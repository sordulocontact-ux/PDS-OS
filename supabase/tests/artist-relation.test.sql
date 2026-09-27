-- Relation of an artist with PDS
-- (supabase/migrations/20260927002101_artist_relation.sql), run with
-- `supabase test db`.
begin;
select plan(9);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));

-- Creation --------------------------------------------------------------------
select throws_ok($$
  insert into public.artists (organization_id, name)
  values ((select id from ids where name = 'org'), 'Sans relation ' || (select v from vars where k = 'tag'))
$$, '23502', null, 'an artist is created with its relation, never a silent default');

select throws_ok($$
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Autre ' || (select v from vars where k = 'tag'), 'friend')
$$, '23514', null, 'the relation is signed or collaboration');

insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Mic ' || (select v from vars where k = 'tag'), 'collaboration');
insert into ids select 'artist', id from public.artists
 where name = 'Mic ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Session Mic',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

select is((select detail ->> 'relation' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_created'),
          'collaboration', 'the creation event records the relation');

-- Creative director: reads, never changes it -------------------------------------
select pg_temp.act_as((select id from ids where name = 'creative'));

update public.artists set relation = 'signed' where id = (select id from ids where name = 'artist');
select pg_temp.act_as((select id from ids where name = 'manager'));
select is((select relation from public.artists where id = (select id from ids where name = 'artist')),
          'collaboration', 'a creative director cannot change the relation');

-- Collaboration → signed: the same record ------------------------------------------
select lives_ok($$
  update public.artists set relation = 'signed' where id = (select id from ids where name = 'artist')
$$, 'a project manager moves a collaboration to the roster');

select is((select relation from public.artists where id = (select id from ids where name = 'artist')),
          'signed', 'the artist is now signed');

select is((select count(*)::int from public.master_artists
            where artist_id = (select id from ids where name = 'artist')
              and master_id = (select id from ids where name = 'master')),
          1, 'the artist keeps its masters');

select is((select detail - 'fields' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_updated'),
          '{"relation": "signed"}'::jsonb, 'the journal records the new relation');

select is((select detail -> 'fields' from public.activity_events
            where artist_id = (select id from ids where name = 'artist') and kind = 'artist_updated'),
          '["relation"]'::jsonb, 'and only the relation changed');

select * from finish();
rollback;
