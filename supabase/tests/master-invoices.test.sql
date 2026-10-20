-- Master, the engineer's invoice, RIB and payment
-- (supabase/migrations/20261020010101_master_invoices.sql): requested at the
-- Master final, deposited by the link (PDF, amount checked against the rate
-- committed, a new RIB), the RIB read and confirmed by the direction alone,
-- marked paid by the direction on a confirmed RIB. Run with `supabase test db`.
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
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
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

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MI ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
create function pg_temp.add_audio(p_name text, p_state text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('title'), 'audio', p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/' || gen_random_uuid() || '.wav',
          p_name || '.wav', 'audio/wav', 1000)
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Ingé ' || (select v from vars where k = 'tag'), '{engineer}', 'inge@test.test');
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Ingé ' || (select v from vars where k = 'tag');
insert into public.master_briefs (organization_id, project_id, validator_person_id,
                                  mix_contact_id, mastering_same_engineer, mix_rate_cents,
                                  mastering_rate_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('engineer'), true, 80000, 30000);
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
insert into tokens select 'link', public.create_master_transmission(pg_temp.id_of('project'), 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title')::text, 'title', 'Sauvéé'))),
  null, now() + interval '60 days',
  '{"withoutStems": ["Sauvéé"], "withoutStemsReason": "Pistes envoyées à part"}'::jsonb);
reset role;

-- The engineer takes the package with the estimate; the owner accepts both.
select pg_temp.as_anon();
select public.take_master_transmission((select token from tokens where name = 'link'), null, null);
select is(public.get_master_invoice((select token from tokens where name = 'link')), null,
          'no invoice before the master final');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.accept_master_rate(pg_temp.id_of('project'), 'mix');
select public.accept_master_rate(pg_temp.id_of('project'), 'mastering');
select pg_temp.add_audio('mix1', 'mix');
select pg_temp.add_audio('master1', 'master');
reset role;

-- 1. The Master final validated: the invoice is requested.
select pg_temp.act_as(pg_temp.id_of('creative'));
select public.decide_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('mix1')),
                                 'approved', null);
reset role;
select is((select count(*)::int from public.master_invoices where project_id = pg_temp.id_of('project')),
          0, 'the mix validated does not ask for the invoice');
select pg_temp.act_as(pg_temp.id_of('creative'));
select public.decide_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('master1')),
                                 'approved', null);
reset role;
insert into ids select 'invoice', id from public.master_invoices where project_id = pg_temp.id_of('project');
select isnt(pg_temp.id_of('invoice'), null, 'the Master final validated asks the engineer for the invoice');

select pg_temp.as_anon();
select is(public.get_master_invoice((select token from tokens where name = 'link')) ->> 'state', 'requested',
          'the link shows « Votre facture »');
select is((public.get_master_invoice((select token from tokens where name = 'link')) -> 'expected' ->> 'total')::int,
          110000, 'the amount expected is the rates committed');

-- 2. Deposited by the link.
insert into vars select 'slot', public.open_master_invoice_slot((select token from tokens where name = 'link'));
select throws_ok($$ select public.open_master_invoice_slot(repeat('0', 64)) $$, 'P0001',
                 'invoice_not_requested', 'an unknown link opens nothing');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('master-finance', (select v from vars where k = 'slot'), '{"size": 2048}'::jsonb);
select pg_temp.as_anon();
select throws_ok(format($$ select public.submit_master_invoice(%L, %L, 'f.pdf', 'application/pdf',
  'KH-1', 110000, null, null, null, null) $$, (select token from tokens where name = 'link'),
  (select v from vars where k = 'slot')), '23514', 'rib_required', 'a first invoice needs a RIB');
reset role;
-- The engineer's card already has a RIB (kept from a former invoice).
insert into public.contact_bank_accounts (organization_id, contact_id, iban, holder, verified_at)
values (pg_temp.id_of('org'), pg_temp.id_of('engineer'), 'DE89370400440532013000', 'Ingé', now());
select pg_temp.as_anon();
select throws_ok(format($$ select public.submit_master_invoice(%L, %L, 'f.pdf', 'application/pdf',
  'KH-1', 110000, null, 'FR7630006000011234567890188', null, 'Ingé') $$, (select token from tokens where name = 'link'),
  (select v from vars where k = 'slot')), '23514', 'invalid_iban', 'a wrong IBAN is refused');
