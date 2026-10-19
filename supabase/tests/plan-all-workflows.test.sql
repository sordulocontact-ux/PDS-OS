-- Plan du projet, step 4 of the Cadrage (supabase/migrations/
-- 20261019020101_plan_all_workflows.sql): every workflow waits for the
-- plan, the plan holds all eight, « Lancer le plan » starts them all
-- whatever their column, « Livraison & sortie » is « Distribution », a
-- workflow may sit in « À anticiper ». Run with `supabase test db`.
begin;
select plan(14);

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
-- One validator in V1 (sole_validator): the test's director only.
update public.memberships set status = 'suspended'
 where organization_id = (select id from ids where name = 'org')
   and role = 'general_director' and status = 'approved'
   and person_id <> (select id from ids where name = 'director_person');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'PW ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key in ('framing', 'launch_strategy');

select public.start_framing_without_call(pg_temp.id_of('project'));

create function pg_temp.brief(p_objective text) returns jsonb language sql as $$
  select jsonb_build_object('dimensions', jsonb_build_array(
    jsonb_build_object('dimension', 'objective', 'items', jsonb_build_array(
      jsonb_build_object('key', 'objective', 'value', p_objective, 'lines', '[]'::jsonb, 'source', 'Call'))),
    jsonb_build_object('dimension', 'timing', 'items', jsonb_build_array(
      jsonb_build_object('key', 'target_date', 'value', '24 octobre', 'lines', '[]'::jsonb, 'source', null)))))
$$;
grant execute on function pg_temp.brief(text) to authenticated;

insert into ids select 'v1', public.create_framing_brief(pg_temp.id_of('project'), pg_temp.brief('Faire connaître'));
insert into ids select 'val1', public.send_framing_brief(pg_temp.id_of('v1'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_framing_brief(pg_temp.id_of('val1'), true, null, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

-- Before the plan, every workflow waits.
select ok(not public.workflow_is_launched(pg_temp.id_of('project'), 'distribution'),
          'the Distribution waits for the plan');
select ok(not public.workflow_is_launched(pg_temp.id_of('project'), 'production'),
          'the Production waits for the plan');
select ok(not public.workflow_is_launched(pg_temp.id_of('project'), 'strategy'),
          'the Stratégie waits for the plan');

insert into ids select 'plan', public.launch_project_plan(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('column', 'focus', 'workflow', 'strategy', 'title', 'Stratégie'),
  jsonb_build_object('column', 'next', 'workflow', 'design', 'title', 'Conception',
                     'dependsOn', jsonb_build_array('strategy')),
  jsonb_build_object('column', 'next', 'workflow', 'production', 'title', 'Production'),
  jsonb_build_object('column', 'next', 'workflow', 'master', 'title', 'Master'),
  jsonb_build_object('column', 'anticipate', 'workflow', 'distribution', 'title', 'Distribution',
                     'dependsOn', jsonb_build_array('master')),
  jsonb_build_object('column', 'anticipate', 'workflow', 'review', 'title', 'Suivi & bilan')));

select is((select count(*)::int from public.project_plan_items
            where plan_id = pg_temp.id_of('plan') and launched_at is null), 0,
          'every workflow of the plan is launched, whatever its column');
select ok(public.workflow_is_launched(pg_temp.id_of('project'), 'master'),
          'a workflow in Ensuite starts with the plan');
select ok(public.workflow_is_launched(pg_temp.id_of('project'), 'distribution'),
          'the Distribution opens with the plan');
select ok(public.workflow_is_launched(pg_temp.id_of('project'), 'activations'),
          'the Marketing''s sub-modules open with the plan');
select is((select s.state from public.project_stages s
            join public.stage_definitions d on d.id = s.stage_definition_id
           where s.project_id = pg_temp.id_of('project') and d.key = 'launch_strategy'),
          'in_progress', 'the Stratégie stage starts');
select ok(not public.workflow_is_launched(pg_temp.id_of('project'), 'legal'),
          'a workflow left out of the plan still waits (Juridique)');
select lives_ok($$ select public.launch_plan_workflow(pg_temp.id_of('project'), 'legal',
                    'Juridique', 'Ajouté') $$,
                'launch_plan_workflow still adds and launches a workflow left out');
insert into ids select 'review', id from public.project_plan_items
 where plan_id = pg_temp.id_of('plan') and workflow = 'review';
select lives_ok($$ select public.update_project_plan_item(pg_temp.id_of('review'), 'anticipate', null,
                    pg_temp.id_of('owner_person'), null, null, '{}') $$,
                'a workflow may stay in « À anticiper »');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.launch_plan_workflow(pg_temp.id_of('project'), 'activations',
                    'Activations', null) $$,
                 '42501', null, 'only the owner launches a workflow');
reset role;
select throws_ok($$ insert into public.project_plan_items
                      (organization_id, plan_id, project_id, column_key, workflow, title)
                    values (pg_temp.id_of('org'), pg_temp.id_of('plan'), pg_temp.id_of('project'),
                            'next', 'delivery', 'Livraison') $$,
                 '23514', null, '« delivery » is no longer a workflow of the plan');
select is((select count(*)::int from public.project_plan_events
            where project_id = pg_temp.id_of('project') and kind = 'launched'), 1,
          'the launch is in the plan''s history');

select * from finish();
rollback;
