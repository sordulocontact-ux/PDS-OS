-- A project's call invites the members who work on it (…20261028000501):
-- the direction, and a creative director not yet on the project, who joins
-- its creative team; never a project manager of another project.
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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into ids select r.name, pg_temp.new_user('cim-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('creative'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'other_pm');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'CIM ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'),
  pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select 'call', public.create_framing_call(pg_temp.id_of('project'),
  'Échange de cadrage', now() + interval '1 day', '', '[]'::jsonb, 'Cadrer le projet',
  '[]'::jsonb, '{}');

select is((select array_agg(place order by place) from public.list_project_call_people(pg_temp.id_of('project'))
            where person_id in (pg_temp.id_of('director_person'), pg_temp.id_of('creative_person'),
                                pg_temp.id_of('other_pm_person'))),
          array['creative', 'direction'],
          'the owner is offered the direction and the creative director, not another project manager');

select lives_ok($$ insert into public.call_attendees (call_id, organization_id, person_id)
                   values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('director_person')) $$,
                'the direction is invited');
select lives_ok($$ insert into public.call_attendees (call_id, organization_id, person_id)
                   values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('creative_person')) $$,
                'a creative director not on the project is invited');
select throws_ok($$ insert into public.call_attendees (call_id, organization_id, person_id)
                    values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('other_pm_person')) $$,
                 '23514', null, 'a project manager of another project is not');
reset role;

select is((select count(*)::int from public.project_creatives
            where project_id = pg_temp.id_of('project') and person_id = pg_temp.id_of('creative_person')), 1,
          'the creative director joined the project''s creative team');
select is((select count(*)::int from public.notifications
            where kind = 'call_invited' and subject_id = pg_temp.id_of('call')), 2,
          'both are told of the call');

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.list_project_call_people(pg_temp.id_of('project'))), 0,
          'someone who cannot see the project lists no one');
reset role;

select * from finish();
rollback;
