-- Keyboard shortcuts of an account (supabase/migrations/20261127200101_account_shortcuts.sql):
-- read and written by their own account only. Run with `supabase test db`.
begin;
select plan(8);

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
insert into ids select r.name, pg_temp.new_user('ksc-' || r.name || '-' || substr(md5(random()::text), 1, 8) || '@pds.test')
  from (values ('me'), ('other')) as r (name);

select pg_temp.act_as((select id from ids where name = 'me'));
select lives_ok(
  $$ insert into public.account_shortcuts (shortcuts) values ('{"create": {"key": "j", "mod": false, "double": false}}') $$,
  'an account keeps its own shortcuts');
select is((select count(*)::int from public.account_shortcuts), 1, 'it reads them');
select lives_ok(
  $$ insert into public.account_shortcuts (account_id, shortcuts) values (auth.uid(), '{"create": {"key": "j", "mod": false, "double": false}}')
     on conflict (account_id) do update set account_id = excluded.account_id, shortcuts = excluded.shortcuts $$,
  'an upsert (as supabase-js sends it) changes them');
select throws_ok(
  $$ insert into public.account_shortcuts (account_id, shortcuts) values ((select id from ids where name = 'other'), '{}') $$,
  '42501', null, 'never for another account');
select throws_ok(
  $$ update public.account_shortcuts set shortcuts = '[]' $$,
  '23514', null, 'a list is refused: an object only');

reset role;
select pg_temp.act_as((select id from ids where name = 'other'));
select is((select count(*)::int from public.account_shortcuts), 0, 'another account sees none of them');
update public.account_shortcuts set shortcuts = '{}';
delete from public.account_shortcuts;
reset role;
select is(
  (select shortcuts->'create'->>'key' from public.account_shortcuts
    where account_id = (select id from ids where name = 'me')),
  'j', 'nor changes or deletes them');

select pg_temp.act_as((select id from ids where name = 'me'));
select lives_ok($$ delete from public.account_shortcuts $$, 'the account goes back to the defaults');

select * from finish();
rollback;
