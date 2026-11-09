-- Juridique, branch 06: the formality engine and SACEM 725
-- (supabase/migrations/20261005007001_legal_formalities.sql). Run with
-- `supabase test db`. Fixture of the ticket (« Piégée », test data only: the
-- shares, signatures, deposit, registration and ISWC here are SIMULATED).
begin;
select plan(41);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);


insert into public.legal_clearances (organization_id, project_id, master_id, element, work)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 'topline', 'Humanisme');
insert into public.legal_plans (organization_id, project_id, status, launched_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'active', now());
insert into public.legal_plan_items (organization_id, plan_id, project_id, item_key, kind, master_id,
                                     label, status, responsible_person_id)
select pg_temp.id_of('org'), id, pg_temp.id_of('project'), 'formality:' || pg_temp.id_of('master'),
       'formality', pg_temp.id_of('master'), 'SACEM', 'blocked', pg_temp.id_of('manager_person')
  from public.legal_plans where project_id = pg_temp.id_of('project');
select public.legal_plan_item_task((select id from public.legal_plan_items where project_id = pg_temp.id_of('project')));

-- Participants (20261109140101): roles, and a share within each role's category.
create function pg_temp.creators(p_shares text[]) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('last_name', 'Ever', 'first_name', 'Ever', 'roles', jsonb_build_array('composer'),
                       'shares', jsonb_build_object('composer', p_shares[1]), 'signs', true),
    jsonb_build_object('last_name', 'Samy', 'pseudonym', 'Samy', 'roles', jsonb_build_array('composer'),
                       'shares', jsonb_build_object('composer', p_shares[2]), 'signs', true),
    jsonb_build_object('last_name', 'Le J', 'first_name', 'Jérémy', 'roles', jsonb_build_array('author'),
                       'shares', jsonb_build_object('author', p_shares[3]), 'signs', true))
$$;
create function pg_temp.status() returns text language sql as $$
  select status from public.legal_formalities where project_id = pg_temp.id_of('project')
$$;

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'f', public.open_formality(pg_temp.id_of('project'), pg_temp.id_of('master'), 'SACEM_725_EDITED_WORK');
select ok(public.formality_missing(pg_temp.id_of('f')) @> array['title', 'duration', 'genre', 'creators', 'dep_dr', 'borrowing:Humanisme'],
          'the formality lists what the bulletin still needs');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'title', jsonb_build_object('value', 'Piégée', 'source', 'Titre'),
  'duration', jsonb_build_object('value', '3:12', 'source', 'Master final'),
  'genre', jsonb_build_object('value', 'Rap', 'source', 'Saisi'),
  'performers', jsonb_build_object('value', 'Dioo', 'source', 'Artistes du titre'),
  'creators', jsonb_build_object('value', pg_temp.creators(array['50', '75', '100']), 'source', 'Saisi'),
  'dep_dr', jsonb_build_object('value', jsonb_build_object('choice', 'follow_phono'), 'source', 'Saisi')));
-- Retour d'Ibé du 02/11/2026: each category is checked on its own (no more 125 % in all).
select ok('composer_total' = any (public.formality_missing(pg_temp.id_of('f')))
          and not ('author_total' = any (public.formality_missing(pg_temp.id_of('f')))),
          'the Compositeur part must be shared to exactly 100 %, apart from the Auteur part');
select ok('publishers_choice' = any (public.formality_missing(pg_temp.id_of('f'))),
          'no music publisher is said, never assumed');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', pg_temp.creators(array['50', '50', '100']), 'source', 'Saisi'),
  'phono_split', jsonb_build_object('value', jsonb_build_object('no_publisher', true), 'source', 'Saisi')));
-- JUR-02/03 (…20261024000401): the first exploitation, and the DEP / DR checked by a person.
select is(public.formality_missing(pg_temp.id_of('f')),
          array['borrowing:Humanisme', 'first_exploitation', 'dep_dr_check'],
          'the first exploitation and the check of the DEP / DR shares are required');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'first_exploitation', jsonb_build_object('value', '2026-11-20', 'source', 'Saisi'),
  'dep_dr', jsonb_build_object('value', jsonb_build_object('choice', 'follow_phono', 'checked', true), 'source', 'Saisi')));
