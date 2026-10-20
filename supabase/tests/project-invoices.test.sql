-- The finances, unified (supabase/migrations/20261020060101_project_invoices.sql): every invoice
-- of an external person on a project in one table; the budget follows it without counting it
-- twice; the RIB and the payment are the direction's. Run with `supabase test db`.
begin;
select plan(24);

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
grant execute on function pg_temp.id_of(text) to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'creative');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Factures ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('owner_person'));
insert into ids select 'project', id from public.projects
 where title = 'Factures ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles, phone)
values (pg_temp.id_of('org'), 'person', 'Yanis ' || (select v from vars where k = 'tag'),
        array['musician'], '06 77 12 30 45'),
       (pg_temp.id_of('org'), 'person', 'Inès ' || (select v from vars where k = 'tag'),
        array['musician'], null);
insert into ids select 'yanis', id from public.network_contacts
 where name = 'Yanis ' || (select v from vars where k = 'tag');
insert into ids select 'ines', id from public.network_contacts
 where name = 'Inès ' || (select v from vars where k = 'tag');
insert into public.contracts (organization_id, title, type, status, signed_on, project_id,
                              owner_person_id)
values (pg_temp.id_of('org'), 'Contrat de musicien ' || (select v from vars where k = 'tag'),
        'service', 'signed', current_date, pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into ids select 'contract', id from public.contracts
 where title = 'Contrat de musicien ' || (select v from vars where k = 'tag');

-- 1. A paid contract signed: the invoice is asked, the fee is engaged once --------------------
insert into public.financial_needs (organization_id, project_id, contract_id, contact_id, amount_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('contract'),
        pg_temp.id_of('yanis'), 100000);
insert into ids select 'invoice', id from public.project_invoices
 where project_id = pg_temp.id_of('project') and contact_id = pg_temp.id_of('yanis');
select isnt(pg_temp.id_of('invoice'), null, 'a signed contract with a fee asks for its invoice');
insert into ids select 'line', id from public.budget_lines where invoice_id = pg_temp.id_of('invoice');
select is((select amount_cents || ' ' || status from public.budget_lines where id = pg_temp.id_of('line')),
          '100000 committed', 'its fee enters the budget, engaged');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          1, 'once');

-- 2. Read by the owner and the direction, never by another member -------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.project_invoices where id = pg_temp.id_of('invoice')), 1,
          'the owner reads it, like the budget');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.project_invoices where id = pg_temp.id_of('invoice')), 0,
          'the creative director does not');
select is((select count(*)::int from public.project_invoice_states(pg_temp.id_of('project'))), 0,
          'nor where it stands');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.project_invoices $$, '42501', null,
                 'nobody without an account reads an invoice');
reset role;

-- 3. Received otherwise, by the owner: a gap explained, a RIB typed from an e-mail ----------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into vars select 'pdf', public.open_invoice_slot(pg_temp.id_of('invoice'), 'invoice', 'pdf');
select throws_ok(format($$ select public.open_invoice_slot(%L, 'proof', 'pdf') $$, pg_temp.id_of('invoice')),
                 '42501', null, 'the owner never opens a proof of transfer');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('project-invoices', (select v from vars where k = 'pdf'), '{"size": 2048}'::jsonb);
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select public.add_received_invoice(%L, %L, 'F.pdf', 'application/pdf', 'YM-1',
  120000, null, current_date, null, 'FR7630006000011234567890189', null, 'Yanis') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'pdf')),
  '23514', 'reason_required', 'an amount that is not the one agreed says why');
select lives_ok(format($$ select public.add_received_invoice(%L, %L, 'F.pdf', 'application/pdf', 'YM-1',
  120000, 'Une heure de plus.', current_date, 'Par e-mail', 'FR7630006000011234567890189', null, 'Yanis') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'pdf')),
  'the owner adds the invoice received otherwise');
select is((select amount_cents || ' ' || status || ' ' || committed_cents from public.budget_lines
            where id = pg_temp.id_of('line')),
          '120000 invoiced 100000', 'the line takes the invoiced amount, the one agreed is kept');
select throws_ok(format($$ update public.budget_lines set status = 'paid' where id = %L $$, pg_temp.id_of('line')),
                 'P0001', 'line_follows_invoice', 'the owner never moves a line that follows an invoice');
select throws_ok(format($$ delete from public.budget_lines where id = %L $$, pg_temp.id_of('line')),
                 'P0001', 'line_follows_invoice', 'nor deletes it');
select lives_ok(format($$ update public.budget_lines set label = 'Musicien · Yanis' where id = %L $$,
                       pg_temp.id_of('line')), 'but names it as they like');
select is((select state from public.project_invoice_states(pg_temp.id_of('project'))), 'rib',
          'a RIB typed by a member waits for the direction');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person')
              and kind in ('legal_invoice_received', 'legal_invoice_bank_changed')), 2,
          'the direction is told: the invoice, and the RIB to confirm');

-- 4. Paid by the direction alone, on a RIB it confirmed ------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into vars select 'proof', public.open_invoice_slot(pg_temp.id_of('invoice'), 'proof', 'png');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('project-invoices', (select v from vars where k = 'proof'), '{"size": 512}'::jsonb);
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.pay_invoice(%L, current_date, %L, 'v.png', 'image/png') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'proof')),
  'P0001', 'rib_unverified', 'never paid on a RIB not confirmed');
select public.confirm_contact_bank_account(
  (select id from public.contact_bank_accounts where contact_id = pg_temp.id_of('yanis') and verified_at is null), true);
select lives_ok(format($$ select public.pay_invoice(%L, current_date, %L, 'v.png', 'image/png') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'proof')), 'the direction marks it paid');
reset role;
select is((select status from public.budget_lines where id = pg_temp.id_of('line')), 'paid',
          'the line is paid');
select is((select status from public.financial_needs where contract_id = pg_temp.id_of('contract')), 'paid',
          'the contract''s money too');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('owner_person') and kind = 'legal_invoice_paid'), 1,
          'the owner is told');

-- 5. The person's page: their invoices only ---------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into vars select 'yanis_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('yanis'));
insert into vars select 'ines_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('ines'));
reset role;
set local role anon;
select is(public.get_person_invoices((select v from vars where k = 'yanis_token')) -> 'invoices' -> 0 ->> 'state',
          'paid', 'the person reads their invoice, paid');
select is(jsonb_array_length(public.get_person_invoices((select v from vars where k = 'ines_token')) -> 'invoices'),
          0, 'another person reads none of it');
select throws_ok(format($$ select public.open_person_invoice_slot(%L, %L, 'pdf') $$,
                        (select v from vars where k = 'ines_token'), pg_temp.id_of('invoice')),
                 'P0001', 'invoice_link_closed', 'nor deposits on it');
reset role;

select * from finish();
rollback;
