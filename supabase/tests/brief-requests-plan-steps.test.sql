-- Retours BUG + UX du 11/10/2026, lots 6 et 7 (supabase/migrations/
-- 20261011500101_brief_requests_plan_steps.sql): requests anchored to a
-- dimension or a question, resolved with a change or a justification,
-- withdrawn by the validator only; an unchanged version refused without a
-- derogation; no validation over an open mandatory request; plan steps with
-- executor, due date and dependencies, edited, added and moved with history.
-- Run with `supabase test db`.
begin;
select plan(33);

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
  'BR ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key in ('framing', 'launch_strategy');

select public.start_framing_without_call(pg_temp.id_of('project'));

create function pg_temp.brief(p_objective text) returns jsonb language sql as $$
  select jsonb_build_object('dimensions', jsonb_build_array(
    jsonb_build_object('dimension', 'objective', 'items', jsonb_build_array(
      jsonb_build_object('key', 'objective', 'value', p_objective, 'lines', '[]'::jsonb, 'source', 'Call'))),
    jsonb_build_object('dimension', 'timing', 'items', jsonb_build_array(
      jsonb_build_object('key', 'target_date', 'value', '24 octobre', 'lines', '[]'::jsonb, 'source', null)))))
$$;
grant execute on function pg_temp.brief(text) to authenticated;

insert into ids select 'v1', public.create_framing_brief(pg_temp.id_of('project'), pg_temp.brief('Faire connaître'));
insert into ids select 'val1', public.send_framing_brief(pg_temp.id_of('v1'), null);

-- Requests -------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_framing_brief(pg_temp.id_of('val1'), false, null, null, '[]'::jsonb) $$,
                 '23514', 'requests_required', 'a change request lists at least one request');
select throws_ok($$ select public.decide_framing_brief(pg_temp.id_of('val1'), false, null, null,
                    '[{"dimension":"objective","questionKey":"target_date","body":"x"}]'::jsonb) $$,
                 '23514', null, 'a request names a question of its own dimension');
select lives_ok($$ select public.decide_framing_brief(pg_temp.id_of('val1'), false, null, null,
  '[{"dimension":"objective","questionKey":"objective","body":"Objectif mesurable","mandatory":true},
    {"dimension":"timing","questionKey":"target_date","body":"Date à confirmer","mandatory":true},
    {"dimension":"timing","body":"Détail du calendrier","mandatory":false}]'::jsonb) $$,
  'the director asks for three anchored corrections');
select is((select count(*)::int from public.framing_brief_requests
            where project_id = pg_temp.id_of('project') and state = 'open'), 3,
          'each request is a line of its own, open');
select is((select reopened_dimensions from public.framing_briefs where id = pg_temp.id_of('v1')),
          array['objective', 'timing'], 'the reopened dimensions follow the requests');
select is((select change_comment from public.framing_briefs where id = pg_temp.id_of('v1')),
          E'Objectif mesurable\nDate à confirmer\nDétail du calendrier',
          'the version keeps the requests as its comment');
insert into ids select 'r_objective', id from public.framing_brief_requests
 where project_id = pg_temp.id_of('project') and question_key = 'objective';
insert into ids select 'r_date', id from public.framing_brief_requests
 where project_id = pg_temp.id_of('project') and question_key = 'target_date';
insert into ids select 'r_optional', id from public.framing_brief_requests
 where project_id = pg_temp.id_of('project') and not mandatory;
select throws_ok($$ select public.resolve_framing_brief_request(pg_temp.id_of('r_date'), 'ok') $$,
                 '42501', null, 'only the owner answers a request');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.framing_brief_requests where project_id = pg_temp.id_of('project')),
          0, 'a member outside the project reads no request');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.framing_brief_requests where project_id = pg_temp.id_of('project')),
          3, 'the owner reads the requests');
select throws_ok($$ select public.resolve_framing_brief_request(pg_temp.id_of('r_objective'), null) $$,
                 '23514', 'justification_required', 'nothing changed yet: resolving needs a justification');

-- An unchanged version is refused without a derogation.
insert into ids select 'v2', public.create_framing_brief(pg_temp.id_of('project'), pg_temp.brief('Faire connaître'));
select lives_ok($$ select public.resolve_framing_brief_request(pg_temp.id_of('r_date'),
                    'La date est confirmée par le distributeur') $$,
                'a request answered without a change, with a justification');
select is((select resolution from public.framing_brief_requests where id = pg_temp.id_of('r_date')),
          'justified', 'it reads as justified');
select throws_ok($$ select public.send_framing_brief(pg_temp.id_of('v2'), null) $$,
                 '23514', 'requests_open', 'a mandatory request still open blocks the sending');
select lives_ok($$ select public.resolve_framing_brief_request(pg_temp.id_of('r_objective'),
                    'Objectif déjà chiffré dans le call') $$, 'the other one justified too');
select throws_ok($$ select public.send_framing_brief(pg_temp.id_of('v2'), null) $$,
                 '23514', 'brief_unchanged', 'a version saying exactly what V1 said is refused');

-- With a change, the request resolves as « corrigée ».
insert into ids select 'v3', public.create_framing_brief(pg_temp.id_of('project'),
  pg_temp.brief('100 000 écoutes en 4 semaines'));
