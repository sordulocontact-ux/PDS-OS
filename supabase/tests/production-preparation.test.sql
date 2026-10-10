-- Production, lot 1: the preparation of a deliverable — sheet opened from a
-- validated Conception version, director's brief, needs by family,
-- assignments and production calls
-- (supabase/migrations/20261010003001_production_preparation.sql).
-- Fixture « Piégée »: plan-séquence, several cameras, live capture of voice
-- and guitar; the run of show and some needs stay empty. Run with
-- `supabase test db`.
begin;
select plan(30);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('outsider', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');
-- A person with no membership in the organization.
insert into public.people (first_name, last_name) values ('Hors', 'Organisation');
insert into ids select 'stranger', id from public.people where first_name = 'Hors' and last_name = 'Organisation'
 order by created_at desc limit 1;

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Live session', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Live session Piégée');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into ids select 'production', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key = 'production';
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Guitariste ' || (select v from vars where k = 'tag'), array['musician']),
       (pg_temp.id_of('org'), 'person', 'Réal ' || (select v from vars where k = 'tag'), array['videographer']);
insert into ids select 'guitarist', id from public.network_contacts
 where name = 'Guitariste ' || (select v from vars where k = 'tag');
insert into ids select 'director_contact', id from public.network_contacts
 where name = 'Réal ' || (select v from vars where k = 'tag');

-- 1. Opening ----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.open_production_sheet(pg_temp.id_of('deliverable'), 'direct') $$,
                 'P0001', 'design_not_approved', 'Production opens from a validated Conception version only');

reset role;
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'link',
        'https://frame.example.com/v1', 'approved', now(), pg_temp.id_of('creative_person'));
insert into ids select 'version', id from public.design_versions where deliverable_id = pg_temp.id_of('deliverable');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.open_production_sheet(pg_temp.id_of('deliverable'), 'direct') $$,
                 '42501', null, 'only the project''s owner opens the preparation');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.open_production_sheet(pg_temp.id_of('deliverable'), 'booking') $$,
                 '22023', null, 'three organisation modes only');
select lives_ok($$ insert into ids select 'sheet', public.open_production_sheet(pg_temp.id_of('deliverable'), 'call') $$,
                'the owner opens the preparation with a mode');
select is((select state from public.project_stages where id = pg_temp.id_of('production')),
          'in_progress', 'opening the first sheet starts the Production stage');
select is((select source_version_id from public.production_sheets where id = pg_temp.id_of('sheet')),
          pg_temp.id_of('version'), 'the sheet keeps its source version');
select lives_ok($$ select public.open_production_sheet(pg_temp.id_of('deliverable'), 'direct') $$,
                'the owner changes the mode');
select is((select count(*)::int from public.production_sheets where deliverable_id = pg_temp.id_of('deliverable')),
          1, 'one sheet per deliverable, the mode changed in place');
select throws_ok($$ update public.production_sheets set mode = 'import' where id = pg_temp.id_of('sheet') $$,
                 '42501', null, 'a sheet is written by its functions only');

-- 2. The director's brief -----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.save_production_brief(pg_temp.id_of('sheet'), 'one_take', 'multi', 'live', null, null, null, null, null, null, null, null) $$,
                 '42501', null, 'a creative who is not the director does not write the brief');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.save_production_brief(pg_temp.id_of('sheet'), 'drone', null, null, null, null, null, null, null, null, null, null) $$,
                 '23514', null, 'a closed choice outside its list is refused');
select lives_ok($$ select public.save_production_brief(pg_temp.id_of('sheet'), 'one_take', 'multi', 'live',
                     'Une prise, au plus près de la voix', null, null, 'Voix et guitare en direct', '  ', null, null, 'Lumière à confirmer') $$,
                'the owner writes the Piégée brief');
select is((select row(coverage, camera_setup, sound_capture, run_of_show)::text from public.production_sheets where id = pg_temp.id_of('sheet')),
          '(one_take,multi,live,)', 'plan-séquence, several cameras, live sound; the run of show stays empty');
select throws_ok($$ select public.set_production_director(pg_temp.id_of('sheet'), pg_temp.id_of('creative_person'), pg_temp.id_of('director_contact')) $$,
                 '22023', null, 'one director at most');
