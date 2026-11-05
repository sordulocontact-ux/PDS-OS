-- Sessions studio et Maquettes (retours d'Ibé du 01/11/2026,
-- supabase/migrations/20261105220101_studio_sessions.sql).
-- Run with `supabase test db`, or psql on the pre-prod (rolled back).
begin;
select plan(16);

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

create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
insert into ids select r.name || '_person', a.person_id from public.accounts a
  join ids r on r.id = a.id where r.name in ('manager', 'creative');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'J4y ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'J4y ' || (select v from vars where k = 'tag');

-- 1. A session without a title, anchored on an artist.
insert into public.master_sessions (organization_id, kind, status, session_date, studio)
values (pg_temp.id_of('org'), 'recording', 'planned', '2026-11-12', 'Studio PDS ' || (select v from vars where k = 'tag'));
insert into ids select 'session', id from public.master_sessions
 where studio = 'Studio PDS ' || (select v from vars where k = 'tag');
select ok(pg_temp.id_of('session') is not null, 'a session is created without a title');
select lives_ok(format($$ insert into public.master_session_artists (session_id, artist_id, organization_id)
  values (%L, %L, %L) $$, pg_temp.id_of('session'), pg_temp.id_of('artist'), pg_temp.id_of('org')),
  'a session is linked to an artist');
select lives_ok(format($$ insert into public.master_session_attendees (session_id, organization_id, person_id)
  values (%L, %L, %L) $$,
  pg_temp.id_of('session'), pg_temp.id_of('org'), pg_temp.id_of('creative_person')),
  'a member takes part');
select throws_ok(format($$ insert into public.master_session_links (session_id, organization_id, label, url)
  values (%L, %L, 'Rushs', 'http://drive.google.com/x') $$, pg_temp.id_of('session'), pg_temp.id_of('org')),
  '23514', null, 'a link is https only');
select lives_ok(format($$ insert into public.master_session_links (session_id, organization_id, label, url)
  values (%L, %L, 'Rushs VHS', 'https://drive.google.com/x') $$, pg_temp.id_of('session'), pg_temp.id_of('org')),
  'the rushes are a Drive link');

-- 2. The report is stamped by the database.
update public.master_sessions set report_notes = 'Deux prises voix gardées.', status = 'done'
 where id = pg_temp.id_of('session');
select ok((select reported_at is not null and reported_by = pg_temp.id_of('manager_person')
             from public.master_sessions where id = pg_temp.id_of('session')),
          'the report says who wrote it and when');

-- 3. Detaching the last title of a session anchored on an artist keeps it.
insert into ids select 'demo', public.create_master(pg_temp.id_of('org'), 'Sans titre 1',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))),
  p_demo_status => 'draft');
insert into public.master_session_titles (session_id, master_id, organization_id)
values (pg_temp.id_of('session'), pg_temp.id_of('demo'), pg_temp.id_of('org'));
select lives_ok(format($$ delete from public.master_session_titles where session_id = %L $$,
  pg_temp.id_of('session')), 'the only title of a session anchored on an artist is detached');
select is((select count(*)::int from public.master_sessions where id = pg_temp.id_of('session')), 1,
          'the session stays, on its artist');

-- 4. A creative director does not create sessions.
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ insert into public.master_sessions (organization_id, kind) values (%L, 'recording') $$,
  pg_temp.id_of('org')), '42501', null, 'creating a session takes manage_sessions');

-- 5. Maquettes.
select throws_ok(format($$ select public.promote_demo(%L, 'Nuit blanche') $$, pg_temp.id_of('demo')),
  '42501', 'promote_forbidden', 'only the DG decides a release');
select lives_ok(format($$ select public.set_demo_status(%L, 'validated') $$, pg_temp.id_of('demo')),
  'the creative director validates a maquette');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.set_demo_status(%L, 'abandoned') $$, pg_temp.id_of('demo')),
  '42501', 'demo_status_forbidden', 'a validated maquette is not un-validated without the artistic right');
select throws_ok(format($$ update public.masters set demo_status = null where id = %L $$, pg_temp.id_of('demo')),
  '42501', null, 'the status never moves by a plain update');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(format($$ select public.promote_demo(%L, 'Nuit blanche') $$, pg_temp.id_of('demo')),
  'the DG moves a validated maquette to the masters');
select ok((select demo_status is null and title = 'Nuit blanche' and promoted_at is not null
             from public.masters where id = pg_temp.id_of('demo')),
          'same row: renamed, a master, the decision dated');
select throws_ok(format($$ select public.create_master(%L, 'Direct', jsonb_build_array(jsonb_build_object(
    'artist_id', %L)), p_demo_status => 'validated') $$, pg_temp.id_of('org'), pg_temp.id_of('artist')),
  '23514', 'demo_status_at_creation', 'a maquette is never created validated');

select * from finish();
rollback;
