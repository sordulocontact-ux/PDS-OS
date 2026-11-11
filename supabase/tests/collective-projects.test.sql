-- Projet collectif, lot 1 (…20261111100101, docs/pds-mic-plan.md): the flag,
-- false by default; a collective's main artist (projects.artist_id) read
-- first by project_artist_name / project_artist_id (search, smartlink, the
-- Conception's identity), any other project unchanged; the main artist
-- changed by set_project_main_artist, the identity already chosen kept.
-- Run with `supabase test db`.
begin;
select plan(21);

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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

-- Artists: the guest credited on the titles, the main artist, an archived one.
with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Invité ' || pg_temp.tag(), 'collaboration') returning id)
insert into ids select 'guest', id from a;
with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Principal ' || pg_temp.tag(), 'signed') returning id)
insert into ids select 'main', id from a;
with a as (insert into public.artists (organization_id, name, relation, archived_at)
  values (pg_temp.id_of('org'), 'Archivé ' || pg_temp.tag(), 'signed', now()) returning id)
insert into ids select 'archived', id from a;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('guest'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('guest'), 'role', 'main')));
-- A simple EP and the future collective, both launched and owned by owner.
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Simple ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'collective', public.create_project(pg_temp.id_of('org'), 'Collectif ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1'), pg_temp.id_of('m2')], p_music_format => 'compilation');
insert into ids select 'a_simple', public.transmit_project(pg_temp.id_of('simple'), pg_temp.id_of('owner_person'));
insert into ids select 'a_collective', public.transmit_project(pg_temp.id_of('collective'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_collective'), 'accepted');
reset role;

-- The flag -------------------------------------------------------------------------
select is((select count(*)::int from public.projects
            where id in (pg_temp.id_of('simple'), pg_temp.id_of('collective')) and collective),
          0, 'a new project is not collective by default');

-- A project that is not collective keeps its rule ------------------------------------
-- Even with an artist named on the project, the first credit wins.
update public.projects set artist_id = pg_temp.id_of('main') where id = pg_temp.id_of('simple');
select is(public.project_artist_name(pg_temp.id_of('simple')), 'Invité ' || pg_temp.tag(),
          'a simple project shows the first credit of its first title, as before');
select is(public.project_artist_id(pg_temp.id_of('simple')), pg_temp.id_of('guest'),
          'and its artist id is the same as before');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('simple'), pg_temp.id_of('main')) $$,
  '23514', 'not_collective', 'only a collective has a main artist to change');
reset role;

-- A collective reads its main artist first -----------------------------------------
update public.projects set collective = true where id = pg_temp.id_of('collective');
select is(public.project_artist_name(pg_temp.id_of('collective')), 'Invité ' || pg_temp.tag(),
          'without a main artist yet, a collective falls back to the first credit');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('collective'), pg_temp.id_of('main')) $$,
  'its owner chooses its main artist, after the launch');
select is(public.project_artist_name(pg_temp.id_of('collective')), 'Principal ' || pg_temp.tag(),
          'a collective shows its main artist, not the first credit');
select is(public.project_artist_id(pg_temp.id_of('collective')), pg_temp.id_of('main'),
          'its artist id is its main artist');
select is((select artist from public.search_projects('Collectif ' || pg_temp.tag())
            where id = pg_temp.id_of('collective')),
          'Principal ' || pg_temp.tag(), 'the search names the main artist');
select is((select artist from public.search_projects('Simple ' || pg_temp.tag())
            where id = pg_temp.id_of('simple')),
          'Invité ' || pg_temp.tag(), 'and still the first credit for a simple project');
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('collective'), null) $$,
  '23514', 'artist_required', 'a main artist is never removed');
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('collective'), pg_temp.id_of('archived')) $$,
  '23503', 'artist_not_found', 'an archived artist is not chosen');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('collective'), pg_temp.id_of('guest')) $$,
  '42501', null, 'once launched, only its owner changes it');
reset role;

-- The smartlink names the main artist ----------------------------------------------
with r as (insert into public.releases (organization_id, project_id, title, smartlink_enabled)
  values (pg_temp.id_of('org'), pg_temp.id_of('collective'), 'Sortie ' || pg_temp.tag(), true)
  returning smartlink_token)
insert into ids select 'token', smartlink_token from r;
select is(public.get_smartlink(pg_temp.id_of('token')) ->> 'artist', 'Principal ' || pg_temp.tag(),
          'the smartlink names the main artist');

-- The Conception's identity follows the main artist, and is kept ----------------------
update public.project_stages s set state = case d.key when 'launch_strategy' then 'validated' else 'in_progress' end
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.id_of('collective')
   and d.key in ('launch_strategy', 'design');
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'main_v', public.propose_artist_identity(pg_temp.id_of('main'), '{"tone": "Principal"}');
insert into ids select 'guest_v', public.propose_artist_identity(pg_temp.id_of('guest'), '{"tone": "Invité"}');
reset role;
insert into public.design_workspaces (project_id, organization_id)
values (pg_temp.id_of('collective'), pg_temp.id_of('org'));
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('collective')),
          pg_temp.id_of('main_v'), 'the Conception opens on the main artist''s identity, not the first credit''s');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.use_artist_identity_version(pg_temp.id_of('collective'), pg_temp.id_of('guest_v')) $$,
  '23514', 'invalid_identity', 'another artist''s identity is refused while the main artist stays');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('collective'), pg_temp.id_of('guest')) $$,
  'its owner changes the main artist');
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('collective')),
          pg_temp.id_of('main_v'), 'the identity already chosen is kept, never replaced in silence');
select throws_ok($$ select public.use_artist_identity_version(pg_temp.id_of('collective'), pg_temp.id_of('main_v')) $$,
  '23514', 'invalid_identity', 'the kept identity can no longer be picked again: it is the old main artist''s');
select lives_ok($$ select public.use_artist_identity_version(pg_temp.id_of('collective'), pg_temp.id_of('guest_v')) $$,
  'moving to the new main artist''s identity is a gesture of its owner');
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('collective')),
          pg_temp.id_of('guest_v'), 'and only then does the Conception change identity');
reset role;

select * from finish();
rollback;
