-- Budget : familles, statut Facturé, livrable et pièce (MKT-S1-11, 12, 15,
-- supabase/migrations/20261012101101_budget_model.sql).
-- Run with `supabase test db`.
begin;
select plan(6);

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
insert into ids select 'other_project', public.create_project(pg_temp.id_of('org'), 'Autre', 'music_release',
  array[pg_temp.id_of('master')], p_music_format => 'ep');
reset role;

create function pg_temp.line(p_family text, p_detail text, p_status text default 'planned') returns void
language sql as $$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, family, family_detail, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Ligne', 100, p_family, p_detail, p_status)
$$;

-- Families (MKT-S1-11) -------------------------------------------------------
select lives_ok($$ select pg_temp.line('advertising', null) $$, 'a spend is advertising');
select throws_ok($$ select pg_temp.line('creation_content', null) $$, '23514', null,
                 'the former families are gone (mapped by the migration)');
select throws_ok($$ select pg_temp.line('other', null) $$, '23514', null, '« Autre » says what it is');
select lives_ok($$ select pg_temp.line('other', 'Assurance du matériel') $$, '« Autre » with its precision');

-- Statuses (MKT-S1-12 / 15) --------------------------------------------------
select lives_ok($$ select pg_temp.line('services', null, 'invoiced') $$, 'a spend can be invoiced');

-- Links stay in the project --------------------------------------------------
insert into public.levers (organization_id, project_id, label, family, state, review_status)
values (pg_temp.id_of('org'), pg_temp.id_of('other_project'), 'Clip', 'creation_content', 'selected', 'confirmed');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
select pg_temp.id_of('org'), pg_temp.id_of('other_project'), id, 'Clip officiel' from public.levers
 where project_id = pg_temp.id_of('other_project');
select throws_ok(format($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, deliverable_id)
  values (%L, %L, 'Tournage', 100, (select id from public.strategy_deliverables where project_id = %L))
$$, pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('other_project')),
  'P0001', 'deliverable_not_in_project', 'a spend pays for a deliverable of its own project');

select * from finish();
rollback;
