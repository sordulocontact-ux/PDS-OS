-- Master workflow: an exchange held to fill the Brief Mix/Master
-- (supabase/migrations/20261005010001_master_brief_calls.sql): a call of the
-- same project, linked by its owner only, read by whoever sees the project.
-- Run with `supabase test db`.
begin;
select plan(10);

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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Two launched projects of the owner.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'ME ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'elsewhere', public.create_project(pg_temp.id_of('org'),
  'ME2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into ids select 'a2', public.transmit_project(pg_temp.id_of('elsewhere'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a2'), 'accepted');

create function pg_temp.new_call(p_name text, p_project text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.calls (organization_id, project_id, title, occurred_at, consent)
  values (pg_temp.id_of('org'), pg_temp.id_of(p_project), p_name, now(), 'granted')
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
select pg_temp.new_call('call', 'project');
select pg_temp.new_call('other_call', 'elsewhere');

select lives_ok($$
  insert into public.master_brief_calls (organization_id, project_id, call_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('call'))
$$, 'the owner makes a call of the project an exchange of its Brief Mix/Master');
select throws_ok($$
  insert into public.master_brief_calls (organization_id, project_id, call_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('other_call'))
$$, 'P0001', 'call_not_in_project', 'the call belongs to the same project');
select throws_ok($$
  insert into public.master_brief_calls (organization_id, project_id, call_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('call'))
$$, '23505', null, 'a call is linked once');
select throws_ok($$
  delete from public.master_brief_calls where call_id = pg_temp.id_of('call')
$$, '42501', null, 'the link is never deleted by hand');
reset role;

-- One transaction: the call and its link ----------------------------------------
select lives_ok($$
  insert into ids select 'made', public.create_master_exchange(pg_temp.id_of('project'),
    'Échange Mix/Master', now(), '',
    '[{"topic": "Tarifs", "minutes": 10}, {"topic": "Livrables", "minutes": 5}]'::jsonb)
$$, 'the owner prepares an exchange in one call');
select is((select (c.duration_minutes, l.project_id = c.project_id)::text
             from public.calls c join public.master_brief_calls l on l.call_id = c.id
            where c.id = pg_temp.id_of('made')),
          '(15,t)', 'the call is linked, its duration is the sum of its agenda');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$
  select public.create_master_exchange(pg_temp.id_of('project'), 'Non', now(), null, '[]'::jsonb)
$$, '42501', null, 'the director cannot prepare one (nothing is created)');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.master_brief_calls where project_id = pg_temp.id_of('project')),
          2, 'the director reads the exchanges');
select throws_ok($$
  insert into public.master_brief_calls (organization_id, project_id, call_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('elsewhere'), pg_temp.id_of('other_call'))
$$, '42501', null, 'the director does not link: only the owner writes');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.master_brief_calls where project_id = pg_temp.id_of('project')),
          0, 'a project manager who does not see the project reads nothing');
reset role;

select * from finish();
rollback;
