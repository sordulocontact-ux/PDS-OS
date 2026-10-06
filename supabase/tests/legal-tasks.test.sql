-- Juridique: the plan's actions are tasks, ticked by their sources
-- (supabase/migrations/20261005003001_legal_tasks_auto.sql). Run with
-- `supabase test db`.
begin;
select plan(13);

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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');
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

-- Two credited composers, Ever already in the Réseau.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Ever ' || (select v from vars where k = 'tag'), array['songwriter']),
       (pg_temp.id_of('org'), 'person', 'Samy ' || (select v from vars where k = 'tag'), array['songwriter']);
insert into ids select lower(split_part(name, ' ', 1)) || '_contact', id from public.network_contacts
 where name in ('Ever ' || (select v from vars where k = 'tag'), 'Samy ' || (select v from vars where k = 'tag'));
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Ever', 'composer', pg_temp.id_of('ever_contact')),
       (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Samy', 'composer', null);
insert into ids select lower(name) || '_credit', id from public.master_contributors
 where master_id = pg_temp.id_of('master');

select pg_temp.act_as(pg_temp.id_of('manager'));
select public.record_legal_answer(
  pg_temp.id_of('project'), 'agreements', null, 'Aucun accord.',
  '[{"kind": "none", "value": {}, "quote": "Aucun accord"}]'::jsonb);
select public.confirm_legal_intake(pg_temp.id_of('project'));
select public.launch_legal_plan(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('key', 'onboarding', 'kind', 'onboarding', 'label', 'Fiches',
    'status', 'action_now', 'depends_on', '[]'::jsonb,
    'responsible_person_id', pg_temp.id_of('manager_person')),
  jsonb_build_object('key', 'contract:ever', 'kind', 'contract', 'label', 'Contrat Ever',
    'subject', 'Ever', 'status', 'blocked', 'depends_on', '["onboarding"]'::jsonb,
    'credit_ids', jsonb_build_array(pg_temp.id_of('ever_credit')), 'due_on', '2026-11-01',
    'responsible_person_id', pg_temp.id_of('manager_person')),
  jsonb_build_object('key', 'splits:' || pg_temp.id_of('master'), 'kind', 'splits',
    'label', 'Répartition', 'master_id', pg_temp.id_of('master'), 'status', 'blocked',
    'depends_on', '["onboarding"]'::jsonb, 'responsible_person_id', pg_temp.id_of('manager_person')),
  jsonb_build_object('key', 'formality:' || pg_temp.id_of('master'), 'kind', 'formality',
    'label', 'SACEM', 'master_id', pg_temp.id_of('master'), 'status', 'blocked',
    'depends_on', '[]'::jsonb)));

create function pg_temp.task_of(p_key text) returns public.tasks language sql as $$
  select t.* from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
   where i.project_id = pg_temp.id_of('project') and i.item_key = p_key
$$;

select is((select count(*)::int from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.project_id = pg_temp.id_of('project')), 3,
          'every action with a responsible is a task, also those that wait');
select is((pg_temp.task_of('onboarding')).due_date, null, 'an action without a date makes a task without a date');
select throws_ok(format($$ insert into public.tasks (organization_id, project_id, title, assignee_person_id)
                          values (%L, %L, 'Sans date', %L) $$,
                        pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('manager_person')),
                 '23514', null, 'any other task keeps its due date');

-- Sources tick the tasks ----------------------------------------------------------
reset role;
create function pg_temp.complete_fiche(p_contact uuid) returns void language sql as $$
  insert into public.legal_forms (organization_id, project_id, contact_id, status, token_hash,
                                  expires_at, definition_version, completed_at)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), p_contact, 'complete',
          md5(random()::text), now() + interval '30 days', 1, now())
$$;
select pg_temp.complete_fiche(pg_temp.id_of('ever_contact'));
select is((pg_temp.task_of('onboarding')).status, 'todo', 'one fiche of two does not finish the fiches');
update public.master_contributors set contact_id = pg_temp.id_of('samy_contact')
 where id = pg_temp.id_of('samy_credit');
select pg_temp.complete_fiche(pg_temp.id_of('samy_contact'));
select is((pg_temp.task_of('onboarding')).status, 'done', 'the last fiche ticks the task');

insert into public.contracts (organization_id, title, type, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Contrat Ever', 'publishing', pg_temp.id_of('project'),
        pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts
 where project_id = pg_temp.id_of('project') and title = 'Contrat Ever';
insert into public.contract_parties (contract_id, organization_id, contact_id)
values (pg_temp.id_of('contract'), pg_temp.id_of('org'), pg_temp.id_of('ever_contact'));
select is((pg_temp.task_of('contract:ever')).status, 'todo', 'a draft contract does not tick it');
update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract');
select is((pg_temp.task_of('contract:ever')).status, 'done', 'the signature ticks the contract''s task');

-- The split sheet (Juridique 04): proposed, then confirmed by everyone.
insert into public.legal_split_sheets (organization_id, project_id, master_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'));
insert into public.legal_split_versions (organization_id, sheet_id, version, status)
select pg_temp.id_of('org'), id, 1, 'proposed' from public.legal_split_sheets
 where project_id = pg_temp.id_of('project');
select is((pg_temp.task_of('splits:' || pg_temp.id_of('master'))).status, 'todo', 'a proposed split is not done');
update public.legal_split_versions set status = 'confirmed'
 where sheet_id = (select id from public.legal_split_sheets where project_id = pg_temp.id_of('project'));
select is((pg_temp.task_of('splits:' || pg_temp.id_of('master'))).status, 'done', 'a confirmed split ticks its task');

-- Delegation and actions added after the launch -----------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.update_legal_plan_item(
  (select id from public.legal_plan_items where item_key = 'formality:' || pg_temp.id_of('master')),
  pg_temp.id_of('director_person'), '2026-12-01');
select is((pg_temp.task_of('formality:' || pg_temp.id_of('master'))).assignee_person_id,
          pg_temp.id_of('director_person'), 'giving an action a responsible gives it its task');
select is(public.add_legal_plan_items(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('key', 'contract:samy', 'kind', 'contract', 'label', 'Contrat Samy',
    'status', 'action_now', 'depends_on', '[]'::jsonb,
    'credit_ids', jsonb_build_array(pg_temp.id_of('samy_credit')),
    'responsible_person_id', pg_temp.id_of('manager_person')),
  jsonb_build_object('key', 'onboarding', 'kind', 'onboarding', 'label', 'Fiches',
    'status', 'action_now', 'depends_on', '[]'::jsonb))), 1,
  'an action added after the launch joins the plan, one already there is left');
select isnt((pg_temp.task_of('contract:samy')).id, null, 'with its task');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.add_legal_plan_items(%L, '[]'::jsonb) $$, pg_temp.id_of('project')),
                 '42501', 'forbidden', 'adding to the plan needs manage_legal');

select * from finish();
rollback;
