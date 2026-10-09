-- Stratégie, workflow complet (…20261009000101_strategy_workflow): the
-- workspace, the budget and KPIs, the Brief de sortie validated by several
-- people (relance, history), V1 frozen and a revision that never overwrites
-- it, the external documents and their shared link, the follow-up's
-- recommendations. Run with `supabase test db`.
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
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
create function pg_temp.org() returns uuid language sql as $$ select pg_temp.id_of('org') $$;
create function pg_temp.prj() returns uuid language sql as $$ select pg_temp.id_of('project') $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated, anon;

-- A launched project, its Cadrage validated, its Strategy started by the plan.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.org(),
  'SW ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.prj(), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.add_call_report(pg_temp.prj());
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.prj() and d.key in ('framing', 'launch_strategy');
select public.start_stage(pg_temp.id_of('framing'));
select public.create_framing_brief(pg_temp.prj(), '{}'::jsonb);
select public.request_validation(pg_temp.id_of('framing'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation((select id from public.validations
  where project_stage_id = pg_temp.id_of('framing') and state = 'pending'), true, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.launch_project_plan(pg_temp.prj(),
  '[{"column":"focus","workflow":"strategy","title":"Stratégie"}]'::jsonb);

-- Workspace and dimensions -------------------------------------------------------
select lives_ok($$ select public.start_strategy(pg_temp.prj()) $$,
                'the owner opens the strategy (« Commencer la stratégie »)');
select ok((select started_at is not null from public.strategy_workspaces where project_id = pg_temp.prj()),
          'the workspace remembers the start');
select lives_ok($$
  with l as (insert into public.levers (organization_id, project_id, label, family, state)
             values (pg_temp.org(), pg_temp.prj(), 'Influence', 'promotion_distribution', 'selected')
             returning id)
  insert into ids select 'lever', id from l;
  insert into public.strategy_budget_lines (organization_id, project_id, lever_id, label, amount_cents, state)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Créateurs', 150000, 'to_decide');
  with k as (insert into public.strategy_kpis (organization_id, project_id, label, target_value, unit)
             values (pg_temp.org(), pg_temp.prj(), 'Streams J+28', 100000, 'streams') returning id)
  insert into ids select 'kpi', id from k;
$$, 'the owner writes a lever, a budget line by lever and a KPI');
select throws_ok($$
  insert into public.strategy_budget_lines (organization_id, project_id, label, amount_cents)
  values (pg_temp.org(), pg_temp.prj(), 'Nul', 0)
$$, '23514', null, 'a budget line has a positive amount');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.strategy_budget_lines where project_id = pg_temp.prj()), 0,
          'the budget is not read outside the project');
select throws_ok($$ select public.start_strategy(pg_temp.prj()) $$, '42501', null,
                 'only the owner starts the strategy');

-- Brief de sortie, validated by several people ------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'v1', public.create_strategy_document(pg_temp.prj(), 'brief',
  '{"kind":"strategy_brief","sections":[]}'::jsonb);
select throws_ok($$ select public.send_strategy_document(pg_temp.id_of('v1'),
                   array[pg_temp.id_of('other_person')]) $$,
                 '23514', 'invalid_reviewer', 'only the project''s creatives join the validation');
select lives_ok($$ select public.send_strategy_document(pg_temp.id_of('v1'),
                   array[pg_temp.id_of('creative_person')], 'Merci') $$,
                'the owner sends V1 to the director and a creative director');
select is((select count(*)::int from public.strategy_document_reviews where document_id = pg_temp.id_of('v1')), 2,
          'two people must validate');
select is((select s.state from public.project_stages s where s.id = pg_temp.id_of('strategy')),
          'awaiting_validation', 'the strategy waits for its validation');
select throws_ok($$
  insert into public.strategy_kpis (organization_id, project_id, label) values (pg_temp.org(), pg_temp.prj(), 'Late')
$$, '42501', null, 'nothing changes while the Brief waits for its reviewers');
select throws_ok($$ select public.create_strategy_document(pg_temp.prj(), 'release_plan', '{}'::jsonb) $$,
                 'P0001', 'brief_not_validated', 'no Plan de sortie before the Brief is validated');
select lives_ok($$ select public.remind_strategy_review((select id from public.strategy_document_reviews
                   where document_id = pg_temp.id_of('v1') and person_id = pg_temp.id_of('creative_person'))) $$,
                'the owner reminds a reviewer');
select throws_ok($$ select public.remind_strategy_review((select id from public.strategy_document_reviews
                   where document_id = pg_temp.id_of('v1') and person_id = pg_temp.id_of('creative_person'))) $$,
                 'P0001', 'reminder_too_soon', 'one reminder every twelve hours');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_validation((select validation_id from public.strategy_documents
                   where id = pg_temp.id_of('v1')), true, null) $$,
                 'P0001', 'use_strategy_brief', 'the stage''s validation follows the Brief''s reviews only');
