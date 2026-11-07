-- What comes back signed comes back by the person's private link (20261020070101): a token only
-- signs the documents of its own contact, in its own project.
begin;
select plan(36);

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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
create function pg_temp.v(p_k text) returns text language sql as $$
  select v from vars where k = p_k
$$;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || pg_temp.v('tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || pg_temp.v('tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), 'Ressac ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = 'Néons ' || pg_temp.v('tag');
insert into ids select 'other_project', id from public.projects where title = 'Ressac ' || pg_temp.v('tag');

insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Sami ' || pg_temp.v('tag'), array['musician']),
       (pg_temp.id_of('org'), 'person', 'Yanis ' || pg_temp.v('tag'), array['musician']);
insert into ids select 'sami', id from public.network_contacts where name = 'Sami ' || pg_temp.v('tag');
insert into ids select 'yanis', id from public.network_contacts where name = 'Yanis ' || pg_temp.v('tag');

-- Sami's contract of the Juridique, validated by the direction, generated from a template.
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Cession — Sami ' || pg_temp.v('tag'), 'publishing', 'approved',
        pg_temp.id_of('project'), pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts where title = 'Cession — Sami ' || pg_temp.v('tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Contrat compositeur', 'publishing', array['composer'], null, 'Texte');
reset role;
insert into public.contract_documents (organization_id, contract_id, version, template_id,
                                       template_version, body)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 1, pg_temp.id_of('tpl'), 1,
        'Article 1. Objet.');
insert into public.legal_agreement_needs (organization_id, project_id, contact_id, contract_type, contract_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sami'), 'publishing',
        pg_temp.id_of('contract'));

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.send_contract(%L, 'link', null, null) $$, pg_temp.id_of('contract')),
                 'P0001', 'contact_link_missing', 'sent on a link only when the person has one');
insert into vars select 'sami_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('sami'));
insert into vars select 'yanis_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('yanis'));
insert into vars select 'sami_other', public.issue_contact_link(pg_temp.id_of('other_project'), pg_temp.id_of('sami'));
select throws_ok(format($$ select public.send_contract(%L, 'other', 'Par pigeon', current_date) $$, pg_temp.id_of('contract')),
                 '23514', null, 'handed otherwise: one of the known ways');
select throws_ok(format($$ select public.send_contract(%L, 'other', 'Remis en main propre', current_date + 2) $$, pg_temp.id_of('contract')),
                 '23514', null, 'and never a day to come');
reset role;

-- Not sent yet: nothing to deposit.
set local role anon;
select is((select jsonb_array_length(public.get_contact_signatures(pg_temp.v('sami_token')) -> 'contracts')),
          1, 'the person sees their contract being prepared');
select is(public.get_contact_contract_document(pg_temp.v('sami_token'), pg_temp.id_of('contract')),
          null, 'but no document before it is sent');
select throws_ok(format($$ select public.open_signed_return_slot(%L, 'contract', %L) $$,
                        pg_temp.v('sami_token'), pg_temp.id_of('contract')),
                 'P0001', 'contract_not_sent', 'nothing to sign before it is sent');
reset role;

-- PDS signs first (20261107150101): not sent before, only by the direction, on its PDF.
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.send_contract(%L, 'link', null, null) $$, pg_temp.id_of('contract')),
                 'P0001', 'contract_countersign_missing', 'not sent before PDS signs it');
select throws_ok(format($$ select public.advance_contract(%L, 'countersign') $$, pg_temp.id_of('contract')),
                 '42501', null, 'only the direction signs for PDS');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.advance_contract(%L, 'countersign') $$, pg_temp.id_of('contract')),
                 'P0001', 'contract_pds_file_missing', 'PDS signs its PDF, never a click alone');
insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 'pds_signed',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
        'Contrat signé PDS.pdf', 'application/pdf', 1000);
select public.advance_contract(pg_temp.id_of('contract'), 'countersign');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.send_contract(%L, 'link', null, null) $$, pg_temp.id_of('contract')),
                'sent on their private link');
