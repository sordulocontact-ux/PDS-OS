-- PROJ-BUG-03: the legal parties of the Cadrage, qualified one by one by a
-- person (supabase/migrations/20261011400201_framing_legal_parties.sql).
-- Run with `supabase test db`.
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
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('lp-director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('lp-owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('lp-other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'LP ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
select public.start_framing_without_call(pg_temp.id_of('project'));

-- A contract in preparation, and a signed one (as the database would hold them).
reset role;
with c as (
  insert into public.contracts (organization_id, title, type, owner_person_id)
  values (pg_temp.id_of('org'), 'Contrat de mixage', 'service', pg_temp.id_of('owner_person'))
  returning id)
insert into ids select 'draft', id from c;
with c as (
  insert into public.contracts (organization_id, title, type, status, signed_on, owner_person_id)
  values (pg_temp.id_of('org'), 'Contrat d''artiste', 'artist', 'signed', current_date,
          pg_temp.id_of('owner_person'))
  returning id)
insert into ids select 'signed', id from c;

create function pg_temp.qualify(p_key text, p_status text, p_contract uuid, p_note text)
returns void language sql as $$
  insert into public.framing_legal_parties
    (organization_id, project_id, party_key, name, document_status, contract_id, note)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), p_key, p_key, p_status, p_contract, p_note)
$$;
grant execute on function pg_temp.qualify(text, text, uuid, text) to authenticated;

-- Qualifications -------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select pg_temp.qualify('mixeur', 'existing', null, null) $$,
                 '23514', null, '« Existant » without a contract: refused, an arrangement is no contract');
select lives_ok($$ select pg_temp.qualify('interprete', 'existing', pg_temp.id_of('signed'), null) $$,
                'the performer covered by a signed contract is « Existant »');
select throws_ok($$ select pg_temp.qualify('masteriseur', 'not_needed', null, null) $$,
                 '23514', null, '« Non nécessaire » needs a reason');
select lives_ok($$ select pg_temp.qualify('masteriseur', 'not_needed', null, 'Facture de prestation seulement') $$,
                'with its reason it is recorded');
select lives_ok($$ select pg_temp.qualify('producteur', 'to_verify', pg_temp.id_of('draft'), null) $$,
                'a producer with a contract in preparation is « À vérifier »');
select throws_ok($$ select pg_temp.qualify('producteur', 'to_prepare', null, null) $$,
                 '23505', null, 'one decision per party: no duplicate');
select is((select decided_by from public.framing_legal_parties
            where project_id = pg_temp.id_of('project') and party_key = 'interprete'),
          pg_temp.id_of('owner_person'), 'who decided is written by the database');

-- Someone else ---------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select pg_temp.qualify('autre', 'to_prepare', null, null) $$,
                 '42501', null, 'a member who is not the project''s owner qualifies nobody');

-- Gone with its proof ----------------------------------------------------------
reset role;
delete from public.contracts where id = pg_temp.id_of('signed');
select is((select count(*)::int from public.framing_legal_parties
            where project_id = pg_temp.id_of('project') and party_key = 'interprete'),
          0, 'the proof deleted, the party is « à qualifier » again');

select * from finish();
rollback;
