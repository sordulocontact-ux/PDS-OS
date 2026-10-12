-- Variantes reliées et répartitions d'un titre (retours Catalogue 08, 15,
-- 43 à 53, supabase/migrations/20261012101001_catalog_variants_splits.sql).
-- Run with `supabase test db`.
begin;
select plan(15);

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


-- Variants named explicitly (retour 08) ------------------------------------
select lives_ok($$
  insert into ids select 'acoustic', public.create_master(
    pg_temp.id_of('org'), 'Soleil', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))),
    p_variant => 'acoustic')
$$, 'Acoustique is a variant');
select lives_ok(format($$ update public.masters set source_master_id = %L where id = %L $$,
  pg_temp.id_of('master'), pg_temp.id_of('acoustic')), 'a variant names its original');
insert into ids select 'live', public.create_master(
  pg_temp.id_of('org'), 'Soleil', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))),
  p_variant => 'live');
select throws_ok(format($$ update public.masters set source_master_id = %L where id = %L $$,
  pg_temp.id_of('acoustic'), pg_temp.id_of('live')), 'P0001', 'invalid_variant_source',
  'a variant never names another variant');
update public.masters set variant = 'original' where id = pg_temp.id_of('acoustic');
select is((select source_master_id from public.masters where id = pg_temp.id_of('acoustic')), null,
          'a title turned back into an original drops its source');

-- Roles by kind (retours 43, 49, 50) ---------------------------------------
select throws_ok(format($$
  insert into public.master_splits (organization_id, master_id, kind, party, role, share)
  values (%L, %L, 'master', 'Ever', 'composer', 10) $$, pg_temp.id_of('org'), pg_temp.id_of('master')),
  '23514', null, 'a composer is not an owner of the recording');
select throws_ok(format($$
  insert into public.master_splits (organization_id, master_id, kind, party, role, share)
  values (%L, %L, 'publishing', 'PDS Records', 'label', 10) $$, pg_temp.id_of('org'), pg_temp.id_of('master')),
  '23514', null, 'a label is not a right holder of the work');

-- History (retour 47) --------------------------------------------------------
insert into public.master_splits (organization_id, master_id, kind, party, role, share)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'master', 'PDS Records', 'label', 100);
update public.master_splits set share = 90 where master_id = pg_temp.id_of('master') and party = 'PDS Records';
select is((select (before ->> 'share') || '→' || (after ->> 'share') from public.master_split_events
            where master_id = pg_temp.id_of('master') and action = 'updated'), '100.00→90.00',
          'a change keeps the value before and after');

-- Validation (retours 15, 44, 46, 48) --------------------------------------
select throws_ok(format($$ select public.validate_master_split(%L, 'master') $$, pg_temp.id_of('master')),
                 'P0001', 'split_not_complete', 'only a split at 100 % is validated');
insert into public.master_splits (organization_id, master_id, kind, party, role, share)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'master', 'Bermud', 'coproducer', 10);
select lives_ok(format($$ select public.validate_master_split(%L, 'master') $$, pg_temp.id_of('master')),
                'a complete split is validated by the legal side');
update public.master_splits set share = 80 where master_id = pg_temp.id_of('master') and party = 'PDS Records';
select is((select (lines -> 1 ->> 'share') from public.master_split_validations
            where master_id = pg_temp.id_of('master') and kind = 'master'), '90.00',
          'a later change never rewrites the validated version');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.validate_master_split(%L, 'master') $$, pg_temp.id_of('master')),
                 '42501', null, 'without the legal permission, nobody validates');
select is((select count(*)::int from public.master_split_events where master_id = pg_temp.id_of('master')), 0,
          'the history stays as private as the splits');

-- Linking a title to an existing project (retours 16, 64) ------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'single', public.create_project(pg_temp.id_of('org'), 'Soleil (single)', 'music_release',
  array[pg_temp.id_of('live')], p_music_format => 'single');
insert into ids select 'ep', public.create_project(pg_temp.id_of('org'), 'EP Kalia', 'music_release',
  array[pg_temp.id_of('live')], p_music_format => 'ep');
select throws_ok(format($$ select public.link_master_to_project(%L, %L) $$,
  pg_temp.id_of('single'), pg_temp.id_of('master')), 'P0001', 'single_requires_one_master',
  'a single keeps one title');
select lives_ok(format($$ select public.link_master_to_project(%L, %L) $$,
  pg_temp.id_of('ep'), pg_temp.id_of('master')), 'a title joins an existing EP');
select is((select array_agg(master_id order by position) from public.project_masters
            where project_id = pg_temp.id_of('ep')),
          array[pg_temp.id_of('live'), pg_temp.id_of('master')], 'after the titles already there');

select * from finish();
rollback;
