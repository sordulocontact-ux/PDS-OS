-- An artist's moodboards as folders (…20261110150101): the Catalogue writes
-- every folder, a creative director creates folders and edits his own; a
-- folder holds moodboard files of its own artist only; a new version stays in
-- its folder, a file reclassified leaves it; a folder with images is not
-- deleted; an artist deleted takes its folders along.
-- Run with `supabase test db`.
begin;
select plan(13);

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
  ('pm', pg_temp.new_user('pm-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('da', pg_temp.new_user('da-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('da2', pg_temp.new_user('da2-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('pm', 'project_manager'), ('da', 'creative_director'),
               ('da2', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
-- A path of the artist's library, as the app makes it.
create function pg_temp.path_of(p_artist text) returns text language sql as $$
  select pg_temp.id_of('org')::text || '/' || pg_temp.id_of(p_artist)::text || '/'
         || gen_random_uuid()::text || '.png' $$;
grant execute on function pg_temp.path_of(text) to authenticated;

with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Mood ' || (select v from vars where k = 'tag'), 'signed') returning id)
insert into ids select 'artist', id from a;
with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Autre ' || (select v from vars where k = 'tag'), 'signed') returning id)
insert into ids select 'artist2', id from a;

-- Folders -------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('da'));
select lives_ok($$
  with f as (
    insert into public.artist_moodboards (organization_id, artist_id, title, note)
    values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'Piste 1', 'Néons froids')
    returning id)
  insert into ids select 'board', id from f
$$, 'a creative director creates a folder');
reset role;

select pg_temp.act_as(pg_temp.id_of('da2'));
update public.artist_moodboards set title = 'Volée' where id = pg_temp.id_of('board');
select lives_ok($$
  with f as (
    insert into public.artist_moodboards (organization_id, artist_id, title)
    values (pg_temp.id_of('org'), pg_temp.id_of('artist2'), 'Ailleurs')
    returning id)
  insert into ids select 'board2', id from f
$$, 'another creative director creates his own');
reset role;
select is((select title from public.artist_moodboards where id = pg_temp.id_of('board')),
          'Piste 1', 'he does not rename someone else''s folder');

select pg_temp.act_as(pg_temp.id_of('pm'));
update public.artist_moodboards set title = 'Piste 1 — Néons' where id = pg_temp.id_of('board');
reset role;
select is((select title from public.artist_moodboards where id = pg_temp.id_of('board')),
          'Piste 1 — Néons', 'the Catalogue renames every folder');

-- Images --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('da'));
select lives_ok($$
  with f as (
    insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes, moodboard_id)
    values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'moodboard', pg_temp.path_of('artist'),
            'neon.png', 'image/png', 10, pg_temp.id_of('board'))
    returning id)
  insert into ids select 'img', id from f
$$, 'an image goes into a folder of its artist');
select throws_ok($$
  insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes, moodboard_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'moodboard', pg_temp.path_of('artist'),
          'x.png', 'image/png', 10, pg_temp.id_of('board2'))
$$, '23503', null, 'never into another artist''s folder');
select lives_ok($$
  with f as (
    insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes, replaces_id)
    values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'moodboard', pg_temp.path_of('artist'),
            'neon-v2.png', 'image/png', 12, pg_temp.id_of('img'))
    returning id)
  insert into ids select 'img_v2', id from f
$$, 'a new version of the image is filed');
reset role;
select is((select moodboard_id from public.artist_files where id = pg_temp.id_of('img_v2')),
          pg_temp.id_of('board'), 'it stays in the folder');

select pg_temp.act_as(pg_temp.id_of('pm'));
with f as (
  insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes, moodboard_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'photo', pg_temp.path_of('artist'),
          'press.png', 'image/png', 10, pg_temp.id_of('board'))
  returning id)
insert into ids select 'photo', id from f;
update public.artist_files set category = 'photo' where id = pg_temp.id_of('img');
reset role;
select is((select moodboard_id from public.artist_files where id = pg_temp.id_of('photo')),
          null, 'a file of another category is in no folder');
select is((select moodboard_id from public.artist_files where id = pg_temp.id_of('img')),
          null, 'a file reclassified leaves its folder');

-- Deleting ------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('da'));
select throws_ok($$ delete from public.artist_moodboards where id = pg_temp.id_of('board') $$,
                 '23503', null, 'a folder with images is not deleted');
delete from public.artist_files where moodboard_id = pg_temp.id_of('board');
delete from public.artist_moodboards where id = pg_temp.id_of('board');
reset role;
select is((select count(*)::int from public.artist_moodboards where id = pg_temp.id_of('board')),
          0, 'emptied, its author deletes it');

select public.delete_artist_row(pg_temp.id_of('artist2'));
select is((select count(*)::int from public.artist_moodboards where id = pg_temp.id_of('board2')),
          0, 'an artist deleted takes its folders along');

select * from finish();
rollback;
