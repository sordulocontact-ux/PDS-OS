-- Archiving artists, masters and projects (…000701), run with
-- `supabase test db`.
begin;
select plan(20);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'manager');

select pg_temp.act_as((select id from ids where name = 'director'));
with a as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Archivable ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from a;
insert into ids select 'master', public.create_master((select id from ids where name = 'org'), 'Titre',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main')));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Projet ' || (select v from vars where k = 'tag'), 'music_release',
  array[(select id from ids where name = 'master')],
  p_assignee_person_id => (select id from ids where name = 'manager_person'));
insert into ids select 'launched', public.create_project((select id from ids where name = 'org'),
  'Lancé ' || (select v from vars where k = 'tag'), 'content',
  p_assignee_person_id => (select id from ids where name = 'manager_person'));

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select public.respond_to_assignment(
  (select id from public.project_assignments where project_id = (select id from ids where name = 'launched')),
  'accepted');

-- Rights ----------------------------------------------------------------------
select throws_ok($$ select public.set_project_archived((select id from ids where name = 'project'), true) $$,
                 '42501', 'not_allowed_to_archive', 'a project manager cannot archive');
select throws_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), true) $$,
                 '42501', 'not_allowed_to_archive', 'manage_catalog is not enough to archive an artist');
select throws_ok($$ update public.artists set archived_at = now() where id = (select id from ids where name = 'artist') $$,
                 '42501', null, 'archived_at is no longer writable directly');

-- In use ------------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), true) $$,
                 'P0001', 'artist_in_use', 'an artist credited on a live master stays');
select throws_ok($$ select public.set_master_archived((select id from ids where name = 'master'), true) $$,
                 'P0001', 'master_in_use', 'a master of a live project stays');
select throws_ok($$ select public.set_project_archived((select id from ids where name = 'launched'), true) $$,
                 'P0001', 'project_launched', 'a launched project stays');

-- Archiving in order ----------------------------------------------------------------
select lives_ok($$ select public.set_project_archived((select id from ids where name = 'project'), true) $$,
                'the director archives a project waiting for its manager');
select lives_ok($$ select public.set_master_archived((select id from ids where name = 'master'), true) $$,
                'then its master');
select lives_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), true) $$,
                'then the artist');
select isnt((select archived_at from public.artists where id = (select id from ids where name = 'artist')),
            null, 'the artist is archived, not deleted');
select lives_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), true) $$,
                'archiving twice changes nothing');

-- Archived rows are frozen ------------------------------------------------------------
select throws_ok($$ select public.update_master((select id from ids where name = 'master'), 'Retouché',
                   jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist')))) $$,
                 'P0001', 'master_not_editable', 'an archived master is not editable');
select throws_ok($$ select public.update_project((select id from ids where name = 'project'), 'Retouché',
                   'content') $$,
                 'P0001', 'project_not_editable', 'an archived project is not editable');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select throws_ok($$ select public.respond_to_assignment(
                   (select id from public.project_assignments
                     where project_id = (select id from ids where name = 'project') and status = 'pending'),
                   'accepted') $$,
                 'P0001', 'project_archived', 'a transmission of an archived project cannot be answered');

-- Restoring in order ------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.set_project_archived((select id from ids where name = 'project'), false) $$,
                 'P0001', 'project_uses_archived', 'a project waits for its master');
select throws_ok($$ select public.set_master_archived((select id from ids where name = 'master'), false) $$,
                 'P0001', 'master_uses_archived', 'a master waits for its artist');
select lives_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), false) $$,
                'the artist comes back');
select lives_ok($$ select public.set_master_archived((select id from ids where name = 'master'), false) $$,
                'then the master');
select lives_ok($$ select public.set_project_archived((select id from ids where name = 'project'), false) $$,
                'then the project');

-- Name taken while archived --------------------------------------------------------------
select public.set_project_archived((select id from ids where name = 'project'), true);
select public.set_master_archived((select id from ids where name = 'master'), true);
select public.set_artist_archived((select id from ids where name = 'artist'), true);
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Archivable ' || (select v from vars where k = 'tag'), 'signed');
select throws_ok($$ select public.set_artist_archived((select id from ids where name = 'artist'), false) $$,
                 'P0001', 'artist_name_taken', 'a live artist holding the name blocks the restore');

select * from finish();
rollback;