reset role;
-- Without an account from here: no one's claims.
select set_config('request.jwt.claims', '', true);
select is((select status || ' · ' || sent_via from public.contracts where id = pg_temp.id_of('contract')),
          'sent · link', 'the contract waits for its signature, sent by the link');

set local role anon;
select is((public.get_contact_contract_document(pg_temp.v('sami_token'), pg_temp.id_of('contract')) ->> 'version'),
          '1', 'the person downloads the version validated');
select is((public.get_contact_contract_pds_file(pg_temp.v('sami_token'), pg_temp.id_of('contract')) ->> 'file_name'),
          'Contrat signé PDS.pdf', 'the person downloads the PDF signed for PDS');
select is(public.get_contact_contract_document(pg_temp.v('yanis_token'), pg_temp.id_of('contract')),
          null, 'another person of the project never reads it');
select is(public.get_contact_contract_document(pg_temp.v('sami_other'), pg_temp.id_of('contract')),
          null, 'nor the same person through another project');
select is((select jsonb_array_length(public.get_contact_signatures(pg_temp.v('yanis_token')) -> 'contracts')),
          0, 'another person sees no contract of theirs');
select throws_ok(format($$ select public.open_signed_return_slot(%L, 'contract', %L) $$,
                        pg_temp.v('yanis_token'), pg_temp.id_of('contract')),
                 'P0001', 'signature_link_closed', 'another person never deposits it');
select throws_ok(format($$ select public.open_signed_return_slot(%L, 'contract', %L) $$,
                        pg_temp.v('sami_other'), pg_temp.id_of('contract')),
                 'P0001', 'signature_link_closed', 'nor the same person through another project');
insert into vars select 'path', public.open_signed_return_slot(pg_temp.v('sami_token'), 'contract', pg_temp.id_of('contract'));
select throws_ok(format($$ select public.submit_signed_contract(%L, %L, %L, 'Contrat_signe.pdf') $$,
                        pg_temp.v('sami_token'), pg_temp.id_of('contract'), pg_temp.v('path')),
                 'P0001', 'upload_missing', 'the file must be there');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('contract-files', pg_temp.v('path'), '{"mimetype": "image/png", "size": 1200}');
set local role anon;
select throws_ok(format($$ select public.submit_signed_contract(%L, %L, %L, 'Contrat_signe.png') $$,
                        pg_temp.v('sami_token'), pg_temp.id_of('contract'), pg_temp.v('path')),
                 'P0001', 'not_pdf', 'a file that is not a PDF is refused');
reset role;
update storage.objects set metadata = '{"mimetype": "application/pdf", "size": 1200}'
 where bucket_id = 'contract-files' and name = pg_temp.v('path');
set local role anon;
select lives_ok(format($$ select public.submit_signed_contract(%L, %L, %L, 'Contrat_signe.pdf') $$,
                       pg_temp.v('sami_token'), pg_temp.id_of('contract'), pg_temp.v('path')),
                'the person deposits their signed contract');
select throws_ok(format($$ select public.open_signed_return_slot(%L, 'contract', %L) $$,
                        pg_temp.v('sami_token'), pg_temp.id_of('contract')),
                 'P0001', 'already_deposited', 'once');
reset role;
select is((select via_contact_id from public.contract_files
            where contract_id = pg_temp.id_of('contract') and category = 'signed'),
          pg_temp.id_of('sami'), 'kept with the contract, deposited by the person');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('manager_person')
              and kind = 'legal_contract_signed_received' and subject_id = pg_temp.id_of('sami')),
          1, 'the owner is told');
select is((select status from public.contracts where id = pg_temp.id_of('contract')),
          'sent', 'the team checks it before it is signed');
-- JUR-11: both parties, and the team's check (20261024000201).
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.advance_contract(%L, 'sign', null, current_date) $$, pg_temp.id_of('contract')),
                 'P0001', 'contract_signature_unchecked', 'nor without the team''s check of the signature');
select lives_ok(format($$ select public.advance_contract(%L, 'sign', null, current_date, true) $$, pg_temp.id_of('contract')),
                'the deposit by the link is the proof of the signature');
