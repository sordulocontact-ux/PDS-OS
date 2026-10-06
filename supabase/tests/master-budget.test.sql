-- Budget, four states (supabase/migrations/20261005012001_budget_four_states.sql):
-- a proposed amount, a line standing for the mix or the mastering of the
-- Brief Mix/Master (one per role), written by the owner only.
-- Run with `supabase test db`.
begin;
select plan(7);

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

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MBU ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

select lives_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, status, master_role)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Mix', 80000, 'proposed', 'mix')
$$, 'a proposed amount, standing for the brief''s mix');
select lives_ok($$
  update public.budget_lines set status = 'committed'
   where project_id = pg_temp.id_of('project') and master_role = 'mix'
$$, 'accepted, it becomes committed');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, master_role)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Mix bis', 1000, 'mix')
$$, '23505', null, 'one line per role of the brief');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, master_role)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 1000, 'clip')
$$, '23514', null, 'the role is mix or mastering');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'X', 1000, 'estimated')
$$, '23514', null, 'the four states only');
select throws_ok($$
  update public.budget_lines set master_role = 'mastering'
   where project_id = pg_temp.id_of('project') and master_role = 'mix'
$$, '42501', null, 'the role of a line is never moved');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, master_role)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Mastering', 20000, 'mastering')
$$, '42501', null, 'only the owner writes the budget');
reset role;

select * from finish();
rollback;
