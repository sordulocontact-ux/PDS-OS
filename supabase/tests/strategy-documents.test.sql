-- Stratégie, étapes 9 à 11 (…20261010000801): the Brief de sortie validated by
-- several people, V1 frozen, a revision that never overwrites it.
-- Run with `supabase test db`.
begin;
select plan(23);



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

-- A creative director on the project (named as a reviewer).
reset role;
insert into ids values
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
update public.memberships m set status = 'approved', role = 'creative_director'
 where m.person_id = (select person_id from public.accounts where id = (select id from ids where name = 'creative'));
insert into ids select 'creative_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name = 'creative';
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('creative_person'));

-- The owner validates the Brief (Cadrage) through the director, then the plan.
select pg_temp.act_as(pg_temp.id_of('owner'));
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
select public.start_strategy(pg_temp.prj());

-- The strategy is validated through its Brief de sortie only ---------------------
select throws_ok($$ select public.request_validation(pg_temp.id_of('strategy'), null) $$,
                 'P0001', 'brief_required', 'no strategy validation without a Brief de sortie');
select throws_ok($$ select public.create_strategy_document(pg_temp.prj(), 'release_plan', '{}'::jsonb) $$,
                 'P0001', 'brief_not_validated', 'no Plan de sortie before the Brief is validated');
select lives_ok($$
  insert into ids select 'v1', public.create_strategy_document(pg_temp.prj(), 'brief', '{"format":1}'::jsonb)
$$, 'the owner writes a Brief version');
select throws_ok($$ select public.send_strategy_document(pg_temp.id_of('v1'), array[pg_temp.id_of('other_person')], null) $$,
                 '23514', 'invalid_reviewer', 'only creatives of the project can be added');
select lives_ok($$ select public.send_strategy_document(pg_temp.id_of('v1'), array[pg_temp.id_of('creative_person')], 'Merci') $$,
                'the owner sends it to the director and a creative');
select is((select state from public.project_stages where id = pg_temp.id_of('strategy')), 'awaiting_validation',
          'the strategy waits for its validation');
select is((select count(*)::int from public.strategy_document_reviews where document_id = pg_temp.id_of('v1')), 2,
          'two people must validate');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label)
  values (pg_temp.org(), pg_temp.prj(), 'Tard')
$$, '42501', null, 'the strategy is frozen while it is reviewed');
select lives_ok($$ select public.remind_strategy_review((select id from public.strategy_document_reviews
                   where document_id = pg_temp.id_of('v1') and person_id = pg_temp.id_of('creative_person'))) $$,
                'the owner reminds a reviewer');
select throws_ok($$ select public.remind_strategy_review((select id from public.strategy_document_reviews
                   where document_id = pg_temp.id_of('v1') and person_id = pg_temp.id_of('creative_person'))) $$,
                 'P0001', 'reminder_too_soon', 'not twice within 12 hours');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_validation((select id from public.validations
                   where project_stage_id = pg_temp.id_of('strategy') and state = 'pending'), true, null) $$,
                 'P0001', 'use_strategy_brief', 'the generic decision never validates a strategy');
select lives_ok($$ select public.decide_strategy_document(pg_temp.id_of('v1'), true, null) $$,
                'the director validates');
select is((select state from public.strategy_documents where id = pg_temp.id_of('v1')), 'sent',
          'the version waits for the creative still');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.decide_strategy_document(pg_temp.id_of('v1'), true, 'Parfait') $$,
                'the creative validates');
select is((select state from public.strategy_documents where id = pg_temp.id_of('v1')), 'approved',
          'every review approved: V1 is validated');
select is((select state from public.project_stages where id = pg_temp.id_of('strategy')), 'validated',
          'the strategy is validated');

-- After V1: external documents, then a revision that never overwrites V1 ------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.create_strategy_document(pg_temp.prj(), 'release_plan', '{"pages":[]}'::jsonb) $$,
                'a Plan de sortie can be generated from the validated Brief');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label)
  values (pg_temp.org(), pg_temp.prj(), 'Avant révision')
$$, '42501', null, 'a validated strategy is frozen');
select lives_ok($$ select public.open_strategy_revision(pg_temp.prj()) $$, 'the owner opens a revision');
select lives_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label)
  values (pg_temp.org(), pg_temp.prj(), 'Pendant la révision')
$$, 'the strategy is editable again during the revision');
select lives_ok($$
  insert into ids select 'v2', public.create_strategy_document(pg_temp.prj(), 'brief', '{"format":1}'::jsonb)
$$, 'the revision makes a new Brief version');
select is((select version || ':' || state from public.strategy_documents where id = pg_temp.id_of('v2')), '2:pending',
          'it is V2');
select is((select state from public.strategy_documents where id = pg_temp.id_of('v1')), 'approved',
          'V1 stays the validated reference');

select * from finish();
rollback;
