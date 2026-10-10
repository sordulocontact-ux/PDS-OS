-- Credits entered with a title, one person with several roles, the contact
-- of an artist from the Réseau (UX test of 09/10/2026, section 8;
-- supabase/migrations/20261010002101_credits_at_creation.sql), run with
-- `supabase test db`.
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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('credits-manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('credits-creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

with a as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Nayra ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from a;
with c as (
  insert into public.network_contacts (organization_id, kind, name, roles)
  values ((select id from ids where name = 'org'), 'person', 'Inès ' || (select v from vars where k = 'tag'),
          array['songwriter'])
  returning id)
insert into ids select 'ines', id from c;

select pg_temp.act_as((select id from ids where name = 'manager'));

-- 1. A title created with its credits ------------------------------------------
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Lune',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))),
  p_contributors => jsonb_build_array(
    jsonb_build_object('name', 'Inès', 'contact_id', (select id from ids where name = 'ines'),
                       'roles', jsonb_build_array('lyricist', 'composer')),
    jsonb_build_object('name', 'Tom', 'contact_id', null, 'roles', jsonb_build_array('producer'))));

select is((select array_agg(role order by role) from public.master_contributors
            where master_id = (select id from ids where name = 'master')
              and contact_id = (select id from ids where name = 'ines')),
          array['composer', 'lyricist'], 'one person with two roles is two credits, linked to their contact');

select is((select count(*)::int from public.master_contributors
            where master_id = (select id from ids where name = 'master')),
          3, 'every credit of the title is created with it');

select throws_ok($$
  select public.create_master(
    (select id from ids where name = 'org'), 'Sans rôle',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))),
    p_contributors => '[{"name": "Personne", "contact_id": null, "roles": []}]')
$$, '23514', null, 'a credit without a role is refused');

select is((select count(*)::int from public.masters where title = 'Sans rôle'
            and organization_id = (select id from ids where name = 'org')),
          0, 'and the title is not created without its credits');

-- 2. One person, several roles ----------------------------------------------------
insert into vars select 'composer_row', id::text from public.master_contributors
 where master_id = (select id from ids where name = 'master')
   and contact_id = (select id from ids where name = 'ines') and role = 'composer';

select lives_ok($$
  select public.set_master_contributor_roles(
    (select id from ids where name = 'master'),
    array(select id from public.master_contributors
           where master_id = (select id from ids where name = 'master')
             and contact_id = (select id from ids where name = 'ines')),
    'Inès', (select id from ids where name = 'ines'), array['composer', 'arranger'], 'guitare')
$$, 'the roles of one person are changed at once');

select is((select array_agg(role order by role) from public.master_contributors
            where master_id = (select id from ids where name = 'master')
              and contact_id = (select id from ids where name = 'ines')),
          array['arranger', 'composer'], 'a role removed goes, a role added comes');

select ok(exists (select 1 from public.master_contributors
                   where id = (select v from vars where k = 'composer_row')::uuid
                     and detail = 'guitare'),
          'the row of a role kept is the same row, updated');

select public.set_master_contributor_roles(
  (select id from ids where name = 'master'), '{}',
  'Inès', (select id from ids where name = 'ines'), array['composer'], null);
select is((select count(*)::int from public.master_contributors
            where master_id = (select id from ids where name = 'master')
              and contact_id = (select id from ids where name = 'ines') and role = 'composer'),
          1, 'a role the person already holds is not credited twice');

-- Creative director: no manage_catalog ----------------------------------------------
select pg_temp.act_as((select id from ids where name = 'creative'));
select throws_ok($$
  select public.set_master_contributor_roles(
    (select id from ids where name = 'master'), '{}',
    'Quelqu''un', null, array['musician'], null)
$$, '42501', null, 'a creative director cannot credit anyone');

-- 3. The contact of an artist, from the Réseau ----------------------------------------
select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artist_contacts (organization_id, artist_id, role, name, email, contact_id, is_primary)
values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'),
        'manager', 'Inès', 'ines@example.com', (select id from ids where name = 'ines'), true);
select is((select contact_id from public.artist_contacts
            where artist_id = (select id from ids where name = 'artist')),
          (select id from ids where name = 'ines'), 'an artist''s manager is a person of the Réseau');

reset role;
-- As delete_records does: the credits are unlinked first.
update public.master_contributors set contact_id = null
 where contact_id = (select id from ids where name = 'ines');
delete from public.network_contacts where id = (select id from ids where name = 'ines');
select is((select name || ' / ' || coalesce(contact_id::text, 'none') from public.artist_contacts
            where artist_id = (select id from ids where name = 'artist')),
          'Inès / none', 'the contact deleted from the Réseau leaves the artist''s contact as a name');

select * from finish();
rollback;
