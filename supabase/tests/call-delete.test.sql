-- Deleting a call (delete_call, 20261107180101): the director, and whoever
-- works on it (the creator of an internal meeting); never an invited member.
-- Run with `supabase test db`.
begin;
select plan(5);

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
insert into ids select r.name, pg_temp.new_user('cdl-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('creator'), ('guest')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('creator', 'project_manager'),
               ('guest', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'creator', 'guest');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Two internal meetings created by a project manager, the guest invited.
select pg_temp.act_as(pg_temp.id_of('creator'));
with c as (
  insert into public.calls (organization_id, project_id, title, occurred_at, ends_at, consent)
  select pg_temp.id_of('org'), null, 'm' || n, now() + interval '1 day',
         now() + interval '1 day 30 minutes', 'granted'
    from generate_series(1, 2) as n
  returning id, title)
insert into ids select title, id from c;
insert into public.call_attendees (call_id, organization_id, person_id)
  select pg_temp.id_of(m), pg_temp.id_of('org'), pg_temp.id_of('guest_person')
    from (values ('m1'), ('m2')) as v (m);
insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('m2'), pg_temp.id_of('org'), pg_temp.id_of('director_person'));
reset role;

select pg_temp.act_as(pg_temp.id_of('guest'));
select throws_ok($$ select public.delete_call(pg_temp.id_of('m1')) $$,
                 '42501', null, 'an invited member may not delete the meeting');
reset role;

select pg_temp.act_as(pg_temp.id_of('creator'));
select lives_ok($$ select public.delete_call(pg_temp.id_of('m1')) $$,
                'its creator deletes it');
reset role;
select is((select count(*)::int from public.calls where id = pg_temp.id_of('m1')), 0,
          'the meeting is gone');
select is((select count(*)::int from public.call_attendees where call_id = pg_temp.id_of('m1')), 0,
          'with its attendees');

select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.delete_call(pg_temp.id_of('m2')) $$,
                'the director deletes a meeting someone else created');
reset role;

select * from finish();
rollback;
