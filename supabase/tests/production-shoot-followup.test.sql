-- Production › the shoot, followed (PROD-019 to PROD-024;
-- supabase/migrations/20261014001001_production_shoot_followup.sql).
-- Run with `supabase test db`.
begin;
select plan(6);

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


reset role;
update public.production_sheets set ready_at = now(), ready_by = pg_temp.id_of('manager_person') where id = pg_temp.id_of('sheet');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.production_shoots (sheet_id, organization_id, project_id, state, rushes_contact_id, backup_location)
values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'), 'in_progress', pg_temp.id_of('thibo'), 'Disque 2 + Drive');
select ok((select started_at is not null and ended_at is null from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          'the start is stamped by the database (PROD-019)');
update public.production_shoots set state = 'partial', missing_sequences = 'Plan drone' where sheet_id = pg_temp.id_of('sheet');
select ok((select ended_at is not null from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          'and the end');
update public.production_shoots set other_media = true where sheet_id = pg_temp.id_of('sheet');
select is((select other_media_by from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          pg_temp.id_of('manager_person'), 'the other media are declared with who (PROD-020)');
select is((select rushes_contact_id from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          pg_temp.id_of('thibo'), 'who retrieves the rushes is kept');
select throws_ok($$ insert into public.production_incidents (organization_id, project_id, sheet_id, title, impacts)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Pluie', array['mood']) $$,
                 '23514', null, 'an impact is one of the five areas (PROD-021)');
select lives_ok($$ insert into public.production_incidents (organization_id, project_id, sheet_id, title, category, impacts)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Pluie', 'weather', array['schedule']) $$,
                'an incident has a category and the areas it hits');

select * from finish();
rollback;
