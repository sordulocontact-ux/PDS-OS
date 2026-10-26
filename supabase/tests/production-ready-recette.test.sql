-- Recette Marketing V1 d'Ibé (23/10/2026), Production: MKT-PROD-001 (a change
-- reopens the preparation before the shoot) and MKT-PROD-002 (a critical line
-- asks the direction, with a catch-up plan). Migration 20261026300101.
-- Run with `supabase test db`.
begin;
select plan(30);


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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('producer', pg_temp.new_user('producer-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('validator', pg_temp.new_user('validator-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('producer', 'project_manager'), ('validator', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');
insert into ids select 'producer_person', person_id from public.accounts where id = pg_temp.id_of('producer');
insert into ids select 'validator_person', person_id from public.accounts where id = pg_temp.id_of('validator');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Session acoustique');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'link',
        'https://frame.example.com/fiche', 'approved', now(), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Thibo ' || (select v from vars where k = 'tag'), array['production_company']);
insert into ids select 'thibo', id from public.network_contacts where name = 'Thibo ' || (select v from vars where k = 'tag');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'sheet', public.open_production_sheet(pg_temp.id_of('deliverable'), 'call');



select lives_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), pg_temp.id_of('producer_person'), pg_temp.id_of('validator_person'), null, null) $$,
                'an external production, the validator named');

-- 1. MKT-PROD-002: a minor line is confirmed with a reason ---------------------------------
create temp table rows_ok (j jsonb) on commit drop;
grant all on rows_ok to authenticated;
insert into rows_ok values ('[{"key":"place","label":"Lieu retenu","value":"Rooftop","ok":true},{"key":"gear","label":"Matériel","value":"Pas encore","ok":false}]');
select is((select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'Matériel loué la veille')),
          'ready', 'a minor line not ready: confirmed with a reason');
reset role;
select ok((select ready_at is not null and ready_approved_by is null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'the preparation is validated by one person');

-- 2. MKT-PROD-001: a change after the confirmation reopens it, before the shoot ------------
update public.production_sheets set location_name = 'Entrepôt' where id = pg_temp.id_of('sheet');
select ok((select ready_at is null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'a new place reopens the preparation');
select is((select ready_reopened_because from public.production_sheets where id = pg_temp.id_of('sheet')),
          array['place'], 'and says what changed');
select throws_ok($$ insert into public.production_shoots (sheet_id, organization_id, project_id, state)
                    values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'), 'in_progress') $$,
                 '23514', 'not_ready', 'the shoot waits for a new control');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'Matériel loué la veille')),
          'ready', 'confirmed again');
reset role;
update public.production_sheets set direction_revision_at = now() where id = pg_temp.id_of('sheet');
select is((select ready_reopened_because from public.production_sheets where id = pg_temp.id_of('sheet')),
          array['direction'], 'a new version of the proposal asked reopens it');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'Matériel loué la veille') $$,
                'confirmed again');
reset role;
update public.production_sheets set quote_revision_at = now() where id = pg_temp.id_of('sheet');
select is((select ready_reopened_because from public.production_sheets where id = pg_temp.id_of('sheet')),
          array['quote'], 'a quote''s revision reopens it');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'Matériel loué la veille') $$,
                'confirmed again');
reset role;
update public.production_sheets set schedule_changed_at = now() where id = pg_temp.id_of('sheet');
select is((select ready_reopened_because from public.production_sheets where id = pg_temp.id_of('sheet')),
          array['date'], 'a new date reopens it');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'Matériel loué la veille') $$,
                'confirmed again');
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'x') $$,
                 'P0001', 'already_ready', 'not twice');

-- 3. MKT-PROD-002: a critical line asks the direction, with a catch-up plan ---------------
reset role;
update public.production_sheets set location_name = 'Studio' where id = pg_temp.id_of('sheet');
create temp table rows_crit (j jsonb) on commit drop;
grant all on rows_crit to authenticated;
insert into rows_crit values ('[{"key":"place","label":"Lieu retenu","value":"Studio","ok":true},{"key":"crew","label":"Équipe confirmée","value":"Pas encore","ok":false},{"key":"gear","label":"Matériel","value":"Pas encore","ok":false}]');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_crit), 'Équipe en cours') $$,
                 'P0001', 'plan_required', 'a critical line needs a catch-up plan');
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_crit), 'Équipe en cours',
                     jsonb_build_array(jsonb_build_object('key', 'crew', 'personId', pg_temp.id_of('producer_person'), 'dueOn', '2020-01-01'))) $$,
                 'P0001', 'plan_due_past', 'its deadline is not past');
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_crit), 'Équipe en cours',
                     jsonb_build_array(jsonb_build_object('key', 'crew', 'personId', gen_random_uuid(), 'dueOn', '2099-01-01'))) $$,
                 'P0001', 'plan_person_invalid', 'its owner is a member');
select is((select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_crit), 'Équipe en cours',
                     jsonb_build_array(jsonb_build_object('key', 'crew', 'personId', pg_temp.id_of('producer_person'), 'dueOn', '2099-01-01')))),
          'requested', 'the confirmation becomes a request');
reset role;
select ok((select ready_at is null and ready_request_at is not null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'the preparation is not validated yet');
select ok(exists (select 1 from public.notifications where kind = 'production_ready_requested'
                   and recipient_person_id = pg_temp.id_of('validator_person')),
          'the validator is told');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.decide_production_ready(pg_temp.id_of('sheet'), true) $$,
                 '42501', null, 'who asked never decides');
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_ok), 'x') $$,
                 'P0001', 'request_pending', 'one request at a time');
reset role;
select pg_temp.act_as(pg_temp.id_of('validator'));
select throws_ok($$ select public.decide_production_ready(pg_temp.id_of('sheet'), false, ' ') $$,
                 'P0001', 'reason_required', 'a refusal says why');
select lives_ok($$ select public.decide_production_ready(pg_temp.id_of('sheet'), false, 'Trouvez le chef op d''abord') $$,
                'the validator refuses');
reset role;
select ok((select ready_request_at is null and ready_at is null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'refused: nothing validated, the request withdrawn');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select public.confirm_production_ready(pg_temp.id_of('sheet'), (select j from rows_crit), 'Équipe en cours',
                     jsonb_build_array(jsonb_build_object('key', 'crew', 'personId', pg_temp.id_of('producer_person'), 'dueOn', '2099-01-01')))),
          'requested', 'asked again');
reset role;
select pg_temp.act_as(pg_temp.id_of('validator'));
select lives_ok($$ select public.decide_production_ready(pg_temp.id_of('sheet'), true) $$, 'the validator approves');
reset role;
select ok((select ready_at is not null and ready_approved_by = pg_temp.id_of('validator_person')
                  and ready_by = pg_temp.id_of('manager_person')
             from public.production_sheets where id = pg_temp.id_of('sheet')),
          'validated by two people');
select ok((select person_id = pg_temp.id_of('producer_person') and due_date = '2099-01-01' and origin like 'Dérogation du %'
             from public.production_plan_actions where sheet_id = pg_temp.id_of('sheet') and title like 'Rattraper%'),
          'the plan became a task, with its owner and its deadline');

-- 4. After the shoot started, a change reopens nothing -------------------------------------
insert into public.production_shoots (sheet_id, organization_id, project_id, state)
values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'), 'in_progress');
update public.production_sheets set location_name = 'Ailleurs' where id = pg_temp.id_of('sheet');
select ok((select ready_at is not null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'the shoot started: the confirmation stays');

select * from finish();
rollback;
