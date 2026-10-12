-- Signal de changement d'un projet (JUR-12 / JUR-28,
-- supabase/migrations/20261012100201_project_live.sql).
-- Run with `supabase test db`.
begin;
select plan(7);

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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id in (select person_id from public.accounts
                        where id in (pg_temp.id_of('owner'), pg_temp.id_of('other')));
insert into ids select 'owner_person', person_id from public.accounts
 where id = pg_temp.id_of('owner');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Live ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('owner_person'));
insert into ids select 'project', id from public.projects
 where title = 'Live ' || (select v from vars where k = 'tag');

select is((select count(*)::int from public.project_live where project_id = pg_temp.id_of('project')),
          0, 'no signal before any legal change');

insert into public.legal_intakes (organization_id, project_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'));
select is((select version from public.project_live where project_id = pg_temp.id_of('project')),
          1::bigint, 'a legal row of the project bumps its signal');

update public.legal_intakes set updated_at = now() + interval '1 second' where project_id = pg_temp.id_of('project');
select is((select version from public.project_live where project_id = pg_temp.id_of('project')),
          2::bigint, 'each change bumps it again');

delete from public.legal_intakes where project_id = pg_temp.id_of('project');
select is((select version from public.project_live where project_id = pg_temp.id_of('project')),
          3::bigint, 'a deletion is a change too');

select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.project_live where project_id = pg_temp.id_of('project')),
          1, 'who sees the project hears its signal');
select throws_ok($$
  update public.project_live set version = 99 where project_id = pg_temp.id_of('project')
$$, '42501', null, 'nobody writes the signal directly');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.project_live where project_id = pg_temp.id_of('project')),
          0, 'someone who does not see the project hears nothing');

select * from finish();
rollback;
