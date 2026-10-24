-- Juridique, branch 06: the formality engine and SACEM 725
-- (supabase/migrations/20261005007001_legal_formalities.sql). Run with
-- `supabase test db`. Fixture of the ticket (« Piégée », test data only: the
-- shares, signatures, deposit, registration and ISWC here are SIMULATED).
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

create function pg_temp.creators(p_shares text[]) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('last_name', 'Ever', 'first_name', 'Ever', 'quality', 'composer', 'phono', p_shares[1], 'signs', true),
    jsonb_build_object('last_name', 'Samy', 'pseudonym', 'Samy', 'quality', 'composer', 'phono', p_shares[2], 'signs', true),
    jsonb_build_object('last_name', 'Le J', 'first_name', 'Jérémy', 'quality', 'author', 'phono', p_shares[3], 'signs', true))
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
  'creators', jsonb_build_object('value', pg_temp.creators(array['33.33', '33.33', '33.33']), 'source', 'Saisi'),
  'dep_dr', jsonb_build_object('value', jsonb_build_object('choice', 'follow_phono'), 'source', 'Saisi')));
select ok('phono_total' = any (public.formality_missing(pg_temp.id_of('f'))), 'the Phono shares must total exactly 100 %');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', pg_temp.creators(array['33.3334', '33.3333', '33.3333']), 'source', 'Saisi')));
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
    jsonb_build_object('last_name', 'Ever', 'quality', 'composer', 'phono', '50', 'signs', true)), 'source', 'Saisi'),
  'publishers', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('name', '', 'phono', '50')), 'source', 'Saisi')));
select ok(public.formality_missing(pg_temp.id_of('f')) @> array['creator_first:1', 'publisher_name:1'],
          'a first name or pseudonym, and the publisher''s denomination, are required');
-- JUR-22 / JUR-25 (…20261012100701): a publisher says whom it publishes, and
-- « copie jointe » needs a piece.
select ok('publisher_link:1' = any (public.formality_missing(pg_temp.id_of('f'))),
          'a publisher publishes at least one creator of the bulletin');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'publishers', jsonb_build_object('value', jsonb_build_array(
    jsonb_build_object('name', 'Éditions PDS', 'phono', '50', 'represents', jsonb_build_array(1))), 'source', 'Saisi'),
  'publishing_contract', jsonb_build_object('value', jsonb_build_object('provided', true, 'rubric_g', ''), 'source', 'Saisi')));
select ok(not ('publisher_link:1' = any (public.formality_missing(pg_temp.id_of('f'))))
          and 'rubric_g' = any (public.formality_missing(pg_temp.id_of('f'))),
          'a copy « joined » without any contract counts as no copy: the rubric G is asked');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'creators', jsonb_build_object('value', pg_temp.creators(array['33.3334', '33.3333', '33.3333']), 'source', 'Saisi'),
  'publishers', jsonb_build_object('value', '[]'::jsonb, 'source', 'Saisi')));
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
          'every rights holder who signs has a signature to collect');
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
