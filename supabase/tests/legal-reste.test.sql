-- Juridique, « le reste » (supabase/migrations/20261020030101 and after): a template asked of
-- the direction in the Plan d'action, a clause revised in the person's step.
begin;
select plan(35);

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
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');

-- 1. A template asked of the direction from « Contrats à prévoir » --------------------------------
select pg_temp.act_as(pg_temp.id_of('other'));
insert into ids select 'foreign', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Modèle autre', 'service', array['musician'], null, 'Texte');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Contrat musicien', 'service', array['musician'], null, 'Texte du modèle');
select throws_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                        pg_temp.id_of('foreign'), pg_temp.id_of('project')),
                 '42501', null, 'only its author asks for a template');
select lives_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                       pg_temp.id_of('tpl'), pg_temp.id_of('project')),
                'its author asks the direction, for a person of the project');
select throws_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                        pg_temp.id_of('tpl'), pg_temp.id_of('project')),
                 'P0001', 'template_wrong_status', 'once');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person')
              and kind = 'legal_template_to_validate' and subject_id = pg_temp.id_of('tpl')),
          1, 'the direction is told');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_contract_template_status(pg_temp.id_of('tpl'), 'retired', 'Durée trop longue.');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('manager_person')
              and kind = 'legal_template_refused' and subject_id = pg_temp.id_of('tpl')),
          1, 'its author is told of the refusal');
select is((select requested_for from public.contract_templates where id = pg_temp.id_of('tpl')),
          'Yanis Morel', 'the person it was made for is kept');

-- 2. A clause revised: a new version that says which clause ---------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'tpl2', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Contrat compositeur', 'publishing', array['composer'], null, 'Texte');
reset role;
update public.contract_templates set status = 'validated', validated_at = now()
 where id = pg_temp.id_of('tpl2');
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Cession ' || (select v from vars where k = 'tag'), 'publishing',
        'draft', pg_temp.id_of('project'), pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts
 where title = 'Cession ' || (select v from vars where k = 'tag');
insert into public.contract_documents
  (organization_id, contract_id, version, template_id, template_version, body)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 1, pg_temp.id_of('tpl2'), 1,
        E'Article 1. Objet.\nArticle 2. Crédit : « Sami ».');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.revise_contract_clause(%L, 'loyalty', 'x', 'Pourquoi') $$,
                        pg_temp.id_of('contract')),
                 '23514', null, 'an unknown clause is refused');
select throws_ok(format($$ select public.revise_contract_clause(%L, 'credit', %L, '') $$,
                        pg_temp.id_of('contract'), E'Article 1. Objet.\nArticle 2. Crédit : « co-composé par Sami ».'),
                 'P0001', 'contract_comment_required', 'a revision says why');
select lives_ok(format($$ select public.revise_contract_clause(%L, 'credit', %L, 'Demande de la direction.') $$,
                       pg_temp.id_of('contract'), E'Article 1. Objet.\nArticle 2. Crédit : « co-composé par Sami ».'),
                'the clause is revised');
reset role;
select is((select clause || ' · v' || version from public.contract_documents
            where contract_id = pg_temp.id_of('contract') order by version desc limit 1),
          'credit · v2', 'the new version names its clause');
select is((select comment from public.contract_documents
            where contract_id = pg_temp.id_of('contract') and version = 2),
          'Demande de la direction.', 'and why');
select throws_ok(format($$ update public.contract_documents set clause = 'credit'
                            where contract_id = %L and version = 1 $$, pg_temp.id_of('contract')),
                 '23514', null, 'the first version changes no clause');

-- 2 bis. JUR-11 (…20261028000601): PDS's signature belongs to the version it signed ---------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.advance_contract(pg_temp.id_of('contract'), 'submit');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.advance_contract(pg_temp.id_of('contract'), 'approve');
-- The person's signed copy, then the PDF PDS signs after them (20261107200101).
insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 'signed',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
        'signe.pdf', 'application/pdf', 1000),
       (pg_temp.id_of('org'), pg_temp.id_of('contract'), 'pds_signed',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
        'pds.pdf', 'application/pdf', 1000);
