-- Distribution on the common journey (proto « Projet complet », lots D0 to D5):
-- 20261019100101_distribution_real_sources.sql (borrowings readable without
-- the Juridique, the cover delivered, one release date, the release created
-- with the plan), 20261019100201_distribution_params_confirmation.sql and
-- 20261019100301_distribution_gestures.sql (notifications, answers in one
-- gesture, proof added later, corrections, « Tout est bon », a problem).
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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('jmanager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('director', pg_temp.new_user('jdirector-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('director', 'general_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts where id = pg_temp.id_of('director');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id, due_date)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'), date '2026-12-05');
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id
  from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null;
insert into public.legal_clearances (organization_id, project_id, element, work, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'sample', 'Night Lights', 'document_pending');
insert into ids select 'clearance', id from public.legal_clearances where project_id = pg_temp.id_of('project');

-- 1. The release is created with the plan, its date follows the project ----
select is((select count(*)::int from public.releases where project_id = pg_temp.id_of('project')),
          0, 'no release before the plan');
insert into public.project_plans (organization_id, project_id, launched_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('manager_person'));
select is((select planned_release_date from public.releases where project_id = pg_temp.id_of('project')),
          date '2026-12-05', 'launching the plan creates the release, dated by the project');
update public.projects set due_date = date '2026-12-12' where id = pg_temp.id_of('project');
select is((select planned_release_date from public.releases where project_id = pg_temp.id_of('project')),
          date '2026-12-12', 'the release date follows the project');
update public.releases set planned_release_date = date '2027-01-01' where project_id = pg_temp.id_of('project');
select is((select planned_release_date from public.releases where project_id = pg_temp.id_of('project')),
          date '2026-12-12', 'the release date is never typed elsewhere');
update public.projects set due_date = date '2026-12-05' where id = pg_temp.id_of('project');

-- 2. The borrowings to secure, readable without the Juridique ---------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select work from public.distribution_legal_blockers(pg_temp.id_of('project'))),
          'Night Lights', 'but the Distribution knows the borrowing blocks');
select is((select count(*)::int from public.distribution_cover(pg_temp.id_of('project'))),
          0, 'no cover found without a Fiche Livrable');

-- 3. « Confirmer les paramètres » in one gesture -----------------------------
select throws_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'),
                     pg_temp.id_of('manager_person'), null, null) $$,
                 'P0001', 'validator_invalid', 'the owner is never proposed as validator');
select throws_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'),
                     pg_temp.id_of('director_person'), true, date '2026-11-14') $$,
                 'P0001', 'params_missing', 'pre-listening and tier are still to say');
insert into public.distribution_dossiers (organization_id, project_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'));
update public.distribution_dossiers set prelisten = true, prelisten_on = date '2026-12-06',
       price_tier = 'front' where project_id = pg_temp.id_of('project');
select throws_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'),
                     pg_temp.id_of('director_person'), true, date '2026-11-14') $$,
                 'P0001', 'date_after_release', 'a pre-listening after the release is refused');
update public.distribution_dossiers set prelisten = false, prelisten_on = null
 where project_id = pg_temp.id_of('project');
select lives_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'),
                     pg_temp.id_of('director_person'), true, date '2026-11-14') $$,
                'the owner confirms, with what PDS OS proposed');
select is((select array[validator_person_id::text, preorder::text, preorder_on::text]
             from public.distribution_dossiers where project_id = pg_temp.id_of('project')),
          array[pg_temp.id_of('director_person')::text, 'true', '2026-11-14'],
          'the proposed validator and pre-order are written with it');
select ok((select params_confirmed_by = pg_temp.id_of('manager_person')
             from public.distribution_dossiers where project_id = pg_temp.id_of('project')),
          'who confirmed is written by the database');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.confirm_distribution_params(pg_temp.id_of('project'), null, null, null) $$,
                 '42501', null, 'only the owner confirms');

-- 4. Submission refused while a borrowing blocks; notifications --------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb) $$,
                 'P0001', 'legal_blockers', 'never submitted with a borrowing to secure');
reset role;
update public.legal_clearances set status = 'cleared' where id = pg_temp.id_of('clearance');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar']) k;
select is(public.submit_distribution_version(pg_temp.id_of('project'), '{"format": 1}'::jsonb),
          1, 'once secured, the V1 is submitted');
reset role;
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('project') and kind = 'distribution_version_submitted'
              and recipient_person_id = pg_temp.id_of('director_person')),
          1, 'the validator is told');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_version(
                     (select id from public.distribution_versions where project_id = pg_temp.id_of('project')),
                     true, null) $$, 'the validator approves');
reset role;
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('project') and kind = 'distribution_version_decided'
              and recipient_person_id = pg_temp.id_of('manager_person')),
          1, 'the owner is told of the decision');

-- 5. The deposit, then what The Orchard said in one gesture ------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit') $$,
                'the deposit is declared');