select throws_ok(format($$ select public.submit_master_invoice(%L, %L, 'f.pdf', 'application/pdf',
  'KH-1', 120000, '  ', 'FR7630006000011234567890189', null, 'Ingé') $$, (select token from tokens where name = 'link'),
  (select v from vars where k = 'slot')), '23514', 'reason_required', 'a different amount says why');
select throws_ok(format($$ select public.submit_master_invoice(%L, %L, 'f.pdf', 'image/png',
  'KH-1', 110000, null, 'FR7630006000011234567890189', null, 'Ingé') $$, (select token from tokens where name = 'link'),
  (select v from vars where k = 'slot')), 'P0001', 'invalid_file', 'only a PDF');
select lives_ok(format($$ select public.submit_master_invoice(%L, %L, 'Facture_KH-1.pdf', 'application/pdf',
  'KH-1', 110000, null, 'FR76 3000 6000 0112 3456 7890 189', 'AGRIFRPP', 'Ingé') $$,
  (select token from tokens where name = 'link'), (select v from vars where k = 'slot')),
  'the engineer sends the invoice and their RIB');
select is(public.get_master_invoice((select token from tokens where name = 'link')) ->> 'state', 'received',
          'the link says it is received');
reset role;
select is((select array_agg(status order by master_role)::text from public.budget_lines
            where project_id = pg_temp.id_of('project') and master_role is not null),
          '{invoiced,invoiced}', 'the lines of both roles are invoiced');
select is((select count(*)::int from public.notifications
            where kind = 'master_invoice_received' and subject_id = pg_temp.id_of('invoice')
              and recipient_person_id in (pg_temp.id_of('owner_person'), pg_temp.id_of('director_person'))),
          2, 'the owner and the direction are told');
select is((select count(*)::int from public.notifications
            where kind = 'master_bank_details_changed' and recipient_person_id = pg_temp.id_of('director_person')),
          1, 'the direction is told the RIB changed');

-- 3. The RIB: the direction alone.
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.contact_bank_accounts), 0, 'the owner never reads a RIB');
select is(public.contact_bank_state(pg_temp.id_of('engineer')), 'pending', 'but knows one waits');
select is((select count(*)::int from public.master_invoices where id = pg_temp.id_of('invoice')), 1,
          'the owner reads the invoice');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.master_invoices where id = pg_temp.id_of('invoice')), 0,
          'the creative director does not');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.pay_master_invoice(%L, current_date, 'x', 'p.pdf', 'application/pdf') $$,
  pg_temp.id_of('invoice')), 'P0001', 'rib_unverified', 'never paid on a RIB not confirmed');
select throws_ok(format($$ select public.confirm_contact_bank_account(%L, false) $$,
  (select id from public.contact_bank_accounts where contact_id = pg_temp.id_of('engineer') and verified_at is null)),
  '23514', 'phone_check_required', 'the phone call is confirmed');
select public.confirm_contact_bank_account(
  (select id from public.contact_bank_accounts where contact_id = pg_temp.id_of('engineer') and verified_at is null), true);

-- 4. Paid by the direction, with its proof.
insert into vars select 'proof', public.open_master_finance_slot(pg_temp.id_of('invoice'), 'proof', 'png');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('master-finance', (select v from vars where k = 'proof'), '{"size": 1024}'::jsonb);
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select public.pay_master_invoice(%L, current_date, %L, 'p.png', 'image/png') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'proof')), '42501', null,
  'the owner never marks it paid');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(format($$ select public.pay_master_invoice(%L, current_date, %L, 'p.png', 'image/png') $$,
  pg_temp.id_of('invoice'), (select v from vars where k = 'proof')), 'the direction marks it paid');
reset role;
select is((select array_agg(status order by master_role)::text from public.budget_lines
            where project_id = pg_temp.id_of('project') and master_role is not null),
          '{paid,paid}', 'the lines are paid');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.master_payment_proofs), 0, 'the proof is the direction''s');
reset role;

select * from finish();
rollback;
