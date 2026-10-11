-- Marketing › Suivi & bilan (ticket « Suivi & bilan », docs/ARCHITECTURE.md
-- § 8 duodecies): activations and evidence, reports, provisional approval,
-- reserves, Marketing closing.
-- Fixture « Piégée / Dioo / Alka »: SIMULATION ONLY. Eight activations — one
-- acoustic session declared published, five capsules to verify, one influence
-- campaign to verify, one press push with reserves —, zero verified
-- publication, zero verified coverage, no real statistic. Everything rolls
-- back. Run with `supabase test db`.
begin;
select plan(95);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('outsider', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select n || '_person', person_id from public.accounts a
  join (values ('director'), ('manager'), ('creative'), ('outsider')) as v (n) on a.id = pg_temp.id_of(n);

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null;

-- 1. Activations and evidence -------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.marketing_activations (organization_id, project_id, title, kind, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique Dioo', 'content', 'done');
insert into ids select 'session', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and title = 'Session acoustique Dioo';
insert into public.marketing_activations (organization_id, project_id, title, kind, status)
select pg_temp.id_of('org'), pg_temp.id_of('project'), 'Capsule ' || n, 'content', 'in_progress'
  from generate_series(1, 5) n;
insert into public.marketing_activations (organization_id, project_id, title, kind, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Campagne Influence Alka', 'influence', 'in_progress'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Relations presse Piégée', 'press', 'in_progress');
insert into ids select 'press', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and kind = 'press';
insert into ids select 'capsule1', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and title = 'Capsule 1';

select is((select count(*)::int from public.marketing_activations where project_id = pg_temp.id_of('project')),
          8, 'the owner records the eight activations of the fixture');
select is((select created_by from public.marketing_activations where id = pg_temp.id_of('session')),
          pg_temp.id_of('manager_person'), 'who created an activation is written by the database');

-- The session is declared published (no one checked); capsules wait for a check.
insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, url, reported_by, observed_on)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'publication',
        'Session sur YouTube', 'https://video.example.test/session', 'Équipe Dioo', date '2026-10-01');
insert into ids select 'session_pub', id from public.marketing_evidence where activation_id = pg_temp.id_of('session');
insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, verification)
select pg_temp.id_of('org'), pg_temp.id_of('project'), a.id, 'publication', 'Capsule publiée', 'to_verify'
  from public.marketing_activations a
 where a.project_id = pg_temp.id_of('project') and a.title like 'Capsule %';

select throws_ok($$ update public.marketing_evidence set verification = 'verified'
                     where activation_id = pg_temp.id_of('capsule1') $$,
                 '23514', null, 'a publication without a link is never verified');
select throws_ok($$ insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, metric, availability, value)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'),
                            'statistic', 'Vues YouTube', 'Vues', 'unavailable', 0) $$,
                 '23514', null, 'an unavailable statistic has no value: never a zero');
select lives_ok($$ insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, metric, availability, reported_by)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'),
                           'statistic', 'Vues YouTube', 'Vues', 'unavailable', 'YouTube Studio') $$,
                'an unavailable statistic is recorded as such');
select throws_ok($$ insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, value)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'),
                            'coverage', 'Article', 12) $$,
                 '23514', null, 'only a statistic carries a value');

-- Verification is stamped by the database; a changed link must be checked again.
update public.marketing_evidence set verification = 'verified' where id = pg_temp.id_of('session_pub');
select is((select verified_by from public.marketing_evidence where id = pg_temp.id_of('session_pub')),
          pg_temp.id_of('manager_person'), 'who verified is written by the database');
update public.marketing_evidence set url = 'https://video.example.test/session-v2' where id = pg_temp.id_of('session_pub');
select is((select row(verification, verified_by is null)::text from public.marketing_evidence
            where id = pg_temp.id_of('session_pub')),
          '(to_verify,t)', 'a verified link that changes goes back to « to verify »');
update public.marketing_evidence set verification = 'declared' where id = pg_temp.id_of('session_pub');

-- A link that became unreachable: flagged, the evidence is kept.
update public.marketing_evidence set link_unreachable_at = now() where id = pg_temp.id_of('session_pub');
select is((select link_reported_by from public.marketing_evidence where id = pg_temp.id_of('session_pub')),
          pg_temp.id_of('manager_person'), 'an unreachable link is flagged by a person, the evidence stays');
