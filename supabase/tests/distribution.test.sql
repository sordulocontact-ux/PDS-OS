-- Distribution (ticket « Distribution », docs/ARCHITECTURE.md § 8 octies):
-- lot 2, the dossier's parameters and history
-- (supabase/migrations/20261011100101_distribution_dossier.sql); lot 3, the
-- checks, the validator and the versions (20261011100201_distribution_validation.sql);
-- lot 4, the declared deposit and answers (20261011100301_distribution_tracking.sql);
-- lot 5, the platforms (20261011100401_distribution_platforms.sql); lot 6,
-- anomalies and new versions (20261011100501_distribution_anomalies.sql); lot 7,
-- the closure (20261011100601_distribution_closure.sql).
-- Fixture « Piégée » (simulation): Dioo, PDS Records, sortie 27/11/2026.
-- Nothing is sent to The Orchard: these tables only keep what people say.
-- Run with `supabase test db`.
begin;
select plan(110);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('other', 'project_manager'),
               ('director', 'general_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'other_person', person_id from public.accounts where id = pg_temp.id_of('other');
insert into ids select 'director_person', person_id from public.accounts where id = pg_temp.id_of('director');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), 'Autre ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('other_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into ids select 'other_project', id from public.projects
 where title = 'Autre ' || (select v from vars where k = 'tag');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), p.id, d.id
  from public.stage_definitions d
 cross join (values (pg_temp.id_of('project')), (pg_temp.id_of('other_project'))) as p (id)
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = p.id and s.stage_definition_id = d.id);
-- A Fiche Livrable « Pochette » in each project.
insert into public.design_deliverables (organization_id, project_id, origin, title, note)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'manual', 'Pochette', 'Pochette du single'),
       (pg_temp.id_of('org'), pg_temp.id_of('other_project'), 'manual', 'Pochette', 'Pochette du single');
insert into public.design_sheets (organization_id, project_id, design_deliverable_id, title)
select organization_id, project_id, id, 'Pochette' from public.design_deliverables
 where project_id in (pg_temp.id_of('project'), pg_temp.id_of('other_project'));
insert into ids select 'cover', id from public.design_sheets where project_id = pg_temp.id_of('project');
insert into ids select 'other_cover', id from public.design_sheets where project_id = pg_temp.id_of('other_project');

-- 1. Who writes the parameters ----------------------------------------------
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ insert into public.distribution_dossiers (organization_id, project_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project')) $$,
                 '42501', null, 'another project manager does not write the dossier');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ insert into public.distribution_dossiers (organization_id, project_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project')) $$,
                 '42501', null, 'the director reads, the owner writes');

select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ insert into public.distribution_dossiers
                     (organization_id, project_id, territory_mode, preorder, prelisten, price_tier)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'world', false, false, 'to_confirm') $$,
                'the owner saves the Piégée parameters: world, no pre-order, no pre-listening, tier to confirm');
select is((select created_by from public.distribution_dossiers where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('manager_person'), 'who created it is written by the database');

-- 2. The parameters' rules --------------------------------------------------
select throws_ok($$ update public.distribution_dossiers set territory_mode = 'include'
                    where project_id = pg_temp.id_of('project') $$,
                 '23514', null, 'only some countries means at least one country');
select lives_ok($$ update public.distribution_dossiers set territory_mode = 'exclude', territories = array['KP']
                   where project_id = pg_temp.id_of('project') $$,
                'world except some countries');
select throws_ok($$ update public.distribution_dossiers set territories = array['fr']
                    where project_id = pg_temp.id_of('project') $$,
                 '23514', null, 'countries are ISO codes');
select throws_ok($$ update public.distribution_dossiers set preorder_on = date '2026-11-01'
                    where project_id = pg_temp.id_of('project') $$,
                 '23514', null, 'a pre-order date only with a pre-order');
select throws_ok($$ update public.distribution_dossiers set price_tier = 'premium'
                    where project_id = pg_temp.id_of('project') $$,
                 '23514', null, 'a known price tier');
select throws_ok($$ update public.distribution_dossiers set created_by = pg_temp.id_of('other_person')
                    where project_id = pg_temp.id_of('project') $$,
                 '42501', null, 'the author is not writable');

-- 3. The cover is a reference to this project's Conception -------------------
select throws_ok($$ update public.distribution_dossiers set cover_sheet_id = pg_temp.id_of('other_cover')
                    where project_id = pg_temp.id_of('project') $$,
                 '23514', 'cover_not_in_project', 'never the cover of another project');
select lives_ok($$ update public.distribution_dossiers set cover_sheet_id = pg_temp.id_of('cover')
                   where project_id = pg_temp.id_of('project') $$,
                'the cover is this project''s Fiche Livrable');

-- 4. History, written by triggers only --------------------------------------
select is((select count(*)::int from public.distribution_events
            where project_id = pg_temp.id_of('project') and kind = 'dossier.parameters_saved'),
          3, 'each save with a change is in the history, with who did it');
select throws_ok($$ insert into public.distribution_events (organization_id, project_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'dossier.parameters_saved') $$,
                 '42501', null, 'nobody writes the history by hand');

-- 5. The validator: a holder of validate, never the owner (lot 3) -------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'no_validator', 'no validation can be asked without a designated validator');
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('project'), pg_temp.id_of('manager_person')) $$,
                 'P0001', 'validator_invalid', 'the owner never validates his own dossier');
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('project'), pg_temp.id_of('other_person')) $$,
                 'P0001', 'validator_invalid', 'a validator holds the right to validate');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('project'), pg_temp.id_of('director_person')) $$,
                 '42501', null, 'only the owner designates the validator');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.set_distribution_validator(pg_temp.id_of('project'), pg_temp.id_of('director_person')) $$,
                'the owner designates the director');

