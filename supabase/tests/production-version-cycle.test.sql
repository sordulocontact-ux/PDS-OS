-- Production › Postproduction: one cycle per version (PROD-029 to PROD-033,
-- supabase/migrations/20261014000101_production_version_cycle.sql). Fixture
-- « Piégée » again: a V1 under review, corrections addressed to the
-- provider, a V2 that treats them, validated straight from its review.
-- Run with `supabase test db`.
begin;
select plan(25);

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


-- 1. Numbering and the version followed --------------------------------------------
insert into public.production_versions (organization_id, project_id, sheet_id, url, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'https://frame.example.com/v1', pg_temp.id_of('thibo'));
insert into ids select 'v1', id from public.production_versions where sheet_id = pg_temp.id_of('sheet') and number = 1;
select is((select previous_version_id from public.production_versions where id = pg_temp.id_of('v1')),
          null, 'the first version follows none');
select lives_ok($$ select public.submit_production_version(pg_temp.id_of('v1'), 'review') $$,
                'one submission: « Soumettre aux retours »');
-- Notifications are read by their recipient only: counted as the database.
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'production_version_submitted' and subject_id = pg_temp.id_of('deliverable')
              and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'the creative director is told a version waits for feedback');
select is((select count(*)::int from public.notifications
            where kind = 'production_version_submitted' and subject_id = pg_temp.id_of('deliverable')
              and recipient_person_id = pg_temp.id_of('manager_person')),
          0, 'the one who submitted is not told');

-- 2. Corrections are addressed to someone ---------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
insert into public.production_version_comments (organization_id, project_id, sheet_id, version_id, timecode_ms, category, body)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('v1'), 12000, 'edit', 'Couper le plan large'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('v1'), null, 'other', 'Doublon du précédent');
insert into ids select 'c1', id from public.production_version_comments where body = 'Couper le plan large';
insert into ids select 'c2', id from public.production_version_comments where body = 'Doublon du précédent';
select throws_ok($$ select public.decide_production_version(pg_temp.id_of('v1'), 'changes', 'Refaire') $$,
                 'P0001', 'recipient_required', 'corrections without a recipient are refused');
select throws_ok($$ select public.request_production_corrections(pg_temp.id_of('v1'), array[pg_temp.id_of('c1')], null, null, current_date + 3, null) $$,
                 'P0001', 'recipient_required', 'a request names who must act');
select throws_ok($$ select public.request_production_corrections(pg_temp.id_of('v1'), array[pg_temp.id_of('c1')], null, pg_temp.id_of('thibo'), current_date - 1, null) $$,
                 'P0001', 'due_in_past', 'a due date is not in the past');
select throws_ok($$ select public.request_production_corrections(pg_temp.id_of('v1'), '{}', null, pg_temp.id_of('thibo'), current_date + 3, ' ') $$,
                 'P0001', 'nothing_to_correct', 'a request carries feedback or a message');
-- The duplicate is closed before the request (PROD-030).
update public.production_version_comments set status = 'rejected' where id = pg_temp.id_of('c2');
select throws_ok($$ select public.request_production_corrections(pg_temp.id_of('v1'), array[pg_temp.id_of('c2')], null, pg_temp.id_of('thibo'), current_date + 3, null) $$,
                 'P0001', 'comment_not_pending', 'a closed feedback is not sent');
insert into ids select 'req', public.request_production_corrections(
  pg_temp.id_of('v1'), array[pg_temp.id_of('c1')], null, pg_temp.id_of('thibo'), current_date + 3, 'Pour jeudi');
select is((select status from public.production_versions where id = pg_temp.id_of('v1')),
          'changes_requested', 'the version waits for its corrections');
select is((select status from public.production_correction_requests where id = pg_temp.id_of('req')),
          'draft', 'the request is a draft until it is sent');
select is((select request_id from public.production_version_comments where id = pg_temp.id_of('c1')),
          pg_temp.id_of('req'), 'the feedback sent is the feedback kept');
select throws_ok($$ insert into public.production_correction_requests (organization_id, project_id, sheet_id, version_id, contact_id, due_on)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('v1'), pg_temp.id_of('thibo'), current_date) $$,
                 '42501', null, 'a request is written through its functions only');

-- 3. Sent, sent again, given to someone else -------------------------------------------
select public.send_production_corrections(pg_temp.id_of('req'));
select is((select status from public.production_correction_requests where id = pg_temp.id_of('req')),
          'sent', '« Transmettre »: sent, with who and when');
select public.send_production_corrections(pg_temp.id_of('req'));
select is((select reminders from public.production_correction_requests where id = pg_temp.id_of('req')),
          1, '« Relancer » counts a reminder on the same request');
select lives_ok($$ select public.update_production_corrections(pg_temp.id_of('req'), pg_temp.id_of('creative_person'), null, current_date + 5, 'Pour lundi') $$,
                'the request is given to someone else, never copied');
select public.send_production_corrections(pg_temp.id_of('req'));
select is((select count(*)::int from public.notifications
            where kind = 'production_corrections_sent' and recipient_person_id = pg_temp.id_of('creative_person')),
          0, 'nobody is told about their own sending');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.update_production_corrections(pg_temp.id_of('req'), pg_temp.id_of('creative_person'), null, current_date + 5, 'Pour lundi');
select public.send_production_corrections(pg_temp.id_of('req'));
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'production_corrections_sent' and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'a member recipient is told in the app');
select pg_temp.act_as(pg_temp.id_of('manager'));

-- 4. The next version answers the request --------------------------------------------
insert into public.production_versions (organization_id, project_id, sheet_id, url)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'https://frame.example.com/v2');
insert into ids select 'v2', id from public.production_versions where sheet_id = pg_temp.id_of('sheet') and number = 2;
select is((select previous_version_id from public.production_versions where id = pg_temp.id_of('v2')),
          pg_temp.id_of('v1'), 'the V2 follows the V1 (same cycle)');
select throws_ok($$ update public.production_versions set previous_version_id = null where id = pg_temp.id_of('v2') $$,
                 '42501', null, 'a version is never moved in the cycle');
select public.submit_production_version(pg_temp.id_of('v2'), 'review');
select is((select (status, treated_version_id)::text from public.production_correction_requests where id = pg_temp.id_of('req')),
          (select ('treated', pg_temp.id_of('v2'))::text), 'the V2 treats the corrections asked on the V1');
select throws_ok($$ select public.send_production_corrections(pg_temp.id_of('req')) $$,
                 'P0001', 'request_treated', 'a treated request is not sent again');

-- 5. One decision ends the cycle -------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.decide_production_version(pg_temp.id_of('v2'), 'approve', null) $$,
                'the V2 is validated straight from its review');
select is((select version_id from public.deliverable_deliveries where deliverable_id = pg_temp.id_of('deliverable')),
          pg_temp.id_of('v2'), 'the creative validation opens the delivery');
select throws_ok($$ select public.decide_production_version(pg_temp.id_of('v2'), 'refuse', 'Non') $$,
                 'P0001', 'invalid_transition', 'a validated version takes no contradictory decision');

select * from finish();
rollback;
