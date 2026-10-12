-- Livrables et calendrier (MKT-S1-08, MKT-S1-10,
-- supabase/migrations/20261012101301_deliverables_calendar.sql).
-- Run with `supabase test db`.
begin;
select plan(4);

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


create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;


reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'), 'Soleil', 'music_release',
  array[pg_temp.id_of('master')], p_music_format => 'ep');
reset role;
insert into public.levers (organization_id, project_id, label, family, state, review_status, no_deliverables)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 'creation_content', 'selected', 'confirmed', true);
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');

select lives_ok(format($$
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, format)
  values (%L, %L, %L, 'Clip officiel', 'Vidéo 16:9, 3 min') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever')),
  'a deliverable has a format');
select is((select no_deliverables from public.levers where id = pg_temp.id_of('lever')), false,
          'a deliverable added to a lever said to need none takes that back');
select lives_ok(format($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, kind, channel, deliverable_id)
  values (%L, %L, 'Livraison · Clip', '2026-11-01', 'delivery', 'other',
          (select id from public.strategy_deliverables where project_id = %L)) $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('project')),
  'a delivery is a milestone of its own');
select throws_ok(format($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, kind, channel)
  values (%L, %L, 'X', '2026-11-01', 'shooting', 'other') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project')), '23514', null, 'kinds stay a closed list');

select * from finish();
rollback;
