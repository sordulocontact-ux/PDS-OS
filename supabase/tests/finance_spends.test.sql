-- Finance, spends in context (supabase/migrations/20261113300101_finance_spends.sql):
-- the Finance keeps its cost centers and enters their spends and those
-- « hors budget »; a spend has one envelope or none (« hors budget »); a
-- project's spends keep their rules (the Finance neither writes nor selects
-- them, it reads them through finance_spends()); the treasury counts TTC;
-- a spend is rebilled only when rebillable. Run with `supabase test db`.
begin;
select plan(14);

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
insert into ids select r.name, pg_temp.new_user('fs-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Morris ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'morris', id from public.artists
 where name = 'Morris ' || (select v from vars where k = 'tag');
insert into ids select 'm_morris', public.create_master(pg_temp.id_of('org'), 'Nuit',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('morris'))));
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'p_morris', public.create_project(pg_temp.id_of('org'), 'Nuit', 'music_release',
  array[pg_temp.id_of('m_morris')], p_music_format => 'single');
reset role;
insert into public.budget_lines (organization_id, project_id, label, amount_cents, family, status, spent_on)
values (pg_temp.id_of('org'), pg_temp.id_of('p_morris'), 'Studio ' || (select v from vars where k = 'tag'),
        120000, 'studio', 'invoiced', '2026-03-02');

-- Cost centers -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select lives_ok($$ insert into public.finance_cost_centers (organization_id, name, budget_cents)
                   values (pg_temp.id_of('org'), 'Structure ' || (select v from vars where k = 'tag'), 1000000) $$,
  'business opens a cost center');
insert into ids select 'structure', id from public.finance_cost_centers
 where name = 'Structure ' || (select v from vars where k = 'tag');

-- Spends -----------------------------------------------------------------------------------
select lives_ok($$ insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents,
                                                    family, status, spent_on, vat_bp, supplier_name)
                   values (pg_temp.id_of('org'), pg_temp.id_of('structure'),
                           'Loyer ' || (select v from vars where k = 'tag'), 100000, 'misc', 'invoiced',
                           '2026-03-05', 2000, 'Bailleur') $$,
  'business enters a spend on a cost center, with its VAT and supplier');
select lives_ok($$ insert into public.budget_lines (organization_id, off_budget, label, amount_cents,
                                                    family, status, spent_on)
                   values (pg_temp.id_of('org'), true, 'Imprévu ' || (select v from vars where k = 'tag'),
                           5000, 'misc', 'paid', '2026-03-06') $$,
  'business enters a spend « hors budget »');
select throws_ok($$ insert into public.budget_lines (organization_id, off_budget, cost_center_id, label,
                                                     amount_cents, status, spent_on)
                    values (pg_temp.id_of('org'), true, pg_temp.id_of('structure'), 'X', 100, 'planned',
                            '2026-03-06') $$,
  '23514', null, '« hors budget » has no envelope');
select throws_ok($$ insert into public.budget_lines (organization_id, label, amount_cents, status, spent_on)
                    values (pg_temp.id_of('org'), 'Y', 100, 'planned', '2026-03-06') $$,
  '23514', null, 'a spend has an envelope, or is « hors budget »');
select throws_ok($$ insert into public.budget_lines (organization_id, project_id, label, amount_cents,
                                                     status, spent_on)
                    values (pg_temp.id_of('org'), pg_temp.id_of('p_morris'), 'Z', 100, 'planned',
                            '2026-03-06') $$,
  '42501', null, 'business does not write a project''s spends');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('p_morris')), 0,
  'nor select them');
select is((select count(*)::int from public.finance_spends()
            where label in ('Studio ' || (select v from vars where k = 'tag'),
                            'Loyer ' || (select v from vars where k = 'tag'),
                            'Imprévu ' || (select v from vars where k = 'tag'))), 3,
  'it reads every spend through finance_spends()');
select is((select supplier_name from public.finance_spends()
            where label = 'Loyer ' || (select v from vars where k = 'tag')), 'Bailleur',
  'with its supplier');
select is((select total_cents from public.finance_cash_out()
            where day = '2026-03-05' and status = 'invoiced'), 120000::bigint,
  'the treasury counts a spend TTC');
insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on, source_line_id)
select pg_temp.id_of('org'), 'Refacturation loyer', 'rebilling', 120000, '2026-04-01', id
  from public.budget_lines where label = 'Loyer ' || (select v from vars where k = 'tag');
select ok((select rebill_income_id is not null from public.finance_spends()
            where label = 'Loyer ' || (select v from vars where k = 'tag')),
  'the expected income rebilling a spend is read with it');

-- The direction keeps its rule on projects; the others read nothing of Finance --------------
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ insert into public.budget_lines (organization_id, project_id, label, amount_cents,
                                                     status, spent_on)
                    values (pg_temp.id_of('org'), pg_temp.id_of('p_morris'), 'W', 100, 'planned',
                            '2026-03-06') $$,
  '42501', null, 'the director still does not write a project''s spends');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_cost_centers)
          + (select count(*)::int from public.budget_lines where cost_center_id is not null or off_budget)
          + (select count(*)::int from public.finance_spends()), 0,
  'a project manager reads no cost center, no Finance spend');
select throws_ok($$ insert into public.finance_cost_centers (organization_id, name)
                    values (pg_temp.id_of('org'), 'Autre') $$,
  '42501', null, 'nor opens a cost center');

select * from finish();
rollback;
