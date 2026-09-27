-- Master page: sessions, tracks, contributors, splits, declarations, files,
-- rights and the master activity log
-- (supabase/migrations/20260927003001_master_page.sql), run with
-- `supabase test db`.
begin;
select plan(18);

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

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

-- Activity ------------------------------------------------------------------
select is((select count(*)::int from public.activity_events
            where master_id = (select id from ids where name = 'master') and kind = 'master_created'),
          1, 'creating a master logs master_created on the master');

update public.masters set iswc = 'T0345246801', rights_holder = 'PDS', rights_year = 2026
 where id = (select id from ids where name = 'master');
select is((select detail -> 'fields' from public.activity_events
            where master_id = (select id from ids where name = 'master') and kind = 'master_updated'),
          '["rights"]'::jsonb, 'editing the rights logs which part changed');

select throws_ok($$
  update public.masters set iswc = 'T-034.524.680-1' where id = (select id from ids where name = 'master')
$$, '23514', null, 'the ISWC is stored normalized');

-- Sessions and tracks ---------------------------------------------------------
insert into public.master_sessions (organization_id, master_id, kind, studio)
values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'recording', 'Studio Ferber');
insert into ids select 'session', id from public.master_sessions
 where master_id = (select id from ids where name = 'master');

select lives_ok($$
  insert into public.master_tracks (organization_id, master_id, session_id, name)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'),
          (select id from ids where name = 'session'), 'Voix lead')
$$, 'a project manager adds a track recorded in a session');

select is((select detail ->> 'section' from public.activity_events
            where master_id = (select id from ids where name = 'master') and kind = 'master_item_added'
              and detail ->> 'name' = 'Voix lead'),
          'track', 'adding a track logs its section and name');

insert into ids select 'other_master', public.create_master(
  (select id from ids where name = 'org'), 'Lune',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

select throws_ok($$
  insert into public.master_tracks (organization_id, master_id, session_id, name)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'other_master'),
          (select id from ids where name = 'session'), 'Basse')
$$, 'P0001', 'track_session_other_master', 'a track cannot point to another master''s session');

-- Splits ---------------------------------------------------------------------
select lives_ok($$
  insert into public.master_splits (organization_id, master_id, kind, party, role, share)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'master', 'PDS', 'label', 60),
         ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'master', 'Kalia', 'artist', 40)
$$, 'master shares adding up to 100 are accepted');

select throws_ok($$
  insert into public.master_splits (organization_id, master_id, kind, party, role, share)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'master', 'Autre', 'other', 1);
  set constraints all immediate
$$, 'P0001', 'split_total_over_100', 'shares of a kind never exceed 100');

select is((select catalog_only from public.activity_events
            where master_id = (select id from ids where name = 'master') and kind = 'master_item_added'
              and detail ->> 'section' = 'split' limit 1),
          true, 'a split event is catalog only');

-- Declarations -----------------------------------------------------------------
insert into public.master_declarations (organization_id, master_id, organism, status, reference)
values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'sacem', 'submitted', 'W123');

select throws_ok($$
  insert into public.master_declarations (organization_id, master_id, organism, status)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'sacem', 'confirmed')
$$, '23505', null, 'one declaration per organism');

-- Creative director: reads, never writes, never sees the splits -------------------
select pg_temp.act_as((select id from ids where name = 'creative'));

select is((select count(*)::int from public.master_sessions
            where master_id = (select id from ids where name = 'master')),
          1, 'every member reads the sessions');

select is((select count(*)::int from public.master_splits
            where master_id = (select id from ids where name = 'master')),
          0, 'splits are hidden without manage_catalog');

select is((select count(*)::int from public.activity_events
            where master_id = (select id from ids where name = 'master')
              and detail ->> 'section' = 'split'),
          0, 'split events are hidden without manage_catalog');

select throws_ok($$
  insert into public.master_contributors (organization_id, master_id, name, role)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'Léo', 'producer')
$$, '42501', null, 'a creative director cannot add a contributor');

select throws_ok($$
  insert into public.activity_events (organization_id, master_id, kind)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'master_updated')
$$, '42501', null, 'nobody writes the activity log directly');

-- Archived master: frozen ----------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'director'));
select public.set_master_archived((select id from ids where name = 'other_master'), true);

select throws_ok($$
  insert into public.master_contributors (organization_id, master_id, name, role)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'other_master'), 'Léo', 'producer')
$$, '42501', null, 'an archived master takes no new contributor');

select lives_ok($$
  insert into public.master_contributors (organization_id, master_id, name, role, detail)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'master'), 'Léo', 'musician', 'guitare')
$$, 'the director adds a contributor to a live master');

select is((select count(*)::int from public.master_splits
            where master_id = (select id from ids where name = 'master')),
          2, 'the director reads the splits');

select * from finish();
rollback;