-- 6. The six checks, stamped by the database ---------------------------------
select lives_ok($$ select public.record_distribution_check(pg_temp.id_of('project'), 'audio', 'compliant', null) $$,
                'the owner records « Audio : conforme »');
select is((select checked_by from public.distribution_checks
            where project_id = pg_temp.id_of('project') and check_key = 'audio'),
          pg_temp.id_of('manager_person'), 'who checked is written by the database');
select throws_ok($$ select public.record_distribution_check(pg_temp.id_of('project'), 'visual', 'non_compliant', '  ') $$,
                 '23514', null, '« non conforme » says why');
select throws_ok($$ select public.record_distribution_check(pg_temp.id_of('project'), 'mastering', 'compliant', null) $$,
                 '23514', null, 'only the six checks exist');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.record_distribution_check(pg_temp.id_of('project'), 'rights', 'compliant', null) $$,
                 '42501', null, 'another manager records nothing');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.record_distribution_check(pg_temp.id_of('project'), 'rights', 'non_compliant', 'Territoire Japon non couvert') $$,
                'the designated validator records a check too');

-- 7. Submit, frozen, decide --------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
-- The parameters are confirmed first (lot D2, 20261019100201).
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'params_not_confirmed', 'never submitted before the parameters are confirmed');
update public.distribution_dossiers set preorder = false, prelisten = false, price_tier = 'front'
 where project_id = pg_temp.id_of('project');
select lives_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'), null, null, null) $$,
                'the owner confirms the parameters');
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'checks_non_compliant', 'never submitted with a check « non conforme »');
select public.record_distribution_check(pg_temp.id_of('project'), 'rights', 'unchecked', null);
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'checks_unrecorded', 'never submitted while a check is not recorded (recette DIST-001)');
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['identity', 'identifiers', 'rights', 'visual', 'calendar']) k;
select is(public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb),
          1, 'the owner submits the V1 once the six checks are recorded');
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'version_open', 'one version at a time');
update public.distribution_dossiers set notes = 'changé' where project_id = pg_temp.id_of('project');
select isnt((select notes from public.distribution_dossiers where project_id = pg_temp.id_of('project')),
            'changé', 'the parameters are frozen while the version waits');
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('project'), null) $$,
                 'P0001', 'version_open', 'nor the validator');
insert into ids select 'v1', id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 1;
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), true, null) $$,
                 '42501', 'not_the_validator', 'the owner does not validate his own submission');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), false, '') $$,
                 'P0001', 'reason_required', 'a refusal says why');
select lives_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), true, null) $$,
                'the validator approves the V1');
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), false, 'trop tard') $$,
                 'P0001', 'already_decided', 'a decision is final');
select is((select array_agg(kind order by created_at)::text from public.distribution_events
            where project_id = pg_temp.id_of('project') and kind like 'version.%'),
          '{version.submitted,version.approved}', 'submission and approval are in the history');

-- 8. The manual deposit and the distributor's answers (lot 4) ----------------
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('other_project'), 'deposit') $$,
                 'P0001', 'not_validated', 'no deposit before the dossier is validated');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit') $$,
                 '42501', null, 'only the owner declares');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'received') $$,
                 'P0001', 'not_deposited', 'an answer of the distributor follows a declared deposit');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', current_date + 1) $$,
                 '23514', null, 'a deposit is not declared in the future');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', null, null, null,
                      pg_temp.id_of('other_project')::text || '/' || gen_random_uuid()::text || '.png', 'x.png') $$,
                 '23514', null, 'a proof lives under its own project');
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit') $$,
                'Piégée: the deposit is declared without date, identifier nor proof');
