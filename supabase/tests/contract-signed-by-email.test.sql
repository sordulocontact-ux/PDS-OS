-- Every contract signed and sent back by e-mail (20261123110101): the cron files the PDFs as
-- « Signé » and the e-mail as « Preuve de signature » in a contract sent for signature, the
-- party whose address sent it named, its owner told. Run with `supabase test db`.
begin;
select plan(9);

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
grant all on ids to authenticated, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('glen'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('glen', 'business_manager'),
               ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'glen', 'other_pm');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, service_role;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, service_role;
create function pg_temp.memo(p integer) returns uuid language sql as $$
  select id from public.deal_memos where deal_id = pg_temp.id_of('deal') and number = p $$;
grant execute on function pg_temp.memo(integer) to authenticated, service_role;
create function pg_temp.told(p_who text, p_kind text) returns integer language sql as $$
  select count(*)::int from public.notifications
   where recipient_person_id = pg_temp.id_of(p_who || '_person') and kind = p_kind
     and subject_id = pg_temp.id_of('deal') $$;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Jay ' || pg_temp.tag(), 'collaboration');
insert into ids select 'jay', id from public.artists where name = 'Jay ' || pg_temp.tag();
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Eben ' || pg_temp.tag(), array[]::text[]);
insert into ids select 'eben', id from public.network_contacts where name = 'Eben ' || pg_temp.tag();

-- A label in the Réseau, party of two contracts: one sent, one only approved.
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'organization', 'Label ' || pg_temp.tag(), array[]::text[],
        'contrats-' || pg_temp.tag() || '@label.fr');
insert into ids select 'label', id from public.network_contacts where name = 'Label ' || pg_temp.tag();
insert into public.contracts (organization_id, title, type, status, owner_person_id, sent_via, sent_how, sent_on)
values (pg_temp.id_of('org'), 'Envoyé ' || pg_temp.tag(), 'license', 'sent', pg_temp.id_of('glen_person'),
        'other', 'Envoyé par PDS OS', current_date);
insert into public.contracts (organization_id, title, type, status, owner_person_id)
values (pg_temp.id_of('org'), 'Validé ' || pg_temp.tag(), 'license', 'approved', pg_temp.id_of('glen_person'));
insert into ids select 'sent', id from public.contracts where title = 'Envoyé ' || pg_temp.tag();
insert into ids select 'approved', id from public.contracts where title = 'Validé ' || pg_temp.tag();
insert into public.contract_parties (contract_id, organization_id, contact_id)
values (pg_temp.id_of('sent'), pg_temp.id_of('org'), pg_temp.id_of('label')),
       (pg_temp.id_of('approved'), pg_temp.id_of('org'), pg_temp.id_of('label'));

-- The files uploaded by the cron, before it calls the function.
create function pg_temp.files(p text) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('path', pg_temp.id_of('org') || '/' || pg_temp.id_of(p) || '/' || md5(p || pg_temp.tag() || 'pdf')::uuid || '.pdf',
                       'file_name', 'Contrat signé.pdf', 'mime', 'application/pdf', 'category', 'signed'),
    jsonb_build_object('path', pg_temp.id_of('org') || '/' || pg_temp.id_of(p) || '/' || md5(p || pg_temp.tag() || 'eml')::uuid || '.eml',
                       'file_name', 'E-mail.eml', 'mime', 'message/rfc822', 'category', 'evidence')) $$;
grant execute on function pg_temp.files(text) to service_role, authenticated;
insert into storage.objects (bucket_id, name, metadata)
select 'contract-files', f->>'path', jsonb_build_object('size', 1200)
  from jsonb_array_elements(pg_temp.files('sent') || pg_temp.files('approved')) f;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(
  $$ select public.receive_contract_signed_copy(pg_temp.id_of('sent'), 'x@label.fr', pg_temp.files('sent')) $$,
  '42501', null, 'members cannot file a signed copy: only the cron');
reset role;

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select is(public.receive_contract_signed_copy(pg_temp.id_of('approved'),
            'contrats-' || pg_temp.tag() || '@label.fr', pg_temp.files('approved')),
          false, 'never in a contract not sent for signature');
select is(public.receive_contract_signed_copy(pg_temp.id_of('sent'),
            'Contrats-' || pg_temp.tag() || '@label.fr', pg_temp.files('sent')),
          true, 'the signed copy of the contract sent is kept');
select is(public.receive_contract_signed_copy(pg_temp.id_of('sent'),
            'contrats-' || pg_temp.tag() || '@label.fr', pg_temp.files('sent')),
          false, 'once: a contract already holding its signed copy is left');
reset role;

select is((select via_contact_id from public.contract_files
            where contract_id = pg_temp.id_of('sent') and category = 'signed'),
          pg_temp.id_of('label'), 'the signed copy names the party whose address sent it');
select is((select count(*)::int from public.contract_files
            where contract_id = pg_temp.id_of('sent') and category = 'evidence'
              and description = 'Reçu par e-mail'),
          1, 'the e-mail is kept as its proof');
select is((select note from public.contract_events
            where contract_id = pg_temp.id_of('sent') and kind = 'signature.emailed'),
          'Label ' || pg_temp.tag(), 'logged in the contract, by the party');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('glen_person') and kind = 'contract_signed_emailed'
              and subject_id = pg_temp.id_of('sent')),
          1, 'its owner is told');
select is((select status from public.contracts where id = pg_temp.id_of('sent')),
          'sent', 'nothing is decided: the contract is not marked signed');

select * from finish();
rollback;
