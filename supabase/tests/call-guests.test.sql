-- A call planned like a Teams meeting: its time slot and its guests invited
-- by e-mail (supabase/migrations/20261010002001_call_schedule_guests.sql).
-- Run with `supabase test db`.
begin;
select plan(7);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('creator', pg_temp.new_user('creator-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id in (select person_id from public.accounts
                        where id in (pg_temp.id_of('creator'), pg_temp.id_of('other')));

-- A meeting with its slot ----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creator'));
select throws_ok($$
  insert into public.calls (organization_id, title, occurred_at, ends_at, consent)
  values (pg_temp.id_of('org'), 'Avant la fin', now() + interval '2 hours', now() + interval '1 hour',
          'granted')
$$, '23514', null, 'a call never ends before it starts');

select lives_ok($$
  insert into public.calls (organization_id, title, occurred_at, ends_at, consent)
  values (pg_temp.id_of('org'), 'Point ' || (select v from vars where k = 'tag'),
          now() + interval '1 day', now() + interval '1 day 30 minutes', 'granted')
$$, 'a member plans a meeting from one time to another');
insert into ids select 'meeting', id from public.calls
 where title = 'Point ' || (select v from vars where k = 'tag');

-- Its guests -----------------------------------------------------------------
select lives_ok($$
  insert into public.call_guests (call_id, organization_id, email)
  values (pg_temp.id_of('meeting'), pg_temp.id_of('org'), 'manager@label.example')
$$, 'its creator invites someone outside the team by e-mail');

select throws_ok($$
  insert into public.call_guests (call_id, organization_id, email)
  values (pg_temp.id_of('meeting'), pg_temp.id_of('org'), 'pas-une-adresse')
$$, '23514', null, 'an invitation needs a real address');

select throws_ok($$
  insert into public.call_guests (call_id, organization_id, email)
  values (pg_temp.id_of('meeting'), pg_temp.id_of('org'), 'Manager@Label.example')
$$, '23514', null, 'the address is stored in lower case, once');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.call_guests where call_id = pg_temp.id_of('meeting')),
          0, 'a member who does not see the meeting does not see its guests');
select throws_ok($$
  insert into public.call_guests (call_id, organization_id, email)
  values (pg_temp.id_of('meeting'), pg_temp.id_of('org'), 'intrus@example.com')
$$, '42501', null, 'nor invites anyone to it');

select * from finish();
rollback;