select is((select (version_number, declared_on, orchard_id, proof_path)::text
             from public.distribution_declarations
            where project_id = pg_temp.id_of('project') and kind = 'deposit'),
          '(1,,,)', 'the absences are kept as such (CA08)');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit') $$,
                 'P0001', 'already_declared', 'one deposit per version');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'corrections_requested') $$,
                 '23514', null, 'corrections requested say which');
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'platforms_delivered') $$,
                'the delivery to the platforms is declared, reception and acceptance still unknown');
select is((select count(*)::int from public.distribution_declarations
            where project_id = pg_temp.id_of('project') and kind in ('received', 'accepted')),
          0, 'no state is deduced from another (CA09)');
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'received', current_date, null, 'Mail de The Orchard',
                     null, null, 'https://mail.example.com/orchard') $$,
                'a reception with a link as proof');
select throws_ok($$ select public.withdraw_distribution_declaration(
                      (select id from public.distribution_declarations
                        where project_id = pg_temp.id_of('project') and kind = 'deposit'), 'erreur') $$,
                 'P0001', 'deposit_in_use', 'a deposit others rest on is not withdrawn');
select throws_ok($$ select public.withdraw_distribution_declaration(
                      (select id from public.distribution_declarations
                        where project_id = pg_temp.id_of('project') and kind = 'received'), ' ') $$,
                 'P0001', 'reason_required', 'a withdrawal says why');
select lives_ok($$ select public.withdraw_distribution_declaration(
                     (select id from public.distribution_declarations
                       where project_id = pg_temp.id_of('project') and kind = 'received'), 'Mauvais projet') $$,
                'a mistake is withdrawn');
select is((select count(*)::int from public.distribution_declarations
            where project_id = pg_temp.id_of('project') and kind = 'received' and withdrawn_at is not null),
          1, 'the withdrawn declaration stays in the history');
select throws_ok($$ insert into public.distribution_declarations (organization_id, project_id, version_number, kind, declared_by)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 1, 'accepted', pg_temp.id_of('manager_person')) $$,
                 '42501', null, 'nobody writes a declaration by hand');
select is((select count(*)::int from public.distribution_events
            where project_id = pg_temp.id_of('project') and kind like 'declaration.%'),
          4, 'each declaration and withdrawal is in the history');

-- 9. The platforms and the public availability (lot 5) ----------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'available') $$,
                'Piégée: the public availability is declared, nothing verified');
select lives_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'spotify', null, null, true) $$,
                'Spotify declared available without a link');
select throws_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'spotify', null,
                      'France', null, null, null, 'https://captures.example.com/spotify') $$,
                 'P0001', 'no_link', 'nothing is verified without the official link');
select throws_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'spotify', null, 'http://open.spotify.com/track/x', true) $$,
                 '23514', null, 'an official link is https');
select lives_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'spotify', null, 'https://open.spotify.com/track/abc', true) $$,
                'the official link is set');
select throws_ok($$ select public.report_distribution_platform_problem(pg_temp.id_of('project'), 'spotify', 'unavailable',
                      ' ', 'distributor', null, 'Relancer', pg_temp.id_of('manager_person'), current_date) $$,
                 'P0001', 'reason_required', '« indisponible » says what was seen');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'spotify', null,
                     'France', null, null, null, 'https://captures.example.com/spotify') $$,
                'the validator opened the link: available and compliant, with the territory and the proof');
select is((select (verified_by = pg_temp.id_of('director_person') and compliance_by = pg_temp.id_of('director_person'))
             from public.distribution_platforms where project_id = pg_temp.id_of('project') and platform = 'spotify'),
          true, 'who verified is written by the database');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'spotify', null, 'https://open.spotify.com/track/other', true) $$,
                'the link changes');
select is((select (verification, compliance)::text from public.distribution_platforms
            where project_id = pg_temp.id_of('project') and platform = 'spotify'),
          '(unchecked,unchecked)', 'a new link is verified again, never inherited');
select throws_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'other_abcdefgh', null, null, false) $$,
                 '23514', null, 'a platform added by hand has a name');
select lives_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'other_abcdefgh', 'Tidal', 'https://tidal.com/track/1', false) $$,
                'any other platform can be added (§ 12)');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.save_distribution_platform(pg_temp.id_of('project'), 'deezer', null, null, true) $$,
                 '42501', null, 'another manager writes no platform');
