-- Publics structurés et responsable d'un KPI (MKT-S1-05, MKT-S1-13,
-- supabase/migrations/20261012101201_strategy_audiences_kpi_owner.sql).
-- Run with `supabase test db`.
begin;
select plan(5);

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
  array[pg_temp.id_of('master')], p_music_format => 'single');

select throws_ok(format($$
  insert into public.strategy_audiences (organization_id, project_id, segment)
  values (%L, %L, 'Fans rap FR') $$, pg_temp.id_of('org'), pg_temp.id_of('project')),
  '42501', null, 'a public is written only while the strategy is open, by its owner');

reset role;
insert into public.strategy_audiences (organization_id, project_id, segment, priority, insight, channel)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Fans rap FR', 'primary', 'Attendent un son plus sombre', 'TikTok');
select throws_ok(format($$
  insert into public.strategy_audiences (organization_id, project_id, segment, priority)
  values (%L, %L, 'Pros', 'tertiary') $$, pg_temp.id_of('org'), pg_temp.id_of('project')),
  '23514', null, 'a priority is primary or secondary');

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.strategy_audiences where project_id = pg_temp.id_of('project')), 1,
          'whoever sees the project reads its publics');
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.strategy_audiences where project_id = pg_temp.id_of('project')), 0,
          'nobody else does');

reset role;
select lives_ok(format($$
  insert into public.strategy_objectives (organization_id, project_id, label, owner_person_id)
  values (%L, %L, 'Streams', (select person_id from public.accounts where id = %L)) $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('manager')),
  'a KPI says who follows it');

select * from finish();
rollback;
