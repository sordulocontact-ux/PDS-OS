-- Cadrage intelligent (supabase/migrations/20261006000101_framing_intelligent.sql
-- and …000201_project_plan.sql): the Brief as versions, sent through the
-- validation circuit, a correction reopening only the dimensions named, the
-- plan launching the workflows, the Stratégie waiting for it.
-- Run with `supabase test db`.
begin;
select plan(31);

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
-- One validator in V1 (sole_validator): the test's director only.
update public.memberships set status = 'suspended'
 where organization_id = (select id from ids where name = 'org')
   and role = 'general_director' and status = 'approved'
   and person_id <> (select id from ids where name = 'director_person');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'FI ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key in ('framing', 'launch_strategy');

-- Dimensions -----------------------------------------------------------------
select is(public.framing_key_dimension('target_date'), 'timing', 'a key belongs to its dimension');
select is(public.framing_key_dimension('legal_blockers_none'), 'legal',
          'a « rien à signaler » marker follows its key');
select is(public.framing_key_dimension('success_criteria_suggestions'), 'objective',
          'suggestions follow their key');

-- The direct path opens the Cadrage without a call.
select lives_ok($$ select public.start_framing_without_call(pg_temp.id_of('project')) $$,
                'the owner starts the framing with PO, no call needed');
select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status,
                                   source_type, source_label)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'brief', 'target_date', '"2026-10-24"',
          'proposed', 'import', 'Fiche projet')
$$, 'a value taken from a record says where it comes from');
select throws_ok($$
  insert into public.framing_deadlines (organization_id, project_id, kind, review_status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'master_final', 'confirmed')
$$, '23514', null, 'a confirmed deadline has its date');
select lives_ok($$
  insert into public.framing_deadlines (organization_id, project_id, kind, due_date)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'master_final', '2026-10-10')
$$, 'the owner notes the master final date');

-- A framing validation is the validation of a Brief version.
select public.start_stage(pg_temp.id_of('framing'));
select throws_ok($$ select public.request_validation(pg_temp.id_of('framing'), null) $$,
                 'P0001', 'brief_required', 'no framing validation without a Brief version');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.create_framing_brief(pg_temp.id_of('project'), '{"dimensions":[]}') $$,
                 '42501', null, 'only the owner writes the Brief');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

insert into ids select 'v1', public.create_framing_brief(pg_temp.id_of('project'), '{"dimensions":[]}');
select is((select state from public.framing_briefs where id = pg_temp.id_of('v1')), 'pending',
          'a generated Brief waits to be sent');
select is((select state from public.project_stages where id = pg_temp.id_of('framing')), 'in_progress',
          'the framing is in progress');

insert into ids select 'validation1', public.send_framing_brief(pg_temp.id_of('v1'), 'À relire');
select is((select state from public.framing_briefs where id = pg_temp.id_of('v1')), 'sent',
          'sent for validation');
select is((select state from public.project_stages where id = pg_temp.id_of('framing')),
          'awaiting_validation', 'the stage awaits the validator');
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'brief', 'objective', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'nothing changes while the Brief is with the validator');

-- The validator asks for a change of the Temporalité only.
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_framing_brief(pg_temp.id_of('validation1'), false, 'Date à revoir', '{}') $$,
                 '23514', 'dimensions_required', 'a change request names the dimensions to reopen');
select throws_ok($$ select public.decide_framing_brief(pg_temp.id_of('validation1'), false, '', '{timing}') $$,
                 '23514', 'reason_required', 'a change request says why');
select lives_ok($$ select public.decide_framing_brief(pg_temp.id_of('validation1'), false,
                                                      'La date du master final est trop tard', '{timing}') $$,
                'the director asks for a change of the timing');
select is((select state from public.framing_briefs where id = pg_temp.id_of('v1')), 'changes_requested',
          'the version is to correct');
select is((select reopened_dimensions from public.framing_briefs where id = pg_temp.id_of('v1')),
          array['timing'], 'only the timing is reopened');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'brief', 'objective', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'a dimension not reopened stays as validated');
select lives_ok($$
  update public.framing_deadlines set due_date = '2026-10-05'
   where project_id = pg_temp.id_of('project') and kind = 'master_final'
$$, 'the reopened dimension is corrected');

insert into ids select 'v2', public.create_framing_brief(pg_temp.id_of('project'), '{"dimensions":[]}');
select is((select version from public.framing_briefs where id = pg_temp.id_of('v2')), 2,
          'the correction is a new version');
select is((select reopened_dimensions from public.framing_briefs where id = pg_temp.id_of('v2')),
          array['timing'], 'the correction keeps to the reopened dimensions');
select is((select state from public.framing_briefs where id = pg_temp.id_of('v1')), 'superseded',
          'the first version stays, superseded');

insert into ids select 'validation2', public.send_framing_brief(pg_temp.id_of('v2'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_framing_brief(pg_temp.id_of('validation2'), true, null, null);
select is((select state from public.framing_briefs where id = pg_temp.id_of('v2')), 'approved',
          'the Brief is validated');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

-- The plan -----------------------------------------------------------------------
select throws_ok($$ select public.start_stage(pg_temp.id_of('strategy')) $$,
                 'P0001', 'plan_required', 'the Stratégie no longer follows the Cadrage on its own');
select is(public.workflow_is_launched(pg_temp.id_of('project'), 'master'), false,
          'the Master waits for the plan');

insert into ids select 'plan', public.launch_project_plan(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('column', 'focus', 'workflow', 'strategy', 'title', 'Stratégie de lancement',
                     'ownerPersonId', pg_temp.id_of('owner_person')),
  jsonb_build_object('column', 'next', 'workflow', 'master', 'title', 'Master'),
  jsonb_build_object('column', 'anticipate', 'title', 'Master final attendu le 5 octobre')));
select is((select state from public.project_stages where id = pg_temp.id_of('strategy')), 'in_progress',
          'launching the plan starts the Stratégie placed in Focus');
select is(public.workflow_is_launched(pg_temp.id_of('project'), 'master'), false,
          'a workflow placed in Ensuite waits');
select lives_ok($$ select public.launch_plan_workflow(pg_temp.id_of('project'), 'master') $$,
                'the owner launches it when the time comes');
select throws_ok($$ select public.launch_project_plan(pg_temp.id_of('project'),
                    '[{"column":"focus","title":"x"}]'::jsonb) $$,
                 'P0001', 'plan_already_launched', 'a plan is launched once');

select * from finish();
rollback;
