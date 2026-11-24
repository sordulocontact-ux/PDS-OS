-- A project's owner files the spends of their project in its sub-budgets
-- (supabase/migrations/20261124180101_budget_parts_project_owner.sql). Run with `supabase test db`.
begin;
select plan(9);

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
insert into ids select r.name, pg_temp.new_user('bpo-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('other'), ('finance')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('finance', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('owner', 'other');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Two launched projects: one run by the owner, one by the other manager.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'BPO ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'project2', public.create_project(pg_temp.id_of('org'),
  'BPO2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into ids select 'a2', public.transmit_project(pg_temp.id_of('project2'), pg_temp.id_of('other_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Pub', 100000, 'committed');
insert into ids select 'line', id from public.budget_lines where project_id = pg_temp.id_of('project');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select public.respond_to_assignment(pg_temp.id_of('a2'), 'accepted');
insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project2'), 'Autre', 1000, 'committed');
insert into ids select 'line2', id from public.budget_lines where project_id = pg_temp.id_of('project2');

-- The Finance cuts both budgets.
reset role;
select pg_temp.act_as(pg_temp.id_of('finance'));
insert into public.finance_budget_parts (organization_id, target_kind, target_id, name, amount_cents)
values (pg_temp.id_of('org'), 'project', pg_temp.id_of('project'), 'Marketing', 500000),
       (pg_temp.id_of('org'), 'project', pg_temp.id_of('project2'), 'Marketing', 500000);
insert into ids select 'part', id from public.finance_budget_parts where target_id = pg_temp.id_of('project');
insert into ids select 'part2', id from public.finance_budget_parts where target_id = pg_temp.id_of('project2');

-- The owner ------------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select array_agg(id) from public.finance_budget_parts),
          array[pg_temp.id_of('part')], 'the owner reads the parts of their project only');
select is(public.assign_budget_part(array[pg_temp.id_of('line')], pg_temp.id_of('part')), 1,
          'and puts a spend of their project in one');
select is((select part_id from public.finance_budget_part_lines() where line_id = pg_temp.id_of('line')),
          pg_temp.id_of('part'), 'and reads which part it is in');
select throws_ok($$ select public.assign_budget_part(array[pg_temp.id_of('line2')], pg_temp.id_of('part2')) $$,
  '42501', null, 'never in a part of a project they do not own');
select throws_ok($$ select public.assign_budget_part(array[pg_temp.id_of('line2')], null) $$,
  '42501', null, 'nor takes a spend of another project out of its part');
select throws_ok($$ insert into public.finance_budget_parts
                      (organization_id, target_kind, target_id, name, amount_cents)
                    values (pg_temp.id_of('org'), 'project', pg_temp.id_of('project'), 'Studio', 1) $$,
  '42501', null, 'cutting the budget stays the Finance''s');

-- Another manager ------------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*) from public.finance_budget_parts where target_id = pg_temp.id_of('project')),
          0::bigint, 'another manager sees none of the owner''s parts');
select is((select count(*) from public.finance_budget_part_lines()), 0::bigint,
          'nor which part a spend is in');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.assign_budget_part(array[pg_temp.id_of('line')], null), 1,
          'the owner takes their spend out of its part');

select * from finish();
rollback;
