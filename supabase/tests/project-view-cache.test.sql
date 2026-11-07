-- project_view_cache (20261107230201): a reader reads and writes only their
-- own kept views; no one else, not even the same organization's director,
-- sees them. live_function_maps is never readable directly. Run with
-- `supabase test db`.
begin;
select plan(9);

create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now());
  return v_id;
end $$;
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- How many rows the caller changed or removed (RLS filters them).
create function pg_temp.update_all() returns int language sql as $$
  with changed as (update public.project_view_cache set value = '{}' returning 1)
  select count(*)::int from changed $$;
create function pg_temp.delete_all() returns int language sql as $$
  with gone as (delete from public.project_view_cache returning 1)
  select count(*)::int from gone $$;
grant execute on function pg_temp.update_all() to authenticated;
grant execute on function pg_temp.delete_all() to authenticated;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids values
  ('a', pg_temp.new_user('cache-a-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('b', pg_temp.new_user('cache-b-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('project', (select id from public.projects order by created_at limit 1));

insert into public.project_view_cache
  (account_id, view, project, reader, computed_at, seen, tables, value)
select (select id from ids where name = 'a'), 'journeys',
       (select id from ids where name = 'project'), repeat('0', 64), now(),
       '{"version": 1, "tables": {}}', '[]', '{"mine": []}';

select pg_temp.act_as((select id from ids where name = 'a'));
select is((select count(*)::int from public.project_view_cache), 1,
  'a reader reads their own kept view');
select lives_ok($$
  update public.project_view_cache set value = '{"mine": [1]}'
   where view = 'journeys' $$, 'a reader updates their own kept view');
select lives_ok($$
  insert into public.project_view_cache (view, project, reader, computed_at, seen, tables, value)
  values ('workflow-states', (select id from ids where name = 'project'), repeat('1', 64), now(),
          '{"version": 1, "tables": {}}', '[]', '{}') $$,
  'a reader writes a kept view for themselves (account_id from auth.uid())');
reset role;

select pg_temp.act_as((select id from ids where name = 'b'));
select is((select count(*)::int from public.project_view_cache), 0,
  'another reader sees none of them');
select is(pg_temp.update_all(), 0, 'another reader updates none of them');
select throws_ok($$
  insert into public.project_view_cache (account_id, view, project, reader, computed_at, seen, tables, value)
  values ((select id from ids where name = 'a'), 'journeys-x', (select id from ids where name = 'project'),
          repeat('2', 64), now(), '{"version": 1, "tables": {}}', '[]', '{}') $$,
  '42501', null, 'another reader cannot write a view in someone else''s name');
select is(pg_temp.delete_all(), 0, 'another reader deletes none of them');
select throws_ok($$ select * from public.live_function_maps $$, '42501', null,
  'the functions'' map is never read directly');
select ok((public.live_function_map() ->> 'signature') is not null,
  'live_function_map answers a signed-in reader');
reset role;

select * from finish();
rollback;
