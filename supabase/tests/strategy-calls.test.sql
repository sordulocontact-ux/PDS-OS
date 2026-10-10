-- Stratégie, étape 1 (…20261010000101): « Commencer la stratégie » once the
-- plan has started the stage, and the strategy calls prepared by the owner.
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
select throws_ok($$ select public.create_strategy_call(pg_temp.prj(), 'Échange', now(), '',
                   '[]'::jsonb, 'Objectif', '[{"name":"Ana"}]'::jsonb, 'video') $$,
                 'P0001', 'previous_stage_not_validated', 'no strategy call before the Brief is validated');

-- The owner validates the Brief through the director.
select public.start_stage(pg_temp.id_of('framing'));
select public.create_framing_brief(pg_temp.prj(), '{}'::jsonb);
select public.request_validation(pg_temp.id_of('framing'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation((select id from public.validations
  where project_stage_id = pg_temp.id_of('framing') and state = 'pending'), true, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

-- Starting ------------------------------------------------------------------
select throws_ok($$ select public.start_strategy(pg_temp.prj()) $$,
                 'P0001', 'plan_required', 'the strategy waits for the plan');
select public.launch_project_plan(pg_temp.prj(),
  '[{"column":"focus","workflow":"strategy","title":"Stratégie"}]'::jsonb);
select is((select count(*)::int from public.strategy_workspaces where project_id = pg_temp.prj()), 0,
          'the plan starts the stage, not the work: the entry shows');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.start_strategy(pg_temp.prj()) $$,
                 '42501', null, 'another project manager cannot start it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.start_strategy(pg_temp.prj()) $$, 'the owner starts the strategy');
select lives_ok($$ select public.start_strategy(pg_temp.prj()) $$, 'starting twice is harmless');
select is((select count(*)::int from public.strategy_workspaces where project_id = pg_temp.prj()), 1,
          'one workspace per project');
select throws_ok($$ insert into public.strategy_workspaces (project_id, organization_id)
                    values (pg_temp.prj(), pg_temp.org()) $$,
                 '42501', null, 'the workspace is written by start_strategy only');

-- Strategy calls --------------------------------------------------------------
select lives_ok($$
  insert into ids select 'video_call', public.create_strategy_call(pg_temp.prj(), 'Échange stratégie',
    now() + interval '1 day', 'https://meet.example/x',
    '[{"topic":"Positionnement","minutes":5}]'::jsonb, 'Décider du positionnement',
    '[{"name":"Ana"},{"name":"Artiste"}]'::jsonb, 'video')
$$, 'the owner prepares a strategy call');
select is((select meeting_url || ' · ' || duration_minutes from public.calls where id = pg_temp.id_of('video_call')),
          'https://meet.example/x · 5', 'a video call keeps its link and agenda length');
select lives_ok($$
  insert into ids select 'phone_call', public.create_strategy_call(pg_temp.prj(), 'Point téléphone',
    now() + interval '2 days', 'https://meet.example/y', '[]'::jsonb, 'Objectif',
    '[{"name":"Ana"}]'::jsonb, 'phone')
$$, 'a phone call is prepared too');
select is((select meeting_url from public.calls where id = pg_temp.id_of('phone_call')), null,
          'a call off video has no link');
select throws_ok($$ select public.create_strategy_call(pg_temp.prj(), 'X', now(), '', '[]'::jsonb,
                   'Objectif', '[{"name":"Ana"}]'::jsonb, 'radio') $$,
                 '23514', null, 'an unknown format is refused');
select throws_ok($$ select public.create_strategy_call(pg_temp.prj(), 'X', now(), '', '[]'::jsonb,
                   'Objectif', '[{"name":" "}]'::jsonb, 'video') $$,
                 '23514', null, 'a participant needs a name');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.strategy_calls where project_id = pg_temp.prj()), 2,
          'the director reads the strategy calls');

-- Once submitted, no more exchange to prepare.
reset role;
update public.project_stages set state = 'awaiting_validation' where id = pg_temp.id_of('strategy');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.create_strategy_call(pg_temp.prj(), 'X', now(), '', '[]'::jsonb,
                   'Objectif', '[{"name":"Ana"}]'::jsonb, 'video') $$,
                 'P0001', 'stage_locked', 'a submitted strategy takes no new exchange');

select * from finish();
rollback;
