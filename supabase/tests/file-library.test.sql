-- File library of an artist or a title: description, reclassification,
-- "file updated" events (supabase/migrations/20260927012001_catalog_file_library.sql),
-- run with `supabase test db`.
begin;
select plan(15);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');

-- Artist files ----------------------------------------------------------------
select lives_ok($$
  insert into public.artist_files (organization_id, artist_id, category, description, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'contract',
          'Contrat artiste 2026',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/'
            || gen_random_uuid() || '.pdf',
          'contrat-dioo-2026.pdf', 'application/pdf', 1024)
$$, 'a file is added with its category and description');
insert into ids select 'file', id from public.artist_files
 where artist_id = (select id from ids where name = 'artist');

select throws_ok($$
  insert into public.artist_files (organization_id, artist_id, category, description, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'photo', '   ',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/'
            || gen_random_uuid() || '.jpg',
          'portrait.jpg', 'image/jpeg', 10)
$$, '23514', null, 'a blank description is refused (null instead)');

-- Creative director before the move: no contract, anywhere.
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.artist_files
            where artist_id = (select id from ids where name = 'artist')),
          0, 'a creative director sees no contract, not even among all files');

update public.artist_files set description = 'Piraté'
 where id = (select id from ids where name = 'file');

select pg_temp.act_as((select id from ids where name = 'manager'));
select is((select description from public.artist_files where id = (select id from ids where name = 'file')),
          'Contrat artiste 2026', 'a creative director cannot edit a file');

select throws_ok($$
  update public.artist_files set path = 'x' where id = (select id from ids where name = 'file')
$$, '42501', null, 'the path of a file is never rewritten');

update public.artist_files set category = 'photo', description = 'Portrait presse'
 where id = (select id from ids where name = 'file');
select is((select (category, description)::text from public.artist_files
            where id = (select id from ids where name = 'file')),
          '(photo,"Portrait presse")', 'manage_catalog reclassifies a file and edits its description');

select is((select (detail ->> 'category', detail ->> 'previous_category', catalog_only)::text
             from public.activity_events
            where subject_id = (select id from ids where name = 'file') and kind = 'file_updated'),
          '(photo,contract,t)', 'the move is logged, as private as the contract it was');

update public.artist_files set category = 'photo' where id = (select id from ids where name = 'file');
select is((select count(*)::int from public.activity_events
            where subject_id = (select id from ids where name = 'file') and kind = 'file_updated'),
          1, 'an update that changes nothing is not logged');

-- Creative director after the move: the same single row, now readable.
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.artist_files
            where artist_id = (select id from ids where name = 'artist') and category = 'photo'),
          1, 'once reclassified out of contracts, the file is readable by everyone');

select is((select count(*)::int from public.activity_events
            where subject_id = (select id from ids where name = 'file') and kind = 'file_updated'),
          0, 'the move of a contract stays hidden from a creative director');

-- Title files -----------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'manager'));
insert into ids select 'title', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio', 'demo',
        (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
          || '/' || gen_random_uuid() || '.wav', 'soleil_demo.wav', 'audio/wav', 1000);
insert into public.master_files (organization_id, master_id, category, path, file_name, mime, bytes)
values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'stems',
        (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
          || '/' || gen_random_uuid() || '.zip', 'soleil_stems.zip', 'application/zip', 1000);

update public.master_files set category = 'other'
 where master_id = (select id from ids where name = 'title') and category = 'audio';
select is((select count(*)::int from public.master_files
            where master_id = (select id from ids where name = 'title') and category = 'audio'),
          1, 'an audio version is not reclassified from the library');

select throws_ok($$
  update public.master_files set category = 'audio'
   where master_id = (select id from ids where name = 'title') and category = 'stems'
$$, '42501', null, 'a file never becomes an audio version by reclassification');

select lives_ok($$
  update public.master_files set description = 'Stems V2', file_name = 'soleil_stems_v2.zip'
   where master_id = (select id from ids where name = 'title') and category = 'stems'
$$, 'a title file gets a description and a new name');

select is((select detail ->> 'name' from public.activity_events
            where master_id = (select id from ids where name = 'title') and kind = 'file_updated'),
          'soleil_stems_v2.zip', 'the title log says which file was edited');

select pg_temp.act_as((select id from ids where name = 'creative'));
update public.master_files set description = 'Piraté'
 where master_id = (select id from ids where name = 'title') and category = 'stems';
select is((select description from public.master_files
            where master_id = (select id from ids where name = 'title') and category = 'stems'),
          'Stems V2', 'a creative director cannot edit a title file');

select * from finish();
rollback;
