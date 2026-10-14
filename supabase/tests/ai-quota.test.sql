-- Daily quota of LLM requests (20261014100101_ai_request_quota.sql), run with
-- `supabase test db`.
begin;
select plan(11);

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
  ('member', pg_temp.new_user('member-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into ids select 'member_person', person_id from public.accounts where id = (select id from ids where name = 'member');

update public.memberships set status = 'approved', role = 'general_director'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'director'));
update public.memberships set status = 'approved', role = 'project_manager'
 where person_id = (select id from ids where name = 'member_person');

-- Member ----------------------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'member'));

select is((select daily_limit from public.ai_usage_today((select id from ids where name = 'org'))),
          200, 'a member starts with 200 requests a day');
select is((select (allowed, used)::text from public.consume_ai_request((select id from ids where name = 'org'))),
          '(t,1)', 'the first request is allowed and counted');

update public.memberships set ai_daily_limit = 5000
 where person_id = (select id from ids where name = 'member_person');
select is((select daily_limit from public.ai_usage_today((select id from ids where name = 'org'))),
          200, 'a member cannot raise their own limit');

select throws_ok(
  format('insert into public.ai_requests (organization_id, person_id) values (%L, %L)',
         (select id from ids where name = 'org'), (select id from ids where name = 'member_person')),
  '42501', null, 'a member cannot write a request directly');

select is((select count(*)::integer from public.ai_usage_today((select id from ids where name = 'org'))),
          1, 'a member reads only their own usage');

-- Director --------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));

update public.memberships set ai_daily_limit = 2
 where person_id = (select id from ids where name = 'member_person');
select is((select used from public.ai_usage_today((select id from ids where name = 'org'))
            where person_id = (select id from ids where name = 'member_person')),
          1, 'the director reads the member''s usage');

-- Limit reached ---------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'member'));

select is((select (allowed, used, daily_limit)::text from public.consume_ai_request((select id from ids where name = 'org'))),
          '(t,2,2)', 'the director''s new limit applies');
select is((select (allowed, used)::text from public.consume_ai_request((select id from ids where name = 'org'))),
          '(f,2)', 'beyond the limit the request is refused');
select is((select count(*)::integer from public.ai_requests
            where person_id = (select id from ids where name = 'member_person')),
          2, 'a refused request is not recorded');
select ok((select resets_at > now() and resets_at <= now() + interval '25 hours'
             from public.ai_usage_today((select id from ids where name = 'org'))),
          'the counter starts again at the next Paris midnight');

-- Outsider (pending) ------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'outsider'));
select throws_ok(
  format('select * from public.consume_ai_request(%L)', (select id from ids where name = 'org')),
  '42501', 'not_a_member', 'a pending account cannot use the model');

select * from finish();
rollback;