select throws_ok($$ update public.marketing_evidence set verified_by = pg_temp.id_of('creative_person')
                     where id = pg_temp.id_of('session_pub') $$,
                 '42501', null, 'who verified is never written by the client');

-- Contributors: the owner and the project's creative directors; not an outsider.
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, reported_by)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'),
                           'coverage', 'Chronique radio', 'Agence RP') $$,
                'a creative director of the project adds a declared coverage');
select pg_temp.act_as(pg_temp.id_of('outsider'));
select is((select count(*)::int from public.marketing_activations where project_id = pg_temp.id_of('project')),
          0, 'a manager outside the project sees no activation');
select throws_ok($$ insert into public.marketing_activations (organization_id, project_id, title)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Intrus') $$,
                 '42501', null, 'nor writes one');
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.marketing_activations where project_id = pg_temp.id_of('project')),
          8, 'the director reads every activation');
update public.marketing_activations set status = 'cancelled' where id = pg_temp.id_of('session');
select is((select status from public.marketing_activations where id = pg_temp.id_of('session')),
          'done', 'the director reads, the owner writes');

-- Logical deletion keeps the row; the audit says who, when, before, after.
select pg_temp.act_as(pg_temp.id_of('manager'));
update public.marketing_activations set archived_at = now() where id = pg_temp.id_of('capsule1');
select is((select archived_by from public.marketing_activations where id = pg_temp.id_of('capsule1')),
          pg_temp.id_of('manager_person'), 'an activation is archived, never deleted');
update public.marketing_activations set archived_at = null where id = pg_temp.id_of('capsule1');
select throws_ok($$ delete from public.marketing_activations where id = pg_temp.id_of('capsule1') $$,
                 '42501', null, 'no one deletes an activation');
select is((select count(*)::int from public.marketing_events
            where subject_id = pg_temp.id_of('capsule1') and kind in ('activation.archived', 'activation.restored')),
          2, 'archiving and restoring are in the audit');
select is((select old_value ->> 'url' from public.marketing_events
            where subject_id = pg_temp.id_of('session_pub') and old_value ? 'url'
            order by created_at limit 1),
          'https://video.example.test/session', 'the audit keeps the old value');
select throws_ok($$ insert into public.marketing_events (organization_id, project_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'forged') $$,
                 '42501', null, 'the audit is written by triggers only');

-- 2. Reports: a frozen, versioned photograph ----------------------------------
reset role;
insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Tournage session', 150000, 'committed');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'report1', public.generate_marketing_report(
  pg_temp.id_of('project'),
  (select array_agg(id) from public.marketing_activations where project_id = pg_temp.id_of('project')),
  null, null, array['summary', 'activations', 'results', 'statistics', 'budget', 'reserves'],
  'Bilan provisoire de la sortie (simulation).', null,
  '[{"category": "links", "description": "Vérifier les liens de publication"},
    {"category": "statistics", "description": "Récupérer les statistiques"},
    {"category": "coverage", "description": "Vérifier les retombées RP"}]'::jsonb, 1);
select is((select row(version, state, jsonb_array_length(snapshot -> 'activations'))::text
             from public.marketing_reports where id = pg_temp.id_of('report1')),
          '(1,generated,8)', 'a report is generated as version 1 with its eight activations');
select is((select content_hash = encode(extensions.digest(convert_to(snapshot::text, 'UTF8'), 'sha256'), 'hex')
             from public.marketing_reports where id = pg_temp.id_of('report1')),
          true, 'the fingerprint is the SHA-256 of the stored snapshot');
select is((select count(*)::int from public.marketing_reserves
            where origin_report_id = pg_temp.id_of('report1')),
          3, 'the three reserves proposed in the preparation are created with the report');
select is((select jsonb_array_length(snapshot -> 'reserves') from public.marketing_reports
            where id = pg_temp.id_of('report1')),
          3, 'and frozen in its snapshot');
select is((select committed_cents from public.marketing_report_budgets where report_id = pg_temp.id_of('report1')),
          150000::bigint, 'the owner reads the budget of the version');
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.marketing_report_budgets where report_id = pg_temp.id_of('report1')),
          0, 'the budget keeps its own permissions: not for a creative director');
select pg_temp.act_as(pg_temp.id_of('outsider'));
select throws_ok($$ select public.generate_marketing_report(pg_temp.id_of('project'), array[pg_temp.id_of('session')],
                      null, null, array['summary'], null, null, '[]'::jsonb, 1) $$,
                 '42501', null, 'an outsider prepares no report');