select throws_ok($$ select public.set_production_director(pg_temp.id_of('sheet'), pg_temp.id_of('stranger'), null) $$,
                 '23514', null, 'a director person is a member of the organization');
select public.set_production_director(pg_temp.id_of('sheet'), pg_temp.id_of('creative_person'), null);
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.save_production_brief(pg_temp.id_of('sheet'), 'one_take', 'multi', 'live',
                     'Une prise, au plus près de la voix', 'Plan-séquence de 4 min', null, 'Voix et guitare en direct', null, null, null, 'Lumière à confirmer') $$,
                'the designated director completes the brief');
select throws_ok($$ select public.set_production_director(pg_temp.id_of('sheet'), null, null) $$,
                 '42501', null, 'only the owner designates the director');

-- 3. Needs and assignments ----------------------------------------------------------
select throws_ok($$ insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'camera', 'camera_operator') $$,
                 '42501', null, 'the needs are the owner''s');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key, speciality, headcount)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'performers', 'musician', 'Guitare', 1) $$,
                'guitarist = Musicien with the speciality Guitare');
insert into ids select 'musician', id from public.production_needs where sheet_id = pg_temp.id_of('sheet') and family = 'performers';
select throws_ok($$ insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key, speciality)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'camera', 'camera_operator', 'Steadicam') $$,
                 '23514', null, 'only a performer has a speciality');
select throws_ok($$ insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'sound', 'camera_operator') $$,
                 '23514', null, 'a position belongs to its family: image and sound stay apart');
insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key, headcount)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'camera', 'camera_operator', 2);
insert into ids select 'cameras', id from public.production_needs where sheet_id = pg_temp.id_of('sheet') and family = 'camera';

insert into public.production_assignments (organization_id, project_id, need_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('musician'), pg_temp.id_of('guitarist'));
select throws_ok($$ insert into public.production_assignments (organization_id, project_id, need_id, person_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('musician'), pg_temp.id_of('creative_person')) $$,
                 '23514', 'need_full', 'a position never holds more people than its count');
select throws_ok($$ insert into public.production_assignments (organization_id, project_id, need_id, person_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('cameras'), pg_temp.id_of('stranger')) $$,
                 '23514', 'person_not_member', 'a person assigned is a member of the organization');
insert into public.production_assignments (organization_id, project_id, need_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('cameras'), pg_temp.id_of('guitarist'));
select is((select count(*)::int from public.production_assignments where contact_id = pg_temp.id_of('guitarist')),
          2, 'one person may hold several positions');
select throws_ok($$ update public.production_needs set headcount = 0 where id = pg_temp.id_of('cameras') $$,
                 '23514', null, 'a count is at least one');
update public.production_needs set headcount = 1 where id = pg_temp.id_of('cameras');
select throws_ok($$ insert into public.production_assignments (organization_id, project_id, need_id, person_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('cameras'), pg_temp.id_of('creative_person')) $$,
                 '23514', 'need_full', 'the count lowered to the people assigned leaves no room');
update public.production_assignments set availability = 'available' where need_id = pg_temp.id_of('musician');
select is((select availability_set_by from public.production_assignments where need_id = pg_temp.id_of('musician')),
          pg_temp.id_of('manager_person'), 'who confirmed an availability is written by the database');

-- 4. Production call and visibility --------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.create_production_call(pg_temp.id_of('sheet'), 'Call technique', now(), null, '[]'::jsonb, 'Décider le dispositif', '[]'::jsonb, 'in_person') $$,
                 '42501', null, 'the production call is the owner''s');
select pg_temp.act_as(pg_temp.id_of('outsider'));
select is((select count(*)::int from public.production_sheets where project_id = pg_temp.id_of('project'))
          + (select count(*)::int from public.production_needs where project_id = pg_temp.id_of('project')),
          0, 'a manager outside the project sees nothing of its preparation');

-- Once the stage is no longer running, the preparation is read only.
reset role;
update public.project_stages set state = 'validated' where id = pg_temp.id_of('production');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.save_production_brief(pg_temp.id_of('sheet'), null, null, null, null, null, null, null, null, null, null, null) $$,
                 '42501', null, 'nothing is written once the Production is validated');

select * from finish();
rollback;