select throws_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'other_abcdefgh', null,
                      'France', null, null, null, 'https://captures.example.com/tidal') $$,
                 '42501', null, 'nor verifies one');

-- 10. Anomalies and a new version of the dossier (lot 6) ---------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.report_distribution_anomaly(pg_temp.id_of('project'), 'credit_isrc',
                     'Crédit compositeur manquant chez The Orchard', null, 'major', 'catalog') $$,
                'an anomaly says where it is corrected: the Catalogue');
select throws_ok($$ select public.report_distribution_anomaly(pg_temp.id_of('project'), 'other', '  ', null, 'minor', 'catalog') $$,
                 '23514', null, 'an anomaly is described');
select throws_ok($$ select public.report_distribution_anomaly(pg_temp.id_of('project'), 'other', 'x', null, 'minor', 'the_orchard_api') $$,
                 '23514', null, 'only known modules own a correction');
insert into ids select 'anomaly', id from public.distribution_anomalies where project_id = pg_temp.id_of('project');
select is((select version_number from public.distribution_anomalies where id = pg_temp.id_of('anomaly')),
          1, 'it is tied to the dossier version current when found');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.report_distribution_anomaly(pg_temp.id_of('project'), 'other', 'x', null, 'minor', 'catalog') $$,
                 '42501', null, 'another manager reports nothing here');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.set_distribution_anomaly_state(pg_temp.id_of('anomaly'), 'resolved', null) $$,
                 '23514', null, 'a resolved anomaly says why');
select lives_ok($$ select public.set_distribution_anomaly_state(pg_temp.id_of('anomaly'), 'in_correction', null) $$,
                'being corrected at the source');

select throws_ok($$ select public.prepare_distribution_version(pg_temp.id_of('project'), '') $$,
                 'P0001', 'reason_required', 'a new version says what was corrected');
select lives_ok($$ select public.prepare_distribution_version(pg_temp.id_of('project'), 'Crédit ajouté au Catalogue') $$,
                'the owner prepares a new version after the correction');
select isnt((select superseded_at from public.distribution_versions
              where project_id = pg_temp.id_of('project') and number = 1), null,
            'the V1 is kept, marked superseded');
select is((select count(*)::int from public.distribution_checks
            where project_id = pg_temp.id_of('project') and result <> 'unchecked'),
          0, 'the checks are to be done again for the new version');
select is((select count(*)::int from public.distribution_declarations
            where project_id = pg_temp.id_of('project') and version_number = 1),
          4, 'the V1 deposit cycle stays in the history (CA13)');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit') $$,
                 'P0001', 'not_validated', 'no deposit until the new version is validated');
update public.distribution_dossiers set notes = 'V2' where project_id = pg_temp.id_of('project');
select is((select notes from public.distribution_dossiers where project_id = pg_temp.id_of('project')),
          'V2', 'the parameters are editable again');
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar']) k;
select is(public.submit_distribution_version(pg_temp.id_of('project'),
            '{"format": 1, "sections": [{"key": "release", "groups": [{"key": "release", "fields": [{"key": "credits", "label": "Crédits", "origin": "catalog", "value": "Dioo, Sami Kader"}]}]}]}'::jsonb),
          2, 'the V2 is submitted, the Catalogue corrected');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_distribution_version(
  (select id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 2), true, null);
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', null, 'ORCH-2') $$,
                'a new deposit is declared for the V2');
select lives_ok($$ select public.set_distribution_anomaly_state(pg_temp.id_of('anomaly'), 'resolved', 'Corrigé dans la V2') $$,
                'the anomaly is resolved, with why');

-- 11. Closure, with reserves then normal, and reopening (lot 7; recette DIST-003) --
insert into vars values ('reserve', '[{"cause":"availability","label":"Disponibilité non vérifiée sur 5 plateformes","details":["Spotify","Apple Music","Deezer","YouTube Music","Amazon Music"],"criticality":"major","ownerPersonId":"'
  || pg_temp.id_of('manager_person') || '","dueOn":"' || (current_date + 14) || '","expectedProof":"Capture de chaque plateforme"}]');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                      (select v from vars where k = 'reserve')::jsonb, 'Arbitrage', 'direction_decision') $$,
                 '42501', null, 'only the owner proposes a closure');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'normal', null, null) $$,
                 'P0001', 'conditions_not_met', 'no normal closure while reserves remain');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                      (select v from vars where k = 'reserve')::jsonb, 'Arbitrage') $$,
                 'P0001', 'not_accepted', 'before The Orchard accepted, no closure with reserves without a reason of the direction');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                      (select v from vars where k = 'reserve')::jsonb, '  ', 'direction_decision') $$,
                 'P0001', 'reason_required', 'a closure with reserves is arbitrated');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves', '[]'::jsonb,
                      'Arbitrage', 'direction_decision') $$,
                 'P0001', 'reserves_invalid', 'a closure with reserves lists them');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                      '[{"cause":"availability","label":"x","details":["Spotify"]}]'::jsonb, 'Arbitrage', 'direction_decision') $$,
                 'P0001', 'reserves_invalid', 'a reserve has its criticality, owner, deadline and proof expected');