select lives_ok($$ select public.decide_strategy_document(pg_temp.id_of('v1'), true, null) $$,
                'the director validates');
select is((select state from public.strategy_documents where id = pg_temp.id_of('v1')), 'sent',
          'V1 still waits for the creative director');

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select ok((select count(*) = 1 from public.notifications
            where recipient_person_id = pg_temp.id_of('creative_person')
              and kind = 'strategy_review_reminder'),
          'the reminded reviewer is notified');
select lives_ok($$ select public.decide_strategy_document(pg_temp.id_of('v1'), true, 'Top') $$,
                'the creative director validates too');
select is((select state from public.strategy_documents where id = pg_temp.id_of('v1')), 'approved',
          'V1 is validated once everyone has');
select is((select s.state from public.project_stages s where s.id = pg_temp.id_of('strategy')),
          'validated', 'the strategy is validated');

-- External documents and their link -------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'plan', public.create_strategy_document(pg_temp.prj(), 'release_plan',
  '{"kind":"release_plan","pages":[]}'::jsonb);
select throws_ok($$ select public.share_strategy_document(pg_temp.id_of('v1')) $$,
                 'P0001', 'not_shareable', 'the internal Brief is never shared outside');
insert into ids select 'token', public.share_strategy_document(pg_temp.id_of('plan'));
select is(public.share_strategy_document(pg_temp.id_of('plan')), pg_temp.id_of('token'),
          'sharing again gives the same live link');
reset role;
set local role anon;
select is((public.get_shared_strategy_document(pg_temp.id_of('token')) ->> 'kind'), 'release_plan',
          'anyone with the link reads the Plan de sortie');
select is(public.get_shared_strategy_document(gen_random_uuid()), null,
          'an unknown link reads nothing');
reset role;

-- Revision: V1 stays the reference -----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$
  insert into public.strategy_kpis (organization_id, project_id, label) values (pg_temp.org(), pg_temp.prj(), 'After')
$$, '42501', null, 'a validated strategy is frozen');
select lives_ok($$ select public.open_strategy_revision(pg_temp.prj()) $$,
                'the owner opens a revision');
insert into ids select 'v2', public.create_strategy_document(pg_temp.prj(), 'brief',
  '{"kind":"strategy_brief","sections":[]}'::jsonb);
select public.send_strategy_document(pg_temp.id_of('v2'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_strategy_document(pg_temp.id_of('v2'), false, '') $$,
                 '23514', 'reason_required', 'a change request says why');
select public.decide_strategy_document(pg_temp.id_of('v2'), false, 'Revoir le budget');
select ok((select state = 'changes_requested' from public.strategy_documents where id = pg_temp.id_of('v2'))
          and (select state = 'approved' from public.strategy_documents where id = pg_temp.id_of('v1'))
          and (select s.state = 'validated' from public.project_stages s where s.id = pg_temp.id_of('strategy')),
          'a refused V2 never touches V1 nor the validated stage');

-- Follow-up ------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$
  insert into public.strategy_recommendations (organization_id, project_id, rule_key, state)
  values (pg_temp.org(), pg_temp.prj(), 'kpi:x:below', 'ignored')
$$, '42501', null, 'only the owner applies or ignores a recommendation');

reset role;
select * from finish();
rollback;
