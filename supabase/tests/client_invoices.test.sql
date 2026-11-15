-- Finance, client invoices and credit notes
-- (supabase/migrations/20261113200102_client_invoices.sql): an invoice is
-- sent only once numbered; a credit note corrects an invoice within what it
-- awaits and is never changed; receipts and credit notes never exceed the
-- income; an income with a credit note is not cancelled; reminders and
-- credit notes are the Finance's alone; the PDFs follow read_finance and
-- manage_finance. Run with `supabase test db`.
begin;
select plan(18);

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
insert into ids select r.name, pg_temp.new_user('ci-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('glen', 'business_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
insert into ids select 'thibault_person', person_id from public.accounts where id = pg_temp.id_of('thibault');
create function pg_temp.income(p text) returns uuid language sql as $$
  select id from public.finance_incomes where label = p || ' ' || (select v from vars where k = 'tag') $$;
grant execute on function pg_temp.income(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('glen'));
insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on,
                                    invoice_number, invoiced_on, due_on, sent_on, vat_bp,
                                    owner_person_id)
values (pg_temp.id_of('org'), 'OneBlade ' || (select v from vars where k = 'tag'), 'partnership',
        1200000, '2026-11-05', 'FA-118', '2026-11-01', '2026-11-30', '2026-11-02', 2000,
        (select person_id from public.accounts where id = pg_temp.id_of('glen'))),
       (pg_temp.id_of('org'), 'Avance ' || (select v from vars where k = 'tag'), 'advance',
        500000, '2026-12-01', null, null, null, null, null, null);

-- The invoice -------------------------------------------------------------------------------
select is((select vat_bp from public.finance_incomes where id = pg_temp.income('OneBlade')), 2000,
  'an invoice keeps its VAT');
select throws_ok($$ update public.finance_incomes set sent_on = '2026-12-02'
                    where id = pg_temp.income('Avance') $$,
  '23514', null, 'an income without an invoice number is not sent');
select throws_ok($$ update public.finance_incomes set sent_on = '2026-10-01'
                    where id = pg_temp.income('OneBlade') $$,
  '23514', null, 'an invoice is not sent before its day');

-- Credit notes ------------------------------------------------------------------------------
select throws_ok($$ insert into public.finance_credit_notes (organization_id, income_id, number, issued_on,
                                                             amount_cents, reason)
                    values (pg_temp.id_of('org'), pg_temp.income('Avance'), 'AV-1', '2026-12-02', 1000,
                            'Erreur') $$,
  'P0001', 'credit_without_invoice', 'no credit note without an invoice');
select lives_ok($$ insert into public.finance_credit_notes (organization_id, income_id, number, issued_on,
                                                            amount_cents, reason)
                   values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), 'AV-1', '2026-11-10',
                           200000, 'Une vidéo en moins') $$,
  'the Finance issues a credit note on an invoice');
select throws_ok($$ insert into public.finance_credit_notes (organization_id, income_id, number, issued_on,
                                                             amount_cents, reason)
                    values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), 'AV-0', '2026-10-01',
                            1000, 'Avant') $$,
  'P0001', 'credit_before_invoice', 'a credit note is not dated before its invoice');
select lives_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                   values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), 900000, '2026-11-20') $$,
  'a receipt settles what the credit note left');
select throws_ok($$ insert into public.finance_receipts (organization_id, income_id, amount_cents, received_on)
                    values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), 100001, '2026-11-21') $$,
  'P0001', 'receipt_over_amount', 'receipts and credit notes never exceed the income');
select throws_ok($$ insert into public.finance_credit_notes (organization_id, income_id, number, issued_on,
                                                             amount_cents, reason)
                    values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), 'AV-2', '2026-11-22',
                            100001, 'Trop') $$,
  'P0001', 'credit_over_amount', 'a credit note never exceeds what is awaited');
select throws_ok($$ update public.finance_incomes set amount_cents = 1000000
                    where id = pg_temp.income('OneBlade') $$,
  'P0001', 'amount_below_received', 'the amount never goes under receipts and credit notes');
select throws_ok($$ update public.finance_credit_notes set amount_cents = 1
                    where income_id = pg_temp.income('OneBlade') $$,
  '42501', null, 'a credit note is never changed');

-- An income with a credit note but no receipt is not cancelled either.
insert into public.finance_incomes (organization_id, label, kind, amount_cents, expected_on,
                                    invoice_number, invoiced_on)
values (pg_temp.id_of('org'), 'Live ' || (select v from vars where k = 'tag'), 'service', 300000,
        '2026-11-15', 'FA-119', '2026-11-03');
insert into public.finance_credit_notes (organization_id, income_id, number, issued_on, amount_cents, reason)
values (pg_temp.id_of('org'), pg_temp.income('Live'), 'AV-3', '2026-11-04', 300000, 'Live annulé');
select throws_ok($$ update public.finance_incomes set cancelled_at = now(), cancel_reason = 'x'
                    where id = pg_temp.income('Live') $$,
  'P0001', 'income_has_credits', 'an income with a credit note is not cancelled');

-- Reminders ---------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select lives_ok($$ insert into public.finance_reminders (organization_id, income_id, reminded_on, channel, note)
                   values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), '2026-11-25', 'email',
                           'Relance du solde') $$,
  'business enters a reminder made');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ insert into public.finance_reminders (organization_id, income_id, reminded_on, channel)
                    values (pg_temp.id_of('org'), pg_temp.income('OneBlade'), '2026-11-25', 'phone') $$,
  '42501', null, 'a project manager does not');
select is((select count(*)::int from public.finance_credit_notes)
          + (select count(*)::int from public.finance_reminders)
          + (select count(*)::int from public.finance_targets()), 0,
  'a project manager reads no credit note, reminder nor finance target');

-- Names and files ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(exists (select 1 from public.finance_targets() t
                   where t.kind = 'member'
                     and t.id = pg_temp.id_of('thibault_person')),
  'the Finance names its members as an invoice''s owner');
select ok(public.finance_file_allowed(pg_temp.id_of('org') || '/x.pdf', 'manage_finance')
          and not public.finance_file_allowed('not-an-org/x.pdf', 'read_finance'),
  'the Finance stores a PDF under its organization, nowhere else');
select pg_temp.act_as(pg_temp.id_of('manager'));
select ok(not public.finance_file_allowed(pg_temp.id_of('org') || '/x.pdf', 'read_finance'),
  'a project manager reads no finance PDF');

select * from finish();
rollback;
