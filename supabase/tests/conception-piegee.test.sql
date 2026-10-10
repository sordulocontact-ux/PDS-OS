-- Conception, étapes 4 à 13 (…20261010005001), on the acceptance fixture
-- « Piégée » of the ticket (test data only: Dioo, Iyad, Alizée, the three
-- deliverables, the dates and the 2 000 €). Everything rolls back: nothing
-- here is a real call, file, task, notification, assignment or validation.
-- Run with `supabase test db`.
begin;
select plan(38);


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

-- The director, the project manager (owner), Iyad (artistic director),
-- Alizée (responsible of the session's sheet).
insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('iyad', pg_temp.new_user('iyad-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('alizee', pg_temp.new_user('alizee-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('iyad', 'creative_director'), ('alizee', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'iyad', 'alizee');

select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Piégée ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
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

create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated;

-- The validated Stratégie hands over a cover, an acoustic session and a
-- series of five capsules (as postgres: the Stratégie is tested elsewhere).
with x as (
  insert into public.levers (organization_id, project_id, label, family, state)
  values (pg_temp.org(), pg_temp.prj(), 'Création', 'creation_content', 'selected') returning id)
insert into ids select 'lever', id from x;
with x as (
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Cover', null),
         (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Session acoustique', null),
         (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Capsules', 5)
  returning id, title)
insert into ids select case title when 'Cover' then 'sd_cover' when 'Capsules' then 'sd_caps'
                                  else 'sd_session' end, id from x;
insert into ids select case d.strategy_deliverable_id
                         when pg_temp.id_of('sd_cover') then 'cover'
                         when pg_temp.id_of('sd_caps') then 'caps' else 'session' end, d.id
  from public.design_deliverables d where d.project_id = pg_temp.prj();
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj()
   and d.key in ('framing', 'launch_strategy');

select pg_temp.act_as(pg_temp.id_of('owner'));
select public.start_design(pg_temp.prj());
reset role;
select ok((select count(*) from public.design_events
            where project_id = pg_temp.prj() and kind = 'conception.started') = 1,
          'starting the Conception is in its history');

-- A simulated creative call: its intentions are proposals -------------------------
with x as (
  insert into public.design_sources (organization_id, project_id, kind, title, body)
  values (pg_temp.org(), pg_temp.prj(), 'import', 'Call créatif simulé',
          'Session live acoustique avec une guitariste dans un lieu naturel et chaleureux, le visage de Dioo peu exposé. Cover sombre, portrait de profil, visage partiellement dans l''ombre. Cinq capsules dans un univers cohérent, cinq cadrages distincts, visage peu visible.')
  returning id)
insert into ids select 'source', id from x;
insert into public.design_intentions (organization_id, project_id, target, design_deliverable_id, topic,
  value, source_type, source_id, source_quote)
values
  (pg_temp.org(), pg_temp.prj(), 'deliverable', pg_temp.id_of('session'), 'story',
   'Session live acoustique avec une guitariste ou un guitariste', 'import', pg_temp.id_of('source'),
   'Session live acoustique avec une guitariste'),
  (pg_temp.org(), pg_temp.prj(), 'deliverable', pg_temp.id_of('session'), 'look',
   'Lieu naturel', 'import', pg_temp.id_of('source'), 'dans un lieu naturel et chaleureux'),
  (pg_temp.org(), pg_temp.prj(), 'deliverable', pg_temp.id_of('session'), 'look',
   'Chaleureux', 'import', pg_temp.id_of('source'), 'dans un lieu naturel et chaleureux'),
  (pg_temp.org(), pg_temp.prj(), 'deliverable', pg_temp.id_of('cover'), 'look',
   'Cover sombre, portrait de profil ou visage partiellement dans l''ombre', 'import',
   pg_temp.id_of('source'), 'Cover sombre, portrait de profil'),
  (pg_temp.org(), pg_temp.prj(), 'unassigned', null, 'musts',
   'Visage de Dioo peu exposé ; cinq cadrages distincts', 'import', pg_temp.id_of('source'),
   'le visage de Dioo peu exposé');

-- Consolidation ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$
  insert into ids select 'merged', public.merge_design_intentions(
    array(select id from public.design_intentions
           where design_deliverable_id = pg_temp.id_of('session') and topic = 'look' order by value),
    'Dans un lieu naturel et chaleureux', 'deliverable', pg_temp.id_of('session'), 'look')
$$, 'two proposals are merged into one');
select is((select count(*)::int from public.design_intentions where merged_into = pg_temp.id_of('merged')), 2,
          'the merged proposals keep their trace');
select lives_ok($$
  select public.split_design_intention(
    (select id from public.design_intentions where target = 'unassigned'),
    jsonb_build_array(
      jsonb_build_object('target', 'deliverable', 'deliverable_id', pg_temp.id_of('session'),
                         'topic', 'musts', 'value', 'Visage de Dioo peu exposé'),
      jsonb_build_object('target', 'deliverable', 'deliverable_id', pg_temp.id_of('caps'),
                         'topic', 'musts', 'value', 'Cinq cadrages distincts, visage peu visible')))
$$, 'a proposal about two deliverables is split');
select is((select count(distinct source_id)::int from public.design_intentions
            where split_from is not null), 1, 'the split parts share one source, never copied');
select throws_ok($$ select public.confirm_design_intentions(pg_temp.prj(), pg_temp.id_of('session')) $$,
                 'P0001', 'proposals_pending', 'nothing is confirmed while proposals wait');
select lives_ok($$ select public.review_design_intention(id, true) from public.design_intentions
                   where status = 'proposed' $$, 'the person accepts the proposals');
reset role;
select pg_temp.act_as(pg_temp.id_of('iyad'));
select throws_ok($$ select public.confirm_design_intentions(pg_temp.prj(), pg_temp.id_of('session')) $$,
                 '42501', null, 'only an authorized person confirms the consolidated intentions');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.confirm_design_intentions(pg_temp.prj(), pg_temp.id_of('session')) $$,
                'the owner confirms the session''s intentions');
select is((select jsonb_array_length(snapshot) from public.design_intent_confirmations
            where design_deliverable_id = pg_temp.id_of('session')), 3,
          'the confirmation keeps a snapshot of what was confirmed');

-- Responsibles ------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('iyad'));
select throws_ok($$ select public.assign_design_responsible(pg_temp.prj(), 'direction', null,
                     pg_temp.id_of('iyad_person')) $$,
                 '42501', null, 'nobody designates themselves');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.assign_design_responsible(pg_temp.prj(), 'direction', null,
                   pg_temp.id_of('iyad_person')) $$, 'the owner designates Iyad artistic director');
select throws_ok($$ select public.assign_design_responsible(pg_temp.prj(), 'direction', null,
                     gen_random_uuid()) $$,
                 '23514', 'person_not_member', 'a responsible is a member of the organization');

-- References: one resource, several deliverables -------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('iyad'));
select lives_ok($$
  with r as (insert into public.design_references (organization_id, project_id, kind, url, note)
             values (pg_temp.org(), pg_temp.prj(), 'link', 'https://example.com/ombre', 'Lumière rasante')
             returning id)
  insert into ids select 'ref', id from r
$$, 'Iyad adds a reference');
select lives_ok($$
  insert into public.design_reference_links (organization_id, project_id, reference_id, target, design_deliverable_id)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('ref'), 'deliverable', pg_temp.id_of('cover')),
         (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('ref'), 'deliverable', pg_temp.id_of('session')),
         (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('ref'), 'deliverable', pg_temp.id_of('caps'))
