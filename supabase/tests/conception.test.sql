-- Conception, étape 1 (…20261010000901): « Commencer directement », the
-- deliverables of the Conception (mirrored from the Stratégie, or added late
-- « à qualifier »), creative calls, sources, intentions and references.
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
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
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

-- A launched project (director creates and transmits, owner accepts).
select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'CO ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
-- The framing opens on a call report; set the stages straight (as postgres).
with c as (
  insert into public.calls (organization_id, project_id, title, consent)
  select organization_id, id, 'Call', 'granted' from public.projects
   where id = (select id from ids where name = 'project')
  returning id, organization_id),
t as (
  insert into public.transcripts (organization_id, call_id, text, provider, model)
  select organization_id, id, 'Transcription', 'test', 'test' from c
  returning id, organization_id, call_id)
insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
reset role;
insert into ids select 'design', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'design';
insert into public.project_creatives (organization_id, project_id, person_id)
select organization_id, id, (select id from ids where name = 'creative_person')
  from public.projects where id = (select id from ids where name = 'project');

create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated;

-- A retained lever and a committed deliverable (as postgres: the Stratégie
-- itself is tested elsewhere).
with x as (
  insert into public.levers (organization_id, project_id, label, family, state)
  values (pg_temp.org(), pg_temp.prj(), 'Clip', 'creation_content', 'selected') returning id)
insert into ids select 'lever', id from x;
with x as (
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Clip officiel') returning id)
insert into ids select 'committed', id from x;

-- Mirror ----------------------------------------------------------------------
select is((select origin || ' · ' || status from public.design_deliverables
            where strategy_deliverable_id = pg_temp.id_of('committed')),
          'strategy · confirmed', 'a committed deliverable has its confirmed line in the Conception');
insert into ids select 'dd', id from public.design_deliverables
 where strategy_deliverable_id = pg_temp.id_of('committed');

-- Before the Stratégie is validated --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.start_design(pg_temp.prj()) $$,
                 'P0001', 'previous_stage_not_validated', 'the Conception waits for the Stratégie');
select throws_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin)
                    values (pg_temp.org(), pg_temp.prj(), 'Teaser', 'manual') $$,
                 '42501', null, 'no addition before the Stratégie is validated');
reset role;
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj()
   and d.key in ('framing', 'launch_strategy');

-- Additions, before the work starts --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin, note)
                   values (pg_temp.org(), pg_temp.prj(), 'Teaser vertical', 'manual', 'Demande du label') $$,
                'the owner adds a late need');
select is((select status from public.design_deliverables where title = 'Teaser vertical'), 'to_qualify',
          'an addition is to qualify, never confirmed on its own');
select throws_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin)
                    values (pg_temp.org(), pg_temp.prj(), 'X', 'call') $$,
                 '23514', null, 'a decision of call names its call');
select lives_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin, lever_id)
                   values (pg_temp.org(), pg_temp.prj(), 'Making-of', 'strategy_decision', pg_temp.id_of('lever')) $$,
                'a decision of Stratégie names a retained lever');
select throws_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin)
                    values (pg_temp.org(), pg_temp.prj(), 'X', 'strategy') $$,
                 '42501', null, 'nobody adds a « committed » line by hand');
select throws_ok($$ update public.design_deliverables set status = 'confirmed'
                    where title = 'Teaser vertical' $$,
                 '42501', null, 'nobody confirms an addition by hand');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin)
                    values (pg_temp.org(), pg_temp.prj(), 'Y', 'manual') $$,
                 '42501', null, 'only the owner adds a deliverable');
select throws_ok($$ select public.save_design_intention(pg_temp.prj(), null, 'story', 'Une histoire') $$,
                 '42501', null, 'nothing is written before the Conception starts');
reset role;

-- Creative calls ------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$
  insert into ids select 'call', public.create_design_call(pg_temp.prj(), 'Échange créatif',
    now() + interval '1 day', 'https://meet.example/c', '[{"topic":"Clip","minutes":8}]'::jsonb,
    'Poser les intentions du clip', '[{"name":"Ana"}]'::jsonb, 'video', array[pg_temp.id_of('dd')])
$$, 'the owner prepares a creative call about a deliverable');
select is((select cardinality(deliverable_ids) from public.design_calls where call_id = pg_temp.id_of('call')), 1,
          'the call keeps the deliverables it is about');
