-- Finance, bank reconciliation (supabase/migrations/20261113600101_finance_reconciliation.sql):
-- a transaction is imported once; money in becomes an income's receipt,
-- money out matches a spend without creating another; a transaction
-- settles at most its amount, in its own direction; a spend fully matched
-- leaves the treasury as paid and is read matched by Finance
-- (20261113700101_finance_alerts.sql); a matched transaction is not set aside nor
-- changed; the others read nothing of it. Run with `supabase test db`.
begin;
select plan(12);

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
insert into ids select r.name, pg_temp.new_user('fr-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tx(p text) returns uuid language sql as $$
  select id from public.finance_bank_transactions
   where external_id = p || (select v from vars where k = 'tag') $$;
grant execute on function pg_temp.tx(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('thibault'));
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'Tournage ' || (select v from vars where k = 'tag'), 3000000);
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, status, spent_on, due_on)
select pg_temp.id_of('org'), id, 'Julien ' || (select v from vars where k = 'tag'), 40000, 'invoiced',
       '2030-12-01', '2030-12-10'
  from public.finance_cost_centers where name = 'Tournage ' || (select v from vars where k = 'tag');
insert into ids select 'julien', id from public.budget_lines where label = 'Julien ' || (select v from vars where k = 'tag');
insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on, invoice_number, invoiced_on)
values (pg_temp.id_of('org'), 'Avance ' || (select v from vars where k = 'tag'), 'advance', 100000, '2030-12-01',
        'FA-1', '2030-11-20');
insert into ids select 'avance', id from public.finance_incomes where label = 'Avance ' || (select v from vars where k = 'tag');

insert into public.finance_bank_transactions (organization_id, booked_on, amount_cents, counterparty, external_id, source)
values (pg_temp.id_of('org'), '2030-12-11', -40000, 'Julien', 'out' || (select v from vars where k = 'tag'), 'csv'),
       (pg_temp.id_of('org'), '2030-12-12', 60000, 'Label', 'in' || (select v from vars where k = 'tag'), 'csv');
select throws_ok($$ insert into public.finance_bank_transactions (organization_id, booked_on, amount_cents, external_id, source)
                    values (pg_temp.id_of('org'), '2030-12-11', -40000, 'out' || (select v from vars where k = 'tag'), 'csv') $$,
  '23505', null, 'a transaction is imported once');

-- Money out ---------------------------------------------------------------------------------
select is((select count(*)::int from public.finance_lines('upcoming', null, '2030-12-31', 200)
            where line_id = pg_temp.id_of('julien')), 1, 'the spend is still to pay');
select lives_ok($$ insert into public.finance_spend_matches (organization_id, transaction_id, line_id, amount_cents)
                   values (pg_temp.id_of('org'), pg_temp.tx('out'), pg_temp.id_of('julien'), 40000) $$,
  'the debit of 400 € is matched with the spend');
select is((select count(*)::int from public.budget_lines where label = 'Julien ' || (select v from vars where k = 'tag')),
          1, 'no second spend is created');
select is((select count(*)::int from public.finance_lines('upcoming', null, '2030-12-31', 200)
            where line_id = pg_temp.id_of('julien')), 0, 'the spend no longer goes out in the forecast');
select is((select total_cents from public.finance_cash_out() where day = '2030-12-11' and status = 'paid'),
          40000::bigint, 'it left on the transaction''s day');
select is((select matched_cents from public.finance_spends() where line_id = pg_temp.id_of('julien')),
          40000::bigint, 'Finance reads how much the bank matched of the spend');
select throws_ok($$ insert into public.finance_spend_matches (organization_id, transaction_id, line_id, amount_cents)
                    values (pg_temp.id_of('org'), pg_temp.tx('in'), pg_temp.id_of('julien'), 100) $$,
  'P0001', 'transaction_direction', 'a credit never pays a spend');

-- Money in ----------------------------------------------------------------------------------
select lives_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on, transaction_id)
                   values (pg_temp.id_of('org'), pg_temp.id_of('avance'), 60000, '2030-12-12', pg_temp.tx('in')) $$,
  'the credit becomes a partial receipt of the income');
select throws_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on, transaction_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('avance'), 1, '2030-12-12', pg_temp.tx('in')) $$,
  'P0001', 'transaction_over_amount', 'a transaction settles at most its amount');
select throws_ok($$ update public.finance_bank_transactions set ignored_at = now(), ignore_reason = 'Frais'
                    where id = pg_temp.tx('in') $$,
  'P0001', 'transaction_matched', 'a matched transaction is not set aside');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_bank_transactions)
          + (select count(*)::int from public.finance_spend_matches)
          + (select count(*)::int from public.finance_match_candidates()), 0,
  'a project manager reads no transaction nor match');

select * from finish();
rollback;