$$, 'the same reference serves the cover, the session and the capsules');
select throws_ok($$ insert into public.design_references (organization_id, project_id, kind, url)
                    values (pg_temp.org(), pg_temp.prj(), 'link', 'https://example.com/ombre') $$,
                 '23505', null, 'the same link is never stored twice');

-- The artistic direction is submitted, by section ----------------------------------------------
select throws_ok($$ select public.submit_design_direction(pg_temp.prj(),
                     array['direction', pg_temp.id_of('session')::text]) $$,
                 'P0001', 'validator_required', 'no submission without a validator');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_design_validators(pg_temp.prj(), 'direction', null,
                   array[pg_temp.id_of('director_person')]) $$, 'the owner names the validator');
reset role;
select pg_temp.act_as(pg_temp.id_of('iyad'));
select lives_ok($$ insert into ids select 'direction_v1', public.submit_design_direction(pg_temp.prj(),
                   array[pg_temp.id_of('session')::text, pg_temp.id_of('cover')::text]) $$,
                'Iyad submits the sections he chose');
select is((select jsonb_array_length(snapshot -> 0 -> 'references') from public.design_submissions
            where id = pg_temp.id_of('direction_v1')), 1,
          'the version carries its references, written by the database');
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('direction_v1'),
                     pg_temp.id_of('session')::text, 'approved', null) $$,
                 '42501', null, 'the responsible does not validate his own work');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_design_submission(pg_temp.id_of('direction_v1'),
                   pg_temp.id_of('session')::text, 'approved', null) $$, 'the session section is validated');