-- New data updates the dashboard, never a generated report.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, metric, availability, value, reported_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'),
        'statistic', 'Écoutes', 'Écoutes', 'available', 1200, 'Plateforme');
update public.marketing_activations set archived_at = now() where id = pg_temp.id_of('capsule1');
select is((select row(jsonb_array_length(snapshot -> 'evidence'),
                      (select count(*) from jsonb_array_elements(snapshot -> 'activations') a
                        where a ->> 'id' = pg_temp.id_of('capsule1')::text))::text
             from public.marketing_reports where id = pg_temp.id_of('report1')),
          '(8,1)', 'a later statistic or an archived activation leave the report as it was');
select throws_ok($$ select public.generate_marketing_report(pg_temp.id_of('project'), array[pg_temp.id_of('capsule1')],
                      null, null, array['summary'], null, null, '[]'::jsonb, 1) $$,
                 '23514', 'invalid_scope', 'an archived activation is not in a new scope');
update public.marketing_activations set archived_at = null where id = pg_temp.id_of('capsule1');
reset role;
select throws_ok($$ update public.marketing_reports set snapshot = '{}'::jsonb where id = pg_temp.id_of('report1') $$,
                 '42501', 'report_frozen', 'a report is never rewritten, even by the database owner');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ update public.marketing_reports set state = 'approved_provisional' where id = pg_temp.id_of('report1') $$,
                 '42501', null, 'nor moved by a client');

-- A new version supersedes the one still waiting.
insert into ids select 'report2', public.generate_marketing_report(
  pg_temp.id_of('project'),
  (select array_agg(id) from public.marketing_activations where project_id = pg_temp.id_of('project')),
  null, null, array['summary', 'results'], null, null, '[]'::jsonb, 1);
select is((select string_agg(version || ':' || state, ',' order by version) from public.marketing_reports
            where project_id = pg_temp.id_of('project')),
          '1:superseded,2:generated', 'version 2 is numbered by the database and supersedes version 1');
select is((select jsonb_array_length(snapshot -> 'evidence') from public.marketing_reports
            where id = pg_temp.id_of('report2')),
          9, 'the new version carries the new statistic');

-- 3. Provisional approval of one precise version -------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.submit_marketing_report(pg_temp.id_of('report2')) $$,
                 '42501', null, 'only the owner submits a version');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_marketing_report(pg_temp.id_of('report1')) $$,
                 'P0001', 'report_superseded', 'an older version is never submitted');
select lives_ok($$ select public.submit_marketing_report(pg_temp.id_of('report2')) $$,
                'the owner submits version 2');
select throws_ok($$ select public.decide_marketing_report(pg_temp.id_of('report2'), 2, 'approved_provisional', null) $$,
                 '42501', null, 'the owner does not validate');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_marketing_report(pg_temp.id_of('report1'), 1, 'approved_provisional', null) $$,
                 'P0001', 'report_superseded', 'a decision on an older version is refused');
select throws_ok($$ select public.decide_marketing_report(pg_temp.id_of('report2'), 1, 'approved_provisional', null) $$,
                 'P0001', 'report_superseded', 'the decision names the version that was read');
select throws_ok($$ select public.decide_marketing_report(pg_temp.id_of('report2'), 2, 'postponed', '  ') $$,
                 '23514', 'comment_required', 'postponing says why');
insert into vars select 'verified_before', count(*)::text from public.marketing_evidence
 where project_id = pg_temp.id_of('project') and verification = 'verified';
select lives_ok($$ select public.decide_marketing_report(pg_temp.id_of('report2'), 2, 'approved_provisional', null) $$,
                'the director approves the provisional review with its reserves');
select is((select row(r.state, a.validator_person_id = pg_temp.id_of('director_person'),
                      jsonb_array_length(a.reserves))::text
             from public.marketing_reports r join public.marketing_report_approvals a on a.report_id = r.id
            where r.id = pg_temp.id_of('report2')),
          '(approved_provisional,t,3)', 'the decision targets version 2 and stores its three reserves');
select is((select count(*)::text from public.marketing_evidence
            where project_id = pg_temp.id_of('project') and verification = 'verified'),
          (select v from vars where k = 'verified_before'),
          'approving verifies nothing: the declared / verified levels are unchanged');
