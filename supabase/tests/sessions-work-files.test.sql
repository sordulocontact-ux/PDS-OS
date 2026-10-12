-- Sessions partagées entre titres et fichiers de travail (retours Catalogue
-- 17, 21, 27 à 38, supabase/migrations/20261012101601_sessions_work_files.sql).
-- Run with `supabase test db`.
begin;
select plan(11);

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
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));


reset role;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'master2', public.create_master(pg_temp.id_of('org'), 'Lune',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into public.master_sessions (organization_id, master_id, kind, session_date, studio, engineer)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'recording', '2026-10-03', 'Empire Studio', 'Antoine Gisbert');
insert into ids select 'session', id from public.master_sessions where master_id = pg_temp.id_of('master');

select is((select count(*)::int from public.master_session_titles
            where session_id = pg_temp.id_of('session') and master_id = pg_temp.id_of('master')), 1,
          'a session is linked to the title it was created on');
select lives_ok(format($$ insert into public.master_session_titles (session_id, master_id, organization_id)
  values (%L, %L, %L) $$, pg_temp.id_of('session'), pg_temp.id_of('master2'), pg_temp.id_of('org')),
  'an existing session is linked to a second title, never copied');
select lives_ok(format($$ update public.master_sessions set notes = 'Prise voix' where id = %L $$,
  pg_temp.id_of('session')), 'written from any title it is linked to');
select throws_ok(format($$ delete from public.master_sessions where id = %L $$, pg_temp.id_of('session')),
  'P0001', 'session_shared', 'a session still linked to another title is not deleted');

-- Working files.
select lives_ok(format($$ insert into public.master_files (organization_id, master_id, category, path,
    file_name, mime, bytes, session_id, work_status)
  values (%L, %L, 'stems', %L || '/' || %L || '/' || gen_random_uuid() || '.zip', 'Session.zip',
          'application/zip', 1000, %L, 'provisional') $$,
  pg_temp.id_of('org'), pg_temp.id_of('master'), pg_temp.id_of('org'), pg_temp.id_of('master'),
  pg_temp.id_of('session')), 'a working file keeps its session and its state');
select throws_ok(format($$ insert into public.master_files (organization_id, master_id, category, path,
    file_name, mime, bytes, work_status)
  values (%L, %L, 'artwork', %L || '/' || %L || '/' || gen_random_uuid() || '.png', 'a.png',
          'image/png', 10, 'final') $$,
  pg_temp.id_of('org'), pg_temp.id_of('master'), pg_temp.id_of('org'), pg_temp.id_of('master')),
  '23514', null, 'only a working file has a state');
select throws_ok(format($$ insert into public.master_work_links (organization_id, master_id, label, url)
  values (%L, %L, 'Projet Logic', 'http://exemple.fr/x') $$, pg_temp.id_of('org'), pg_temp.id_of('master')),
  '23514', null, 'a link to a large working file is https');

-- Detaching, then deleting.
select lives_ok(format($$ delete from public.master_session_titles where session_id = %L and master_id = %L $$,
  pg_temp.id_of('session'), pg_temp.id_of('master')), 'detaching its first title');
select is((select master_id::text || '/' || (select count(*) from public.master_files
             where session_id = pg_temp.id_of('session'))::text from public.master_sessions where id = pg_temp.id_of('session')),
          pg_temp.id_of('master2')::text || '/0',
          'hands the session to the other title, its working files there keep the file without the link');
select throws_ok(format($$ delete from public.master_session_titles where session_id = %L $$,
  pg_temp.id_of('session')), 'P0001', 'session_last_title', 'the last title is not detached: delete instead');
select lives_ok(format($$ delete from public.master_sessions where id = %L $$, pg_temp.id_of('session')),
  'a session on one title only is deleted');

select * from finish();
rollback;
