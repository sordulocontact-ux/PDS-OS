-- Juridique, Plan d'action (supabase/migrations/20261004001201_legal_plan.sql).
-- Run with `supabase test db`.
begin;
select plan(16);

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

-- An answered dossier, not confirmed yet -----------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.record_legal_answer(
  pg_temp.id_of('project'), 'agreements', null, 'Aucun accord.',
  '[{"kind": "none", "value": {}, "quote": "Aucun accord"}]'::jsonb);

select throws_ok($$
  select public.launch_legal_plan(pg_temp.id_of('project'),
    '[{"key": "onboarding", "kind": "onboarding", "label": "Fiches", "status": "action_now", "depends_on": []}]'::jsonb)
$$, 'P0001', 'legal_intake_not_confirmed', 'no plan before the dossier is confirmed');

select public.confirm_legal_intake(pg_temp.id_of('project'));
select is((select count(*)::int from public.list_legal_people(pg_temp.id_of('org'))
            where person_id = pg_temp.id_of('manager_person')),
          1, 'a project manager is a possible responsible (manage_legal)');

select throws_ok($$
  select public.launch_legal_plan(pg_temp.id_of('project'),
    jsonb_build_array(jsonb_build_object('key', 'onboarding', 'kind', 'onboarding', 'label', 'Fiches',
      'status', 'action_now', 'depends_on', '[]'::jsonb,
      'responsible_person_id', pg_temp.id_of('creative_person'))))
$$, 'P0001', 'legal_plan_responsible_invalid', 'a responsible must hold manage_legal');

select lives_ok($$
  select public.launch_legal_plan(pg_temp.id_of('project'),
    jsonb_build_array(
      jsonb_build_object('key', 'onboarding', 'kind', 'onboarding', 'label', 'Fiches de renseignements',
        'status', 'action_now', 'depends_on', '[]'::jsonb, 'due_on', '2026-10-20',
        'responsible_person_id', pg_temp.id_of('manager_person')),
      jsonb_build_object('key', 'splits:x', 'kind', 'splits', 'label', 'Répartition',
        'status', 'blocked', 'depends_on', '["onboarding"]'::jsonb, 'due_on', '2026-10-24')))
$$, 'the project owner launches the plan on a confirmed dossier');
select is((select status from public.legal_plans where project_id = pg_temp.id_of('project')),
          'active', 'the launched plan is confirmed and active');
select is((select depends_on from public.legal_plan_items where item_key = 'splits:x'),
          array['onboarding'], 'an item keeps what it depends on');
select throws_ok($$
  select public.launch_legal_plan(pg_temp.id_of('project'), '[]'::jsonb)
$$, 'P0001', 'legal_plan_already_launched', 'a plan is launched once');

-- Tasks (supabase/migrations/20261004001401_legal_plan_tasks.sql)
select is((select count(*)::int from public.tasks t
            join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.item_key = 'onboarding' and t.assignee_person_id = pg_temp.id_of('manager_person')
              and t.due_date = '2026-10-20'),
          1, 'an action to start now becomes a task of its responsible, on its date');
select is((select count(*)::int from public.tasks t
            join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.item_key = 'splits:x'),
          0, 'an action that waits for another one is not a task yet');

-- Delegation (supabase/migrations/20261004001301_legal_plan_delegation.sql)
select lives_ok($$
  select public.update_legal_plan_item(
    (select id from public.legal_plan_items where item_key = 'splits:x'),
    pg_temp.id_of('manager_person'), '2026-11-01')
$$, 'an action is delegated, with a new due date');
select is((select count(*)::int from public.legal_plan_events
            where item_id = (select id from public.legal_plan_items where item_key = 'splits:x')),
          2, 'both changes are kept in the journal');
select throws_ok($$
  select public.update_legal_plan_item(
    (select id from public.legal_plan_items where item_key = 'splits:x'),
    pg_temp.id_of('creative_person'), null)
$$, 'P0001', 'legal_plan_responsible_invalid', 'a responsible must hold manage_legal');

select lives_ok($$
  select public.create_legal_plan_task((select id from public.legal_plan_items where item_key = 'splits:x'))
$$, 'a freed action becomes a task on demand');
select throws_ok($$
  select public.create_legal_plan_task((select id from public.legal_plan_items where item_key = 'splits:x'))
$$, 'P0001', 'legal_task_exists', 'once only');

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.legal_plan_items where project_id = pg_temp.id_of('project')),
          0, 'a creative director reads no plan (no manage_legal)');
select throws_ok($$
  select public.update_legal_plan_item(
    (select id from public.legal_plan_items limit 1), null, null)
$$, '42501', 'forbidden', 'nor delegates an action');

select * from finish();
rollback;