select throws_ok($$ select public.create_design_call(pg_temp.prj(), 'X', now(), '', '[]'::jsonb,
                   'Objectif', '[{"name":"Ana"}]'::jsonb, 'video', array[gen_random_uuid()]) $$,
                 '23514', 'deliverable_not_in_project', 'a call names deliverables of its project only');

-- Starting --------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.start_design(pg_temp.prj()) $$,
                 '42501', null, 'another project manager cannot start it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.start_design(pg_temp.prj()) $$, 'the owner starts directly');
select lives_ok($$ select public.start_design(pg_temp.prj()) $$, 'starting twice is harmless');
select is((select state from public.project_stages where id = pg_temp.id_of('design')), 'in_progress',
          'starting directly starts the stage');

-- Intentions --------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.save_design_intention(pg_temp.prj(), pg_temp.id_of('dd'), 'story',
                   'Une nuit en ville') $$, 'the creative team writes an intention');
select lives_ok($$ select public.save_design_intention(pg_temp.prj(), pg_temp.id_of('dd'), 'story',
                   'Une nuit au bord de la mer') $$, 'answering again replaces the answer');
select is((select string_agg(status, ',' order by created_at) from public.design_intentions
            where design_deliverable_id = pg_temp.id_of('dd') and topic = 'story'),
          'replaced,confirmed', 'one confirmed answer per topic, the previous one kept');
select lives_ok($$ select public.save_design_intention(pg_temp.prj(), pg_temp.id_of('dd'), 'look',
                   'L''image est sombre et contrastée.', '{"choices": ["dark"], "other": null}'::jsonb) $$,
                'an answer is saved with the choices checked to write it');
select is((select choices from public.design_intentions
            where design_deliverable_id = pg_temp.id_of('dd') and topic = 'look' and status = 'confirmed'),
          '{"choices": ["dark"], "other": null}'::jsonb,
          'the choices are kept with the answer');
select throws_ok($$ select public.save_design_intention(pg_temp.prj(), pg_temp.id_of('dd'), 'tone',
                   'Intime', '["intimate"]'::jsonb) $$,
                 '23514', null, 'choices keep their shape');

-- A source feeding two targets with one passage, and one PO could not place.
with x as (
  insert into public.design_sources (organization_id, project_id, kind, title, body)
  values (pg_temp.org(), pg_temp.prj(), 'import', 'Brief agence', 'Couleurs froides partout, bleu nuit.')
  returning id)
insert into ids select 'source', id from x;
select lives_ok($$
  insert into public.design_intentions (organization_id, project_id, target, design_deliverable_id, topic,
    value, source_type, source_id, source_quote)
  values (pg_temp.org(), pg_temp.prj(), 'deliverable', pg_temp.id_of('dd'), 'look', 'Couleurs froides',
          'import', pg_temp.id_of('source'), 'Couleurs froides partout'),
         (pg_temp.org(), pg_temp.prj(), 'direction', null, 'look', 'Couleurs froides',
          'import', pg_temp.id_of('source'), 'Couleurs froides partout'),
         (pg_temp.org(), pg_temp.prj(), 'unassigned', null, 'tone', 'Bleu nuit',
          'import', pg_temp.id_of('source'), 'bleu nuit')
$$, 'one passage of a source feeds several targets');
select throws_ok($$
  insert into public.design_intentions (organization_id, project_id, target, topic, value)
  values (pg_temp.org(), pg_temp.prj(), 'direction', 'tone', 'Sombre') $$,
  '42501', null, 'a hand-written answer goes through save_design_intention');
select throws_ok($$ select public.review_design_intention(
                     (select id from public.design_intentions where target = 'unassigned'), true) $$,
                 'P0001', 'target_required', 'a proposal PO could not place needs a target');
select lives_ok($$ select public.review_design_intention(
                     (select id from public.design_intentions where target = 'unassigned'), true,
                     'deliverable', pg_temp.id_of('dd')) $$,
                'a person attaches and confirms it');

-- References ----------------------------------------------------------------------------
select lives_ok($$ insert into public.design_references (organization_id, project_id, url)
                   values (pg_temp.org(), pg_temp.prj(), 'https://example.com/ref') $$,
                'a reference is added while working');
select throws_ok($$ insert into public.design_references (organization_id, project_id, url)
                    values (pg_temp.org(), pg_temp.prj(), 'http://example.com') $$,
                 '23514', null, 'a reference is an https link');

select * from finish();
rollback;
