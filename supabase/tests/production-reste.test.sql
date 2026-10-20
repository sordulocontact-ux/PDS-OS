-- What remained of the Production (docs/projet-complet/production.md PR-11,
-- PR-13, montage and delivery, date and hours): migrations 20261020020101 and
-- following. Run with `supabase test db`.
begin;
select plan(66);


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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('producer', pg_temp.new_user('producer-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('validator', pg_temp.new_user('validator-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('producer', 'project_manager'), ('validator', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');
insert into ids select 'producer_person', person_id from public.accounts where id = pg_temp.id_of('producer');
insert into ids select 'validator_person', person_id from public.accounts where id = pg_temp.id_of('validator');

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



select lives_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), pg_temp.id_of('producer_person'), pg_temp.id_of('validator_person'), null, null) $$,
                'an external production');
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Bastien ' || (select v from vars where k = 'tag'), array['videographer']),
       (pg_temp.id_of('org'), 'person', 'Jade ' || (select v from vars where k = 'tag'), array['manager']);
insert into ids select 'bastien', id from public.network_contacts where name = 'Bastien ' || (select v from vars where k = 'tag');
insert into ids select 'jade', id from public.network_contacts where name = 'Jade ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.set_production_director(pg_temp.id_of('sheet'), null, pg_temp.id_of('bastien'));
insert into vars select 'director', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('bastien'));


-- 1. The proposal in versions, validated inside and outside (PR-11) ------------------------
select throws_ok($$ select public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('jade')) $$,
                 'P0001', 'not_a_provider', 'no link for a contact without a role');
reset role;
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.set_production_creative_ext(pg_temp.id_of('sheet'), pg_temp.id_of('jade')) $$,
                 '42501', null, 'only the owner names the external validation');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.set_production_creative_ext(pg_temp.id_of('sheet'), pg_temp.id_of('jade')) $$,
                'the owner names the management');
insert into vars select 'mgmt', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('jade'));
reset role;
set local role anon;
select is(public.get_production_link_journey((select v from vars where k = 'mgmt')) -> 'roles', '["creativeExt"]'::jsonb,
          'the management''s link holds the external validation');
select throws_ok($$ select public.deposit_production_direction_by_link((select v from vars where k = 'mgmt'), 'https://x.example/t.pdf', null, 'https://x.example/d.pdf', null) $$,
                 '42501', null, 'the validation deposits nothing');
select throws_ok($$ select public.deposit_production_direction_by_link((select v from vars where k = 'director'), 'https://x.example/t.pdf', null, null, null) $$,
                 'P0001', 'pieces_required', 'the treatment and the découpage are required');
select is(public.deposit_production_direction_by_link((select v from vars where k = 'director'), 'https://x.example/t1.pdf', 'https://x.example/m1.pdf', 'https://x.example/d1.pdf', null), 1,
          'the director deposits V1');
select throws_ok($$ select public.deposit_production_direction_by_link((select v from vars where k = 'director'), 'https://x.example/t.pdf', null, 'https://x.example/d.pdf', null) $$,
                 'P0001', 'version_pending', 'no V2 while V1 waits');
reset role;
insert into ids select 'v1', id from public.production_direction_versions where sheet_id = pg_temp.id_of('sheet') and number = 1;
select is((select ext_status from public.production_direction_versions where id = pg_temp.id_of('v1')), 'pending',
          'the external validation is awaited');
select is((select direction_status from public.production_sheets where id = pg_temp.id_of('sheet')), 'submitted',
          'the sheet follows: submitted');
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.decide_production_direction_version(pg_temp.id_of('v1'), true, null) $$,
                 '42501', null, 'the line producer is not the creative validation');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_production_direction_version(pg_temp.id_of('v1'), false, ' ') $$,
                 'P0001', 'reason_required', 'asking for changes says what');
select lives_ok($$ select public.decide_production_direction_version(pg_temp.id_of('v1'), true, null) $$,
                'the internal validation validates V1');
reset role;
select is((select direction_status from public.production_sheets where id = pg_temp.id_of('sheet')), 'submitted',
          'not retained while the outside has not decided');
set local role anon;
select lives_ok($$ select public.decide_production_direction_by_link((select v from vars where k = 'mgmt'), pg_temp.id_of('v1'), false, 'Plus de néons') $$,
                'the management asks for changes on its link');
select is(public.deposit_production_direction_by_link((select v from vars where k = 'director'), 'https://x.example/t2.pdf', null, 'https://x.example/d2.pdf', null), 2,
          'the director deposits V2');
reset role;
insert into ids select 'v2', id from public.production_direction_versions where sheet_id = pg_temp.id_of('sheet') and number = 2;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_production_direction_version(pg_temp.id_of('v1'), true, null) $$,
                 'P0001', 'version_replaced', 'a replaced version is no longer decided');