select is((select status from public.design_submissions where id = pg_temp.id_of('direction_v1')), 'pending',
          'never validated by silence: the cover still waits');
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('direction_v1'),
                     pg_temp.id_of('cover')::text, 'changes_requested', ' ') $$,
                 'P0001', 'reason_required', 'asking for changes needs a comment');
select lives_ok($$ select public.decide_design_submission(pg_temp.id_of('direction_v1'),
                   pg_temp.id_of('cover')::text, 'changes_requested', 'Plus de contraste') $$,
                'changes are asked on the cover');
select is((select status from public.design_submissions where id = pg_temp.id_of('direction_v1')),
          'changes_requested', 'the version closes with its decisions kept separately');

-- Fiches Livrables -------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$
  with s as (insert into public.design_sheets (organization_id, project_id, design_deliverable_id, kind, title)
             values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('session'), 'single', 'Session acoustique'),
                    (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('caps'), 'series', 'Capsules')
             returning id, kind)
  insert into ids select case kind when 'single' then 'sheet' else 'series' end, id from s
$$, 'the owner creates the sheets');
select lives_ok($$
  insert into public.design_sheet_items (organization_id, project_id, sheet_id, number, title)
  select pg_temp.org(), pg_temp.prj(), pg_temp.id_of('series'), n, 'Capsule ' || n
    from generate_series(1, 5) n
$$, 'a series holds five numbered capsules, as many as decided');
select lives_ok($$ select public.assign_design_responsible(pg_temp.prj(), 'sheet', pg_temp.id_of('sheet'),
                   pg_temp.id_of('alizee_person')) $$, 'Alizée is designated on the session''s sheet');
reset role;
select pg_temp.act_as(pg_temp.id_of('alizee'));
select lives_ok($$
  update public.design_sheets
     set duration_min_seconds = 180, duration_max_seconds = 180, ratios = array['16:9', '9:16'],
         subtitles = true, subtitle_ratios = array['16:9', '9:16'], subtitle_mode = 'burned',
         shoot_date = '2026-10-15', post_start = '2026-10-19', post_deadline = '2026-10-23',
         delivery_date = '2026-10-26', budget_cents = 200000
   where id = pg_temp.id_of('sheet')
$$, 'Alizée completes the sheet');
select throws_ok($$ select public.submit_design_sheet(pg_temp.id_of('sheet')) $$,
                 'P0001', 'validator_required', 'the missing validator blocks this submission only');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_design_validators(pg_temp.prj(), 'sheet', pg_temp.id_of('sheet'),
                                    array[pg_temp.id_of('director_person')]);
reset role;
select pg_temp.act_as(pg_temp.id_of('alizee'));
select lives_ok($$ insert into ids select 'sheet_v1', public.submit_design_sheet(pg_temp.id_of('sheet')) $$,
                'Alizée submits the sheet');
update public.design_sheets set notes = 'x' where id = pg_temp.id_of('sheet');
select is((select notes from public.design_sheets where id = pg_temp.id_of('sheet')), null,
          'a sheet waiting for its decision is frozen');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.handoff_design_sheet(pg_temp.id_of('sheet')) $$,
                 'P0001', 'not_validated', 'no handoff before a validated version');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_design_submission(pg_temp.id_of('sheet_v1'), s, 'approved', null)
                     from unnest((select sections from public.design_submissions
                                   where id = pg_temp.id_of('sheet_v1'))) s $$,
                'the validator validates the sheet');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.handoff_design_sheet(pg_temp.id_of('sheet')) $$,
                'the owner hands the validated version to Production');
select is((select (s.snapshot -> 'sheet' ->> 'budget_cents')::int || ' · ' || (s.snapshot -> 'sheet' ->> 'delivery_date')
             from public.design_handoffs h join public.design_submissions s on s.id = h.submission_id
            where h.sheet_id = pg_temp.id_of('sheet')),
          '200000 · 2026-10-26', 'Production reads the validated version, without typing it again');
reset role;
select is((select count(*)::int from public.tasks where project_id = pg_temp.prj()), 0,
          'the handoff created no task');

select * from finish();
rollback;
