-- A fiche that corrects the Réseau's e-mail is a correction to review
-- (supabase/migrations/20261010000101_legal_form_contact_corrections.sql).
-- Run with `supabase test db`.
begin;
select plan(7);

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

-- She corrects her e-mail ---------------------------------------------------------------
reset role;
set local role anon;
select is(public.submit_legal_form((select token from links), array['artist'], null,
          '{"legal_first_name": "Maya", "email": "maya.lenoir@example.com"}'::jsonb, '{}'::jsonb, 1),
          'action_required', 'a fiche that changes the Réseau''s e-mail waits for review');
reset role;
select is((select corrections #>> '{email,before}' from public.legal_form_submissions
            where form_id = (select form from links)),
          'maya@example.com', 'the correction keeps the e-mail it replaces');
select is((select coalesce(details ->> 'email', 'none') from public.contact_legal_details
            where contact_id = pg_temp.id_of('maya')),
          'none', 'the new e-mail is not used before review (the contract keeps the known one)');
select is((select email from public.network_contacts where id = pg_temp.id_of('maya')),
          'maya@example.com', 'nor in the Réseau');

-- Accepted: one value everywhere -----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.review_legal_form((select form from links), true);
reset role;
select is((select email from public.network_contacts where id = pg_temp.id_of('maya')),
          'maya.lenoir@example.com', 'an accepted e-mail correction updates the Réseau');
select is((select details ->> 'email' from public.contact_legal_details
            where contact_id = pg_temp.id_of('maya')),
          'maya.lenoir@example.com', 'and the fiche''s details');

-- The same e-mail, but for case and spaces, is no correction --------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
delete from links;
insert into links select token, form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), pg_temp.id_of('maya'), 'Maya ' || (select v from vars where k = 'tag'),
  array['artist'], '{}', '{}'::jsonb, 1);
reset role;
set local role anon;
select is(public.submit_legal_form((select token from links), array['artist'], null,
          '{"email": " Maya.Lenoir@example.com "}'::jsonb, '{}'::jsonb, 1),
          'action_required', 'the same e-mail written differently is not a correction: received, to validate (JUR-06)');

reset role;
select * from finish();
rollback;
