-- Production as a journey (Ibé, 14/10;
-- supabase/migrations/20261014001401_production_journey.sql).
-- Run with `supabase test db`.
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


-- 1. Organisation -----------------------------------------------------------------------
select is((select organization from public.production_sheets where id = pg_temp.id_of('sheet')), null,
          'a new sheet waits for its organisation');
select throws_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', null, null, pg_temp.id_of('validator_person'), null, null) $$,
                 'P0001', 'company_required', 'external needs its production company');
select throws_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), null, null, null, null) $$,
                 'P0001', 'quote_validator_required', 'someone validates the quotes');
select lives_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), pg_temp.id_of('producer_person'), pg_temp.id_of('validator_person'), null, null) $$,
                'the owner launches an external production with its roles');
reset role;
select is((select count(*)::int from public.notifications where kind = 'production_organized'
            and recipient_person_id in (pg_temp.id_of('producer_person'), pg_temp.id_of('validator_person'))), 2,
          'the line producer and the validator are told');

-- 2. The line producer organises -----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('producer'));
select ok(public.production_can_organize(pg_temp.id_of('project')), 'the line producer organises the Production');
select throws_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'internal', null, null, pg_temp.id_of('validator_person'), null, null) $$,
                 '42501', null, 'but only the owner decides who produces');

-- 3. A quote from the company's link, checked, submitted, decided ------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('thibo'));
reset role;
set local role anon;
select lives_ok($$ select public.deposit_production_quote_by_link((select v from vars where k = 'token'), 'Devis clip', 1640000, '2026-11-28', null, null) $$,
                'the company deposits its quote through its link');
select throws_ok($$ select public.add_production_gear_by_link((select v from vars where k = 'token'), '[{"label": "FX6"}]'::jsonb) $$,
                 '42501', null, 'the company is not the director of photography');
select lives_ok($$ select public.set_production_progress_by_link((select v from vars where k = 'token'), 'calls', true) $$,
                'the company reports its progress');
select lives_ok($$ select public.propose_production_location_by_link((select v from vars where k = 'token'), 'Entrepôt', 'Aubervilliers', 140000, null, null, null) $$,
                'the company proposes a place');
reset role;
insert into ids select 'quote', id from public.production_quotes where sheet_id = pg_temp.id_of('sheet');
select is((select count(*)::int from public.notifications where kind = 'production_quote_deposited'
            and recipient_person_id = pg_temp.id_of('producer_person')), 1, 'the line producer is told');
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.submit_production_quote(pg_temp.id_of('quote'), '{"amount": true, "delay": true}'::jsonb, null) $$,
                 'P0001', 'checks_incomplete', 'every point is checked before submitting');
select lives_ok($$ select public.submit_production_quote(pg_temp.id_of('quote'), '{"amount": true, "delay": true, "scope": true}'::jsonb, 'Marge de 1 600 €') $$,
                'checked and submitted');
select throws_ok($$ select public.decide_production_quote(pg_temp.id_of('quote'), true, null) $$,
                 '42501', null, 'the line producer does not validate his own check');
reset role;
select pg_temp.act_as(pg_temp.id_of('validator'));
select throws_ok($$ select public.decide_production_quote(pg_temp.id_of('quote'), false, ' ') $$,
                 'P0001', 'reason_required', 'a refusal says why');
select lives_ok($$ select public.decide_production_quote(pg_temp.id_of('quote'), true, null) $$,
                'the validator approves');
reset role;
select is((select status from public.production_quotes where id = pg_temp.id_of('quote')), 'approved', 'the quote is approved');

-- 4. The director's proposal ----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_production_direction(pg_temp.id_of('sheet')) $$,
                 'P0001', 'direction_incomplete', 'an intention and a découpage first');
select public.save_production_brief(pg_temp.id_of('sheet'), null, null, null, 'Un clip nocturne', null, null, null,
  '1. Ouverture · 2. Couplet', null, null, null);
select lives_ok($$ select public.submit_production_direction(pg_temp.id_of('sheet')) $$, 'the proposal is sent');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.decide_production_direction(pg_temp.id_of('sheet'), true, null) $$,
                'the creative director approves it');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.save_production_brief(pg_temp.id_of('sheet'), null, null, null, 'Un clip nocturne, presque muet', null, null, null,
  '1. Ouverture · 2. Couplet', null, null, null);
select is((select direction_status from public.production_sheets where id = pg_temp.id_of('sheet')), 'draft',
          'changed after approval: to send again');

-- 5. The director of photography's link -------------------------------------------------------
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Hugo ' || (select v from vars where k = 'tag'), array['videographer']);
reset role;
insert into ids select 'hugo', id from public.network_contacts where name = 'Hugo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.set_production_organization(pg_temp.id_of('sheet'), 'internal', null, pg_temp.id_of('producer_person'),
  pg_temp.id_of('validator_person'), null, pg_temp.id_of('hugo'));
insert into vars select 'dop', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('hugo'));
reset role;
set local role anon;
select is(public.add_production_gear_by_link((select v from vars where k = 'dop'), '[{"label": "Sony FX6", "category": "image", "quantity": "1"}, {"label": " "}]'::jsonb),
          1, 'the director of photography lists his gear, blank lines left out');
reset role;
select is((select status from public.production_equipment where sheet_id = pg_temp.id_of('sheet') and label = 'Sony FX6'),
          'need', 'a need to price, never booked');

select * from finish();
rollback;
