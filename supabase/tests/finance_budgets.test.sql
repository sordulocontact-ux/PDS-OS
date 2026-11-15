-- Finance, detailed budgets (supabase/migrations/20261113400101_finance_budgets.sql):
-- a line keeps its forecast when it is engaged at another amount; every
-- change of an envelope is traced (before, after, who, why); a cost center
-- is revised with a reason only; the PDS share and the templates are the
-- Finance's. Run with `supabase test db`.
begin;
select plan(11);

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
insert into ids select r.name, pg_temp.new_user('fb-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('thibault'));
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'PDS MIC #6 ' || (select v from vars where k = 'tag'), 760000);
insert into ids select 'mic', id from public.finance_cost_centers
 where name = 'PDS MIC #6 ' || (select v from vars where k = 'tag');

-- Forecast and sub-post ---------------------------------------------------------------------
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, family, subpost,
                                 status, spent_on)
values (pg_temp.id_of('org'), pg_temp.id_of('mic'), 'Plateau', 200000, 'studio', 'Location', 'planned',
        '2026-12-01');
select is((select forecast_cents from public.budget_lines where cost_center_id = pg_temp.id_of('mic')),
          200000::bigint, 'a line is forecast at its amount');
update public.budget_lines set amount_cents = 240000, status = 'committed'
 where cost_center_id = pg_temp.id_of('mic');
select is((select forecast_cents from public.budget_lines where cost_center_id = pg_temp.id_of('mic')),
          200000::bigint, 'and keeps its forecast once engaged at another amount');
select throws_ok($$ update public.budget_lines set forecast_cents = 1
                    where cost_center_id = pg_temp.id_of('mic') $$,
  '42501', null, 'the forecast is never written by hand');
select is((select subpost from public.finance_spends() where cost_center_id = pg_temp.id_of('mic')),
          'Location', 'the sub-post is read with the spend');

-- Revisions ---------------------------------------------------------------------------------
select throws_ok($$ select public.revise_cost_center(pg_temp.id_of('mic'), 800000, ' ') $$,
  'P0001', 'revision_reason_required', 'a cost center is revised with a reason');
select lives_ok($$ select public.revise_cost_center(pg_temp.id_of('mic'), 800000, 'Invité en plus') $$,
  'the Finance revises a cost center');
select is((select before_cents || '>' || after_cents || ' ' || reason from public.budget_revisions
            where target_id = pg_temp.id_of('mic')),
          '760000>800000 Invité en plus', 'the revision keeps before, after and why');

-- Share and templates -----------------------------------------------------------------------
select lives_ok($$ insert into public.finance_envelope_shares (organization_id, target_kind, target_id, pds_share_bp)
                   values (pg_temp.id_of('org'), 'cost_center', pg_temp.id_of('mic'), 4000) $$,
  'the Finance sets the share PDS finances');
select lives_ok($$ insert into public.finance_budget_templates (organization_id, name, lines)
                   values (pg_temp.id_of('org'), 'PDS MIC',
                           '[{"label": "Plateau", "family": "studio", "amount_cents": 200000}]') $$,
  'the Finance keeps a template');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.budget_revisions where target_id = pg_temp.id_of('mic'))
          + (select count(*)::int from public.finance_envelope_shares)
          + (select count(*)::int from public.finance_budget_templates), 0,
  'a project manager reads no revision, share nor template');
select throws_ok($$ select public.revise_cost_center(pg_temp.id_of('mic'), 1, 'x') $$,
  '42501', null, 'nor revises a cost center');

select * from finish();
rollback;
