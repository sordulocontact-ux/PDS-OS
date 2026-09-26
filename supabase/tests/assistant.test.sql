-- Assistant search functions (search_projects, search_calls), run with
-- `supabase test db`. SECURITY INVOKER: RLS must hide other people's data.
begin;
select plan(5);

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

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  execute 'set local role service_role';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon, service_role;
-- Unique per run: the suite must pass whatever the dev database contains.
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into vars select 'artist', 'Nova Kessel ' || v from vars where k = 'tag';
insert into vars select 'project', 'Lueur ' || v from vars where k = 'tag';
insert into vars select 'call', 'Cadrage ' || v from vars where k = 'tag';
insert into vars select 'isrc', 'FRZ03' || lpad(floor(random() * 1e7)::int::text, 7, '0');

insert into ids values
  ('admin', pg_temp.new_user('admin-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
-- The fixture admin is promoted directly (as postgres), so the suite does not
-- depend on the one-shot bootstrap of the seed.
-- The fixture "admin" is the project manager who owns the project: only the
-- owner writes inside a project (calls, release). Project created as postgres.
update public.memberships set status = 'approved', role = 'project_manager'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'admin'));
insert into public.projects (organization_id, title, type, owner_person_id)
values ((select id from ids where name = 'org'), (select v from vars where k = 'project'), 'partnership',
        (select person_id from public.accounts where id = (select id from ids where name = 'admin')));

select pg_temp.act_as((select id from ids where name = 'admin'));
insert into ids select 'project', id from public.projects where title = (select v from vars where k = 'project');
insert into public.calls (organization_id, project_id, title, consent)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), (select v from vars where k = 'call'), 'granted');
insert into ids select 'call', id from public.calls where title = (select v from vars where k = 'call');
insert into public.transcripts (organization_id, call_id, text, provider, model)
values ((select id from ids where name = 'org'), (select id from ids where name = 'call'), 'On a parlé du featuring avec un rappeur.', 'test', 'test');
select public.save_call_report((select id from ids where name = 'call'),
  (select id from public.transcripts where call_id = (select id from ids where name = 'call')),
  'Résumé', 'test', 'test',
  '[{"kind":"open","position":0,"what":"Inviter un featuring ou non","quote":"On a parlé du featuring","located":"found"}]');

-- Member ------------------------------------------------------------------------
select ok(exists(select 1 from public.search_projects('lueru') where id = (select id from ids where name = 'project')),
          'a typo still finds the project');
select ok(exists(select 1 from public.search_calls('featuring', (select id from ids where name = 'project')) where source = 'report'),
          'full-text search finds the report item');
select ok(exists(select 1 from public.search_calls('featurings rappeurs', (select id from ids where name = 'project')) where source = 'transcript'),
          'French stemming finds the transcript excerpt');

-- Outsider (pending) --------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'outsider'));
select is((select count(*)::int from public.search_projects('lueur')), 0, 'a pending account finds no project');
select is((select count(*)::int from public.search_calls('featuring')), 0, 'a pending account finds no call');

reset role;
select * from finish();
rollback;
