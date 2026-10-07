-- Deleting artists, masters, projects and network contacts (…20261006000101),
-- run with `supabase test db`.
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
  values ((select id from ids where name = 'org'), 'Supprimable ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from a;
insert into ids select 'master', public.create_master((select id from ids where name = 'org'), 'Titre',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main')));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Projet ' || (select v from vars where k = 'tag'), 'music_release',
  array[(select id from ids where name = 'master')],
  p_assignee_person_id => (select id from ids where name = 'manager_person'), p_music_format => 'single');
insert into public.network_contacts (organization_id, kind, name, roles)
values ((select id from ids where name = 'org'), 'person', 'Ever ' || (select v from vars where k = 'tag'),
        array['songwriter']);
insert into ids select 'contact', id from public.network_contacts
 where name = 'Ever ' || (select v from vars where k = 'tag');
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
values ((select id from ids where name = 'org'), (select id from ids where name = 'master'),
        'Ever ' || (select v from vars where k = 'tag'), 'composer', (select id from ids where name = 'contact'));

-- The project is launched: it has stages, tasks…
reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select public.respond_to_assignment(
  (select id from public.project_assignments where project_id = (select id from ids where name = 'project')),
  'accepted');

-- Rights ----------------------------------------------------------------------
select is((select error from public.delete_records('project', array[(select id from ids where name = 'project')])),
          'forbidden', 'a project manager cannot delete');
select is((select count(*) from public.projects where id = (select id from ids where name = 'project')),
          1::bigint, 'the project is still there');

-- In use ----------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select error from public.delete_records('artist', array[(select id from ids where name = 'artist')])),
          'artist_in_use', 'an artist credited on a master stays');
select is((select error from public.delete_records('master', array[(select id from ids where name = 'master')])),
          'master_in_use', 'a master used by a project stays');
select is((select error from public.delete_records('project', array[gen_random_uuid()])),
          'not_found', 'an unknown id is reported, not raised');

-- A selection: what can go goes, the rest is reported ---------------------------------
select is((select array_agg(error order by error nulls first)
             from public.delete_records('master',
               array[(select id from ids where name = 'master'),
                     public.create_master((select id from ids where name = 'org'), 'Libre',
                       jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'),
                                                            'role', 'main')))])),
          array[null, 'master_in_use'], 'one master of two is deleted, the other reported');

-- Top-down --------------------------------------------------------------------
select is((select error from public.delete_records('project', array[(select id from ids where name = 'project')])),
          null, 'a launched project is deleted');
select is((select count(*) from public.project_stages where project_id = (select id from ids where name = 'project')),
          0::bigint, 'with its stages');
select is((select count(*) from public.project_masters where project_id = (select id from ids where name = 'project')),
          0::bigint, 'and its link to the master');
select is((select error from public.delete_records('contact', array[(select id from ids where name = 'contact')])),
          null, 'a credited contact is deleted');
select is((select contact_id from public.master_contributors where master_id = (select id from ids where name = 'master')),
          null, 'the credit keeps its name and loses the link');
select is((select error from public.delete_records('master', array[(select id from ids where name = 'master')])),
          null, 'then the master');
select is((select error from public.delete_records('artist', array[(select id from ids where name = 'artist')])),
          null, 'then the artist');
select is((select count(*) from public.activity_events where artist_id = (select id from ids where name = 'artist')),
          0::bigint, 'with its journal');

select * from finish();
rollback;
