-- Finance, the box of proofs (supabase/migrations/20261115600101_finance_receipts.sql):
-- who writes Finance drops a proof (stamped with who dropped it), checks
-- its values and attaches it to a spend without a proof, a project's or an
-- artist's too, without creating another; an unchecked reading, a spend
-- that already has a proof, a proof set aside are refused; an attached
-- proof is frozen and goes back « to process » when its spend is deleted;
-- a project manager reads only the proofs they sent. Run with
-- `supabase test db`.
begin;
select plan(17);

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
insert into ids select r.name || '_person', a.person_id
  from (values ('manager'), ('thibault')) as r (name)
  join public.accounts a on a.id = (select id from ids where name = r.name);
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.path(p text) returns text language sql as $$
  select pg_temp.id_of('org')::text || '/' || p || (select v from vars where k = 'tag') || '.pdf' $$;
grant execute on function pg_temp.path(text) to authenticated;
create function pg_temp.proof(p text) returns uuid language sql as $$
  select id from public.finance_proofs where file_path = pg_temp.path(p) $$;
grant execute on function pg_temp.proof(text) to authenticated;

-- An artist's spend, which Finance does not write by itself.
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into public.budget_lines (organization_id, artist_id, label, amount_cents, family, status)
values (pg_temp.id_of('org'), pg_temp.id_of('artist'), 'Taxi ' || (select v from vars where k = 'tag'), 7017, 'food', 'paid');
insert into ids select 'taxi', id from public.budget_lines where label = 'Taxi ' || (select v from vars where k = 'tag');
-- A ticket the project manager sent by e-mail (the cron, service role).
insert into public.finance_proofs (organization_id, file_path, file_name, mime, source, uploaded_by,
                                   email_from, email_message_id, email_part)
values (pg_temp.id_of('org'), pg_temp.path('mail'), 'ticket.pdf', 'application/pdf', 'email',
        pg_temp.id_of('manager_person'), 'manager@pds.test', '<m-' || (select v from vars where k = 'tag') || '>', 0);

select pg_temp.act_as(pg_temp.id_of('thibault'));
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'Tournage ' || (select v from vars where k = 'tag'), 3000000);
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, vat_bp, status, spent_on)
select pg_temp.id_of('org'), id, 'SNCF ' || (select v from vars where k = 'tag'), 7017, 2000, 'paid', '2030-11-12'
  from public.finance_cost_centers where name = 'Tournage ' || (select v from vars where k = 'tag');
insert into ids select 'sncf', id from public.budget_lines where label = 'SNCF ' || (select v from vars where k = 'tag');

-- Dropping ---------------------------------------------------------------------------------
select lives_ok($$ insert into public.finance_proofs (organization_id, file_path, file_name, mime)
                   values (pg_temp.id_of('org'), pg_temp.path('a'), 'sncf.pdf', 'application/pdf'),
                          (pg_temp.id_of('org'), pg_temp.path('b'), 'photo.jpg', 'image/jpeg'),
                          (pg_temp.id_of('org'), pg_temp.path('c'), 'doublon.pdf', 'application/pdf') $$,
  'who writes Finance drops proofs');
select is((select uploaded_by from public.finance_proofs where id = pg_temp.proof('a')),
          pg_temp.id_of('thibault_person'), 'the proof is stamped with who dropped it');
select throws_ok($$ insert into public.finance_proofs (organization_id, file_path, file_name, mime)
                    values (pg_temp.id_of('org'), 'elsewhere/x.pdf', 'x.pdf', 'application/pdf') $$,
  '23514', null, 'a proof is kept under its organization');

-- Attaching --------------------------------------------------------------------------------
update public.finance_proofs set read_state = 'read', read_at = now(), vendor = 'SNCF', amount_cents = 8420,
       amount_verified = true, issued_on = '2030-11-12', issued_on_verified = false
 where id = pg_temp.proof('a');
select throws_ok($$ select public.attach_finance_proof(pg_temp.proof('a'), pg_temp.id_of('sncf')) $$,
  'P0001', 'proof_unchecked', 'a value not found in the text is checked by a person first');
update public.finance_proofs set checked_at = now() where id = pg_temp.proof('a');
select is((select checked_by from public.finance_proofs where id = pg_temp.proof('a')),
          pg_temp.id_of('thibault_person'), 'the check is stamped with who checked');
select lives_ok($$ select public.attach_finance_proof(pg_temp.proof('a'), pg_temp.id_of('sncf')) $$,
  'the proof is attached to its spend');
select is((select proof_path from public.budget_lines where id = pg_temp.id_of('sncf')),
          pg_temp.path('a'), 'the spend carries the file as its proof');
select is((select count(*)::int from public.budget_lines where label = 'SNCF ' || (select v from vars where k = 'tag')),
          1, 'no second spend is created');
select throws_ok($$ update public.finance_proofs set vendor = 'Autre' where id = pg_temp.proof('a') $$,
  'P0001', 'proof_attached', 'an attached proof is frozen');
update public.finance_proofs set checked_at = now() where id = pg_temp.proof('b');
select throws_ok($$ select public.attach_finance_proof(pg_temp.proof('b'), pg_temp.id_of('sncf')) $$,
  'P0001', 'line_has_proof', 'a spend that has a proof takes no other');
select lives_ok($$ select public.attach_finance_proof(pg_temp.proof('b'), pg_temp.id_of('taxi')) $$,
  'an artist''s spend takes its proof from Finance');
select is((select (proof_path, amount_cents, status) from public.finance_spends() where line_id = pg_temp.id_of('taxi')),
          (pg_temp.path('b'), 7017::bigint, 'paid'::text), 'only the proof of the artist''s spend changes');

-- Setting aside ----------------------------------------------------------------------------
update public.finance_proofs set dismissed_at = now(), dismiss_reason = 'Doublon', checked_at = now()
 where id = pg_temp.proof('c');
select is((select dismissed_by from public.finance_proofs where id = pg_temp.proof('c')),
          pg_temp.id_of('thibault_person'), 'a proof set aside says who did it');
select throws_ok($$ select public.attach_finance_proof(pg_temp.proof('c'), pg_temp.id_of('taxi')) $$,
  'P0001', 'proof_dismissed', 'a proof set aside is never attached');

-- Who reads --------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select array_agg(file_name) from public.finance_proofs), array['ticket.pdf'],
  'a project manager reads only the proof they sent');
select throws_ok($$ insert into public.finance_proofs (organization_id, file_path, file_name, mime)
                    values (pg_temp.id_of('org'), pg_temp.path('d'), 'd.pdf', 'application/pdf') $$,
  '42501', null, 'a project manager drops nothing in Finance');

-- The spend deleted ------------------------------------------------------------------------
reset role;
delete from public.budget_lines where id = pg_temp.id_of('taxi');
select is((select (line_id, attached_at) from public.finance_proofs where id = pg_temp.proof('b')),
          (null::uuid, null::timestamptz), 'its spend deleted, the proof is to process again');

select * from finish();
rollback;
