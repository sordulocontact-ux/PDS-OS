-- MKT-C2-04 (…20261013100101): the artist's identity, versioned on the artist;
-- approved at once when written by a validator, proposed otherwise; decided
-- by a validator, never by its author; the Conception keeps the version it
-- opened with, deviates on purpose, and copies elements as linked references.
-- Run with `supabase test db`.
begin;
select plan(17);

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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('da', pg_temp.new_user('da-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('da', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'da');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Two artists, a content project of the first one, launched, owned by owner.
with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Identité ' || (select v from vars where k = 'tag'), 'signed') returning id)
insert into ids select 'artist', id from a;
with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Autre ' || (select v from vars where k = 'tag'), 'signed') returning id)
insert into ids select 'artist2', id from a;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'ID ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'),
  pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
update public.projects set artist_id = pg_temp.id_of('artist') where id = pg_temp.id_of('project');
-- Stratégie validated, Conception in progress (set directly: not under test).
update public.project_stages s set state = case d.key when 'launch_strategy' then 'validated' else 'in_progress' end
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.id_of('project')
   and d.key in ('launch_strategy', 'design');

-- Versions --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'v1', public.propose_artist_identity(pg_temp.id_of('artist'),
  '{"manifesto": "Brut et lumineux", "tone": "Direct", "refs": [{"kind": "moodboard", "url": "https://are.na/x", "title": "Board"}]}');
select is((select status || '/' || number from public.artist_identity_versions where id = pg_temp.id_of('v1')),
          'approved/1', 'a validator''s version is approved at once');
select is(public.current_artist_identity(pg_temp.id_of('artist')), pg_temp.id_of('v1'),
          'it is the current identity');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'v2', public.propose_artist_identity(pg_temp.id_of('artist'),
  '{"manifesto": "Brut, lumineux et nocturne"}', 'Nouvelle ère');
select is((select status from public.artist_identity_versions where id = pg_temp.id_of('v2')),
          'proposed', 'a catalog manager proposes');
select is(public.current_artist_identity(pg_temp.id_of('artist')), pg_temp.id_of('v1'),
          'a proposal never changes the current identity');
select throws_ok($$ select public.decide_artist_identity(pg_temp.id_of('v2'), true) $$,
  '42501', null, 'a project manager does not decide');
select throws_ok($$ select public.propose_artist_identity(pg_temp.id_of('artist'),
  '{"refs": [{"kind": "reference", "url": "http://insecure"}]}') $$,
  '23514', null, 'a reference is an https link');
reset role;

select pg_temp.act_as(pg_temp.id_of('da'));
select lives_ok($$ select public.propose_artist_identity(pg_temp.id_of('artist'), '{"tone": "Doux"}') $$,
  'a creative director proposes too');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_artist_identity(pg_temp.id_of('v2'), false) $$,
  '23514', null, 'a refusal says why');
select lives_ok($$ select public.decide_artist_identity(pg_temp.id_of('v2'), true) $$,
  'the director approves the proposal');
select is(public.current_artist_identity(pg_temp.id_of('artist')), pg_temp.id_of('v2'),
          'the approved proposal is the current identity');
reset role;

-- The Conception keeps its version -------------------------------------------------
insert into public.design_workspaces (project_id, organization_id)
values (pg_temp.id_of('project'), pg_temp.id_of('org'));
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('v2'), 'the work opens on the current identity');
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'v4', public.propose_artist_identity(pg_temp.id_of('artist'), '{"tone": "Solaire"}');
reset role;
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('v2'), 'a later version never rewrites the Conception');

select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.use_artist_identity_version(pg_temp.id_of('project'), pg_temp.id_of('v4')) $$,
  '42501', null, 'another project manager does not move it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.use_artist_identity_version(pg_temp.id_of('project'), pg_temp.id_of('v4'));
select is((select identity_version_id from public.design_workspaces where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('v4'), 'its owner moves it to a newer version, on purpose');
select public.set_design_identity_deviation(pg_temp.id_of('project'), 'Pochette en noir et blanc, pour une fois');
select is((select identity_deviation from public.design_workspaces where project_id = pg_temp.id_of('project')),
          'Pochette en noir et blanc, pour une fois', 'the release deviates on purpose, in words');

-- Linked references ---------------------------------------------------------------
select lives_ok($$
  insert into public.design_references (organization_id, project_id, kind, url, identity_version_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'link', 'https://are.na/x', pg_temp.id_of('v1'))
$$, 'an element of the identity becomes a linked reference');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'w1', public.propose_artist_identity(pg_temp.id_of('artist2'), '{"tone": "Autre"}');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$
  insert into public.design_references (organization_id, project_id, kind, url, identity_version_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'link', 'https://example.com/y', pg_temp.id_of('w1'))
$$, '23514', null, 'never from another artist''s identity');

select * from finish();
rollback;