reset role;
select is((select status from public.contracts where id = pg_temp.id_of('contract')), 'signed', 'signed');

-- The SACEM bulletin: Sami signs his own line only.
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Mona ' || pg_temp.v('tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Mona ' || pg_temp.v('tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Néons',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.legal_formalities (organization_id, project_id, master_id, definition_key,
                                      definition_version, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'),
        'SACEM_725_EDITED_WORK', 1, 'signatures_pending');
insert into ids select 'formality', id from public.legal_formalities where master_id = pg_temp.id_of('master');
insert into public.legal_formality_documents (organization_id, formality_id, version, content)
values (pg_temp.id_of('org'), pg_temp.id_of('formality'), 1, '{}');
insert into public.legal_formality_signatures (organization_id, formality_id, document_version,
                                               signer, role, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('formality'), 1, 'Sami Kader', 'composer', pg_temp.id_of('sami')),
       (pg_temp.id_of('org'), pg_temp.id_of('formality'), 1, 'Yanis Morel', 'author', pg_temp.id_of('yanis'));
insert into ids select 'sig_sami', id from public.legal_formality_signatures
 where formality_id = pg_temp.id_of('formality') and signer = 'Sami Kader';
insert into ids select 'sig_yanis', id from public.legal_formality_signatures
 where formality_id = pg_temp.id_of('formality') and signer = 'Yanis Morel';

set local role anon;
select is((select jsonb_array_length(public.get_contact_signatures(pg_temp.v('sami_token')) -> 'bulletins')),
          1, 'the person sees their own line of the bulletin');
select throws_ok(format($$ select public.open_signed_return_slot(%L, 'bulletin', %L) $$,
                        pg_temp.v('sami_token'), pg_temp.id_of('sig_yanis')),
                 'P0001', 'signature_link_closed', 'never another person''s signature');
select is(public.get_contact_bulletin_document(pg_temp.v('sami_other'), pg_temp.id_of('sig_sami')),
          null, 'nor through another project');
insert into vars select 'bpath', public.open_signed_return_slot(pg_temp.v('sami_token'), 'bulletin', pg_temp.id_of('sig_sami'));
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('formality-signatures', pg_temp.v('bpath'), '{"mimetype": "application/pdf", "size": 900}');
set local role anon;
select lives_ok(format($$ select public.submit_signed_bulletin(%L, %L, %L, 'Bulletin_signe.pdf') $$,
                       pg_temp.v('sami_token'), pg_temp.id_of('sig_sami'), pg_temp.v('bpath')),
                'the person deposits the signed bulletin');
reset role;
select is((select status || ' · ' || via || ' · ' || file_name from public.legal_formality_signatures
            where id = pg_temp.id_of('sig_sami')),
          'signed · link · Bulletin_signe.pdf', 'their signature is recorded with its file');

-- « A signé autrement », by the team, with its day and the signed bulletin scanned
-- (JUR-11, …20261024000601): the last signature passes the bulletin on.
insert into storage.objects (bucket_id, name, metadata)
values ('formality-signatures', pg_temp.id_of('org') || '/proofs/' || pg_temp.id_of('formality')
                                || '/33333333-3333-3333-3333-333333333333.pdf', '{"size": 1200}');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.note_formality_signature(%L, current_date - 1, null) $$, pg_temp.id_of('sig_yanis')),
                 'P0001', 'formality_proof_file_required', 'a signature made otherwise needs its scan');
select lives_ok(format($$ select public.note_formality_signature(%L, current_date - 1, %L) $$, pg_temp.id_of('sig_yanis'),
                       pg_temp.id_of('org') || '/proofs/' || pg_temp.id_of('formality')
                       || '/33333333-3333-3333-3333-333333333333.pdf'),
                'a signature made otherwise, with its day and its scan');
reset role;
select is((select status from public.legal_formalities where id = pg_temp.id_of('formality')),
          'ready_to_submit', 'every signature in: ready to submit');

select * from finish();
rollback;
