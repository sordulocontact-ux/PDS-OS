-- Catalog (artists, masters) and project creation around masters
-- (docs/PARCOURS-01-ARTISTE-MASTER-PROJET.md), run with `supabase test db`.
begin;
select plan(24);

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
-- Unique per run: the suite must pass whatever the dev database contains.
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into vars select 'artist', 'Nova Kessel ' || v from vars where k = 'tag';
insert into vars select 'guest', 'Sable ' || v from vars where k = 'tag';
insert into vars select 'isrc', 'FR-Z03-' || lpad(floor(random() * 1e7)::int::text, 7, '0');

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

-- Artists -------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'manager'));
select lives_ok($$
  insert into public.artists (organization_id, name, notes, relation)
  values ((select id from ids where name = 'org'), (select v from vars where k = 'artist'), 'Signée en 2026', 'signed');
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), (select v from vars where k = 'guest'), 'collaboration')
$$, 'a project manager creates artists');
insert into ids select 'artist', id from public.artists where name = (select v from vars where k = 'artist');
insert into ids select 'guest', id from public.artists where name = (select v from vars where k = 'guest');

select throws_ok($$
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), '  ' || upper((select v from vars where k = 'artist')) || ' ', 'signed')
$$, '23505', null, 'an artist name is unique, whatever the case and spaces');

-- Deezer id: random per run, the dev database may already hold real ones.
insert into vars select 'deezer', (floor(random() * 1e12) + 1e12)::bigint::text;
select lives_ok($$
  update public.artists
     set deezer_id = (select v from vars where k = 'deezer')::bigint,
         picture_url = 'https://cdn-images.dzcdn.net/images/artist/x/500x500.jpg',
         deezer_url = 'https://www.deezer.com/artist/1'
   where id = (select id from ids where name = 'artist')
$$, 'a project manager links an artist to Deezer');

select throws_ok($$
  update public.artists set deezer_id = (select v from vars where k = 'deezer')::bigint
   where id = (select id from ids where name = 'guest')
$$, '23505', null, 'a Deezer profile belongs to one active artist');

-- Masters -------------------------------------------------------------------
select lives_ok($$
  insert into ids select 'master', public.create_master(
    (select id from ids where name = 'org'), 'Lueur',
    jsonb_build_array(
      jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main'),
      jsonb_build_object('artist_id', (select id from ids where name = 'guest'), 'role', 'featuring')),
    null, (select v from vars where k = 'isrc'), 187)
$$, 'a project manager creates a master with two credits');

select is((select isrc from public.masters where id = (select id from ids where name = 'master')),
          replace((select v from vars where k = 'isrc'), '-', ''), 'the ISRC is stored without hyphens');
select is((select string_agg(role || ':' || position, ',' order by position)
             from public.master_artists where master_id = (select id from ids where name = 'master')),
          'main:1,featuring:2', 'credits keep their order and role');

select throws_ok($$
  select public.create_master((select id from ids where name = 'org'), 'Seul', '[]')
$$, 'P0001', 'master_requires_artist', 'a master needs at least one artist');

select throws_ok($$
  insert into public.masters (organization_id, title) values ((select id from ids where name = 'org'), 'Orphelin');
  set constraints all immediate
$$, 'P0001', 'master_requires_artist', 'a master without credit is refused at commit, whatever the path');
set constraints all deferred;

select lives_ok($$
  insert into ids select 'master2', public.create_master((select id from ids where name = 'org'), 'Brume',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))), 'radio edit');
  insert into ids select 'master3', public.create_master((select id from ids where name = 'org'), 'Vertige',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))))
$$, 'more masters for an EP');

select throws_ok($$
  select public.create_project((select id from ids where name = 'org'), 'Pas le droit', 'partnership',
    null, null, null, null, null)
$$, '42501', null, 'a project manager cannot create a project');

-- Projects ------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));

select throws_ok($$
  select public.create_project((select id from ids where name = 'org'), 'Lueur', 'music_release',
    array[]::uuid[], null, null, null, null)
$$, 'P0001', 'music_release_requires_master', 'a music release without master is refused');

select throws_ok($$
  insert into public.projects (organization_id, title, type)
  values ((select id from ids where name = 'org'), 'Contournement', 'music_release');
  set constraints all immediate
$$, 'P0001', 'music_release_requires_master', 'the rule also holds for a direct insert');
set constraints all deferred;

select lives_ok($$
  insert into ids select 'partnership', public.create_project((select id from ids where name = 'org'),
    'OP marque', 'partnership', null, null, null, null, null)
$$, 'a partnership without master is created');

select lives_ok($$
  insert into ids select 'ep', public.create_project((select id from ids where name = 'org'),
    'EP Lueur', 'music_release',
    array[(select id from ids where name = 'master'), (select id from ids where name = 'master2'),
          (select id from ids where name = 'master3'), (select id from ids where name = 'master')],
    '2026-12-04', 150000, 'high', 'Brief reçu par mail')
$$, 'a music release with three masters is created');

select is((select string_agg(master_id::text, ',' order by position) from public.project_masters
            where project_id = (select id from ids where name = 'ep')),
          (select id from ids where name = 'master') || ',' || (select id from ids where name = 'master2')
            || ',' || (select id from ids where name = 'master3'),
          'masters are linked once each, in the chosen order');

select lives_ok($$
  select public.create_project((select id from ids where name = 'org'), 'Single Lueur', 'music_release',
    array[(select id from ids where name = 'master')], null, null, null, null)
$$, 'the same master can join another project');

select is((select count(*)::int from public.project_stages
            where project_id in ((select id from ids where name = 'ep'), (select id from ids where name = 'partnership'))),
          0, 'a created project has no stage');
select is((select count(*)::int from public.projects
            where id in ((select id from ids where name = 'ep'), (select id from ids where name = 'partnership'))
              and owner_person_id is null),
          2, 'nobody owns a project at creation');
select is(public.project_artist_name((select id from ids where name = 'ep')),
          (select v from vars where k = 'artist'), 'the artist of a project is the main credit of its first master');

select throws_ok($$
  insert into public.projects (organization_id, title, type, owner_person_id)
  values ((select id from ids where name = 'org'), 'Avec responsable', 'partnership',
          (select person_id from public.accounts where id = (select id from ids where name = 'director')))
$$, '42501', null, 'the owner cannot be set at creation');

-- Creative director -----------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));

select ok((select count(*) from public.masters where id = (select id from ids where name = 'master')) = 1,
          'a creative director reads the catalog');
select throws_ok($$
  insert into public.artists (organization_id, name, relation) values ((select id from ids where name = 'org'), 'Intrus DC', 'signed')
$$, '42501', null, 'a creative director cannot create an artist');
select throws_ok($$
  select public.create_master((select id from ids where name = 'org'), 'Intrus',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))))
$$, '42501', null, 'a creative director cannot create a master');

reset role;
select * from finish();
rollback;
