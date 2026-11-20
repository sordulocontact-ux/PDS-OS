-- Finance, retours of 18/11/2026 (supabase/migrations/20261120120101_finance_budget_envelopes.sql):
-- a budget made by hand is deleted when unused and archived when used; a budget is cut into
-- parts and spends join them; only the Finance writes either. Run with `supabase test db`.
begin;
select plan(13);

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
insert into ids select r.name, pg_temp.new_user('be-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- The Finance opens two budgets: « Marketing » 20 000 € (used), « Essai » (unused).
select pg_temp.act_as(pg_temp.id_of('thibault'));
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'Marketing ' || (select v from vars where k = 'tag'), 2000000),
       (pg_temp.id_of('org'), 'Essai ' || (select v from vars where k = 'tag'), 50000);
insert into ids select 'marketing', id from public.finance_cost_centers
 where name = 'Marketing ' || (select v from vars where k = 'tag');
insert into ids select 'essai', id from public.finance_cost_centers
 where name = 'Essai ' || (select v from vars where k = 'tag');
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, status, spent_on)
values (pg_temp.id_of('org'), pg_temp.id_of('marketing'), 'Clip', 300000, 'planned', '2026-12-01'),
       (pg_temp.id_of('org'), pg_temp.id_of('essai'), 'Autre', 1000, 'planned', '2026-12-01');
insert into ids select 'clip', id from public.budget_lines where cost_center_id = pg_temp.id_of('marketing');
insert into ids select 'autre', id from public.budget_lines where cost_center_id = pg_temp.id_of('essai');

-- Parts ---------------------------------------------------------------------------------------
insert into public.finance_budget_parts (organization_id, target_kind, target_id, name, amount_cents)
values (pg_temp.id_of('org'), 'cost_center', pg_temp.id_of('marketing'), 'Marketing', 1000000),
       (pg_temp.id_of('org'), 'cost_center', pg_temp.id_of('marketing'), 'Enregistrement', 1000000);
insert into ids select 'part-marketing', id from public.finance_budget_parts where name = 'Marketing'
  and target_id = pg_temp.id_of('marketing');
select is((select count(*) from public.finance_budget_parts where target_id = pg_temp.id_of('marketing')),
          2::bigint, 'the Finance cuts a budget into two parts');
select throws_ok($$ insert into public.finance_budget_parts
                      (organization_id, target_kind, target_id, name, amount_cents)
                    values (pg_temp.id_of('org'), 'cost_center', pg_temp.id_of('marketing'), 'MARKETING', 1) $$,
  '23505', null, 'a budget has one part of a name');
select throws_ok($$ insert into public.finance_budget_parts
                      (organization_id, target_kind, target_id, name, amount_cents)
                    values (pg_temp.id_of('org'), 'cost_center', gen_random_uuid(), 'Ghost', 1) $$,
  'P0001', 'part_unknown_budget', 'a part cuts a budget that exists');

-- A spend joins a part, only of its own budget ------------------------------------------------
select is(public.assign_budget_part(array[pg_temp.id_of('clip')], pg_temp.id_of('part-marketing')), 1,
          'a spend joins a part of its budget');
select is((select part_id from public.finance_budget_part_lines() where line_id = pg_temp.id_of('clip')),
          pg_temp.id_of('part-marketing'), 'and the Finance reads it');
select throws_ok($$ select public.assign_budget_part(array[pg_temp.id_of('autre')],
                                                    pg_temp.id_of('part-marketing')) $$,
  'P0001', 'part_other_budget', 'a spend of another budget cannot join it');
select throws_ok($$ update public.budget_lines set part_id = null where id = pg_temp.id_of('clip') $$,
  '42501', null, 'a client never writes the part by hand');

-- Who: a project manager reads and writes none of it -------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*) from public.finance_budget_parts), 0::bigint, 'a project manager sees no part');
select throws_ok($$ select public.assign_budget_part(array[pg_temp.id_of('clip')], null) $$,
  '42501', null, 'nor puts a spend in a part');
select throws_ok($$ select public.remove_cost_center(pg_temp.id_of('essai')) $$,
  '42501', null, 'nor removes a budget');

-- Removing a budget ----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is(public.remove_cost_center(pg_temp.id_of('marketing')), 'archived',
          'a budget with spends is archived');
select is((select count(*) from public.finance_budget_parts where target_id = pg_temp.id_of('marketing')),
          2::bigint, 'its parts stay with it');
delete from public.budget_lines where id = pg_temp.id_of('autre');
select is(public.remove_cost_center(pg_temp.id_of('essai')), 'deleted', 'an unused budget is deleted');

select * from finish();
rollback;