select lives_ok($$ select public.decide_production_direction_version(pg_temp.id_of('v2'), true, null) $$, 'V2 validated inside');
reset role;
set local role anon;
select lives_ok($$ select public.decide_production_direction_by_link((select v from vars where k = 'mgmt'), pg_temp.id_of('v2'), true, null) $$,
                'and outside');
reset role;
select is((select direction_status from public.production_sheets where id = pg_temp.id_of('sheet')), 'approved',
          'V2 is retained');
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.request_production_direction_version(pg_temp.id_of('sheet'), 'Changement de lieu') $$,
                'a new version is asked');
reset role;
set local role anon;
select is(public.deposit_production_direction_by_link((select v from vars where k = 'director'), 'https://x.example/t3.pdf', null, 'https://x.example/d3.pdf', null), 3,
          'the director deposits V3');
reset role;
select is((select direction_status from public.production_sheets where id = pg_temp.id_of('sheet')), 'approved',
          'V2 stays retained until V3 is');
select is((select direction_revision_at from public.production_sheets where id = pg_temp.id_of('sheet')), null,
          'the request is answered');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.set_production_creative_ext(pg_temp.id_of('sheet'), null) $$,
                'the owner removes the external validation');
reset role;
select is((select ext_status from public.production_direction_versions
            where sheet_id = pg_temp.id_of('sheet') and number = 3), 'none',
          'what waited for it is no longer awaited');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ insert into public.production_direction_versions (organization_id, project_id, sheet_id, number, treatment_url, cutting_url) values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 9, 'https://x', 'https://y') $$,
                 '42501', null, 'never written directly');
reset role;


-- 2. A cover and teasers drawn from the clip (PR-13) ---------------------------------------
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Pochette'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Teasers');
insert into ids select 'cover_d', id from public.strategy_deliverables where project_id = pg_temp.id_of('project') and title = 'Pochette';
insert into ids select 'teasers_d', id from public.strategy_deliverables where project_id = pg_temp.id_of('project') and title = 'Teasers';
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d, 'link', 'https://frame.example.com/f', 'approved', now(), pg_temp.id_of('creative_person')
  from unnest(array[pg_temp.id_of('cover_d'), pg_temp.id_of('teasers_d')]) d;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'cover', public.open_production_sheet(pg_temp.id_of('cover_d'), 'direct');
insert into ids select 'teasers', public.open_production_sheet(pg_temp.id_of('teasers_d'), 'direct');
select public.set_production_organization(pg_temp.id_of('cover'), 'internal', null, null, pg_temp.id_of('validator_person'), null, null);
select lives_ok($$ select public.set_production_derived(pg_temp.id_of('teasers'), pg_temp.id_of('sheet')) $$,
                'the teasers are drawn from the clip');
reset role;
select is((select company_contact_id from public.production_sheets where id = pg_temp.id_of('teasers')), pg_temp.id_of('thibo'),
          'they follow the clip''s company');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.deposit_production_light_version(pg_temp.id_of('teasers'), null, 'https://x.example/t1', null, null) $$,
                 'P0001', 'clip_not_validated', 'no teaser before the clip''s edit is validated');
reset role;
insert into public.production_files (organization_id, project_id, sheet_id, kind, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('cover'), 'version',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/' || gen_random_uuid() || '.jpg', 'Pochette_V1.jpg', 'image/jpeg', 2400000);
insert into ids select 'cover_file', id from public.production_files where sheet_id = pg_temp.id_of('cover');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(public.deposit_production_light_version(pg_temp.id_of('cover'), pg_temp.id_of('cover_file'), null, 2999, 3000), 1,
          'the cover''s V1 is deposited with its size');
select throws_ok($$ select public.deposit_production_light_version(pg_temp.id_of('cover'), null, 'https://x.example/v2', null, null) $$,
                 'P0001', 'version_pending', 'one version at a time');
insert into ids select 'cover_v1', id from public.production_versions where sheet_id = pg_temp.id_of('cover') and number = 1;
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_production_light_version(pg_temp.id_of('cover_v1'), false, null) $$,
                 'P0001', 'reason_required', 'asking for changes says what');
select lives_ok($$ select public.decide_production_light_version(pg_temp.id_of('cover_v1'), true, null) $$,
                'the creative side validates V1');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.confirm_production_light_check(pg_temp.id_of('cover')) $$,
                 'P0001', 'cover_not_conforming', 'a cover of 2999 px is refused by code');
select throws_ok($$ select public.deliver_production(pg_temp.id_of('cover'), '[]'::jsonb) $$,
                 'P0001', 'recipients_required', 'a delivery has recipients');
reset role;
update public.production_versions set image_width = 3000 where id = pg_temp.id_of('cover_v1');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_light_check(pg_temp.id_of('cover')) $$,
                'a conforming cover passes the check');
select lives_ok($$ select public.deliver_production(pg_temp.id_of('cover'), jsonb_build_array(jsonb_build_object('personId', pg_temp.id_of('creative_person'), 'purpose', 'activations'), jsonb_build_object('name', 'Mona Lys'))) $$,
                'delivered to its recipients');