select lives_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                     (select v from vars where k = 'reserve')::jsonb,
                     'Piégée : une réserve de disponibilité pour les cinq plateformes', 'direction_decision') $$,
                'Piégée: an early closure with one grouped reserve, for a reason of the direction');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'cancelled',
                      null, 'Encore', 'release_cancelled') $$,
                 'P0001', 'closure_open', 'one closure at a time');
insert into ids select 'closure1', id from public.distribution_closures where project_id = pg_temp.id_of('project');
select is((select (early, reason_kind)::text from public.distribution_closures where id = pg_temp.id_of('closure1')),
          '(t,direction_decision)', 'it is marked ahead of time, with its reason');
select throws_ok($$ select public.decide_distribution_closure(pg_temp.id_of('closure1'), true, null) $$,
                 '42501', 'not_direction', 'the owner does not decide an early closure');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_distribution_closure(pg_temp.id_of('closure1'), false, '') $$,
                 'P0001', 'reason_required', 'a refused closure says why');
select lives_ok($$ select public.decide_distribution_closure(pg_temp.id_of('closure1'), true, null) $$,
                'the direction closes with reserves');
select is((select (kind, status, jsonb_array_length(reserves))::text from public.distribution_closures
            where id = pg_temp.id_of('closure1')),
          '(reserves,closed,1)', 'it stays « clôturée avec réserves », the reserve kept as such');
select is((select (category, criticality, status, owner_person_id = pg_temp.id_of('manager_person'))::text
             from public.distribution_reserves where closure_id = pg_temp.id_of('closure1')),
          '(availability,major,open,t)', 'the reserve is followed: category, criticality, owner, open');
select throws_ok($$ select public.reopen_distribution_closure(pg_temp.id_of('project'), ' ') $$,
                 'P0001', 'reason_required', 'a reopening says why');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.reopen_distribution_closure(pg_temp.id_of('project'), 'x') $$,
                 '42501', null, 'another manager does not reopen');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.reopen_distribution_closure(pg_temp.id_of('project'), 'Lien Spotify retrouvé') $$,
                'the owner reopens');
select is((select (status, decided_at is not null, reopened_at is not null)::text
             from public.distribution_closures where id = pg_temp.id_of('closure1')),
          '(closed,t,t)', 'the closing decision stays, the reopening is added (§ 13)');

-- Everything met: a normal closure.
do $$ begin
  perform public.declare_distribution(pg_temp.id_of('project'), k)
     from unnest(array['received', 'accepted', 'platforms_delivered']) k;
end $$;
select public.save_distribution_platform(pg_temp.id_of('project'), p, null, 'https://example.com/' || p, true)
  from unnest(array['spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music']) p;
select public.confirm_distribution_platform(pg_temp.id_of('project'), p, null, 'France', null, null, null,
         'https://captures.example.com/' || p)
  from unnest(array['spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music']) p;
select public.record_distribution_check(pg_temp.id_of('project'), 'calendar', 'unchecked', null);
select is(public.distribution_closure_ready(pg_temp.id_of('project')), false,
          'one check not recorded: not ready');
select public.record_distribution_check(pg_temp.id_of('project'), 'calendar', 'not_applicable', null);
select is(public.distribution_closure_ready(pg_temp.id_of('project')), true,
          'every condition met: ready for a normal closure');
select lives_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'normal', null, null) $$,
                'the owner proposes a normal closure');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_closure(
                     (select id from public.distribution_closures
                       where project_id = pg_temp.id_of('project') and status = 'pending'), true, null) $$,
                'the validator closes normally');
-- Inside one test transaction every event has the same now(): compare the
-- steps as a set with their counts, not in time order.
select is((select array_agg(kind order by kind)::text from public.distribution_events
            where project_id = pg_temp.id_of('project') and kind like 'closure.%'),
          '{closure.closed,closure.closed,closure.proposed,closure.proposed,closure.reopened}',
          'every closure step is in the history');

select * from finish();
rollback;
