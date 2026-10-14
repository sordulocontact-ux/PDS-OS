-- Production › the search for a location (PROD-011, PROD-012, PROD-013;
-- supabase/migrations/20261014000701_production_locations.sql).
-- Run with `supabase test db`.
begin;
select plan(15);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Session acoustique');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'link',
        'https://frame.example.com/fiche', 'approved', now(), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Thibo ' || (select v from vars where k = 'tag'), array['production_company']);
insert into ids select 'thibo', id from public.network_contacts where name = 'Thibo ' || (select v from vars where k = 'tag');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'sheet', public.open_production_sheet(pg_temp.id_of('deliverable'), 'call');


create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end $$;
reset role;
grant all on vars, ids to anon;
select pg_temp.act_as(pg_temp.id_of('manager'));

-- 1. Candidates --------------------------------------------------------------------------
insert into public.production_location_options (organization_id, project_id, sheet_id, name, price_cents, availability)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Studio Pigalle', 80000, 'Libre le 20'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Toit Belleville', null, null);
insert into ids select 'pigalle', id from public.production_location_options where name = 'Studio Pigalle';
insert into ids select 'toit', id from public.production_location_options where name = 'Toit Belleville';
select is((select count(*)::int from public.production_location_options where sheet_id = pg_temp.id_of('sheet')),
          2, 'several candidate places on one sheet');
insert into public.production_location_media (organization_id, project_id, sheet_id, option_id, url)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('pigalle'), 'https://photos.example.com/pigalle');

-- 2. Opinions of the people consulted -----------------------------------------------------
insert into public.production_location_consults (organization_id, project_id, sheet_id, person_id, role)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('creative_person'), 'artistic');
insert into public.production_location_consults (organization_id, project_id, sheet_id, contact_id, role)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('thibo'), 'technical');
select throws_ok($$ select public.review_production_location(pg_temp.id_of('pigalle'), 'favorable', null) $$,
                 'P0001', 'not_consulted', 'only a consulted person gives an opinion');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.review_production_location(pg_temp.id_of('toit'), 'reserved', null) $$,
                 'P0001', 'reason_required', 'a reserve says why');
select lives_ok($$ select public.review_production_location(pg_temp.id_of('pigalle'), 'favorable', 'La lumière colle au brief') $$,
                'the creative director gives the artistic opinion');
update public.production_location_options set name = 'Autre' where id = pg_temp.id_of('pigalle');
select is((select name from public.production_location_options where id = pg_temp.id_of('pigalle')),
          'Studio Pigalle', 'an opinion never edits the place (RLS: the owner only)');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('thibo'));
select pg_temp.as_anon();
select is(jsonb_array_length(public.get_production_provider_locations((select v from vars where k = 'token')) -> 'options'),
          2, 'the consulted provider sees the candidates on their page');
select lives_ok($$ select public.review_production_location_by_link((select v from vars where k = 'token'), pg_temp.id_of('pigalle'), 'reserved', 'Plafond bas pour la grue') $$,
                'and gives the technical opinion through their link');
reset role;
select is((select role from public.production_location_reviews where option_id = pg_temp.id_of('pigalle') and contact_id = pg_temp.id_of('thibo')),
          'technical', 'each opinion keeps its role');

-- 3. The decision ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.choose_production_location(pg_temp.id_of('pigalle'), null) $$,
                 'P0001', 'location_not_verified', 'a place is chosen once verified');
update public.production_location_options set verification = 'verified' where id = pg_temp.id_of('pigalle');
select lives_ok($$ select public.choose_production_location(pg_temp.id_of('pigalle'), 'Meilleur compromis lumière / budget') $$,
                'the owner keeps the place, with why');
select is((select location_status || ' · ' || location_name from public.production_sheets where id = pg_temp.id_of('sheet')),
          'confirmed · Studio Pigalle', 'the place goes to the sheet, confirmed');
select throws_ok($$ select public.discard_production_location(pg_temp.id_of('pigalle'), 'Non') $$,
                 'P0001', 'location_chosen', 'the chosen place is not discarded');
select public.discard_production_location(pg_temp.id_of('toit'), 'Trop exposé au vent');
select is((select (status, decision_reason)::text from public.production_location_options where id = pg_temp.id_of('toit')),
          '(discarded,"Trop exposé au vent")', 'a discarded place stays, with its reason');

-- 4. Changing the place reopens what depends on it -------------------------------------------
select public.set_production_check(pg_temp.id_of('sheet'), 'location', true, null, null);
insert into public.production_location_options (organization_id, project_id, sheet_id, name, verification)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Hangar Ivry', 'verified');
select public.choose_production_location(
  (select id from public.production_location_options where name = 'Hangar Ivry'), 'Studio indisponible');
select is((select confirmed_at from public.production_readiness_checks
            where sheet_id = pg_temp.id_of('sheet') and key = 'location'),
          null, 'another place chosen: the location check is to confirm again');
select is((select status from public.production_location_options where id = pg_temp.id_of('pigalle')),
          'candidate', 'the former choice goes back to the candidates');

select * from finish();
rollback;