select is(public.formality_missing(pg_temp.id_of('f')), array['borrowing:Humanisme'], 'only the unsecured borrowing remains');
-- JUR-24 (…20261012100401): a creator without first name nor pseudonym,
-- and a publisher without denomination, block the bulletin.
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('last_name', 'Ever', 'roles', jsonb_build_array('composer'),
                       'shares', jsonb_build_object('composer', '100'), 'signs', true)), 'source', 'Saisi'),
  'publishers', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('name', '', 'share', '100')), 'source', 'Saisi')));
select ok(public.formality_missing(pg_temp.id_of('f')) @> array['creator_first:1', 'publisher_name:1'],
          'a first name or pseudonym, and the publisher''s denomination, are required');
-- JUR-22 / JUR-25 (…20261012100701): a publisher says whom it publishes, and
-- « copie jointe » needs a piece.
select ok('publisher_link:1' = any (public.formality_missing(pg_temp.id_of('f'))),
          'a publisher publishes at least one creator of the bulletin');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'publishers', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('name', 'Éditions PDS', 'share', '100', 'represents', jsonb_build_array(1))), 'source', 'Saisi'),
  'publishing_contract', jsonb_build_object('value', jsonb_build_object('provided', true, 'rubric_g', ''), 'source', 'Saisi')));
select ok(not ('publisher_link:1' = any (public.formality_missing(pg_temp.id_of('f'))))
          and 'rubric_g' = any (public.formality_missing(pg_temp.id_of('f'))),
          'a copy « joined » without any contract counts as no copy: the rubric G is asked');
-- A label taken for a music publisher is pointed out (retour d'Ibé du 02/11/2026).
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Label Test ' || (select v from vars where k = 'tag'), array['label']);
insert into ids select 'label', id from public.network_contacts
 where name = 'Label Test ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'publishers', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('name', 'Label Test', 'share', '100', 'represents', jsonb_build_array(1),
                       'contact_id', pg_temp.id_of('label'))), 'source', 'Saisi')));
select ok('publisher_label:1' = any (public.formality_missing(pg_temp.id_of('f'))),
          'a label is not a music publisher');
-- The main artist is never an author by default: their role is confirmed by a person; a
-- performer alone has no share and is not on the bulletin.
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', pg_temp.creators(array['50', '50', '100'])
    || jsonb_build_array(jsonb_build_object('last_name', 'Dioo', 'pseudonym', 'Dioo', 'roles', '[]'::jsonb,
                                            'performer_only', true, 'shares', '{}'::jsonb, 'signs', false,
                                            'main_artist', true)), 'source', 'Saisi'),
  'publishers', jsonb_build_object('value', '[]'::jsonb, 'source', 'Saisi')));
select ok('main_artist_role:4' = any (public.formality_missing(pg_temp.id_of('f')))
          and not ('creator_role:4' = any (public.formality_missing(pg_temp.id_of('f')))),
          'the main artist''s role is confirmed by a person; a performer alone needs no role');
-- A contract's parts between categories make 100 %, with none for a category nobody holds.
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'phono_split', jsonb_build_object('value', jsonb_build_object('no_publisher', true,
    'custom', jsonb_build_object('author', '40', 'composer', '40', 'publisher', '20')), 'source', 'Saisi')));
select ok('phono_split' = any (public.formality_missing(pg_temp.id_of('f'))),
          'no Éditeur part without a music publisher');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', pg_temp.creators(array['50', '50', '100'])
    || jsonb_build_array(jsonb_build_object('last_name', 'Dioo', 'pseudonym', 'Dioo', 'roles', '[]'::jsonb,
                                            'performer_only', true, 'shares', '{}'::jsonb, 'signs', true,
                                            'main_artist', true, 'confirmed', true)), 'source', 'Saisi'),
  'phono_split', jsonb_build_object('value', jsonb_build_object('no_publisher', true,
    'custom', jsonb_build_object('author', '40', 'composer', '60', 'publisher', '')), 'source', 'Saisi')));
