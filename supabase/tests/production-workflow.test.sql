-- Production, lots 2 to 4: preproduction, shoot, postproduction, delivery and
-- hand-off (supabase/migrations/20261010006001_production_preproduction.sql,
-- 20261010006101_production_shoot.sql, 20261010006201_production_post.sql).
-- Fixture « Piégée »: a live session; a V3 by the provider is submitted then
-- validated; two exports 16:9 and 9:16 subtitled. Nothing real is checked.
-- Run with `supabase test db`.
begin;
select plan(32);

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

-- 1. Preproduction: plan, tasks, equipment, budget, readiness ------------------
insert into public.production_plan_actions (organization_id, project_id, sheet_id, title, person_id, due_date)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Trouver et vérifier le lieu',
        pg_temp.id_of('manager_person'), date '2026-10-12');
insert into ids select 'action', id from public.production_plan_actions where sheet_id = pg_temp.id_of('sheet');
select throws_ok($$ select public.create_production_task(pg_temp.id_of('action'), pg_temp.id_of('manager_person'), date '2026-10-12') $$,
                 'P0001', 'action_not_approved', 'a draft action never becomes a task');
update public.production_plan_actions set status = 'approved' where id = pg_temp.id_of('action');
select is((select approved_by from public.production_plan_actions where id = pg_temp.id_of('action')),
          pg_temp.id_of('manager_person'), 'who approved an action is written by the database');
select is((select count(*)::int from public.tasks where project_id = pg_temp.id_of('project')),
          0, 'approving an action creates no task');
select lives_ok($$ select public.create_production_task(pg_temp.id_of('action'), pg_temp.id_of('manager_person'), date '2026-10-12') $$,
                'the owner confirms: the approved action becomes a task of Travail');
select throws_ok($$ select public.create_production_task(pg_temp.id_of('action'), pg_temp.id_of('manager_person'), date '2026-10-12') $$,
                 'P0001', 'task_already_created', 'once');

insert into public.production_equipment (organization_id, project_id, sheet_id, category, label, quantity, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'sound', 'Micro statique', 2, 'to_verify');
insert into ids select 'mic', id from public.production_equipment where sheet_id = pg_temp.id_of('sheet');
update public.production_equipment set status = 'retained' where id = pg_temp.id_of('mic');
select is((select verified_by from public.production_equipment where id = pg_temp.id_of('mic')),
          pg_temp.id_of('manager_person'), 'a line read from a quote is verified by a person, recorded');
select throws_ok($$ update public.production_equipment set status = 'incident' where id = pg_temp.id_of('mic') $$,
                 '23514', null, 'a return incident says what happened');
select throws_ok($$ insert into public.production_budget_lines (organization_id, project_id, sheet_id, label, category, status)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Location son', 'equipment', 'estimated') $$,
                 '23514', null, 'an estimate has an amount; only « À estimer » goes without');

select throws_ok($$ select public.mark_production_ready(pg_temp.id_of('sheet')) $$,
                 'P0001', 'checks_open', 'not ready while required checks are open');
-- What each check rests on (PROD-008): a confirmed place, every position
-- held, the equipment booked, the shoot date, the budget within its
-- envelope, the call time; the backup plan written down.
update public.production_sheets
   set location_status = 'confirmed', location_name = 'Studio Pigalle', shoot_date = date '2026-11-20',
       budget_envelope_cents = 500000
 where id = pg_temp.id_of('sheet');
insert into public.production_needs (organization_id, project_id, sheet_id, family, role_key, headcount)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'camera', 'camera_operator', 1);
insert into public.production_assignments (organization_id, project_id, need_id, contact_id, availability)
select pg_temp.id_of('org'), pg_temp.id_of('project'), n.id, pg_temp.id_of('thibo'), 'available'
  from public.production_needs n where n.sheet_id = pg_temp.id_of('sheet');
update public.production_equipment set status = 'booked' where id = pg_temp.id_of('mic');
insert into public.production_call_sheets (sheet_id, organization_id, project_id, call_time)
values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'), '8h00 au studio');
select public.set_production_check(pg_temp.id_of('sheet'), k, true, null, null)
  from unnest(array['location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet']) k;
select public.set_production_check(pg_temp.id_of('sheet'), 'backup', true, null, 'Double copie sur deux disques');
select lives_ok($$ select public.mark_production_ready(pg_temp.id_of('sheet')) $$,
                'ready once every required check is confirmed (permits not required by default)');
select public.set_production_check(pg_temp.id_of('sheet'), 'permits', null, true, null);
select is((select ready_at from public.production_sheets where id = pg_temp.id_of('sheet')),
          null, 'requiring an unconfirmed check takes the readiness back');
select public.set_production_check(pg_temp.id_of('sheet'), 'permits', true, null, 'Aucune autorisation nécessaire');
select public.mark_production_ready(pg_temp.id_of('sheet'));

-- 2. Shoot ------------------------------------------------------------------------
insert into public.production_shoots (sheet_id, organization_id, project_id)
values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'));
select throws_ok($$ update public.production_shoots set state = 'partial' where sheet_id = pg_temp.id_of('sheet') $$,
                 '23514', null, 'a partial shoot names what is missing');