reset role;
select is((select count(*)::int from public.production_delivery_recipients where sheet_id = pg_temp.id_of('cover')), 2,
          'the recipients are kept');
select is((select count(*)::int from public.notifications where kind = 'production_delivered'
            and recipient_person_id = pg_temp.id_of('creative_person')), 1, 'the member is told');


-- 3. The edit deposited by the company, validated inside and outside -----------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.set_production_creative_ext(pg_temp.id_of('sheet'), pg_temp.id_of('jade'));
insert into vars select 'mgmt2', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('jade'));
insert into vars select 'company', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('thibo'));
reset role;
set local role anon;
select throws_ok($$ select public.deposit_production_version((select v from vars where k = 'mgmt2'), 'https://x.example/cut', null, null, null) $$,
                 '42501', null, 'the external validation deposits no edit');
select is(public.deposit_production_version((select v from vars where k = 'company'), 'https://frame.example/v1', null, null, null), 1,
          'the company deposits the edit V1 on its link, without a post step');
reset role;
insert into ids select 'cut1', id from public.production_versions where sheet_id = pg_temp.id_of('sheet') and number = 1;
select is((select ext_status from public.production_versions where id = pg_temp.id_of('cut1')), 'pending',
          'the external validation is awaited');
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.decide_production_version(pg_temp.id_of('cut1'), 'approve', null) $$,
                'the internal validation validates');
reset role;
select is((select status from public.production_versions where id = pg_temp.id_of('cut1')), 'in_review',
          'not approved while the outside has not decided');
set local role anon;
select throws_ok($$ select public.set_production_final_by_link((select v from vars where k = 'company'), 'https://x.example/master.mov') $$,
                 'P0001', 'no_validated_version', 'no final file before the validation');
select lives_ok($$ select public.decide_production_version_by_link((select v from vars where k = 'mgmt2'), pg_temp.id_of('cut1'), true, null) $$,
                'the management validates on its link');
reset role;
select is((select status from public.production_versions where id = pg_temp.id_of('cut1')), 'approved',
          'the edit is approved once both have');
select ok((select approved_at is not null from public.deliverable_deliveries where deliverable_id = pg_temp.id_of('deliverable')),
          'the delivery''s creative decision follows');
set local role anon;
select lives_ok($$ select public.set_production_final_by_link((select v from vars where k = 'company'), 'https://x.example/master.mov') $$,
                'the company deposits the final file');
select is(public.get_production_link_journey((select v from vars where k = 'company')) -> 'cut' ->> 'finalUrl',
          'https://x.example/master.mov', 'its link reads the final file');
select is(public.get_production_link_journey((select v from vars where k = 'mgmt2')) -> 'quotes', '[]'::jsonb,
          'the management never reads the quotes');
reset role;


-- 4. The shoot's date and hours, a decision replaced, never erased -----------------------------
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.decide_production_schedule(pg_temp.id_of('sheet'), '2026-10-23', '08:00', '19:00', 'meeting') $$,
                 '42501', null, 'the project''s owner decides the date');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.decide_production_schedule(pg_temp.id_of('sheet'), '2026-10-23', '19:00', '08:00', 'meeting') $$,
                 'P0001', 'end_before_start', 'the end comes after the start');
select lives_ok($$ select public.decide_production_schedule(pg_temp.id_of('sheet'), '2026-10-23', '08:00', '19:00', 'meeting') $$,
                'the date and hours are decided');
select is((select count(*)::int from public.production_plan_actions where sheet_id = pg_temp.id_of('sheet') and origin like 'Changement de date%'), 0,
          'a first decision asks nothing to review');
select lives_ok($$ select public.decide_production_schedule(pg_temp.id_of('sheet'), '2026-10-23', '08:00', '15:00', 'call') $$,
                'then changed');
reset role;
select is((select count(*)::int from public.production_schedule_decisions where sheet_id = pg_temp.id_of('sheet')), 2,
          'the previous decision stays in the history');
select is((select count(*)::int from public.production_schedule_decisions where sheet_id = pg_temp.id_of('sheet') and replaced_at is null), 1,
          'one decision is current');
select ok((select review from public.production_plan_actions where sheet_id = pg_temp.id_of('sheet') and origin like 'Changement de date%'),
          'the planning is to review');
select is((select shoot_date from public.production_sheets where id = pg_temp.id_of('sheet')), '2026-10-23'::date,
          'the sheet''s date follows');

select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), '[{"key":"date","label":"Date et horaires","value":"x","ok":true}]'::jsonb, null) $$,
                'the preparation is confirmed');
select lives_ok($$ select public.decide_production_schedule(pg_temp.id_of('sheet'), '2026-10-24', '09:00', '15:00', 'email') $$,
                'the date changes after the confirmation');
reset role;
select ok((select ready_at is not null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'the confirmation stays, to confirm again');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'), '[{"key":"date","label":"Date et horaires","value":"y","ok":true}]'::jsonb, null) $$,
                'and is confirmed again');
reset role;

select * from finish();
rollback;
