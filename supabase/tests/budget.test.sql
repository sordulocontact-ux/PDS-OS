-- Budget lines: read by whoever sees the project, written by its owner only.
-- Run with `supabase test db`.
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

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- The director creates and transmits, the owner accepts: the project is launched.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'BU ' || (select v from vars where k = 'tag'), 'partnership');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

-- Owner writes ----------------------------------------------------------------
select lives_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 250000, 'committed')
$$, 'the owner adds a line');
insert into ids select 'line', id from public.budget_lines where project_id = pg_temp.id_of('project');
select is((select created_by from public.budget_lines where id = pg_temp.id_of('line')),
          pg_temp.id_of('owner_person'), 'authorship is set by the database');
select lives_ok($$ update public.budget_lines set status = 'paid', amount_cents = 240000
                   where id = pg_temp.id_of('line') $$, 'the owner updates a line');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Négatif', -1)
$$, '23514', null, 'an amount is never negative');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), '  ', 100)
$$, '23514', null, 'a line has a label');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Statut', 100, 'spent')
$$, '23514', null, 'status is a closed list');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, family)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Famille', 100, 'marketing')
$$, '23514', null, 'family is the closed taxonomy');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents, created_by)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Auteur', 100, pg_temp.id_of('other_person'))
$$, '42501', null, 'created_by is not writable by the client');

-- Director: reads, never writes -------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          1, 'the director reads the lines');
select throws_ok($$
  insert into public.budget_lines (organization_id, project_id, label, amount_cents)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Intrus', 100)
$$, '42501', null, 'the director cannot add a line');
update public.budget_lines set amount_cents = 1 where id = pg_temp.id_of('line');
delete from public.budget_lines where id = pg_temp.id_of('line');
select is((select amount_cents from public.budget_lines where id = pg_temp.id_of('line')),
          240000::bigint, 'the director can neither update nor delete a line');

-- Another project manager: sees nothing ----------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          0, 'someone who does not see the project reads no line');

-- Owner deletes -----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ delete from public.budget_lines where id = pg_temp.id_of('line') $$,
                'the owner deletes a line');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          0, 'the line is gone');

select * from finish();
rollback;
