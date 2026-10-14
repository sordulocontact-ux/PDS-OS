-- Production › delivery and closure (PROD-035 to PROD-040;
-- supabase/migrations/20261014001201_production_delivery_closure.sql).
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


-- 1. Expected files, kept and checked point by point ------------------------------------------
insert into public.production_export_checks (organization_id, project_id, sheet_id, label, kind, spec, url)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Export 16:9', 'export',
        'MP4 · 16:9 · 3:10', 'https://drive.example.com/v1');
insert into ids select 'line', id from public.production_export_checks where sheet_id = pg_temp.id_of('sheet');
select is((select count(*)::int from public.production_events where entity = 'export' and action = 'created'
            and entity_id = pg_temp.id_of('line')), 1, 'an expected file added is in the history (PROD-035)');
select throws_ok($$ select public.check_production_export(pg_temp.id_of('line'), '[{"key": "codec", "result": "not_ok"}]'::jsonb) $$,
                 '23514', null, 'a failing point says why (PROD-037)');
select public.check_production_export(pg_temp.id_of('line'),
  '[{"key": "format", "result": "ok"}, {"key": "codec", "result": "not_ok", "note": "H.265 au lieu de H.264"}]'::jsonb);
select is((select result from public.production_export_checks where id = pg_temp.id_of('line')),
          'not_ok', 'one failing point: the file is not conforming');
select ok((select note from public.production_export_checks where id = pg_temp.id_of('line')) like '%H.265%',
          'its note says which point and why');
update public.production_export_checks set url = 'https://drive.example.com/v2' where id = pg_temp.id_of('line');
select is((select count(*)::int from public.production_export_check_items where line_id = pg_temp.id_of('line')),
          0, 'a new file: its points are to check again');
select is((select count(*)::int from public.production_export_files where line_id = pg_temp.id_of('line')),
          2, 'every file deposited is kept (PROD-036)');
select public.check_production_export(pg_temp.id_of('line'), (select jsonb_agg(jsonb_build_object('key', k, 'result', 'ok'))
  from unnest(public.production_export_points('export')) k));
select is((select result from public.production_export_checks where id = pg_temp.id_of('line')),
          'ok', 'every point conforming: the file is conforming');
reset role;
update public.production_export_checks set checked_at = now() - interval '2 days' where id = pg_temp.id_of('line');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.check_production_export(pg_temp.id_of('line'), '[{"key": "audio", "result": "ok"}]'::jsonb);
select ok((select checked_at > now() - interval '1 minute' from public.production_export_checks where id = pg_temp.id_of('line')),
          'checked again with the same result: a new check, dated');

-- 2. Transmission ------------------------------------------------------------------------
-- A non conforming file first (adding or removing an expected file
-- reopens the delivery: an existing rule), then the delivery.
insert into public.production_export_checks (organization_id, project_id, sheet_id, label, kind)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Export 9:16', 'export');
reset role;
insert into public.deliverable_deliveries (organization_id, project_id, deliverable_id, final_url, approved_at, checked_at, delivered_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'https://drive.example.com/final', now(), now(), now());
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.transmit_production_to_activations(pg_temp.id_of('sheet'), array['16:9'], null, pg_temp.id_of('creative_person')) $$,
                 'P0001', 'exports_not_conforming', 'only conforming files go to Activations (PROD-039)');
reset role;
delete from public.production_export_checks where label = 'Export 9:16';
update public.deliverable_deliveries set checked_at = now(), delivered_at = now()
 where deliverable_id = pg_temp.id_of('deliverable');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.transmit_production_to_activations(pg_temp.id_of('sheet'), array['16:9'], 'Sous-titres', pg_temp.id_of('creative_person')) $$,
                'transmitted with its files and its person in charge');
select is((select jsonb_array_length(exports) from public.production_activation_handoffs where sheet_id = pg_temp.id_of('sheet')),
          1, 'the files go with it');
reset role;
select is((select count(*)::int from public.notifications where kind = 'production_handed_off'
            and recipient_person_id = pg_temp.id_of('creative_person')), 1, 'the person in charge is told');

-- 3. Closing -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.production_equipment (organization_id, project_id, sheet_id, category, label, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'image', 'FX6', 'to_return');
select throws_ok($$ select public.close_production_sheet(pg_temp.id_of('sheet')) $$,
                 'P0001', 'closing_blocked', 'not closed while equipment is still out (PROD-040)');
update public.production_equipment set status = 'returned' where label = 'FX6';
select lives_ok($$ select public.close_production_sheet(pg_temp.id_of('sheet')) $$, 'closed once nothing is open');
select is((select closed_by from public.production_sheets where id = pg_temp.id_of('sheet')),
          pg_temp.id_of('manager_person'), 'who closed it is kept');

select * from finish();
rollback;
