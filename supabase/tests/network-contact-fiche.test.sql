-- Réseau : une fiche de renseignements par contact (…20261123210101, Sacha
-- 23/11/2026) : created with the contact (and for every existing one), its
-- link kept encrypted and read back only by who manages the Réseau and reads
-- legal details (and a private contact's coordinates), filled from /f without
-- a project, renewed with « Nouveau lien », gone with the contact.
-- Run with `supabase test db`.
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
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('alize'), ('creative'), ('bm'), ('outsider')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into public.organizations (slug, name)
values ('fiche-' || (select v from vars where k = 'tag'), 'Autre maison');
insert into ids select 'org2', id from public.organizations
 where slug = 'fiche-' || (select v from vars where k = 'tag');
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('alize', 'project_manager'),
               ('creative', 'creative_director'), ('bm', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
update public.memberships m set organization_id = (select id from ids where name = 'org2'),
                                status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = 'outsider'));

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, anon;
-- The contact's open Réseau fiche.
create function pg_temp.fiche(p text) returns public.legal_forms language sql as $$
  select * from public.legal_forms
   where contact_id = pg_temp.id_of(p) and project_id is null and status <> 'revoked'
   order by created_at desc limit 1 $$;

-- Created with the contact ----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Nadia ' || pg_temp.tag(), array['artist', 'songwriter'],
        'nadia-' || pg_temp.tag() || '@exemple.fr');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Label ' || pg_temp.tag(), array['label']);
reset role;
insert into ids select 'nadia', id from public.network_contacts where name = 'Nadia ' || pg_temp.tag();
insert into ids select 'label', id from public.network_contacts where name = 'Label ' || pg_temp.tag();

select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('nadia') and project_id is null), 1,
  'a new contact has its Réseau fiche at once');
select is((pg_temp.fiche('nadia')).status, 'link_generated', 'not sent yet');
select is((pg_temp.fiche('nadia')).expires_at, 'infinity'::timestamptz, 'it never expires');
select is((select count(*)::int from public.legal_form_secrets
            where form_id = (pg_temp.fiche('nadia')).id), 1, 'its link is kept, encrypted');
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('label') and project_id is null), 1,
  'a structure too');

-- Backfill: every contact of the Réseau not archived has one.
select is((select count(*)::int from public.network_contacts c
            where c.archived_at is null
              and not exists (select 1 from public.legal_forms f
                               where f.contact_id = c.id and f.project_id is null
                                 and f.status <> 'revoked')), 0,
  'every existing contact got its Réseau fiche');

-- Who reads it ------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
insert into vars select 'token', public.network_contact_fiche(pg_temp.id_of('nadia')) ->> 'token';
select is(encode(sha256(convert_to((select v from vars where k = 'token'), 'UTF8')), 'hex'),
          (select token_hash from public.legal_forms
            where id = (select (public.network_contact_fiche(pg_temp.id_of('nadia')) ->> 'id')::uuid)),
  'a project manager reads the link back, the one whose hash opens the fiche');
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('nadia') and project_id is null), 1,
  'and sees the fiche');
select throws_ok($$ select * from public.legal_form_secrets $$, '42501', null,
  'nobody reads the encrypted links through the API');
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
select is(public.network_contact_fiche(pg_temp.id_of('nadia')), null,
  'a creative director (no legal details) gets no link');
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('nadia') and project_id is null), 0,
  'nor the fiche');
select throws_ok($$ select public.renew_network_contact_fiche(pg_temp.id_of('nadia')) $$,
  '42501', 'forbidden', 'nor renews it');
select throws_ok($$ select public.mark_network_contact_fiche_sent(pg_temp.id_of('nadia')) $$,
  '42501', 'forbidden', 'nor marks it sent');
reset role;

select pg_temp.act_as(pg_temp.id_of('outsider'));
select is(public.network_contact_fiche(pg_temp.id_of('nadia')), null,
  'another organization gets no link');
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('nadia')), 0, 'nor the fiche');
reset role;

select pg_temp.act_as(pg_temp.id_of('bm'));
select ok(public.network_contact_fiche(pg_temp.id_of('nadia')) ->> 'token' is not null,
  'a business manager (contracts) reads it');
reset role;

-- A private contact's link stays with whoever reads its coordinates.
select pg_temp.act_as(pg_temp.id_of('alize'));
select public.make_contact_private(pg_temp.id_of('nadia'));
select ok(public.network_contact_fiche(pg_temp.id_of('nadia')) is not null,
  'its owner still reads the link of a private contact');
reset role;
select pg_temp.act_as(pg_temp.id_of('bm'));
select is(public.network_contact_fiche(pg_temp.id_of('nadia')), null,
  'a member who may not read its coordinates does not');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select ok(public.network_contact_fiche(pg_temp.id_of('nadia')) is not null, 'the direction does');
reset role;

-- The public page, without a project ---------------------------------------------------------
set local role anon;
select is(public.get_legal_form((select v from vars where k = 'token')) ->> 'state', 'open',
  'the link opens the fiche without an account');
select is(public.get_legal_form((select v from vars where k = 'token')) -> 'project', 'null'::jsonb,
  'without a project');
select is(public.get_legal_form((select v from vars where k = 'token')) #> '{prefill,roles}',
          '["author", "performer"]'::jsonb, 'the roles to tick come from the Réseau');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into vars select 'label_token', public.network_contact_fiche(pg_temp.id_of('label')) ->> 'token';
reset role;
set local role anon;
select is(public.get_legal_form((select v from vars where k = 'label_token')) #>> '{prefill,answers,entity_type}',
          'company', 'a structure starts as a company');
reset role;

select pg_temp.act_as(pg_temp.id_of('alize'));
select public.mark_network_contact_fiche_sent(pg_temp.id_of('nadia'));
reset role;
select is((pg_temp.fiche('nadia')).status, 'sent', '« Marquer comme envoyé »');

set local role anon;
select is(public.submit_legal_form((select v from vars where k = 'token'), array['performer'], null,
            jsonb_build_object('legal_first_name', 'Nadia', 'legal_last_name', 'Benali',
                               'entity_type', 'person', 'address', '1 rue de Paris'),
            '{}'::jsonb, 2), 'action_required', 'the person sends it');
reset role;
select is((select details ->> 'legal_last_name' from public.contact_legal_details
            where contact_id = pg_temp.id_of('nadia')), 'Benali',
  'the answers land on the contact, for every project fiche after it');
select is((select count(*)::int from public.legal_form_submissions
            where contact_id = pg_temp.id_of('nadia') and project_id is null), 1,
  'kept as a submission without a project');

-- « Nouveau lien » ----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
insert into vars select 'renewed', public.renew_network_contact_fiche(pg_temp.id_of('label'))::text;
reset role;
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('label') and project_id is null
              and status = 'link_generated'), 1, 'one open link after « Nouveau lien »');
select is((select count(*)::int from public.legal_forms
            where contact_id = pg_temp.id_of('label') and project_id is null
              and status = 'revoked'), 1, 'the former one stops working');

-- Deleting the contact takes its Réseau fiche ------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select error from public.delete_records('contact', array[pg_temp.id_of('label')])), null,
  'a contact with its Réseau fiche can still be deleted');
reset role;

select * from finish();
rollback;