select is((select count(*)::int from public.marketing_reserves
            where project_id = pg_temp.id_of('project') and status = 'open'),
          3, 'nor lifts a reserve');
select is((select row(count(*), max(actor::text) = pg_temp.id_of('director_person')::text,
                      max(new_value ->> 'version'))::text from public.marketing_events
            where subject_id = pg_temp.id_of('report2') and kind = 'approval.approved_provisional'),
          '(1,t,2)', 'the decision is in the audit: who, which version');

-- New data after the approval: the dashboard moves, the approved report not.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'hash2', content_hash from public.marketing_reports where id = pg_temp.id_of('report2');
insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, url, reported_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'),
        'coverage', 'Article en ligne', 'https://media.example.test/article', 'Agence RP');
select is((select row(content_hash = (select v from vars where k = 'hash2'),
                      jsonb_array_length(snapshot -> 'evidence'))::text
             from public.marketing_reports where id = pg_temp.id_of('report2')),
          '(t,9)', 'a coverage added after the approval leaves the approved report identical');
insert into ids select 'report3', public.generate_marketing_report(
  pg_temp.id_of('project'),
  (select array_agg(id) from public.marketing_activations where project_id = pg_temp.id_of('project')),
  null, null, array['summary', 'results', 'reserves'], null, null, '[]'::jsonb, 1);
select is((select string_agg(version || ':' || state, ',' order by version) from public.marketing_reports
            where project_id = pg_temp.id_of('project')),
          '1:superseded,2:approved_provisional,3:generated',
          'a new version is not approved; the approved one stays approved');

-- Separation of roles: whoever prepared a version never decides on it.
reset role;
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('director_person'));
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'report4', public.generate_marketing_report(
  pg_temp.id_of('project'), array[pg_temp.id_of('session')],
  null, null, array['summary'], null, null, '[]'::jsonb, 1);
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.submit_marketing_report(pg_temp.id_of('report4'));
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_marketing_report(pg_temp.id_of('report4'), 4, 'approved_provisional', null) $$,
                 '42501', 'self_approval', 'the director prepared version 4: someone else decides');
reset role;
delete from public.project_creatives
 where project_id = pg_temp.id_of('project') and person_id = pg_temp.id_of('director_person');

-- 4. Arbitration of each reserve before the closing ------------------------------
insert into ids select 'r_links', id from public.marketing_reserves
 where project_id = pg_temp.id_of('project') and category = 'links';
insert into ids select 'r_stats', id from public.marketing_reserves
 where project_id = pg_temp.id_of('project') and category = 'statistics';
insert into ids select 'r_press', id from public.marketing_reserves
 where project_id = pg_temp.id_of('project') and category = 'coverage';
select is((select count(*)::int from public.tasks where project_id = pg_temp.id_of('project')),
          0, 'no task exists before anyone asks for one');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_links'), 'blocking', null, null, null, null, null) $$,
                 '42501', null, 'a creative director does not arbitrate');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_links'), 'follow_up', null,
                      pg_temp.id_of('creative_person'), date '2026-11-15', '  ', null) $$,
                 '23514', 'follow_up_incomplete', 'a follow-up names who, by when and the channel');
select lives_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_links'), 'follow_up', null,
                     pg_temp.id_of('creative_person'), date '2026-11-15', 'Point hebdo Marketing', null) $$,
                'the owner puts the links to verify under follow-up after the closing');
select is((select row(status, decision, arbitrated_by = pg_temp.id_of('manager_person'))::text
             from public.marketing_reserves where id = pg_temp.id_of('r_links')),
          '(arbitrated,follow_up,t)', 'arbitrated, who and when written by the database');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_stats'), 'accepted_limit', 'Pas de données plateforme', null, null, null, null) $$,
                 '42501', 'limit_needs_direction', 'only the direction accepts a definitive limit');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_press'), 'not_applicable', null, null, null, null, null) $$,
                 '23514', 'reason_required', '« non applicable » says why');
select lives_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_press'), 'blocking', null, null, null, null, null) $$,
                'the RP coverage must be verified before the closing');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_stats'), 'accepted_limit', ' ', null, null, null, null) $$,
                 '23514', 'reason_required', 'a definitive limit says why');
select lives_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_stats'), 'accepted_limit',
                     'Aucune statistique réelle disponible pour la simulation', null, null, null, null) $$,
                'the director accepts the missing statistics as a definitive limit');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_press'), 'not_applicable', 'x', null, null, null, null) $$,
                 '42501', null, 'the director accepts limits, the owner arbitrates the rest');

