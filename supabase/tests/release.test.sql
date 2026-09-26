-- Release detection persistence (record_release_detection), run with
-- `supabase test db`. Same fixtures as rls.test.sql.
begin;
select plan(14);

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

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  execute 'set local role service_role';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon, service_role;
-- Unique per run: the suite must pass whatever the dev database contains.
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into vars select 'artist', 'Nova Kessel ' || v from vars where k = 'tag';
insert into vars select 'project', 'Lueur ' || v from vars where k = 'tag';
insert into vars select 'call', 'Cadrage ' || v from vars where k = 'tag';
insert into vars select 'isrc', 'FRZ03' || lpad(floor(random() * 1e7)::int::text, 7, '0');

insert into ids values
  ('admin', pg_temp.new_user('admin-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
-- The fixture admin is promoted directly (as postgres), so the suite does not
-- depend on the one-shot bootstrap of the seed.
update public.memberships set status = 'approved', role = 'general_director'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'admin'));

select pg_temp.act_as((select id from ids where name = 'admin'));
insert into public.artists (organization_id, name)
values ((select id from ids where name = 'org'), (select v from vars where k = 'artist'));
insert into public.projects (organization_id, title, type)
values ((select id from ids where name = 'org'), (select v from vars where k = 'project'), 'partnership');
insert into public.releases (organization_id, project_id, title, isrc)
select (select id from ids where name = 'org'), id, 'Lueur', (select v from vars where k = 'isrc') from public.projects where title = (select v from vars where k = 'project');
insert into ids select 'release', id from public.releases where isrc = (select v from vars where k = 'isrc');

-- Member ----------------------------------------------------------------------
select throws_ok($$
  insert into public.release_links (organization_id, release_id, platform, url, source)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'release'),
          'deezer', 'https://www.deezer.com/track/1', 'manual')
$$, '42501', null, 'clients cannot write release links directly');

select lives_ok($$
  select public.record_release_detection((select id from ids where name = 'release'),
    '[{"platform":"spotify","url":"https://open.spotify.com/track/x","source":"manual"}]')
$$, 'a member records a manual-only result');
select is((select online_detected_at from public.releases where id = (select id from ids where name = 'release')),
          null, 'a manual link alone never marks a release online');

select lives_ok($$
  select public.record_release_detection((select id from ids where name = 'release'),
    '[{"platform":"deezer","url":"https://www.deezer.com/track/1","source":"deezer"},
      {"platform":"spotify","url":"https://open.spotify.com/track/y","source":"musicbrainz"}]')
$$, 'a member records a detection result');
select is((select count(*)::int from public.release_links where release_id = (select id from ids where name = 'release')),
          2, 'links are upserted, one per platform');
select is((select source from public.release_links where platform = 'spotify'), 'musicbrainz',
          'a detected link replaces the manual one');
select isnt((select online_detected_at from public.releases where id = (select id from ids where name = 'release')),
            null, 'a detected link marks the release online');

-- Backdate, then record again: first detection and first sighting are kept.
reset role;
update public.releases set online_detected_at = '2020-01-01' where id = (select id from ids where name = 'release');
update public.release_links set first_seen_at = '2020-01-01', last_seen_at = '2020-01-01';

select pg_temp.act_as_service();
select lives_ok($$
  select public.record_release_detection((select id from ids where name = 'release'),
    '[{"platform":"deezer","url":"https://www.deezer.com/track/2","source":"deezer"}]')
$$, 'the service role records a detection result');
reset role;
select is((select online_detected_at from public.releases where id = (select id from ids where name = 'release')),
          '2020-01-01'::timestamptz, 'online_detected_at is set once');
select ok((select first_seen_at = '2020-01-01' and last_seen_at > '2020-01-01'
             and url = 'https://www.deezer.com/track/2'
           from public.release_links where platform = 'deezer'),
          'an upsert keeps first_seen_at and refreshes url and last_seen_at');

-- Invalid payloads ------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'admin'));
select throws_ok($$
  select public.record_release_detection((select id from ids where name = 'release'),
    '[{"platform":"myspace","url":"https://myspace.com/x","source":"deezer"}]')
$$, 'P0001', 'invalid_link', 'an unknown platform is rejected');
select throws_ok($$
  select public.record_release_detection((select id from ids where name = 'release'),
    '[{"platform":"deezer","url":"javascript:alert(1)","source":"deezer"}]')
$$, 'P0001', 'invalid_link', 'a non-https URL is rejected');

-- Outsider and anon -----------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'outsider'));
select throws_ok($$
  select public.record_release_detection((select id from ids where name = 'release'), '[]')
$$, 'P0001', 'release_not_found', 'a non-member cannot record a detection');

reset role;
select pg_temp.act_as_anon();
select throws_ok($$
  select public.record_release_detection((select id from ids where name = 'release'), '[]')
$$, '42501', null, 'anon cannot call the function');

reset role;
select * from finish();
rollback;
