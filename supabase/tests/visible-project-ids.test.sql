-- visible_project_ids() (20261026000101) says exactly what can_see_project_row()
-- says, for every kind of viewer, and the policies rewritten on it let each
-- viewer read the same rows as before. Run with `supabase test db`.
begin;
select plan(24);

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
-- The claims alone, still as postgres: the reference reads every project.
create function pg_temp.claims_of(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into ids
select name, pg_temp.new_user(name || '-' || pg_temp.tag() || '@pds.test')
  from unnest(array['director', 'owner', 'other', 'cp2', 'creative', 'engineer', 'producer',
                    'gone', 'waiting', 'outsider']) name;
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into public.organizations (slug, name) values ('vis-' || pg_temp.tag(), 'Autre maison');
insert into ids select 'org2', id from public.organizations where slug = 'vis-' || pg_temp.tag();

update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('cp2', 'project_manager'),
               ('creative', 'creative_director'), ('engineer', 'project_manager'),
               ('producer', 'project_manager'), ('gone', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
-- « waiting » keeps its pending membership; « outsider » belongs to the other house.
update public.memberships m set organization_id = pg_temp.id_of('org2'),
                                status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('outsider'));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'cp2', 'creative', 'engineer', 'producer',
                'gone', 'waiting', 'outsider');

-- A: Lina's, with a creative. B: transmitted to cp2, not answered.
-- C: Lina's, with an in-house engineer and a line producer. D: the other house.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select k, public.create_project(pg_temp.id_of('org'), k || ' ' || pg_temp.tag(), 'content')
  from unnest(array['A', 'B', 'C']) k;
insert into ids select 'A_a', public.transmit_project(pg_temp.id_of('A'), pg_temp.id_of('owner_person'));
insert into ids select 'B_a', public.transmit_project(pg_temp.id_of('B'), pg_temp.id_of('cp2_person'));
insert into ids select 'C_a', public.transmit_project(pg_temp.id_of('C'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of(k), 'accepted') from unnest(array['A_a', 'C_a']) k;
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
insert into ids select 'D', public.create_project(pg_temp.id_of('org2'), 'D ' || pg_temp.tag(), 'content');
reset role;

insert into public.project_creatives (organization_id, project_id, person_id)
select pg_temp.id_of('org'), pg_temp.id_of('A'), pg_temp.id_of(k)
  from unnest(array['creative_person', 'gone_person', 'waiting_person']) k;
insert into public.master_briefs (organization_id, project_id, mix_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('C'), pg_temp.id_of('engineer_person'));
insert into public.strategy_deliverables (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('C'), 'Clip ' || pg_temp.tag());
insert into public.production_sheets (organization_id, project_id, deliverable_id, mode, line_producer_person_id)
select pg_temp.id_of('org'), pg_temp.id_of('C'), id, 'call', pg_temp.id_of('producer_person')
  from public.strategy_deliverables where title = 'Clip ' || pg_temp.tag();
update public.accounts set disabled_at = now() where id = pg_temp.id_of('gone');

-- What can_see_project_row() lets the viewer see, and what the set says.
create function pg_temp.reference(p_user uuid) returns uuid[] language plpgsql as $$
begin
  perform pg_temp.claims_of(p_user);
  return coalesce((select array_agg(p.id order by p.id) from public.projects p
                    where public.can_see_project_row(p.organization_id, p.id, p.owner_person_id)), '{}');
end $$;
create function pg_temp.as_set(p_user uuid) returns uuid[] language plpgsql as $$
begin
  perform pg_temp.claims_of(p_user);
  return coalesce((select array_agg(x order by x) from unnest(public.visible_project_ids()) x), '{}');
end $$;
-- Rows the rewritten policy of project_stages lets the viewer read.
create function pg_temp.stages_read(p_user uuid) returns int language plpgsql as $$
declare v int;
begin
  perform pg_temp.act_as(p_user);
  select count(*) into v from public.project_stages;
  execute 'reset role';
  return v;
end $$;
create function pg_temp.stages_expected(p_user uuid) returns int language sql as $$
  select count(*)::int from public.project_stages where project_id = any (pg_temp.reference(p_user))
$$;

-- Both forms agree, viewer by viewer ------------------------------------------
select is(pg_temp.as_set(pg_temp.id_of(v)), pg_temp.reference(pg_temp.id_of(v)),
          'visible_project_ids() = can_see_project_row() for ' || v)
  from unnest(array['director', 'owner', 'other', 'cp2', 'creative', 'engineer', 'producer',
                    'gone', 'waiting', 'outsider']) v;

-- And they say what the rules say -----------------------------------------------
select ok(pg_temp.id_of('B') = any (pg_temp.as_set(pg_temp.id_of('director'))),
          'the director sees every project of the house');
select ok(not pg_temp.id_of('D') = any (pg_temp.as_set(pg_temp.id_of('director'))),
          '… but not those of another house');
select is(pg_temp.as_set(pg_temp.id_of('owner')),
          (select array_agg(x order by x) from unnest(array[pg_temp.id_of('A'), pg_temp.id_of('C')]) x),
          'the owner sees their two projects');
select is(pg_temp.as_set(pg_temp.id_of('cp2')), array[pg_temp.id_of('B')],
          'a pending assignee sees the project transmitted to them');
select is(pg_temp.as_set(pg_temp.id_of('creative')), array[pg_temp.id_of('A')],
          'a creative sees the project they work on');
select is(pg_temp.as_set(pg_temp.id_of('engineer')), array[pg_temp.id_of('C')],
          'the in-house engineer sees the Master''s project');
select is(pg_temp.as_set(pg_temp.id_of('producer')), array[pg_temp.id_of('C')],
          'the line producer sees the production''s project');
select is(pg_temp.as_set(pg_temp.id_of('gone')), '{}'::uuid[], 'a disabled account sees nothing');
select is(pg_temp.as_set(pg_temp.id_of('waiting')), '{}'::uuid[], 'a pending member sees nothing');
select is(pg_temp.as_set(null), '{}'::uuid[], 'nobody signed in sees nothing');

-- The rewritten policies read the same rows ----------------------------------------
select is(pg_temp.stages_read(pg_temp.id_of(v)), pg_temp.stages_expected(pg_temp.id_of(v)),
          'project_stages: the policy reads what can_see_project_row() allows, for ' || v)
  from unnest(array['owner', 'cp2', 'creative']) v;

select is((select count(*)::int from pg_policies
            where schemaname = 'public' and qual like '%can_see_project(project_id)%'), 0,
          'no policy reads can_see_project(project_id) row by row any more');

select * from finish();
rollback;
