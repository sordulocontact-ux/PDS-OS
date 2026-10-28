-- JUR-06 (recette Juridique V1, 21/10/2026): a received fiche is not complete.
-- It waits for the team's validation; what is missing is asked again, and the
-- person sees only those fields on their private link
-- (supabase/migrations/20261024000101_legal_form_validation.sql).
-- Run with `supabase test db`.
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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
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

-- Maya is in the Réseau with an e-mail -----------------------
reset role;
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Maya ' || (select v from vars where k = 'tag'),
        array['artist'], 'maya@example.com');
insert into ids select 'maya', id from public.network_contacts
 where name = 'Maya ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
create temp table links (token text, form uuid) on commit drop;
grant all on links to authenticated, anon;
insert into links select token, form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), pg_temp.id_of('maya'), 'Maya ' || (select v from vars where k = 'tag'),
  array['artist'], '{}', '{}'::jsonb, 1);

-- Maya sends her fiche without her address --------------------------------------------------
reset role;
set local role anon;
select is(public.submit_legal_form((select token from links), array['artist'], null,
          '{"legal_first_name": "Maya", "legal_last_name": "Lenoir", "entity_type": "person", "email": "maya@example.com"}'::jsonb, '{}'::jsonb, 1),
          'action_required', 'a received fiche waits for validation');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(
  format('select public.review_legal_form(%L, true)', (select form from links)),
  'P0001', 'legal_form_incomplete', 'a fiche missing its address is never validated, even called directly (JUR-06)');

-- The team asks for the address ----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(
  format('select public.request_legal_form_complement(%L, array[''address''], null)', (select form from links)),
  '42501', null, 'only manage_legal asks for a complement');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(
  format('select public.request_legal_form_complement(%L, array[''address'', ''bad key!''], %L)',
         (select form from links), 'Il manque votre adresse.'),
  'the owner asks for what is missing');
select throws_ok(
  format('select public.review_legal_form(%L, true)', (select form from links)),
  'P0001', 'legal_form_complement_pending', 'no validation while a complement is awaited');

-- Her private link shows only the missing field --------------------------------------------------
reset role;
set local role anon;
select is(public.get_legal_form((select token from links)) ->> 'state', 'complement',
          'the link opens on the complement');
select is(public.get_legal_form((select token from links)) -> 'missing', '["address"]'::jsonb,
          'with only the field asked (an invalid key is dropped)');
select throws_ok(
  format('select public.submit_legal_form_complement(%L, %L::jsonb)', (select token from links),
         '{"address": "  "}'),
  'P0001', 'legal_form_invalid', 'an empty answer is refused');
select is(public.submit_legal_form_complement((select token from links),
          '{"address": "3 rue des Lilas, Paris", "iban": "FR76"}'::jsonb),
          'action_required', 'the complement is received, back to the team');
reset role;
select is((select person ->> 'address' from public.legal_form_submissions
            where form_id = (select form from links) order by created_at desc limit 1),
          '3 rue des Lilas, Paris', 'the answer joins the fiche, nothing else is taken');

-- Validated --------------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.review_legal_form((select form from links), true);
reset role;
select is((select status || ' · ' || (validated_by = pg_temp.id_of('manager_person'))::text
             from public.legal_forms where id = (select form from links)),
          'complete · true', 'validated by the owner');

reset role;
select * from finish();
rollback;
