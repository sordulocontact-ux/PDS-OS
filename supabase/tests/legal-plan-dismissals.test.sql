-- The Plan d'action remembers what a person decided against
-- (supabase/migrations/20261010000402_legal_plan_dismissals.sql).
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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);

-- A launched plan with a contract action and its task -------------------------------
reset role;
insert into public.legal_plans (organization_id, project_id, status, launched_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'active', now());
insert into ids select 'plan', id from public.legal_plans where project_id = pg_temp.id_of('project');
insert into public.legal_plan_items (organization_id, plan_id, project_id, item_key, kind, label, status)
values (pg_temp.id_of('org'), pg_temp.id_of('plan'), pg_temp.id_of('project'),
        'contract:ilan', 'contract', 'Faire signer un contrat à Ilan', 'action_now');
insert into ids select 'item', id from public.legal_plan_items where plan_id = pg_temp.id_of('plan');
insert into public.tasks (organization_id, project_id, title, assignee_person_id, legal_plan_item_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Faire signer un contrat à Ilan',
        pg_temp.id_of('manager_person'), pg_temp.id_of('item'));

-- Without manage_legal --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.retire_legal_plan_items(pg_temp.id_of('project'), array['contract:ilan']) $$,
                 '42501', null, 'only manage_legal retires an action');
select throws_ok($$ select public.dismiss_legal_plan_keys(pg_temp.id_of('project'), array['splits:x']) $$,
                 '42501', null, 'only manage_legal dismisses an action');

-- The cartography says no agreement is needed ----------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.retire_legal_plan_items(pg_temp.id_of('project'), array['contract:ilan']);
reset role;
select is((select status from public.legal_plan_items where id = pg_temp.id_of('item')),
          'obsolete', 'the action is retired');
select is((select count(*)::int from public.tasks where legal_plan_item_id = pg_temp.id_of('item')),
          0, 'its open task leaves Travail');

-- Removed at the launch -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.dismiss_legal_plan_keys(pg_temp.id_of('project'), array['splits:large', 'contract:ilan']);
reset role;
select is((select dismissed_keys from public.legal_plans where id = pg_temp.id_of('plan')),
          array['contract:ilan', 'splits:large'], 'removed and retired keys are remembered once');
select throws_ok($$ update public.legal_plans set dismissed_keys = '{}' $$,
                 '42501', null, 'the dismissed keys are written by the functions only')
  from (select set_config('role', 'authenticated', true)) as r;
reset role;

-- A project without a plan: nothing to retire, no error ---------------------------------------
delete from public.legal_plan_items where plan_id = pg_temp.id_of('plan');
delete from public.legal_plans where id = pg_temp.id_of('plan');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.retire_legal_plan_items(pg_temp.id_of('project'), array['contract:ilan']) $$,
                'retiring without a plan changes nothing');

reset role;
select * from finish();
rollback;
