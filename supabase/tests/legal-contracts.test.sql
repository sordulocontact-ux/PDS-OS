-- Juridique, branch 03: agreements generated from validated templates
-- (supabase/migrations/20261005001001_contract_templates.sql). Run with
-- `supabase test db`. Fixture of the ticket (« Piégée », test data only:
-- the signatures here are SIMULATED): Ever 600 €, Samy 350 €, Le J 350 €.
begin;
select plan(20);

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

reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');

-- Three people of the Réseau, their fiche complete.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Ever', array['songwriter']),
       (pg_temp.id_of('org'), 'person', 'Samy', array['songwriter']),
       (pg_temp.id_of('org'), 'person', 'Le J', array['songwriter']);
insert into ids select lower(replace(name, ' ', '')), id from public.network_contacts
 where organization_id = pg_temp.id_of('org') and name in ('Ever', 'Samy', 'Le J')
   and created_at = now();

-- Templates -----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'template', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Cession compositeur', 'publishing', array['composer'], null,
  'Entre PDS et {{personne.nom_civil}}, pour « {{ projet.titre }} ». Rémunération : {{remuneration}}.');
select is((select fields from public.contract_templates where id = pg_temp.id_of('template')),
          array['personne.nom_civil', 'projet.titre', 'remuneration'],
          'the placeholders of a template are read from its text');
select throws_ok($$ select public.set_contract_template_status(pg_temp.id_of('template'), 'validated') $$,
                 '42501', 'forbidden', 'a project manager does not validate a template');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.create_contract_template(pg_temp.id_of('org'), null, 'X', 'other', array['other'], null, 'x') $$,
                 '42501', 'forbidden', 'a creative director does not write templates');

select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_contract_template_status(pg_temp.id_of('template'), 'validated');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'template_v2', public.create_contract_template(
  pg_temp.id_of('org'), (select series_id from public.contract_templates where id = pg_temp.id_of('template')),
  'Cession compositeur', 'publishing', array['composer'], null, 'Version 2 {{remuneration}}');
select is((select version from public.contract_templates where id = pg_temp.id_of('template_v2')), 2,
          'a correction is a new version of the same template');
select is((select status from public.contract_templates where id = pg_temp.id_of('template')), 'validated',
          'the validated version stays in use until the next one is validated');

-- The mapping, at once ----------------------------------------------------------
select throws_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('ever'), 'needed', true,
    'roles', jsonb_build_array('composer'), 'template_id', pg_temp.id_of('template_v2')))),
  'P0001', 'mapping_template_not_validated', 'only a validated template is proposed');
select public.approve_contract_mapping(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('contact_id', pg_temp.id_of('ever'), 'needed', true, 'roles', jsonb_build_array('composer'),
                     'template_id', pg_temp.id_of('template'), 'fee_cents', 60000),
  jsonb_build_object('contact_id', pg_temp.id_of('samy'), 'needed', true, 'roles', jsonb_build_array('composer'),
                     'template_id', pg_temp.id_of('template'), 'fee_cents', 35000),
  jsonb_build_object('contact_id', pg_temp.id_of('lej'), 'needed', true, 'roles', jsonb_build_array('composer'),
                     'template_id', pg_temp.id_of('template'), 'fee_cents', 35000)));
select is((select count(*)::int from public.legal_agreement_needs where project_id = pg_temp.id_of('project')), 3,
          'the mapping is approved at once');
insert into ids select 'need_' || lower(replace(c.name, ' ', '')), n.id
  from public.legal_agreement_needs n join public.network_contacts c on c.id = n.contact_id
 where n.project_id = pg_temp.id_of('project');

-- Generation ------------------------------------------------------------------
select throws_ok(format($$ select public.generate_legal_contract(%L, '{"personne.nom_civil": {"value": "Evan Ever"}}'::jsonb) $$,
                        pg_temp.id_of('need_ever')),
                 'P0001', 'contract_fields_missing', 'a copy is not generated while a value is missing');

create function pg_temp.fields(p_name text, p_fee text) returns jsonb language sql as $$
  select jsonb_build_object(
    'personne.nom_civil', jsonb_build_object('value', p_name, 'source', 'Fiche de renseignements'),
    'projet.titre', jsonb_build_object('value', 'Piégée', 'source', 'Projet'),
    'remuneration', jsonb_build_object('value', p_fee, 'source', 'Cartographie'))
$$;
insert into ids select 'contract_ever', public.generate_legal_contract(
  pg_temp.id_of('need_ever'), pg_temp.fields('Evan Ever', '600 €'));
select is((select body from public.contract_documents where contract_id = pg_temp.id_of('contract_ever')),
          'Entre PDS et Evan Ever, pour « Piégée ». Rémunération : 600 €.',
          'the copy is filled from the values given');
select alike((select body from public.contract_templates where id = pg_temp.id_of('template')),
            '%{{remuneration}}%', 'the original template is unchanged');
