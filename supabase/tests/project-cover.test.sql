-- The project's cover (20261110100101): the direction changes it before the
-- project is accepted, then only its owner; another manager never; a path
-- outside "<org>/<project>/<uuid>.<ext>" is refused. Simulation only,
-- rolled back. Run with `supabase test db`.
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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
create function pg_temp.tag() returns text language sql as $$
  select v from vars where k = 'tag'
$$;

insert into ids values
  ('director', pg_temp.new_user('cover-dg-' || pg_temp.tag() || '@pds.test')),
  ('manager', pg_temp.new_user('cover-cp-' || pg_temp.tag() || '@pds.test')),
  ('other', pg_temp.new_user('cover-other-' || pg_temp.tag() || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');

-- Not accepted yet: no stage, no owner.
insert into public.projects (organization_id, title, type, music_format)
values (pg_temp.id_of('org'), 'Cover ' || pg_temp.tag(), 'music_release', 'single');
insert into ids select 'project', id from public.projects where title = 'Cover ' || pg_temp.tag();
insert into vars select 'path',
  pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/' || gen_random_uuid() || '.jpg';

select pg_temp.act_as(pg_temp.id_of('director'));
select ok(public.can_edit_project_cover(pg_temp.id_of('project')),
  'the direction may change the cover before acceptance');
select lives_ok($$ select public.set_project_cover(pg_temp.id_of('project'),
  (select v from vars where k = 'path')) $$, 'the direction sets it');
select throws_ok($$ select public.set_project_cover(pg_temp.id_of('project'), 'elsewhere/x.jpg') $$,
  '23514', null, 'a path outside the project is refused');
reset role;

-- Accepted: an owner and a stage.
update public.projects set owner_person_id = pg_temp.id_of('manager_person')
 where id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id
  from public.stage_definitions d order by d.position limit 1;

select pg_temp.act_as(pg_temp.id_of('director'));
select ok(not public.can_edit_project_cover(pg_temp.id_of('project')),
  'once accepted, the direction no longer changes it');
select throws_ok($$ select public.set_project_cover(pg_temp.id_of('project')) $$,
  '42501', null, 'the direction cannot remove it either');
reset role;

select pg_temp.act_as(pg_temp.id_of('manager'));
select ok(public.can_edit_project_cover(pg_temp.id_of('project')),
  'the owner may change it');
select is(public.set_project_cover(pg_temp.id_of('project')),
  (select v from vars where k = 'path'),
  'removing it returns the image it replaces, for cleanup');
reset role;

select pg_temp.act_as(pg_temp.id_of('other'));
select ok(not public.can_edit_project_cover(pg_temp.id_of('project')),
  'another manager may not');
reset role;

select * from finish();
rollback;