-- A duplicate is attached to the reserve kept, without losing its history.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.marketing_reserves (organization_id, project_id, category, description)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'links', 'Liens à vérifier (doublon)');
insert into ids select 'r_dup', id from public.marketing_reserves
 where project_id = pg_temp.id_of('project') and description = 'Liens à vérifier (doublon)';
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_dup'), 'duplicate', null, null, null, null, pg_temp.id_of('r_dup')) $$,
                 '23514', 'invalid_duplicate', 'a reserve is not its own duplicate');
select public.arbitrate_marketing_reserve(pg_temp.id_of('r_dup'), 'duplicate', null, null, null, null, pg_temp.id_of('r_links'));
select is((select row(status, duplicate_of = pg_temp.id_of('r_links'))::text from public.marketing_reserves
            where id = pg_temp.id_of('r_dup')),
          '(closed,t)', 'the duplicate is closed and points to the reserve kept; it stays in the history');

-- The person following a reserve updates its follow-up, never its decision.
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.note_marketing_reserve(pg_temp.id_of('r_links'), '3 liens sur 6 vérifiés') $$,
                'the person following the links notes where it stands');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_links'), 'blocking', null, null, null, null, null) $$,
                 '42501', null, 'and never changes the decision');

-- A task only when the owner asks for one.
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.create_reserve_task(pg_temp.id_of('r_links')) $$,
                'the owner creates the follow-up task in Travail, on purpose');
select is((select row(t.assignee_person_id = pg_temp.id_of('creative_person'), t.due_date)::text
             from public.tasks t join public.marketing_reserves r on r.task_id = t.id
            where r.id = pg_temp.id_of('r_links')),
          '(t,2026-11-15)', 'the task takes who and when from the follow-up');
select throws_ok($$ select public.create_reserve_task(pg_temp.id_of('r_links')) $$,
                 'P0001', 'task_already_created', 'once');

-- Lifting a blocking reserve; a lifted reserve is not arbitrated again.
select lives_ok($$ select public.lift_marketing_reserve(pg_temp.id_of('r_press'), 'Retombées vérifiées (simulation)') $$,
                'the owner lifts the blocking reserve');
select is((select row(status, lifted_by = pg_temp.id_of('manager_person'))::text from public.marketing_reserves
            where id = pg_temp.id_of('r_press')),
          '(lifted,t)', 'who lifted it is written by the database');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_press'), 'blocking', null, null, null, null, null) $$,
                 'P0001', 'invalid_transition', 'a lifted reserve stays lifted');
select is((select count(*)::int from public.marketing_events
            where project_id = pg_temp.id_of('project') and kind = 'reserve.arbitrated'),
          4, 'each arbitration is in the audit');

-- 5. The Marketing closing, apart from the project's ---------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report3'), null) $$,
                 'P0001', 'report_not_reference', 'the closing rests on the approved provisional review');
insert into public.marketing_reserves (organization_id, project_id, category, description)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'payments', 'Facture agence RP à recevoir');
insert into ids select 'r_pay', id from public.marketing_reserves
 where project_id = pg_temp.id_of('project') and category = 'payments';
select throws_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'), null) $$,
                 'P0001', 'reserves_unarbitrated', 'a closing with a reserve not arbitrated is refused');
select public.arbitrate_marketing_reserve(pg_temp.id_of('r_pay'), 'blocking', null, null, null, null, null);
select throws_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'), null) $$,
                 'P0001', 'reserves_blocking', 'and with a reserve to lift before the closing');
select public.arbitrate_marketing_reserve(pg_temp.id_of('r_pay'), 'follow_up', null,
         pg_temp.id_of('manager_person'), date '2026-11-30', 'Suivi administratif', null);
insert into ids select 'closure', public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'),
                                                                   'Bilan provisoire approuvé, suivis organisés.');
select throws_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'), null) $$,
                 'P0001', 'closure_pending', 'one closing asked at a time');
select throws_ok($$ select public.decide_marketing_closure(pg_temp.id_of('closure'), 'closed_with_reserves', null) $$,
                 '42501', null, 'the owner does not close the Marketing');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_marketing_closure(pg_temp.id_of('closure'), 'closed_clean', null) $$,
                 'P0001', 'reserves_remaining', '« sans réserve » is refused while follow-ups or limits remain');
