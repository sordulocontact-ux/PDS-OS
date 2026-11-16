-- Finance, treasury and money in (supabase/migrations/20261113100101_treasury.sql):
-- the direction and the Finance (business managers, business) read and write
-- the balance, the reserve, the incomes and their receipts; a receipt never
-- exceeds its income, an income with receipts is not cancelled, a cancelled
-- one is frozen; every change is journaled; the others read and write
-- nothing. Run with `supabase test db`.
begin;
select plan(22);

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
insert into ids select r.name, pg_temp.new_user('tr-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('manager'), ('creative'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'dioo', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
insert into public.budget_lines (organization_id, artist_id, label, amount_cents, family, status, spent_on)
values (pg_temp.id_of('org'), pg_temp.id_of('dioo'), 'Train', 3000, 'transport', 'paid', '2026-11-02'),
       (pg_temp.id_of('org'), pg_temp.id_of('dioo'), 'Hôtel', 12000, 'lodging', 'committed', '2026-12-01');

-- The permission ----------------------------------------------------------------------------
select ok('manage_finance' = any (public.role_permissions('general_director'))
          and 'manage_finance' = any (public.role_permissions('business_manager'))
          and 'manage_finance' = any (public.role_permissions('business')),
  'the direction and the Finance write the finance');
select ok(not ('manage_finance' = any (public.role_permissions('project_manager')))
          and not ('manage_finance' = any (public.role_permissions('creative_director'))),
  'project managers and the creative director do not');

-- Balance and reserve -----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select lives_ok($$ insert into public.treasury_balances (organization_id, balance_cents, as_of)
                   values (pg_temp.id_of('org'), 8462000, '2026-11-01') $$,
  'business enters a statement of the account');
select is((select created_by from public.treasury_balances
            where organization_id = pg_temp.id_of('org') order by created_at desc limit 1),
          (select person_id from public.accounts where id = pg_temp.id_of('thibault')),
  'the statement is signed by whoever entered it');
select lives_ok($$ insert into public.treasury_settings (organization_id, reserve_cents)
                   values (pg_temp.id_of('org'), 2000000)
                   on conflict (organization_id) do update set reserve_cents = excluded.reserve_cents $$,
  'business sets the minimum reserve');
select throws_ok($$ update public.treasury_balances set balance_cents = 1
                    where organization_id = pg_temp.id_of('org') $$,
  '42501', null, 'a statement is never changed');

-- Incomes and receipts ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
insert into public.finance_incomes (organization_id, label, kind, amount_cents, artist_id, expected_on,
                                    invoice_number, invoiced_on, due_on)
values (pg_temp.id_of('org'), 'OneBlade', 'partnership', 1200000, pg_temp.id_of('dioo'), '2026-11-05',
        'FA-2026-118', '2026-11-01', '2026-11-07');
insert into ids select 'philips', id from public.finance_incomes
 where organization_id = pg_temp.id_of('org') and invoice_number = 'FA-2026-118';
select isnt(pg_temp.id_of('philips'), null, 'a business manager enters an income with its invoice');
select lives_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                   values (pg_temp.id_of('org'), pg_temp.id_of('philips'), 500000, '2026-11-10') $$,
  'a first receipt, partial');
select throws_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                    values (pg_temp.id_of('org'), pg_temp.id_of('philips'), 800000, '2026-11-11') $$,
  'P0001', 'receipt_over_amount', 'receipts never add up to more than the income');
select lives_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                   values (pg_temp.id_of('org'), pg_temp.id_of('philips'), 700000, '2026-11-12') $$,
  'the rest, received');
select throws_ok($$ update public.finance_incomes set amount_cents = 1000000
                    where id = pg_temp.id_of('philips') $$,
  'P0001', 'amount_below_received', 'the amount never goes under what was received');
select throws_ok($$ update public.finance_incomes set cancelled_at = now(), cancel_reason = 'Erreur'
                    where id = pg_temp.id_of('philips') $$,
  'P0001', 'income_has_receipts', 'an income whose money came in is not cancelled');
select throws_ok($$ delete from public.finance_incomes where id = pg_temp.id_of('philips') $$,
  '42501', null, 'an income is never deleted');

insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on)
values (pg_temp.id_of('org'), 'Remboursement label ' || (select v from vars where k = 'tag'),
        'label_refund', 480000, '2026-11-30');
insert into ids select 'refund', id from public.finance_incomes
 where label = 'Remboursement label ' || (select v from vars where k = 'tag');
update public.finance_incomes set cancelled_at = now(), cancel_reason = 'Abandonné'
 where id = pg_temp.id_of('refund');
select is((select cancelled_by from public.finance_incomes where id = pg_temp.id_of('refund')),
          (select person_id from public.accounts where id = pg_temp.id_of('glen')),
  'a cancelled income says who cancelled it');
select throws_ok($$ update public.finance_incomes set label = 'Autre' where id = pg_temp.id_of('refund') $$,
  'P0001', 'income_cancelled', 'a cancelled income is frozen');
select throws_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                    values (pg_temp.id_of('org'), pg_temp.id_of('refund'), 100, '2026-11-12') $$,
  'P0001', 'income_cancelled', 'nothing is received on a cancelled income');

-- History -----------------------------------------------------------------------------------
select is((select count(*)::int from public.finance_events where row_id = pg_temp.id_of('philips')),
          1, 'the income''s entry is journaled');
select is((select count(*)::int from public.finance_events
            where entity = 'finance_receipts' and after ->> 'income_id' = pg_temp.id_of('philips')::text),
          2, 'each receipt too');

-- What goes out, for the treasury -----------------------------------------------------------
select is((select sum(total_cents)::bigint from public.finance_cash_out()
            where day = '2026-12-01' and status = 'committed'),
          12000::bigint, 'a spend still to pay goes out on its day');
select is((select count(*)::int from public.finance_lines('upcoming', null, '2026-12-31', 200)
            where artist_id = pg_temp.id_of('dioo')),
          1, '« upcoming »: the lines not paid yet');

-- Nothing for the others --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_incomes) + (select count(*)::int from public.treasury_balances)
          + (select count(*)::int from public.finance_targets()),
          0, 'a project manager reads no income, statement nor target');
select throws_ok($$ insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on)
                    values (pg_temp.id_of('org'), 'X', 'other', 100, '2026-11-30') $$,
  '42501', null, 'nor enters one');

select * from finish();
rollback;
