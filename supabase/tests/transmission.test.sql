-- Handing a project over to a project manager, then launching it at
-- acceptance (docs/CONTEXTE-PROJET.md § 12), run with `supabase test db`.
begin;
select plan(21);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager2', pg_temp.new_user('manager2-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('manager2', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'manager', 'manager2', 'creative');

select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'OP ' || (select v from vars where k = 'tag'), 'partnership');

-- Transmitting ----------------------------------------------------------------
select ok(exists(select 1 from public.list_assignable_people((select id from ids where name = 'org'))
                 where person_id = (select id from ids where name = 'manager_person'))
          and not exists(select 1 from public.list_assignable_people((select id from ids where name = 'org'))
                 where person_id = (select id from ids where name = 'creative_person')),
          'the director is offered project managers only');

select throws_ok($$ select public.transmit_project((select id from ids where name = 'project'),
                    (select id from ids where name = 'creative_person')) $$,
                 'P0001', 'invalid_assignee', 'a project goes to a project manager only');
select lives_ok($$ insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
                   (select id from ids where name = 'manager_person'), 'Brief en pièce jointe') $$,
                'the director transmits a project');
select throws_ok($$ select public.transmit_project((select id from ids where name = 'project'),
                    (select id from ids where name = 'manager2_person')) $$,
                 'P0001', 'assignment_pending', 'one transmission waits at a time');
select throws_ok($$ insert into public.project_assignments (organization_id, project_id, assignee_person_id)
                    values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
                            (select id from ids where name = 'manager2_person')) $$,
                 '42501', null, 'clients cannot write a transmission directly');
select throws_ok($$ update public.projects set owner_person_id = (select id from ids where name = 'director_person')
                    where id = (select id from ids where name = 'project') $$,
                 '42501', null, 'clients cannot set the owner');
select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          0, 'a transmitted project is not launched');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select throws_ok($$ select public.transmit_project((select id from ids where name = 'project'),
                    (select id from ids where name = 'manager_person')) $$,
                 '42501', null, 'a project manager cannot transmit');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted') $$,
                 '42501', null, 'the director cannot accept in place of the manager');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager2'));
select throws_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted') $$,
                 '42501', null, 'another manager cannot answer');

-- Answering ---------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select throws_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'), 'refused', '  ') $$,
                 'P0001', 'response_required', 'a refusal needs a reason');
select lives_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'),
                   'clarification_requested', 'Quel budget pour le clip ?') $$,
                'the manager asks for a clarification');
select is((select status || '/' || response from public.project_assignments where id = (select id from ids where name = 'a1')),
          'clarification_requested/Quel budget pour le clip ?', 'the question goes back to the director');
select throws_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted') $$,
                 'P0001', 'assignment_closed', 'an answered transmission is closed');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select lives_ok($$ insert into ids select 'a2', public.transmit_project((select id from ids where name = 'project'),
                   (select id from ids where name = 'manager_person'), '5 000 € pour le clip') $$,
                'the director transmits again with an answer');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select lives_ok($$ select public.respond_to_assignment((select id from ids where name = 'a2'), 'accepted') $$,
                'the manager accepts');
select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          (select count(*)::int from public.stage_definitions
            where organization_id = (select id from ids where name = 'org') and archived_at is null),
          'acceptance launches the project: one stage per active definition');
select is((select owner_person_id from public.projects where id = (select id from ids where name = 'project')),
          (select id from ids where name = 'manager_person'), 'the manager owns the project');
select is((select count(*)::int from public.project_assignments where project_id = (select id from ids where name = 'project')),
          2, 'the history keeps every transmission');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select public.transmit_project((select id from ids where name = 'project'),
                    (select id from ids where name = 'manager2_person')) $$,
                 'P0001', 'project_already_launched', 'a launched project is not transmitted again');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.list_assignable_people((select id from ids where name = 'org'))),
          0, 'only the director sees who can receive a project');

reset role;
select * from finish();
rollback;
