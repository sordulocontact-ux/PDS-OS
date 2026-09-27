-- Editing a master and a project that is not launched (…002101), run with
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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'manager', 'creative');

select pg_temp.act_as((select id from ids where name = 'director'));
with a as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Artiste ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from a;
with a as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Invité ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist2', id from a;
insert into ids select 'master', public.create_master((select id from ids where name = 'org'), 'Titre',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main')));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Projet ' || (select v from vars where k = 'tag'), 'music_release',
  array[(select id from ids where name = 'master')],
  p_assignee_person_id => (select id from ids where name = 'manager_person'), p_music_format => 'single');

-- Masters ------------------------------------------------------------------------
select lives_ok($$ select public.update_master((select id from ids where name = 'master'), 'Titre (radio)',
                   jsonb_build_array(
                     jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main'),
                     jsonb_build_object('artist_id', (select id from ids where name = 'artist2'), 'role', 'featuring')),
                   p_isrc => 'fr-z03-26-00001') $$,
                'the director edits a master and its credits');
select is((select count(*)::int from public.master_artists where master_id = (select id from ids where name = 'master')),
          2, 'the credits are replaced');
select is((select isrc from public.masters where id = (select id from ids where name = 'master')),
          'FRZ032600001', 'the ISRC is stored normalized');
select throws_ok($$ select public.update_master((select id from ids where name = 'master'), 'Titre', '[]'::jsonb) $$,
                 'P0001', 'master_requires_artist', 'a master keeps at least one artist');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select throws_ok($$ select public.update_master((select id from ids where name = 'master'), 'Piraté',
                   jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist')))) $$,
                 'P0001', 'master_not_editable', 'a creative director cannot edit the catalog');

-- Projects before launch ------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select lives_ok($$ select public.update_project((select id from ids where name = 'project'), 'Nouveau titre',
                   'music_release', array[(select id from ids where name = 'master')],
                   p_budget_cents => 150000, p_priority => 'high', p_music_format => 'single') $$,
                'the director edits a project waiting for its manager');
select is((select budget_cents from public.projects where id = (select id from ids where name = 'project')),
          150000::bigint, 'the new values are saved');
select throws_ok($$ select public.update_project((select id from ids where name = 'project'), 'Sans master',
                   'music_release', '{}'::uuid[]) $$,
                 'P0001', 'music_release_requires_master', 'a music release keeps a master');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select throws_ok($$ select public.update_project((select id from ids where name = 'project'), 'Piraté', 'content') $$,
                 'P0001', 'project_not_editable', 'a creative director cannot edit a project');

-- Projects after launch ----------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select public.respond_to_assignment(
  (select id from public.project_assignments where project_id = (select id from ids where name = 'project')),
  'accepted');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.update_project((select id from ids where name = 'project'), 'Trop tard',
                   'music_release', array[(select id from ids where name = 'master')], p_music_format => 'single') $$,
                 'P0001', 'project_not_editable', 'a launched project is no longer edited here');
select is((select title from public.projects where id = (select id from ids where name = 'project')),
          'Nouveau titre', 'its title is unchanged');

select * from finish();
rollback;
