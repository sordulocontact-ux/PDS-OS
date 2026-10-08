-- Contracts from templates, follow-ups of 07/10/2026
-- (supabase/migrations/20261007000301_contracts_automation.sql): automatic
-- generation followed by the project owner, the template's source file, a
-- signed publishing contract ticking the SACEM bulletins. Run with
-- `supabase test db`. Test data only: the signatures here are SIMULATED.
begin;
select plan(11);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Mila ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Mila ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Nuit blanche',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'master_2', public.create_master(
  pg_temp.id_of('org'), 'Soleil levant',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Lumières ' || (select v from vars where k = 'tag'), 'music_release',
        'ep', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Lumières ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master_2'), 2);
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Jean ' || (select v from vars where k = 'tag'),
        array['songwriter']);
insert into ids select 'jean', id from public.network_contacts
 where name = 'Jean ' || (select v from vars where k = 'tag');

-- The source file of a template ------------------------------------------------
insert into storage.objects (bucket_id, name)
values ('contract-template-sources', pg_temp.id_of('org') || '/source-' || (select v from vars where k = 'tag') || '.docx');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.create_contract_template(%L, null, 'X', 'publishing',
                          array['composer'], null, 'x', %L, 'x.docx') $$,
                        pg_temp.id_of('org'), gen_random_uuid() || '/source.docx'),
                 'P0001', 'template_source_invalid', 'a source file outside the organization is refused');
select throws_ok(format($$ select public.create_contract_template(%L, null, 'X', 'publishing',
                          array['composer'], null, 'x', %L, 'x.docx') $$,
                        pg_temp.id_of('org'), pg_temp.id_of('org') || '/missing.docx'),
                 'P0001', 'template_source_invalid', 'a source file that was not uploaded is refused');
insert into ids select 'template', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Cession compositeur', 'publishing', array['composer'], null,
  'Entre PDS et {{personne.nom_civil}}.',
  pg_temp.id_of('org') || '/source-' || (select v from vars where k = 'tag') || '.docx',
  'Contrat Jean.docx');
select is((select source_name from public.contract_templates where id = pg_temp.id_of('template')),
          'Contrat Jean.docx', 'a template keeps the file it was imported from');

-- Automatic generation, followed by the project owner ------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_contract_template_status(pg_temp.id_of('template'), 'validated');
select public.approve_contract_mapping(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('contact_id', pg_temp.id_of('jean'), 'needed', true,
                     'roles', jsonb_build_array('composer'), 'template_id', pg_temp.id_of('template'))));
insert into ids select 'need', id from public.legal_agreement_needs where project_id = pg_temp.id_of('project');
insert into ids select 'contract', public.generate_legal_contract(
  pg_temp.id_of('need'),
  jsonb_build_object('personne.nom_civil', jsonb_build_object('value', 'Jean Dupont', 'source', 'Réseau')),
  true);
select is((select owner_person_id from public.contracts where id = pg_temp.id_of('contract')),
          pg_temp.id_of('manager_person'),
          'a contract generated by whoever opened the page is followed by the project owner');
select is((select note from public.contract_events
            where contract_id = pg_temp.id_of('contract') and kind = 'contract.generated'),
          'Cession compositeur v1 · automatique', 'the journal says it was generated automatically');
select throws_ok(format($$ select public.generate_legal_contract(%L, '{}'::jsonb, true) $$, pg_temp.id_of('need')),
                 'P0001', 'agreement_already_generated', 'an agreement is generated once');

-- A signed publishing contract ticks the bulletins being prepared ----------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'f', public.open_formality(pg_temp.id_of('project'), pg_temp.id_of('master'), 'SACEM_725_EDITED_WORK');
insert into ids select 'f2', public.open_formality(pg_temp.id_of('project'), pg_temp.id_of('master_2'), 'SACEM_725_EDITED_WORK');
select public.save_formality_values(pg_temp.id_of('f'), jsonb_build_object(
  'publishing_contract', jsonb_build_object('value', jsonb_build_object('provided', false, 'rubric_g', ''),
                                            'source', 'Saisi')));
reset role;
-- The second bulletin is already generated (forced here).
update public.legal_formalities set status = 'document_ready' where id = pg_temp.id_of('f2');

-- A contract of another type changes nothing.
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Prestation', 'service', 'sent', pg_temp.id_of('project'),
        pg_temp.id_of('manager_person'));
update public.contracts set status = 'signed', signed_on = current_date
 where project_id = pg_temp.id_of('project') and title = 'Prestation';
select is((select value ->> 'provided' from public.legal_formality_values
            where formality_id = pg_temp.id_of('f') and field_key = 'publishing_contract'),
          'false', 'a contract that is not a publishing contract ticks nothing');

update public.contracts set status = 'sent' where id = pg_temp.id_of('contract');
update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract');
select is((select (value ->> 'provided') || ' · ' || source from public.legal_formality_values
            where formality_id = pg_temp.id_of('f') and field_key = 'publishing_contract'),
          'true · Contrat signé : ' || (select title from public.contracts where id = pg_temp.id_of('contract')),
          'the signed publishing contract ticks « copie jointe », with the contract as its source');
select is((select count(*)::int from public.legal_formality_events
            where formality_id = pg_temp.id_of('f') and kind = 'contract.signed'), 1,
          'the bulletin''s history says so');
select is((select count(*)::int from public.legal_formality_values
            where formality_id = pg_temp.id_of('f2') and field_key = 'publishing_contract'), 0,
          'a bulletin already generated is not changed');
select alike((select note from public.legal_formality_events
               where formality_id = pg_temp.id_of('f2') and kind = 'contract.signed'),
             '%à joindre au dépôt%', 'it is told to join the contract to the filing');

select * from finish();
rollback;
