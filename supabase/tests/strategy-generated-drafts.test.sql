-- Brouillon de stratégie rédigé par PO et synthèse du récit (MKT-S1-06, MKT-S1-09,
-- supabase/migrations/20261012101401_strategy_generated_drafts.sql).
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

reset role;
create function pg_temp.draft(p_status text, p_source text, p_confidence text) returns void
language sql as $$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value,
                                   status, source_type, source_label, confidence)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'strategy', 'narrative_story',
          '"Un titre écrit après une rupture."'::jsonb, p_status, p_source, 'le call « Kick-off »',
          p_confidence)
$$;

select throws_ok($$ select pg_temp.draft('confirmed', 'generated', 'high') $$,
  '23514', null, 'a draft of PO is never a confirmed value by itself');
select lives_ok($$ select pg_temp.draft('proposed', 'generated', 'low') $$,
  'a draft of PO is a proposal, with the confidence judged by the code');
select throws_ok($$ select pg_temp.draft('proposed', 'manual', 'high') $$,
  '23514', null, 'only a draft carries a confidence');
select throws_ok($$ select pg_temp.draft('proposed', 'generated', 'sure') $$,
  '23514', null, 'a confidence is high, medium or low');
select is((select confidence from public.current_field_values
            where project_id = pg_temp.id_of('project') and deliverable = 'strategy'
              and field_key = 'narrative_story'), 'low',
          'the current value says how sure PO was');
select ok(has_column_privilege('authenticated', 'public.field_values', 'confidence', 'INSERT'),
          'the owner writes the confidence with the draft, with their session');

select * from finish();
rollback;
