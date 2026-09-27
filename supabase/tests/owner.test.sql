-- Only the owner (the accepting project manager) writes inside a project; the
-- director reads and validates. Run with `supabase test db`.
begin;
select plan(18);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

-- The framing opens once the project has a call report (run as postgres).
create function pg_temp.add_call_report(p_project uuid) returns void language sql as $$
  with c as (
    insert into public.calls (organization_id, project_id, title, consent)
    select organization_id, id, 'Call de cadrage', 'granted' from public.projects where id = p_project
    returning id, organization_id),
  t as (
    insert into public.transcripts (organization_id, call_id, text, provider, model)
    select organization_id, id, 'Transcription', 'test', 'test' from c
    returning id, organization_id, call_id)
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
$$;
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

-- The director creates and transmits, the owner accepts: the project is launched.
select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'OP ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
insert into ids select 'stage', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'framing';

-- Owner ---------------------------------------------------------------------
select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'manual');
  insert into public.calls (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Cadrage ' || (select v from vars where k = 'tag'));
  insert into public.releases (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Lueur')
$$, 'the owner writes the framing, a call and the release');
select lives_ok($$
  with t as (
    insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
    values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Budget à confirmer',
            (select id from ids where name = 'director_person'), current_date + 3)
    returning id)
  insert into ids select 'task', id from t
$$, 'the owner assigns a task to the director');
select ok(exists(select 1 from public.list_validators((select id from ids where name = 'org'))
                 where person_id = (select id from ids where name = 'director_person'))
          and not exists(select 1 from public.list_validators((select id from ids where name = 'org'))
                 where person_id = (select id from ids where name = 'other_person')),
          'only the director is offered as validator');
select lives_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$, 'the owner starts the framing');
select lives_ok($$ select public.request_validation((select id from ids where name = 'stage'), 'Brief prêt') $$,
                'the owner asks for a validation: the sole director is resolved automatically');
select is((select validator_person_id from public.validations
           where project_stage_id = (select id from ids where name = 'stage') and state = 'pending'),
          (select id from ids where name = 'director_person'),
          'the director is the one resolved as validator');

-- Director --------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"y"', 'confirmed', 'manual')
$$, '42501', null, 'the director cannot write the framing');
select throws_ok($$
  insert into public.needs (organization_id, project_id, label, family, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Clip', 'creation_content', 'manual')
$$, '42501', null, 'the director cannot add a need');
select throws_ok($$
  insert into public.calls (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Intrus')
$$, '42501', null, 'the director cannot create a call');
select throws_ok($$
  insert into public.releases (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Intrus')
$$, '42501', null, 'the director cannot write the release');
update public.releases set title = 'Changé' where project_id = (select id from ids where name = 'project');
select is((select title from public.releases where project_id = (select id from ids where name = 'project')),
          'Lueur', 'the director cannot update the release');
select throws_ok($$
  select public.record_release_detection(
    (select id from public.releases where project_id = (select id from ids where name = 'project')), '[]')
$$, 'P0001', 'release_not_found', 'the director cannot run the release detection');
select lives_ok($$ update public.tasks set status = 'done', done_at = now()
                   where id = (select id from ids where name = 'task') $$,
                'the director ticks the task assigned to them');
select is((select status from public.tasks where id = (select id from ids where name = 'task')), 'done',
          'the task is done');
select lives_ok($$ select public.decide_validation(
  (select id from public.validations where project_stage_id = (select id from ids where name = 'stage') and state = 'pending'),
  true, 'OK') $$, 'the director validates the framing');

reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select throws_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$,
                 'P0001', 'invalid_transition', 'a validated stage is final: it cannot be reopened');

-- Another project manager -------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'other'));
select throws_ok($$
  insert into public.open_points (organization_id, project_id, question)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Date ?')
$$, '42501', null, 'another project manager cannot write the framing');
select throws_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$,
                 '42501', null, 'another project manager cannot move a stage');

reset role;
select * from finish();
rollback;