select is((select template_version || ' ' || (fields -> 'remuneration' ->> 'source')
             from public.contract_documents where contract_id = pg_temp.id_of('contract_ever')),
          '1 Cartographie', 'the copy keeps its template version and the source of each value');

-- An explicit change of clauses ------------------------------------------------------
select throws_ok(format($$ select public.revise_contract_document(%L, 'Autre texte', null) $$,
                        pg_temp.id_of('contract_ever')),
                 'P0001', 'contract_comment_required', 'a clause change says why');
select public.revise_contract_document(pg_temp.id_of('contract_ever'),
  'Entre PDS et Evan Ever, pour « Piégée ». Rémunération : 600 €. Crédit : Ever.', 'Ajout du crédit');
select is((select max(version)::int from public.contract_documents where contract_id = pg_temp.id_of('contract_ever')), 2,
          'a clause change is a new version');

-- Review, sending and signature with proof (SIMULATED) ------------------------------------
create function pg_temp.to_review(p_contract uuid) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.id_of('manager'));
  perform public.advance_contract(p_contract, 'submit');
  perform pg_temp.act_as(pg_temp.id_of('director'));
  perform public.advance_contract(p_contract, 'approve');
  perform pg_temp.act_as(pg_temp.id_of('manager'));
end $$;
create function pg_temp.add_file(p_contract uuid, p_category text) returns void language sql as $$
  insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), p_contract, p_category,
          pg_temp.id_of('org') || '/' || p_contract || '/' || gen_random_uuid() || '.pdf',
          p_category || '.pdf', 'application/pdf', 1000)
$$;

select pg_temp.to_review(pg_temp.id_of('contract_ever'));
select throws_ok(format($$ select public.advance_contract(%L, 'send') $$, pg_temp.id_of('contract_ever')),
                 'P0001', 'contract_send_proof_required', 'a generated contract is not sent without saying how');
select public.advance_contract(pg_temp.id_of('contract_ever'), 'send', 'E-mail à Ever le 05/10 (SIMULÉ)');
select pg_temp.add_file(pg_temp.id_of('contract_ever'), 'signed');
select throws_ok(format($$ select public.advance_contract(%L, 'sign', null, current_date) $$, pg_temp.id_of('contract_ever')),
                 'P0001', 'contract_proof_missing', 'the signature is not recorded without its proof');
select pg_temp.add_file(pg_temp.id_of('contract_ever'), 'evidence');
select public.advance_contract(pg_temp.id_of('contract_ever'), 'sign', null, current_date);

reset role;
select is((select amount_cents || ' ' || status from public.financial_needs
            where contract_id = pg_temp.id_of('contract_ever')),
          '60000 waiting_for_invoice', 'contract.signed(Ever) creates 600 € waiting for the invoice');
-- Signing again (after a terminate and a reset, forced here) adds nothing.
update public.contracts set status = 'sent', signed_on = null where id = pg_temp.id_of('contract_ever');
update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract_ever');
select is((select count(*)::int from public.financial_needs where contract_id = pg_temp.id_of('contract_ever')), 1,
          'without a duplicate');

-- Samy and Le J.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'contract_samy', public.generate_legal_contract(
  pg_temp.id_of('need_samy'), pg_temp.fields('Samy', '350 €'));
insert into ids select 'contract_lej', public.generate_legal_contract(
  pg_temp.id_of('need_lej'), pg_temp.fields('Le J', '350 €'));
select pg_temp.to_review(pg_temp.id_of('contract_samy'));
select pg_temp.to_review(pg_temp.id_of('contract_lej'));
select pg_temp.add_file(pg_temp.id_of('contract_samy'), 'signed');
select pg_temp.add_file(pg_temp.id_of('contract_samy'), 'evidence');
select pg_temp.add_file(pg_temp.id_of('contract_lej'), 'signed');
select pg_temp.add_file(pg_temp.id_of('contract_lej'), 'evidence');
select public.advance_contract(pg_temp.id_of('contract_samy'), 'sign', null, current_date);
select public.advance_contract(pg_temp.id_of('contract_lej'), 'sign', null, current_date);
select is((select sum(amount_cents)::int || ' ' || count(*) || ' ' || string_agg(distinct status, ',')
             from public.financial_needs where project_id = pg_temp.id_of('project')),
          '130000 3 waiting_for_invoice', 'the three fees wait for their invoice, none is to pay');

select is((select count(*)::int from public.contract_events
            where contract_id = pg_temp.id_of('contract_ever')
              and kind in ('contract.generated', 'contract.revised', 'contract.approved',
                           'signature.requested', 'contract.signed', 'financial_need.created')), 6,
          'each step is in the contract''s journal');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.legal_agreement_needs where project_id = pg_temp.id_of('project')), 0,
          'the mapping is not read without manage_legal');

select * from finish();
rollback;