select public.advance_contract(pg_temp.id_of('contract'), 'countersign');
reset role;
select is((select pds_signed_version from public.contracts where id = pg_temp.id_of('contract')),
          2, 'the direction signs version 2 for PDS');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.revise_contract_clause(%L, 'credit', %L, 'Crédit corrigé.') $$,
                       pg_temp.id_of('contract'), E'Article 1. Objet.\nArticle 2. Crédit : « Sami Kader ».'),
                'a clause is revised after PDS signed');
reset role;
select ok((select pds_signed_at is null and pds_signed_by is null and pds_signed_version is null
                  and status = 'draft'
             from public.contracts where id = pg_temp.id_of('contract')),
          'the revision cancels PDS''s signature: version 3 must be signed again');
select is((select note from public.contract_events
            where contract_id = pg_temp.id_of('contract') and kind = 'contract.countersign_voided'),
          'v2', 'the history says which signature was cancelled');

-- 3. The links of a split's confirmations, kept sealed and visible --------------------------------
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Mona ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Mona ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Néons',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'v1', public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
  jsonb_build_array(jsonb_build_object('name', 'Mona', 'role', 'composer', 'share', '50'),
                    jsonb_build_object('name', 'Sami', 'role', 'composer', 'share', '50')), null);
select count(*) from public.propose_split_version(pg_temp.id_of('v1'));
insert into ids select 'conf', c.id from public.legal_split_confirmations c
  join public.legal_split_entries e on e.id = c.entry_id
 where c.version_id = pg_temp.id_of('v1') and e.name = 'Sami';
select lives_ok(format($$ select public.seal_split_confirmation_link(%L, 'v1.sealed') $$,
                       pg_temp.id_of('conf')), 'the server keeps the link sealed');
select public.mark_split_confirmation_sent(pg_temp.id_of('conf'));
select isnt((select sent_by from public.legal_split_confirmations where id = pg_temp.id_of('conf')),
            null, 'who sent it is written by the database');
-- A new version: Sami keeps the same link, still sealed and sent.
insert into ids select 'v2', public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
  jsonb_build_array(jsonb_build_object('name', 'Mona', 'role', 'composer', 'share', '60'),
                    jsonb_build_object('name', 'Sami', 'role', 'composer', 'share', '40')),
  'Mona a composé le refrain.');
select count(*) from public.propose_split_version(pg_temp.id_of('v2'));
insert into ids select 'conf2', c.id from public.legal_split_confirmations c
  join public.legal_split_entries e on e.id = c.entry_id
 where c.version_id = pg_temp.id_of('v2') and e.name = 'Sami';
select is((select link_sealed || ' · ' || (sent_at is not null)::text
             from public.legal_split_confirmations where id = pg_temp.id_of('conf2')),
          'v1.sealed · true', 'a carried link keeps its seal and its sending');
select throws_ok(format($$ select public.revoke_split_confirmation(%L, '  ') $$, pg_temp.id_of('conf2')),
                 'P0001', 'split_link_reason_required', 'a revocation says why');
select lives_ok(format($$ select public.revoke_split_confirmation(%L, 'Mauvaise adresse.') $$,
                       pg_temp.id_of('conf2')), 'the access is revoked');
select is((select status || ' · ' || revoked_reason || ' · ' || coalesce(link_sealed, 'none')
             from public.legal_split_confirmations where id = pg_temp.id_of('conf2')),
          'revoked · Mauvaise adresse. · none', 'with its reason, and the link forgotten');
reset role;
set local role anon;
select throws_ok(format($$ select public.mark_split_confirmation_sent(%L) $$, pg_temp.id_of('conf')),
                 '42501', null, 'nobody without an account touches a link');
reset role;

-- 4. Invoices (one table since 20261020060101): deposited by the person's link with their RIB,
--    read by the owner and the direction, paid by the direction only --------------------------
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Yanis ' || (select v from vars where k = 'tag'),
        array['musician']),
       (pg_temp.id_of('org'), 'person', 'Inès ' || (select v from vars where k = 'tag'),
        array['musician']);
insert into ids select 'yanis', id from public.network_contacts
 where name = 'Yanis ' || (select v from vars where k = 'tag');
insert into ids select 'ines', id from public.network_contacts
 where name = 'Inès ' || (select v from vars where k = 'tag');
insert into public.contracts (organization_id, title, type, status, signed_on, project_id,
                              owner_person_id)
