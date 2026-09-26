-- Artist profile: identity, bio, picture, contacts
-- (supabase/migrations/20260926002001_artist_profile.sql), run with
-- `supabase test db`.
begin;
select plan(19);

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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name)
values ((select id from ids where name = 'org'), 'Dioo ' || (select v from vars where k = 'tag'));
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');

-- Identity, bio, picture ------------------------------------------------------
select lives_ok($$
  update public.artists
     set legal_name = 'Dioo Mensah', country_code = 'FR', bio = 'Artiste franco-ghanéen.'
   where id = (select id from ids where name = 'artist')
$$, 'a project manager fills the identity and the bio');

select throws_ok($$
  update public.artists set country_code = 'France' where id = (select id from ids where name = 'artist')
$$, '23514', null, 'a country is an ISO code');

select lives_ok($$
  update public.artists
     set picture_path = (select id from ids where name = 'org') || '/'
                        || (select id from ids where name = 'artist') || '/'
                        || gen_random_uuid() || '.jpg'
   where id = (select id from ids where name = 'artist')
$$, 'a picture path under the artist folder is accepted');

select throws_ok($$
  update public.artists
     set picture_path = (select id from ids where name = 'org') || '/'
                        || gen_random_uuid() || '/' || gen_random_uuid() || '.jpg'
   where id = (select id from ids where name = 'artist')
$$, '23514', null, 'a picture path pointing at another artist is refused');

-- Picture storage: the policy checks the folder is an artist of the org.
select lives_ok($$
  insert into storage.objects (bucket_id, name)
  values ('artist-pictures', (select id from ids where name = 'org') || '/'
          || (select id from ids where name = 'artist') || '/' || gen_random_uuid() || '.png')
$$, 'a project manager uploads a picture into the artist folder');

-- Contacts --------------------------------------------------------------------
select lives_ok($$
  insert into public.artist_contacts (organization_id, artist_id, role, name, email, phone)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'),
          'manager', 'Aminata Fall', 'manager@dioo.fr', '+33 6 24 18 90 32')
$$, 'a project manager adds a contact');
insert into ids select 'manager_contact', id from public.artist_contacts
 where artist_id = (select id from ids where name = 'artist') and role = 'manager';

select is((select is_primary from public.artist_contacts where id = (select id from ids where name = 'manager_contact')),
          true, 'the first contact becomes the primary one');

insert into public.artist_contacts (organization_id, artist_id, role, name, email)
values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'),
        'booker', 'Léo Martin', 'booking@dioo.fr');
insert into ids select 'booker_contact', id from public.artist_contacts
 where artist_id = (select id from ids where name = 'artist') and role = 'booker';

select is((select count(*)::int from public.artist_contacts
            where artist_id = (select id from ids where name = 'artist') and is_primary),
          1, 'a second contact does not take the primary place');

select lives_ok($$
  update public.artist_contacts set is_primary = true where id = (select id from ids where name = 'booker_contact')
$$, 'another contact can be made primary');
select is((select is_primary from public.artist_contacts where id = (select id from ids where name = 'manager_contact')),
          false, 'making a contact primary releases the previous one');

select throws_ok($$
  insert into public.artist_contacts (organization_id, artist_id, role, name, email)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'),
          'press', 'X', 'pas-un-email')
$$, '23514', null, 'an invalid email is refused');

select throws_ok($$
  insert into public.artist_contacts (organization_id, artist_id, role, name)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'cousin', 'X')
$$, '23514', null, 'an unknown role is refused');

select lives_ok($$
  delete from public.artist_contacts where id = (select id from ids where name = 'booker_contact')
$$, 'a project manager deletes a contact');
select is((select is_primary from public.artist_contacts where id = (select id from ids where name = 'manager_contact')),
          true, 'deleting the primary contact promotes the remaining one');

-- Creative director -------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.artist_contacts
            where artist_id = (select id from ids where name = 'artist')),
          0, 'a creative director never sees the contacts');
select is((select legal_name from public.artists where id = (select id from ids where name = 'artist')),
          'Dioo Mensah', 'a creative director reads the identity');

update public.artists set bio = 'Réécrite' where id = (select id from ids where name = 'artist');
select is((select bio from public.artists where id = (select id from ids where name = 'artist')),
          'Artiste franco-ghanéen.', 'a creative director cannot edit the profile');

select throws_ok($$
  insert into public.artist_contacts (organization_id, artist_id, role, name)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'other', 'X')
$$, '42501', null, 'a creative director cannot add a contact');

select throws_ok($$
  insert into storage.objects (bucket_id, name)
  values ('artist-pictures', (select id from ids where name = 'org') || '/'
          || (select id from ids where name = 'artist') || '/' || gen_random_uuid() || '.png')
$$, '42501', null, 'a creative director cannot upload a picture');

select * from finish();
rollback;
