-- Team positions and invitations (account created ahead by the director),
-- run with `supabase test db`.
begin;
select plan(20);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into vars select 'invitee', 'invitee-' || v || '@pds.test' from vars where k = 'tag';

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'manager_person', person_id from public.accounts where id = (select id from ids where name = 'manager');
update public.memberships set status = 'approved', role = 'general_director'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'director'));

-- Positions -----------------------------------------------------------------
select is((select role from public.memberships m
           join public.accounts a on a.person_id = m.person_id
           where a.id = (select id from ids where name = 'manager')),
          null::text, 'a self-signup has no position until approved');

select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$
  update public.memberships set status = 'approved'
   where person_id = (select id from ids where name = 'manager_person')
$$, '23514', null, 'nobody is approved without a position');
select lives_ok($$
  update public.memberships set status = 'approved', role = 'creative_director'
   where person_id = (select id from ids where name = 'manager_person')
$$, 'the director approves someone and sets the position');
select is((select status || '/' || role from public.memberships where person_id = (select id from ids where name = 'manager_person')),
          'approved/creative_director', 'the position is stored');
select throws_ok($$
  update public.memberships set role = 'member'
   where person_id = (select id from ids where name = 'manager_person')
$$, '23514', null, 'the former member role no longer exists');

-- Invitations ---------------------------------------------------------------
select throws_ok($$ select public.invite_member((select v from vars where k = 'invitee'), 'Léa', null, 'member') $$,
                 'P0001', 'invalid_role', 'an invitation needs a known position');
select lives_ok($$
  insert into ids select 'invitation',
    public.invite_member(upper((select v from vars where k = 'invitee')), 'Léa', 'Moreau', 'project_manager')
$$, 'the director creates an account with a position');
select is((select status || '/' || role from public.memberships where id = (select id from ids where name = 'invitation')),
          'invited/project_manager', 'the invitation carries the chosen position');
select lives_ok($$ select public.invite_member((select v from vars where k = 'invitee'), 'Léa', 'Moreau', 'creative_director') $$,
                'inviting the same address again updates the position');
select throws_ok($$ select public.invite_member('manager-' || (select v from vars where k = 'tag') || '@pds.test', 'X', null, 'general_director') $$,
                 'P0001', 'person_has_account', 'someone who already has an account cannot be invited');
select throws_ok($$
  update public.memberships set status = 'invited'
   where person_id = (select id from ids where name = 'manager_person')
$$, 'P0001', 'person_has_account', 'an existing account cannot be turned back into an invitation');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select throws_ok($$ select public.invite_member('other-' || (select v from vars where k = 'tag') || '@pds.test', 'X', null, 'general_director') $$,
                 '42501', null, 'only the director creates accounts');
select is((select count(*)::int from public.memberships where id = (select id from ids where name = 'invitation')),
          0, 'an invitation is invisible to other members');

-- Positions grant permissions; checks ask for permissions ----------------------
select is(public.role_permissions('general_director'),
          array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
                'view_all_projects', 'archive_records'],
          'the general director administers, assigns and creates projects, validates, manages the catalog, archives');
select is(public.role_permissions('creative_director'), array['creative_work'],
          'the creative director does creative work only');
select ok(not public.is_org_admin((select id from public.organizations where slug = 'pds')),
          'a creative director does not administer');
select is((public.get_my_access() -> 'permissions'), '["creative_work"]'::jsonb,
          'get_my_access returns the permissions of the position');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$
  update public.memberships set role = 'project_manager'
   where status = 'approved' and role = 'general_director'
$$, 'P0001', 'last_usable_admin', 'the last general director cannot lose the position');

-- The invited person signs up and confirms the address --------------------------
reset role;
insert into ids select 'invitee', pg_temp.new_user((select v from vars where k = 'invitee'));
select is((select status || '/' || role from public.memberships where id = (select id from ids where name = 'invitation')),
          'approved/creative_director', 'confirming the address opens the access with the position');
select is((select approved_account_id from public.memberships where id = (select id from ids where name = 'invitation')),
          (select id from ids where name = 'invitee'), 'the access is bound to the new account');

select * from finish();
rollback;
