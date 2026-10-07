-- Launch strategy: starts after a validated Brief, written by the owner only
-- while in progress, frozen once submitted. Run with `supabase test db`.
begin;
select plan(21);

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
  'ST ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project')
   and d.key in ('framing', 'launch_strategy');


-- Shortcuts: org and project ids.
create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated;

-- Before the Brief is validated ----------------------------------------------
select throws_ok($$ select public.start_stage(pg_temp.id_of('strategy')) $$,
                 'P0001', 'previous_stage_not_validated', 'the strategy waits for a validated Brief');
select throws_ok($$
  insert into public.levers (organization_id, project_id, label, family)
  values (pg_temp.org(), pg_temp.prj(), 'Clip', 'creation_content')
$$, '42501', null, 'no lever before the strategy starts');
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'strategy', 'positioning', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'no strategy field before the strategy starts');

-- The owner validates the Brief through the director.
select public.start_stage(pg_temp.id_of('framing'));
-- A framing validation is the validation of a Brief version (…20261006000101).
select public.create_framing_brief(pg_temp.prj(), '{}'::jsonb);
select public.request_validation(pg_temp.id_of('framing'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation((select id from public.validations
  where project_stage_id = pg_temp.id_of('framing') and state = 'pending'), true, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

-- In progress ---------------------------------------------------------------
-- The Stratégie starts from the plan of the project (…20261006000201).
select lives_ok($$ select public.launch_project_plan(pg_temp.prj(),
                   '[{"column":"focus","workflow":"strategy","title":"Stratégie"}]'::jsonb) $$,
                'the owner starts the strategy from the plan once the Brief is validated');
select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'strategy', 'positioning', '"Pop solaire"', 'confirmed', 'manual');
  with l as (insert into public.levers (organization_id, project_id, label, family)
             values (pg_temp.org(), pg_temp.prj(), 'Clip', 'creation_content') returning id)
  insert into ids select 'lever', id from l;
$$, 'the owner writes the positioning and adds a lever');
select is((select state from public.levers where id = pg_temp.id_of('lever')), 'to_decide',
          'a new lever is to decide');
select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'strategy', 'audiences_suggestions',
          '{"items":[{"choice":"current_fans","source":"brief:objective","quote":"fidéliser les fans"}]}', 'proposed', 'suggestion')
$$, 'PO can store a sourced suggestion of choices for the owner');
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'strategy', 'audiences_choices', '{"choices":["new_audience"]}', 'confirmed', 'suggestion')
$$, '23514', null, 'a suggestion is never a confirmed choice');
select lives_ok($$
  insert into public.levers (organization_id, project_id, label, family, source_type, source_quote)
  values (pg_temp.org(), pg_temp.prj(), 'Showcase', 'creation_content', 'voice', 'ajoute un showcase')
$$, 'a lever can come from a dictation');
select throws_ok($$
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Clip 16:9')
$$, 'P0001', 'lever_not_selected', 'a deliverable needs a selected lever');
update public.levers set state = 'selected' where id = pg_temp.id_of('lever');
select lives_ok($$
  with d as (insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, due_date)
             values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Clip 16:9', current_date + 20) returning id)
  insert into ids select 'deliverable', id from d;
$$, 'a selected lever carries a deliverable');
select throws_ok($$ update public.levers set state = 'rejected' where id = pg_temp.id_of('lever') $$,
                 'P0001', 'lever_has_deliverables', 'a lever with deliverables stays selected');
select lives_ok($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, kind, deliverable_id)
  values (pg_temp.org(), pg_temp.prj(), 'Sortie du clip', current_date + 21, 'content', pg_temp.id_of('deliverable'))
$$, 'the owner adds a milestone tied to the deliverable');
select throws_ok($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, kind)
  values (pg_temp.org(), pg_temp.prj(), 'Mystère', current_date, 'unknown')
$$, '23514', null, 'milestone kinds are a closed list');
delete from public.strategy_deliverables where id = pg_temp.id_of('deliverable');
select ok((select deliverable_id is null from public.milestones where title = 'Sortie du clip'),
          'removing a deliverable detaches its milestones');

-- Director --------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.levers where project_id = pg_temp.prj()), 2,
          'the director reads the levers');
select throws_ok($$
  insert into public.levers (organization_id, project_id, label, family)
  values (pg_temp.org(), pg_temp.prj(), 'Intrus', 'other')
$$, '42501', null, 'the director cannot add a lever');

-- Submitted: frozen -------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_validation(pg_temp.id_of('strategy'), null);
select throws_ok($$
  insert into public.levers (organization_id, project_id, label, family)
  values (pg_temp.org(), pg_temp.prj(), 'Live', 'experiences_activations')
$$, '42501', null, 'a submitted strategy takes no new lever');
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'strategy', 'narrative', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'a submitted strategy takes no new field value');
update public.levers set state = 'to_decide' where id = pg_temp.id_of('lever');
select is((select state from public.levers where id = pg_temp.id_of('lever')), 'selected',
          'a submitted strategy cannot be changed');
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'brief', 'frame', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'the Brief stays frozen once the framing is validated');

reset role;
select * from finish();
rollback;