select lives_ok($$ select public.send_framing_brief(pg_temp.id_of('v3'), null) $$,
                'a version that changed is sent');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'val3', validation_id from public.framing_briefs where id = pg_temp.id_of('v3');
select lives_ok($$ select public.decide_framing_brief(pg_temp.id_of('val3'), false, null, null,
  '[{"dimension":"objective","questionKey":"objective","body":"Préciser la plateforme"}]'::jsonb) $$,
  'a second round of corrections');
insert into ids select 'r_second', id from public.framing_brief_requests
 where project_id = pg_temp.id_of('project') and brief_id = pg_temp.id_of('v3');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'v4', public.create_framing_brief(pg_temp.id_of('project'),
  pg_temp.brief('100 000 écoutes Spotify en 4 semaines'));
select is(public.resolve_framing_brief_request(pg_temp.id_of('r_second'), null), 'modified',
          'the latest version changed the question: corrected, no justification needed');
select is((select resolved_brief_id from public.framing_brief_requests where id = pg_temp.id_of('r_second')),
          pg_temp.id_of('v4'), 'the request points to the version that carries the change');

-- The same content sent again only with a derogation, kept.
insert into ids select 'val4', public.send_framing_brief(pg_temp.id_of('v4'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_framing_brief(pg_temp.id_of('val4'), false, null, null,
  '[{"dimension":"timing","body":"Revoir l''ordre des échéances"}]'::jsonb) $$, 'third round');
insert into ids select 'r_third', id from public.framing_brief_requests
 where project_id = pg_temp.id_of('project') and brief_id = pg_temp.id_of('v4');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'v5', public.create_framing_brief(pg_temp.id_of('project'),
  pg_temp.brief('100 000 écoutes Spotify en 4 semaines'));
select public.resolve_framing_brief_request(pg_temp.id_of('r_third'), 'L''ordre est imposé par le label');
select lives_ok($$ select public.send_framing_brief(pg_temp.id_of('v5'), null,
                    'Aucun changement : la DG a été prévenue par téléphone') $$,
                'sent unchanged with a written derogation');
select is((select unchanged_reason from public.framing_briefs where id = pg_temp.id_of('v5')),
          'Aucun changement : la DG a été prévenue par téléphone', 'the derogation is kept on the version');

-- The validator withdraws an open request before validating.
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'val5', validation_id from public.framing_briefs where id = pg_temp.id_of('v5');
select is((select state from public.framing_brief_requests where id = pg_temp.id_of('r_optional')), 'open',
          'an optional request may stay open');
select lives_ok($$ select public.withdraw_framing_brief_request(pg_temp.id_of('r_optional'), 'Plus nécessaire') $$,
                'the validator withdraws a request with a reason');
select lives_ok($$ select public.decide_framing_brief(pg_temp.id_of('val5'), true, null, null) $$,
                'nothing mandatory is open: the Brief is validated');

-- Plan steps -------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'plan', public.launch_project_plan(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('column', 'focus', 'workflow', 'strategy', 'title', 'Stratégie de lancement',
                     'ownerPersonId', pg_temp.id_of('owner_person'),
                     'executorPersonId', pg_temp.id_of('other_person'), 'dueDate', '2026-11-02'),
  jsonb_build_object('column', 'next', 'workflow', 'design', 'title', 'Conception',
                     'dependsOn', jsonb_build_array('strategy'))));
select is((select executor_person_id::text || ' ' || due_date::text from public.project_plan_items
            where plan_id = pg_temp.id_of('plan') and workflow = 'strategy'),
          pg_temp.id_of('other_person')::text || ' 2026-11-02', 'a step keeps its executor and due date');
insert into ids select 'design', id from public.project_plan_items
 where plan_id = pg_temp.id_of('plan') and workflow = 'design';
select lives_ok($$ select public.update_project_plan_item(pg_temp.id_of('design'), 'meanwhile', null,
                    pg_temp.id_of('owner_person'), null, '2026-11-20', '{strategy}') $$,
                'the owner changes a step after the launch');
insert into ids select 'added', public.add_project_plan_item(pg_temp.id_of('project'), 'Shooting photo',
  'meanwhile', pg_temp.id_of('owner_person'), pg_temp.id_of('other_person'), '2026-11-10', '{design}');
select lives_ok($$ select public.move_project_plan_item(pg_temp.id_of('added'), -1) $$,
                'a step moves up within its column');
select is((select array_agg(kind order by created_at, kind) from public.project_plan_events
            where project_id = pg_temp.id_of('project')),
          array['launched', 'step_added', 'step_moved', 'step_updated'],
          'every change is in the plan''s history');
select lives_ok($$ select public.set_project_plan_item_done(pg_temp.id_of('added'), true) $$,
                'an added step is marked done by the owner');
select throws_ok($$ select public.set_project_plan_item_done(pg_temp.id_of('design'), true) $$,
                 'P0001', 'invalid_transition', 'a workflow''s step reads its own state, never a done mark');
select is((select count(*)::int from public.project_plan_events
            where project_id = pg_temp.id_of('project') and kind = 'step_done'), 1,
          'marking it done is in the history');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.update_project_plan_item(pg_temp.id_of('design'), 'focus', null,
                    null, null, null, '{}') $$,
                 '42501', null, 'the director reads the plan, the owner changes it');

select * from finish();
rollback;
