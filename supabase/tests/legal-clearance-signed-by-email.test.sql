-- The authorisation contract sent back signed by e-mail
-- (supabase/migrations/20261109160101_clearance_signed_by_email.sql): kept by
-- the cron only, in the contract sent for signature, the PDF as « Signé » (from
-- the holder whose address sent it), the e-mail as its proof, once.
begin;
select plan(8);

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
grant all on ids to authenticated, service_role;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
-- The files as the cron describes them, once uploaded.
create function pg_temp.files(p_contract text) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('path', pg_temp.id_of('org') || '/' || pg_temp.id_of(p_contract) || '/'
                               || pg_temp.id_of('pdf_' || p_contract) || '.pdf',
                       'file_name', 'Contrat signé.pdf', 'mime', 'application/pdf',
                       'category', 'signed'),
    jsonb_build_object('path', pg_temp.id_of('org') || '/' || pg_temp.id_of(p_contract) || '/'
                               || pg_temp.id_of('eml_' || p_contract) || '.eml',
                       'file_name', 'E-mail.eml', 'mime', 'message/rfc822',
                       'category', 'evidence'))
$$;

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Signé ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Signé ' || (select v from vars where k = 'tag');
insert into public.legal_clearances (organization_id, project_id, element, work, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'sample', 'bir haikem', 'document_pending');
insert into ids select 'clearance', id from public.legal_clearances
 where project_id = pg_temp.id_of('project');
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'organization', 'Éditions ' || (select v from vars where k = 'tag'),
        array['publisher'], 'Ed@Editions.fr');
insert into ids select 'holder', id from public.network_contacts
 where name = 'Éditions ' || (select v from vars where k = 'tag');
insert into public.legal_clearance_rightsholders (organization_id, clearance_id, "right", name, role, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'work', 'Éditions', 'publisher',
        pg_temp.id_of('holder'));

insert into public.contracts (organization_id, title, type, owner_person_id, project_id, status)
values (pg_temp.id_of('org'), 'Sent ' || (select v from vars where k = 'tag'), 'license',
        pg_temp.id_of('manager_person'), pg_temp.id_of('project'), 'sent'),
       (pg_temp.id_of('org'), 'Approved ' || (select v from vars where k = 'tag'), 'license',
        pg_temp.id_of('manager_person'), pg_temp.id_of('project'), 'approved');
insert into ids select 'sent', id from public.contracts
 where title = 'Sent ' || (select v from vars where k = 'tag');
insert into ids select 'approved', id from public.contracts
 where title = 'Approved ' || (select v from vars where k = 'tag');
insert into public.legal_clearance_contracts (organization_id, clearance_id, "right", contract_id)
values (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'work', pg_temp.id_of('sent')),
       (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'master', pg_temp.id_of('approved'));

-- The files uploaded by the cron, before it calls the function.
insert into ids values ('pdf_sent', gen_random_uuid()), ('eml_sent', gen_random_uuid()),
                       ('pdf_approved', gen_random_uuid()), ('eml_approved', gen_random_uuid());
insert into storage.objects (bucket_id, name, metadata)
select 'contract-files', f->>'path', jsonb_build_object('size', 1200)
  from jsonb_array_elements(pg_temp.files('sent') || pg_temp.files('approved')) f;

-- A member cannot: only the cron.
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(
  $$ select public.receive_clearance_signed_copy(pg_temp.id_of('clearance'), pg_temp.id_of('sent'),
                                                 'ed@editions.fr', pg_temp.files('sent')) $$,
  '42501', null, 'members cannot file a signed copy');

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select is(public.receive_clearance_signed_copy(pg_temp.id_of('clearance'), pg_temp.id_of('approved'),
                                               'ed@editions.fr', pg_temp.files('approved')),
          false, 'never in a contract not sent for signature');
select is(public.receive_clearance_signed_copy(pg_temp.id_of('clearance'), pg_temp.id_of('sent'),
                                               'ed@editions.fr', pg_temp.files('sent')),
          true, 'the cron keeps the signed copy of the contract sent');
select is(public.receive_clearance_signed_copy(pg_temp.id_of('clearance'), pg_temp.id_of('sent'),
                                               'ed@editions.fr', pg_temp.files('sent')),
          false, 'once: a contract already holding its signed copy is left');

reset role;
select is((select via_contact_id from public.contract_files
            where contract_id = pg_temp.id_of('sent') and category = 'signed'),
          pg_temp.id_of('holder'), 'the signed copy names the holder whose address sent it');
select is((select count(*)::int from public.contract_files
            where contract_id = pg_temp.id_of('sent') and category = 'evidence'
              and description = 'Reçu par e-mail'),
          1, 'the e-mail is kept as its proof');
select is((select note from public.contract_events
            where contract_id = pg_temp.id_of('sent') and kind = 'signature.emailed'),
          'Éditions ' || (select v from vars where k = 'tag'), 'logged in the contract, by the holder');
select is((select status from public.contracts where id = pg_temp.id_of('sent')),
          'sent', 'nothing is decided: the contract is not marked signed');

select * from finish();
rollback;