select throws_ok($$ select public.decide_marketing_closure(pg_temp.id_of('closure'), 'postponed', null) $$,
                 '23514', 'comment_required', 'postponing says why');
select lives_ok($$ select public.decide_marketing_closure(pg_temp.id_of('closure'), 'closed_with_reserves', null) $$,
                'the director closes the Marketing with reserves');
select is((select row(c.state, r.state, jsonb_array_length(c.reserves))::text
             from public.marketing_closures c join public.marketing_reports r on r.id = c.report_id
            where c.id = pg_temp.id_of('closure')),
          '(closed_with_reserves,finalized,5)', 'the reference report is finalized, the reserves stored with the decision');
select is((select s.state from public.project_stages s join public.stage_definitions d on d.id = s.stage_definition_id
            where s.project_id = pg_temp.id_of('project') and d.key = 'review'),
          'not_started', 'the closing of the Marketing never closes the project');

-- Lecture contrôlée after the closing; the follow-ups go on.
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ insert into public.marketing_activations (organization_id, project_id, title)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Nouvelle activation') $$,
                 '42501', 'marketing_closed', 'no new activation once closed');
select throws_ok($$ select public.arbitrate_marketing_reserve(pg_temp.id_of('r_pay'), 'blocking', null, null, null, null, null) $$,
                 '42501', 'marketing_closed', 'the arbitrations are frozen');
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.lift_marketing_reserve(pg_temp.id_of('r_links'), 'Les six liens sont vérifiés (simulation)') $$,
                'a follow-up after the closing is lifted by the person following it');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'hash2b', content_hash from public.marketing_reports where id = pg_temp.id_of('report2');
select lives_ok($$ insert into public.marketing_evidence (organization_id, project_id, activation_id, kind, label, url, verification)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'),
                           'publication', 'Session sur une plateforme', 'https://video.example.test/v3', 'verified') $$,
                'complementary evidence is still accepted');
select is((select content_hash from public.marketing_reports where id = pg_temp.id_of('report2')),
          (select v from vars where k = 'hash2b'), 'and the closed report stays identical');
select throws_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'), null) $$,
                 'P0001', 'already_closed', 'no second closing: consult it or reopen it');

-- Reopening: the direction, with a reason, audited.
select throws_ok($$ select public.reopen_marketing_closure(pg_temp.id_of('closure'), 'Une campagne reprend') $$,
                 '42501', null, 'the owner does not reopen');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.reopen_marketing_closure(pg_temp.id_of('closure'), ' ') $$,
                 '23514', 'reason_required', 'reopening says why');
select lives_ok($$ select public.reopen_marketing_closure(pg_temp.id_of('closure'), 'Une campagne reprend en décembre (simulation)') $$,
                'the director reopens the Marketing');
select is((select row(count(*) filter (where kind = 'closure.closed_with_reserves'),
                      count(*) filter (where kind = 'closure.reopened' and reason is not null))::text
             from public.marketing_events where subject_id = pg_temp.id_of('closure')),
          '(1,1)', 'the decision and the reopening are in the audit, with their reason');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ insert into public.marketing_activations (organization_id, project_id, title)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Campagne de décembre') $$,
                'once reopened, the Marketing is written again');

-- 6. Recette Piégée / Dioo / Alka (simulation) -----------------------------------
select is((select count(*)::int from public.marketing_reports r, jsonb_array_elements(r.snapshot -> 'evidence') e
            where r.id = pg_temp.id_of('report2') and e ->> 'kind' in ('publication', 'coverage') and e ->> 'verification' = 'verified'),
          0, 'the approved review holds zero verified publication and zero verified coverage');
select is((select count(*)::int from public.marketing_reports r, jsonb_array_elements(r.snapshot -> 'evidence') e
            where r.id = pg_temp.id_of('report2') and e ->> 'kind' = 'statistic' and e ->> 'availability' = 'unavailable'
              and e -> 'value' = 'null'::jsonb),
          1, 'its unavailable statistic is frozen without a value, never a zero');
select lives_ok($$ select public.request_marketing_closure(pg_temp.id_of('project'), pg_temp.id_of('report2'), 'Nouvelle demande après réouverture') $$,
                'after a reopening, the closing can be asked again on the finalized reference');
select is((select count(*)::int from public.marketing_closures where project_id = pg_temp.id_of('project')),
          2, 'the reopened closing stays in the history beside the new request');

select * from finish();
rollback;
