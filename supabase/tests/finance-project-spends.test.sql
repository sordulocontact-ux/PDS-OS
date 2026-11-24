-- The Finance writes the spends of every project
-- (supabase/migrations/20261124190101_finance_writes_project_spends.sql). Run with `supabase test db`.
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
insert into ids select r.name, pg_temp.new_user('fps-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('other'), ('finance')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('finance', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name = 'owner';
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A launched project, run by the owner.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'FPS ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

-- The Finance (a business manager, who does not see the project) ------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('finance'));
select lives_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Pub Meta', 50000, 'committed')
$$, 'the Finance adds a spend to a project it does not run');
insert into ids select 'line', id from public.budget_lines where project_id = pg_temp.id_of('project');
select is((select count(*) from public.budget_lines where project_id = pg_temp.id_of('project')),
          1::bigint, 'and reads it');
update public.budget_lines set amount_cents = 60000 where id = pg_temp.id_of('line');
select is((select amount_cents from public.budget_lines where id = pg_temp.id_of('line')),
          60000::bigint, 'and changes it');

-- The owner keeps their rights; another manager has none -------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select amount_cents from public.budget_lines where id = pg_temp.id_of('line')),
          60000::bigint, 'the owner reads the Finance''s spend');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*) from public.budget_lines where project_id = pg_temp.id_of('project')),
          0::bigint, 'another manager reads none of it');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Intrus', 100)
$$, '42501', null, 'nor adds one');

-- The Finance removes it ------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('finance'));
delete from public.budget_lines where id = pg_temp.id_of('line');
select is((select count(*) from public.budget_lines where project_id = pg_temp.id_of('project')),
          0::bigint, 'the Finance removes a project''s spend');

select * from finish();
rollback;
