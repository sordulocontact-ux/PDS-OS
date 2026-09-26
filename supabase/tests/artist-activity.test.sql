-- Artist files and activity log
-- (supabase/migrations/20260927000101_artist_files_and_activity.sql), run with
-- `supabase test db`.
begin;
select plan(16);

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
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'));
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');

-- Artist and master ---------------------------------------------------------------
select is((select count(*)::int from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_created'),
          1, 'creating an artist logs artist_created');

select is((select actor_person_id from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_created'),
          (select person_id from public.accounts where id = (select id from ids where name = 'manager')),
          'the event records who acted');

insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

select is((select detail ->> 'title' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'master_created'
              and subject_id = (select id from ids where name = 'master')),
          'Soleil', 'creating a master logs master_created with its title');

update public.artists set bio = 'Nouvelle bio.' where id = (select id from ids where name = 'artist');
select is((select detail -> 'fields' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_updated'),
          '["bio"]'::jsonb, 'an update logs which part of the profile changed');

-- Contacts and files ----------------------------------------------------------------
insert into public.artist_contacts (organization_id, artist_id, role, name)
values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'manager', 'Aminata Fall');

select is((select catalog_only from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'contact_added'),
          true, 'a contact event is catalog only');

select lives_ok($$
  insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'contract',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/'
            || gen_random_uuid() || '.pdf',
          'Contrat.pdf', 'application/pdf', 1024)
$$, 'a project manager adds a contract');

select lives_ok($$
  insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'press',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/'
            || gen_random_uuid() || '.pdf',
          'Dossier de presse.pdf', 'application/pdf', 2048)
$$, 'a project manager adds a press kit');

select is((select count(*)::int from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'file_added'),
          2, 'the project manager reads both file events');

select throws_ok($$
  insert into public.activity_events (organization_id, artist_id, kind)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'artist_created')
$$, '42501', null, 'nobody writes the log directly');

-- Creative director ------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'creative'));

select is((select count(*)::int from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_created'),
          1, 'a creative director reads the artist events');

select is((select count(*)::int from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind like 'contact_%'),
          0, 'a creative director never reads contact events');

select is((select count(*)::int from public.artist_files
            where artist_id = (select id from ids where name = 'artist') and category = 'contract'),
          0, 'a creative director never sees a contract');

select is((select count(*)::int from public.artist_files
            where artist_id = (select id from ids where name = 'artist') and category = 'press'),
          1, 'a creative director sees the other files');

select is((select detail ->> 'name' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'file_added'),
          'Dossier de presse.pdf', 'a creative director reads only the non-contract file event');

select throws_ok($$
  insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'photo',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/'
            || gen_random_uuid() || '.jpg',
          'Photo.jpg', 'image/jpeg', 10)
$$, '42501', null, 'a creative director cannot add a file');

-- Project manager ----------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'manager'));
select is((select count(*)::int from public.artist_files
            where artist_id = (select id from ids where name = 'artist') and category = 'contract'),
          1, 'a project manager sees the contract');

select * from finish();
rollback;