select throws_ok($$ select public.declare_distribution_answers(pg_temp.id_of('project'),
                     '[{"kind": "deposit"}]'::jsonb) $$,
                 '22023', null, 'only answers of The Orchard');
select is(public.declare_distribution_answers(pg_temp.id_of('project'),
            '[{"kind": "accepted", "source": "orchard_email"}, {"kind": "received", "source": "orchard_portal"}]'::jsonb),
          2, 'two answers declared in one gesture');
select is((select array_agg(kind order by declared_at, kind)::text from public.distribution_declarations
            where project_id = pg_temp.id_of('project') and kind <> 'deposit'),
          '{accepted,received}', 'each one is its own declaration');
insert into ids select 'received', id from public.distribution_declarations
 where project_id = pg_temp.id_of('project') and kind = 'received';
select lives_ok($$ select public.attach_distribution_declaration_proof(pg_temp.id_of('received'),
                     (select organization_id::text || '/' || id::text || '/' || gen_random_uuid()::text || '.eml'
                        from public.projects where id = pg_temp.id_of('project')), 'Mail.eml') $$,
                'a proof is added later');
select throws_ok($$ select public.attach_distribution_declaration_proof(pg_temp.id_of('received'),
                     (select organization_id::text || '/' || id::text || '/' || gen_random_uuid()::text
                        from public.projects where id = pg_temp.id_of('project')), 'Autre.eml') $$,
                 'P0001', 'proof_exists', 'never replaced');

-- 6. « Tout est bon » and « Il y a un problème » ------------------------------
select throws_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'spotify',
                     'https://open.spotify.com/album/x1') $$,
                 'P0001', 'territory_required', '« Tout est bon » says the territory seen (recette DIST-005)');
select throws_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'spotify',
                     'https://open.spotify.com/album/x1', 'France') $$,
                 'P0001', 'proof_required', 'and its proof');
select lives_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'spotify',
                     'https://open.spotify.com/album/x1', 'France', null, null, null,
                     'https://captures.example.com/spotify') $$, '« Tout est bon » on Spotify');
select is((select array[verification, compliance, url] from public.distribution_platforms
            where project_id = pg_temp.id_of('project') and platform = 'spotify'),
          array['verified', 'compliant', 'https://open.spotify.com/album/x1'],
          'available and compliant in one click, with the link');
select throws_ok($$ select public.confirm_distribution_platform(pg_temp.id_of('project'), 'deezer', null,
                     'France', null, null, null, 'https://captures.example.com/deezer') $$,
                 'P0001', 'no_link', 'never without a link');
select throws_ok($$ select public.report_distribution_platform_problem(pg_temp.id_of('project'), 'amazon_music',
                     'unavailable', ' ', 'distributor', 'https://music.amazon.fr/x') $$,
                 'P0001', 'reason_required', 'a problem says what was seen');
select throws_ok($$ select public.report_distribution_platform_problem(pg_temp.id_of('project'), 'amazon_music',
                     'unavailable', 'Indisponible en France', 'distributor', 'https://music.amazon.fr/x') $$,
                 'P0001', 'action_required', 'an unavailability says what is done, by whom, by when (recette DIST-005)');
select lives_ok($$ select public.report_distribution_platform_problem(pg_temp.id_of('project'), 'amazon_music',
                     'unavailable', 'Indisponible en France', 'distributor', 'https://music.amazon.fr/x',
                     'Relancer The Orchard', pg_temp.id_of('manager_person'), current_date + 3) $$,
                '« Il y a un problème » on Amazon Music');
select is((select kind || ':' || platform from public.distribution_anomalies
            where project_id = pg_temp.id_of('project')),
          'platform_unavailable:amazon_music', 'the anomaly opens in the same gesture');

-- 7. Corrections of The Orchard: declaration, anomaly, next version ---------
select throws_ok($$ select public.declare_distribution_corrections(pg_temp.id_of('project'), '',
                     'credit_isrc', 'catalog', 'major') $$,
                 'P0001', 'reason_required', 'corrections say what is asked');
select lives_ok($$ select public.declare_distribution_corrections(pg_temp.id_of('project'),
                     'Le compositeur sous son nom civil', 'credit_isrc', 'catalog', 'major') $$,
                'The Orchard asks for corrections');
select ok((select from_distributor and version_number = 1 from public.distribution_anomalies
            where project_id = pg_temp.id_of('project') and kind = 'credit_isrc'),
          'the anomaly comes from the distributor, on the V1');
select ok((select superseded_at is not null from public.distribution_versions
            where project_id = pg_temp.id_of('project') and number = 1),
          'the V1 is replaced: the next version is to prepare');
select is(public.distribution_current_version(pg_temp.id_of('project')), null,
          'nothing to deposit until the V2 is validated');

select * from finish();
rollback;