values (pg_temp.id_of('org'), 'Musicien ' || (select v from vars where k = 'tag'), 'service',
        'signed', current_date, pg_temp.id_of('project'), pg_temp.id_of('manager_person'));
insert into ids select 'paid_contract', id from public.contracts
 where title = 'Musicien ' || (select v from vars where k = 'tag');
insert into public.financial_needs (organization_id, project_id, contract_id, contact_id, amount_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('paid_contract'),
        pg_temp.id_of('yanis'), 25000);
insert into ids select 'need', id from public.financial_needs
 where contract_id = pg_temp.id_of('paid_contract');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'yanis_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('yanis'));
insert into vars select 'ines_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('ines'));
reset role;
insert into ids select 'need_invoice', id from public.project_invoices
 where financial_need_id = pg_temp.id_of('need');

set local role anon;
select is((select jsonb_array_length(public.get_contact_invoices((select v from vars where k = 'yanis_token')))),
          1, 'the person''s page lists their signed contract with a fee');
select throws_ok(format($$ select public.open_legal_invoice_slot(%L, %L, 'pdf') $$,
                        (select v from vars where k = 'ines_token'), pg_temp.id_of('need')),
                 'P0001', 'invoice_link_closed', 'nobody deposits the invoice of another person');
insert into vars select 'path', public.open_legal_invoice_slot(
  (select v from vars where k = 'yanis_token'), pg_temp.id_of('need'), 'pdf');
reset role;
insert into storage.objects (bucket_id, name) values ('project-invoices', (select v from vars where k = 'path'));
set local role anon;
select throws_ok(format($$ select public.submit_legal_invoice(%L, %L, %L, 'Facture.pdf', 'application/pdf', 1000, 'YM-1', 30000, null) $$,
                        (select v from vars where k = 'yanis_token'), pg_temp.id_of('need'),
                        (select v from vars where k = 'path')),
                 '23514', 'reason_required', 'an amount that is not the fee agreed says why');
-- A RIB is needed to be paid: the first one comes with the first invoice (unified rule).
select lives_ok(format($$ select public.submit_person_invoice(%L, %L, %L, 'Facture.pdf', 'application/pdf', 'YM-1', 30000, 'Une heure de plus.', 'FR7630006000011234567890189', null, 'Yanis') $$,
                       (select v from vars where k = 'yanis_token'),
                       pg_temp.id_of('need_invoice'),
                       (select v from vars where k = 'path')),
                'the person deposits their invoice by their link');
reset role;
select is((select status from public.financial_needs where id = pg_temp.id_of('need')),
          'invoiced', 'the money is invoiced');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person')
              and kind = 'legal_invoice_received'), 1, 'the direction is told');

select pg_temp.act_as(pg_temp.id_of('manager'));
-- The owner reads the invoice like the budget (proto « Projet complet »), never a RIB.
select is((select count(*)::int from public.project_invoices i
             join public.contact_bank_accounts a on a.contact_id = i.contact_id
            where i.project_id = pg_temp.id_of('project')),
          0, 'the owner never reads the RIB');
select is((select state from public.legal_invoice_states(pg_temp.id_of('project'))),
          'to_pay', 'but sees where it stands');
select throws_ok(format($$ select public.open_legal_invoice_team_slot(%L, 'proof', 'pdf') $$,
                        pg_temp.id_of('need')),
                 '42501', null, 'only the direction pays');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select gap_reason from public.project_invoices where financial_need_id = pg_temp.id_of('need')),
          'Une heure de plus.', 'the direction reads it, with the gap explained');
insert into vars select 'proof', public.open_legal_invoice_team_slot(pg_temp.id_of('need'), 'proof', 'pdf');
reset role;
insert into storage.objects (bucket_id, name) values ('project-invoices', (select v from vars where k = 'proof'));
insert into ids select 'invoice', id from public.project_invoices where financial_need_id = pg_temp.id_of('need');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(format($$ select public.mark_legal_invoice_paid(%L, %L, %L, 'Virement.pdf') $$,
                       pg_temp.id_of('invoice'), (now() at time zone 'Europe/Paris')::date,
                       (select v from vars where k = 'proof')),
                'the direction marks it paid, with its proof');
reset role;
select is((select status from public.financial_needs where id = pg_temp.id_of('need')),
          'paid', 'the money is paid');

select * from finish();
rollback;