select is(pg_temp.status(), 'collecting_data', 'an unsecured Humanisme keeps the formality from being finalised');
select throws_ok(format($$ select public.generate_formality_document(%L) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_not_ready', 'no bulletin before the borrowing is secured');

reset role;
update public.legal_clearances set status = 'cleared' where project_id = pg_temp.id_of('project');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.save_formality_values(pg_temp.id_of('f'), '{}'::jsonb);
select is(pg_temp.status(), 'ready_to_generate', 'ready once everything is there');

-- JUR-03 (…20261024000501): the proofs are files the team deposits in the formality's folder.
reset role;
insert into storage.objects (bucket_id, name)
values ('formality-signatures', pg_temp.id_of('org') || '/proofs/' || pg_temp.id_of('f')
                                || '/11111111-1111-1111-1111-111111111111.pdf');
create function pg_temp.proof() returns text language sql as $$
  select pg_temp.id_of('org') || '/proofs/' || pg_temp.id_of('f') || '/11111111-1111-1111-1111-111111111111.pdf'
$$;
grant execute on function pg_temp.proof() to authenticated;
select pg_temp.act_as(pg_temp.id_of('manager'));

-- Document, signatures, deposit ----------------------------------------------------
select is(public.generate_formality_document(pg_temp.id_of('f')), 1, 'version 1 of the bulletin');
select is((select count(*)::int from public.legal_formality_signatures where formality_id = pg_temp.id_of('f')), 3,
          'every rights holder who signs has a signature to collect, never a performer alone');
select throws_ok(format($$ select public.submit_formality(%L, 'Envoyé') $$, pg_temp.id_of('f')),
                 'P0001', 'formality_not_ready', 'no deposit before the signatures');
select throws_ok(format($$ select public.record_formality_signature((select id from public.legal_formality_signatures where formality_id = %L limit 1), null) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_proof_required', 'a signature is recorded with its proof');
select public.record_formality_signature(id, 'Bulletin signé reçu (SIMULÉ)')
  from public.legal_formality_signatures where formality_id = pg_temp.id_of('f');
select is(pg_temp.status(), 'ready_to_submit', 'all signed: ready to submit');
select throws_ok(format($$ select public.submit_formality(%L, 'Envoyé', null) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_proof_file_required', 'a deposit is recorded with its receipt, a file');
select public.submit_formality(pg_temp.id_of('f'), 'Envoyé par courrier le 05/10 (SIMULÉ)', pg_temp.proof());
select is(pg_temp.status(), 'submitted', 'submitted is not registered');
-- « Rejetée » by the SACEM, then a new declaration, history kept (rolled back after).
savepoint rejected;
select throws_ok(format($$ select public.reject_formality(%L, null) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_reason_required', 'a rejection says why');
select public.reject_formality(pg_temp.id_of('f'), 'Œuvre déjà déclarée (SIMULÉ)');
select is(pg_temp.status(), 'rejected', 'REJECTED, with its reason');
select public.restart_formality(pg_temp.id_of('f'));
select is(pg_temp.status(), 'ready_to_generate', 'a new declaration starts from the dossier kept');
rollback to savepoint rejected;
select is((select status from public.master_declarations where master_id = pg_temp.id_of('master') and organism = 'sacem'),
          'submitted', 'the title''s SACEM declaration reads submitted');

-- An external correction reopens only its field ------------------------------------------
select public.require_formality_action(pg_temp.id_of('f'), array['duration'], 'Durée à corriger');
select is(pg_temp.status(), 'action_required', 'ACTION_REQUIRED');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'title', jsonb_build_object('value', 'Autre titre', 'source', 'Saisi')));
select is((select value #>> '{}' from public.legal_formality_values where formality_id = pg_temp.id_of('f') and field_key = 'title'),
          'Piégée', 'a field not reopened stays as it was');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'duration', jsonb_build_object('value', '3:14', 'source', 'Master final')));
select is(public.generate_formality_document(pg_temp.id_of('f')), 2, 'the correction makes a new version');
select is((select count(*)::int from public.legal_formality_signatures
            where formality_id = pg_temp.id_of('f') and document_version = 2 and status = 'pending'), 3,
          'with new signatures, version 1 kept');
-- JUR-03 (…20261028000601): the signatures of version 1 are kept, never valid any more.
select is((select count(*)::int from public.legal_formality_signatures
            where formality_id = pg_temp.id_of('f') and document_version = 1
              and status = 'signed' and superseded_at is not null), 3,
          'version 1''s signatures are kept, marked replaced');
savepoint changed;
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'duration', jsonb_build_object('value', '3:15', 'source', 'Saisi')));
select ok((select bool_and(superseded_at is not null) from public.legal_formality_signatures
            where formality_id = pg_temp.id_of('f') and document_version = 2)
          and exists (select 1 from public.legal_formality_events
                       where formality_id = pg_temp.id_of('f') and kind = 'signatures.superseded'
                         and note = 'v2 · 0 signature reçue'),
          'a change to a generated bulletin cancels the signatures of its version, in the history');
rollback to savepoint changed;
-- JUR-03: PDS Éditions' line is signed by the direction in PDS OS.
reset role;
insert into public.legal_formality_signatures
  (organization_id, formality_id, document_version, signer, role, house)
values (pg_temp.id_of('org'), pg_temp.id_of('f'), 2, 'PDS Éditions', 'publisher', true);
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.sign_formality_for_house((select id from public.legal_formality_signatures where formality_id = %L and house)) $$, pg_temp.id_of('f')),
                 '42501', null, 'only the direction signs for PDS Éditions');
select throws_ok(format($$ select public.sign_formality_for_house((select id from public.legal_formality_signatures where formality_id = %L and document_version = 2 and not house limit 1)) $$, pg_temp.id_of('f')),
                 '42501', null, 'nor anyone a line that is not the house''s');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.sign_formality_for_house((select id from public.legal_formality_signatures where formality_id = %L and document_version = 2 and not house limit 1)) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_signature_closed', 'the direction signs only the house''s line');
select lives_ok(format($$ select public.sign_formality_for_house((select id from public.legal_formality_signatures where formality_id = %L and house)) $$, pg_temp.id_of('f')),
                'the direction signs for PDS Éditions');
reset role;
select is((select via || ' · ' || status from public.legal_formality_signatures
            where formality_id = pg_temp.id_of('f') and house),
          'house · signed', 'signed in PDS OS, by the direction');
select pg_temp.act_as(pg_temp.id_of('manager'));

-- Partial declaration, processing, completion with proof ----------------------------------
select throws_ok(format($$ select public.declare_formality_partial(%L, null) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_reason_required', 'a partial declaration says why');
select public.declare_formality_partial(pg_temp.id_of('f'), 'Le J injoignable (SIMULÉ)');
select public.submit_formality(pg_temp.id_of('f'), 'Renvoyé le 20/10 (SIMULÉ)', pg_temp.proof());
select public.mark_formality_processing(pg_temp.id_of('f'));
select throws_ok(format($$ select public.complete_formality(%L, null, null, null) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_proof_file_required', 'COMPLETED needs the proof of the result, a file');
select throws_ok(format($$ select public.complete_formality(%L, null, null, null, pg_temp.proof()) $$, pg_temp.id_of('f')),
                 'P0001', 'formality_external_id_required', 'and the work''s SACEM identifier');
select public.complete_formality(pg_temp.id_of('f'), 'Avis d''enregistrement SACEM (SIMULÉ)', 'W-123', 'T1234567890', pg_temp.proof());
select is((select iswc from public.masters where id = pg_temp.id_of('master')), 'T1234567890',
          'the ISWC received is carried to the title');
reset role;
select is((select t.status from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.project_id = pg_temp.id_of('project')), 'done', 'the plan''s SACEM task is ticked');

select * from finish();
rollback;
