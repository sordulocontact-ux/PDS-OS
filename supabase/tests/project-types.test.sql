-- Project types and formats (…011001), run with `supabase test db`.
begin;
select plan(16);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'director'));
with a as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Artiste ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from a;
insert into ids select 'master', public.create_master((select id from ids where name = 'org'), 'Un',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main')));
insert into ids select 'master2', public.create_master((select id from ids where name = 'org'), 'Deux',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'), 'role', 'main')));

-- Content formats ------------------------------------------------------------
select lives_ok($$
  with f as (
    insert into public.content_formats (organization_id, name, description)
    values ((select id from ids where name = 'org'), 'Format ' || (select v from vars where k = 'tag'), 'Un format')
    returning id)
  insert into ids select 'format', id from f
$$, 'whoever creates projects creates a content format');
select throws_ok($$
  insert into public.content_formats (organization_id, name)
  values ((select id from ids where name = 'org'), 'FORMAT ' || (select v from vars where k = 'tag'))
$$, '23505', null, 'two formats never share a name');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.content_formats where id = (select id from ids where name = 'format')),
          1, 'every member reads the formats');
select throws_ok($$
  insert into public.content_formats (organization_id, name)
  values ((select id from ids where name = 'org'), 'Pirate ' || (select v from vars where k = 'tag'))
$$, '42501', null, 'without create_projects, no format is created');

-- Types ------------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.create_project((select id from ids where name = 'org'), 'Marque', 'partnership') $$,
                 '23514', null, 'a partnership is no longer a project');
select throws_ok($$ select public.create_project((select id from ids where name = 'org'), 'Concert', 'event') $$,
                 'P0001', 'project_type_unavailable', 'no new event project in V1');

-- Music ------------------------------------------------------------------------
select throws_ok($$ select public.create_project((select id from ids where name = 'org'), 'Sans format', 'music_release',
                     array[(select id from ids where name = 'master')]) $$,
                 'P0001', 'music_format_required', 'a music project names its format');
select throws_ok($$ select public.create_project((select id from ids where name = 'org'), 'Deux titres', 'music_release',
                     array[(select id from ids where name = 'master'), (select id from ids where name = 'master2')],
                     p_music_format => 'single') $$,
                 'P0001', 'single_requires_one_master', 'a single links one master');
select lives_ok($$ insert into ids select 'ep', public.create_project((select id from ids where name = 'org'), 'EP',
                     'music_release',
                     array[(select id from ids where name = 'master'), (select id from ids where name = 'master2')],
                     p_music_format => 'ep', p_initial_context => '  Contexte  ') $$,
                'an EP links several masters');
select is((select music_format || ' ' || initial_context from public.projects where id = (select id from ids where name = 'ep')),
          'ep Contexte', 'the format and the initial context are saved');
select throws_ok($$ select public.create_project((select id from ids where name = 'org'), 'Faux format', 'music_release',
                     array[(select id from ids where name = 'master')], p_music_format => 'maxi') $$,
                 '23514', null, 'an unknown format is refused');

-- Content ----------------------------------------------------------------------
select lives_ok($$ insert into ids select 'edition', public.create_project((select id from ids where name = 'org'),
                     'Édition', 'content', array[(select id from ids where name = 'master')],
                     p_music_format => 'single',
                     p_content_format_id => (select id from ids where name = 'format'),
                     p_artist_id => (select id from ids where name = 'artist')) $$,
                'an edition of a format is created');
select is((select (content_format_id = (select id from ids where name = 'format'))::text || ' '
                  || (artist_id = (select id from ids where name = 'artist'))::text || ' '
                  || coalesce(music_format, 'none')
             from public.projects where id = (select id from ids where name = 'edition')),
          'true true none', 'it keeps its format and artist, never a music format');
select is((select count(*)::int from public.project_masters where project_id = (select id from ids where name = 'edition')),
          0, 'a content project links no master');
select lives_ok($$ select public.update_project((select id from ids where name = 'edition'), 'Ponctuel', 'content') $$,
                'it becomes a one-off content');
select is((select coalesce(content_format_id::text, 'none') || ' ' || coalesce(artist_id::text, 'none')
             from public.projects where id = (select id from ids where name = 'edition')),
          'none none', 'without its format nor artist');

select * from finish();
rollback;
