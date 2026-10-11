-- Marketing : every stage validation is asked by the owner and decided by
-- the director, both ways (Conception, Production, Suivi & bilan), with the
-- guards that stop a request (deliveries open, review missing). Asked by
-- Sacha on 11/10/2026 : « vérifie sur toutes les pages du marketing si la
-- validation ou le rejet fonctionne partout ». Rolled back.
-- Run with `supabase test db`.
begin;
select plan(16);

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
create function pg_temp.stage(p_key text) returns uuid language sql as $$
  select s.id from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.project_id = pg_temp.id_of('project') and d.key = p_key
$$;
create function pg_temp.pending(p_key text) returns uuid language sql as $$
  select v.id from public.validations v where v.project_stage_id = pg_temp.stage(p_key) and v.state = 'pending'
$$;
create function pg_temp.state(p_key text) returns text language sql as $$
  select state from public.project_stages where id = pg_temp.stage(p_key)
$$;

insert into ids values
  ('director', pg_temp.new_user('msd-director-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('owner', pg_temp.new_user('msd-owner-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('creative', pg_temp.new_user('msd-creative-' || substr(md5(random()::text), 1, 8) || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts where id = (select id from ids where name = r.name));
-- Rolled back : another director of the organization steps aside, so the
-- test's director is the sole validator (sole_validator).
update public.memberships set status = 'suspended'
 where role = 'general_director' and status = 'approved'
   and person_id not in (select a.person_id from public.accounts a where a.id in (select id from ids));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'creative');

insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'MSD ' || substr(md5(random()::text), 1, 8), 'content', pg_temp.id_of('owner_person'));
insert into ids select 'project', id from public.projects
 where owner_person_id = pg_temp.id_of('owner_person') order by created_at desc limit 1;
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
-- The Marketing stages under way (their own work is tested elsewhere).
update public.project_stages set state = 'in_progress'
 where id in (pg_temp.stage('design'), pg_temp.stage('production'), pg_temp.stage('review'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 'creation_content', 'selected');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
select pg_temp.id_of('org'), pg_temp.id_of('project'), id, 'Clip' from public.levers
 where project_id = pg_temp.id_of('project');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');

-- Conception ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.request_validation(pg_temp.stage('design'), null) $$,
                 '42501', null, 'only the owner asks for a validation');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.request_validation(pg_temp.stage('design'), 'Conception') $$,
                'the owner asks for the Conception''s validation');
select is((select validator_person_id from public.validations where id = pg_temp.pending('design')),
          pg_temp.id_of('director_person'), 'the director is the validator');
select throws_ok($$ select public.decide_validation(pg_temp.pending('design'), true, null) $$,
                 'P0001', 'not_the_validator', 'the owner does not decide');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_validation(pg_temp.pending('design'), false, 'Revoir la DA') $$,
                'the director sends the Conception back');
select is(pg_temp.state('design'), 'in_progress', 'rejected : the Conception is open again');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_validation(pg_temp.stage('design'), null);
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_validation(pg_temp.pending('design'), true, null) $$,
                'the director validates the Conception');
select is(pg_temp.state('design'), 'validated', 'validated');

-- Production ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.request_validation(pg_temp.stage('production'), null) $$,
                 'P0001', 'deliveries_open', 'not while a deliverable is not delivered');
reset role;
insert into public.deliverable_deliveries
  (organization_id, project_id, deliverable_id, final_url, approved_at, checked_at, delivered_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'),
        'https://example.com/clip', now(), now(), now());
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.request_validation(pg_temp.stage('production'), null) $$,
                'every deliverable delivered : the Production is asked for validation');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation(pg_temp.pending('production'), false, 'Exports à revoir');
select is(pg_temp.state('production'), 'in_progress', 'rejected : back in progress');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_validation(pg_temp.stage('production'), null);
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation(pg_temp.pending('production'), true, null);
select is(pg_temp.state('production'), 'validated', 'then validated');

-- Suivi & bilan --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.request_validation(pg_temp.stage('review'), null) $$,
                 'P0001', 'review_required', 'no closure without a written review');
reset role;
insert into public.project_reviews (organization_id, project_id, results)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), '500 000 écoutes');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.request_validation(pg_temp.stage('review'), null) $$,
                'with its review, the closure is asked');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation(pg_temp.pending('review'), false, 'Bilan incomplet');
select is(pg_temp.state('review'), 'in_progress', 'rejected : the review is open again');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_validation(pg_temp.stage('review'), null);
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation(pg_temp.pending('review'), true, null);
select is(pg_temp.state('review'), 'validated', 'validated : the project is closed');

select * from finish();
rollback;
