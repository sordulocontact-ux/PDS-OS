-- A spend of a project or of an artist (BUD 1,
-- supabase/migrations/20261111200102_budget_artist_lines.sql): one row of
-- budget_lines, exactly one owner; an artist's spends read and written by the
-- direction, the project managers and the business managers; a project's
-- lines keep their rule; the receipt of an artist's spend is a private file of
-- the artist.
-- Run with `supabase test db`.
begin;
select plan(17);

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
insert into ids select r.name, pg_temp.new_user('bal-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('manager'), ('creative'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Morris ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Morris ' || (select v from vars where k = 'tag');
insert into public.artists (organization_id, name, relation, archived_at)
values (pg_temp.id_of('org'), 'Ancien ' || (select v from vars where k = 'tag'), 'signed', now());
insert into ids select 'archived', id from public.artists
 where name = 'Ancien ' || (select v from vars where k = 'tag');
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Autre ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'other_artist', id from public.artists
 where name = 'Autre ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'), 'Soleil', 'music_release',
  array[pg_temp.id_of('master')], p_music_format => 'single');
reset role;
insert into public.budget_lines (organization_id, project_id, label, amount_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 500000);

create function pg_temp.artist_line(p_artist text, p_label text) returns void language sql as $$
  insert into public.budget_lines (organization_id, artist_id, label, amount_cents, family, status)
  values (pg_temp.id_of('org'), pg_temp.id_of(p_artist), p_label, 1850, 'food', 'paid')
$$;
grant execute on function pg_temp.artist_line(text, text) to authenticated;

-- 1. Exactly one owner -------------------------------------------------------------
select throws_ok($$
  insert into public.budget_lines (organization_id, label, amount_cents)
  values (pg_temp.id_of('org'), 'Rien', 100) $$,
  '23514', null, 'a spend belongs to something');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, artist_id, label, amount_cents)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('artist'), 'Les deux', 100) $$,
  '23514', null, 'a spend belongs to a project or to an artist, not both');

-- 2. Who writes an artist's spends ----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select pg_temp.artist_line('artist', 'Grec après la session') $$,
  'a business manager adds a spend to an artist');
select is((select spent_on from public.budget_lines where label = 'Grec après la session'),
  (now() at time zone 'Europe/Paris')::date, 'a spend is dated today by default (Paris)');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
  1, 'a business manager reads a project''s lines, as the Finance (20261124190101)');
select throws_ok($$ select pg_temp.artist_line('archived', 'Taxi') $$,
  '42501', null, 'no spend on an archived artist');
select throws_ok($$
  update public.budget_lines set artist_id = pg_temp.id_of('other_artist')
   where label = 'Grec après la session' $$,
  '42501', null, 'what a spend belongs to is chosen once');

reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select pg_temp.artist_line('artist', 'Uber') $$,
  'a project manager adds a spend to an artist');
select is((select count(*)::int from public.budget_lines where artist_id = pg_temp.id_of('artist')),
  2, 'a project manager reads the artist''s spends');

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.budget_lines where artist_id = pg_temp.id_of('artist')),
  0, 'a creative director does not read an artist''s spends');
select throws_ok($$ select pg_temp.artist_line('artist', 'Café') $$,
  '42501', null, 'a creative director adds none');

reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*)::int from public.budget_lines where artist_id = pg_temp.id_of('artist')),
  0, 'business development does not read the artists'' budgets');

-- 3. An artist's spend links nothing of a project ----------------------------------------
reset role;
insert into public.levers (organization_id, project_id, label, family, state, review_status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 'creation_content', 'selected', 'confirmed');
select throws_ok(format($$
  insert into public.budget_lines (organization_id, artist_id, label, amount_cents, lever_id)
  values (%L, %L, 'Avec levier', 100, %L) $$,
  pg_temp.id_of('org'), pg_temp.id_of('artist'),
  (select id from public.levers where project_id = pg_temp.id_of('project') limit 1)),
  'P0001', null, 'an artist''s spend serves no lever of a project');

-- 4. The receipt ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'receipt',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('artist') || '/' || gen_random_uuid() || '.jpg',
        'ticket.jpg', 'image/jpeg', 1000);
select lives_ok($$
  update public.budget_lines
     set artist_attachment_file_id = (select id from public.artist_files where file_name = 'ticket.jpg'
                                       and artist_id = pg_temp.id_of('artist'))
   where label = 'Grec après la session' $$,
  'a business manager joins the receipt to the spend');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.artist_files
            where artist_id = pg_temp.id_of('artist') and category = 'receipt'),
  0, 'a receipt is not in the artist''s library for a creative director');
reset role;
select throws_ok(format($$
  insert into public.budget_lines (organization_id, artist_id, label, amount_cents, artist_attachment_file_id)
  values (%L, %L, 'Mauvais ticket', 100, %L) $$,
  pg_temp.id_of('org'), pg_temp.id_of('other_artist'),
  (select id from public.artist_files where file_name = 'ticket.jpg' and artist_id = pg_temp.id_of('artist'))),
  'P0001', null, 'a receipt stays with its artist');

-- 5. An artist with spends is not deleted -----------------------------------------------
select pg_temp.artist_line('other_artist', 'Train');
select throws_ok(format($$ select public.delete_artist_row(%L) $$, pg_temp.id_of('other_artist')),
  'P0001', 'artist_in_use', 'an artist with spends stays');

select * from finish();
rollback;