update public.production_shoots set state = 'done', video_rushes = true, audio_sources = true
 where sheet_id = pg_temp.id_of('sheet');
select is((select row(video_rushes_by is not null, audio_sources_by is not null, backup_verified)::text
             from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          '(t,t,f)', 'rushes and audio declared, each stamped; the backup is a separate declaration');
select throws_ok($$ update public.production_shoots set video_rushes_by = null where sheet_id = pg_temp.id_of('sheet') $$,
                 '42501', null, 'who declared is never written by the client');
update public.production_shoots set backup_verified = true where sheet_id = pg_temp.id_of('sheet');
select lives_ok($$ select public.validate_production_shoot_report(pg_temp.id_of('sheet')) $$,
                'the owner validates the shoot report');
update public.production_shoots set observations = 'Une prise de plus' where sheet_id = pg_temp.id_of('sheet');
select is((select report_validated_at from public.production_shoots where sheet_id = pg_temp.id_of('sheet')),
          null, 'changing the shoot after its report reopens the report');
insert into public.production_incidents (organization_id, project_id, sheet_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Câble XLR abîmé');
update public.production_incidents set resolution = 'Remplacé par le loueur' where sheet_id = pg_temp.id_of('sheet');
select isnt((select resolved_at from public.production_incidents where sheet_id = pg_temp.id_of('sheet')),
            null, 'an incident is resolved by a written resolution');

-- 3. Versions and feedback -----------------------------------------------------------
insert into public.production_versions (organization_id, project_id, sheet_id, label, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'V3', pg_temp.id_of('thibo'));
insert into ids select 'v', id from public.production_versions where sheet_id = pg_temp.id_of('sheet');
select is((select number from public.production_versions where id = pg_temp.id_of('v')),
          1, 'numbered by the database; no V1 or V2 is invented');
select throws_ok($$ select public.submit_production_version(pg_temp.id_of('v'), 'review') $$,
                 'P0001', 'version_without_media', 'a version without a file or a link stays a draft');
update public.production_versions set url = 'https://frame.example.com/v3' where id = pg_temp.id_of('v');
select public.submit_production_version(pg_temp.id_of('v'), 'review');
update public.production_versions set url = 'https://frame.example.com/other' where id = pg_temp.id_of('v');
select is((select url from public.production_versions where id = pg_temp.id_of('v')),
          'https://frame.example.com/v3', 'a submitted version keeps what was reviewed');
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ insert into public.production_version_comments (organization_id, project_id, sheet_id, version_id, timecode_ms, category, body)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('v'), 72000, 'audio', 'Voix un peu basse') $$,
                'a creative director comments at a timecode');
insert into ids select 'comment', id from public.production_version_comments where version_id = pg_temp.id_of('v');
update public.production_version_comments set status = 'declared_fixed' where id = pg_temp.id_of('comment');
select throws_ok($$ update public.production_version_comments set status = 'resolved' where id = pg_temp.id_of('comment') $$,
                 '23514', null, 'a correction declared fixed is verified before it is resolved');
update public.production_version_comments set status = 'to_verify' where id = pg_temp.id_of('comment');
update public.production_version_comments set status = 'resolved' where id = pg_temp.id_of('comment');
-- One cycle per version (PROD-033): the decision is taken on the version
-- under review; a second submission « final » is refused.
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_production_version(pg_temp.id_of('v'), 'final') $$,
                 'P0001', 'invalid_transition', 'a version under review is not submitted a second time');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_production_version(pg_temp.id_of('v'), 'refuse', null) $$,
                 'P0001', 'reason_required', 'a refusal says why');
select lives_ok($$ select public.decide_production_version(pg_temp.id_of('v'), 'approve', null) $$,
                'the creative validator validates the V3');
select is((select version_id from public.deliverable_deliveries where deliverable_id = pg_temp.id_of('deliverable')),
          pg_temp.id_of('v'), 'the creative decision is recorded on the delivery');

-- 4. Exports, delivery, hand-off ----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'approve') $$,
                 'P0001', 'approve_on_version', 'with a production sheet, the creative validation is given on a version');
select throws_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check') $$,
                 'P0001', 'exports_not_checked', 'no technical check without the expected exports');
insert into public.production_export_checks (organization_id, project_id, sheet_id, label, kind, result)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Export 16:9', 'export', 'ok'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Export 9:16', 'export', null),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Sous-titres intégrés', 'subtitles', 'ok');
select throws_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check') $$,
                 'P0001', 'exports_not_checked', 'every expected export is checked conforming');
update public.production_export_checks set result = 'ok' where sheet_id = pg_temp.id_of('sheet');
select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check');
select throws_ok($$ select public.transmit_to_activations(pg_temp.id_of('sheet'), array['16:9', '9:16'], null) $$,
                 'P0001', 'not_delivered', 'nothing goes to Activations before the delivery');
select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'deliver');
select lives_ok($$ select public.transmit_to_activations(pg_temp.id_of('sheet'), array['16:9', '9:16'], 'Sous-titres intégrés') $$,
                'the owner transmits the delivered version to Activations');
select is((select version_id from public.production_activation_handoffs where sheet_id = pg_temp.id_of('sheet')),
          pg_temp.id_of('v'), 'Activations receives a reference to the delivered version');

select * from finish();
rollback;
