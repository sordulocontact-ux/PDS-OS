-- Pre-production showcase of Finance › Justificatifs (new style lot 6,
-- docs/FINANCE-V2.md; Sacha 15/11/2026: « rajoute les données » in pre-prod):
-- three spends of the label that tickets will prove, then seven proofs in
-- every state of the box:
--   - proposed: SNCF (by e-mail, Train Paris–Lyon), Studio Ombre (Ingé son),
--     SonoFix (Réparation enceinte);
--   - to check: a photo of a G7 ticket (nothing of a photo is « verified »);
--   - waiting: Adobe, no spend matches it;
--   - attached: Loca Plateau, the proof of « Location plateau »;
--   - set aside: a printer's quote, « Un devis, pas une facture ».
-- The rows only: their files (fixed paths below) are made and uploaded by
-- scripts/preprod-proof-files.mjs. Both are played by scripts/preprod-reset.sh
-- after the Business showcase, or alone on a base already in use:
--
--   psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/preprod/showcase-finance-proofs.sql
--   node scripts/preprod-proof-files.mjs
--
-- Adds only, played once (guard below). NEVER on production (accounts
-- @preprod.pds only). Written as the database owner, the proofs' stamp trigger
-- set aside for the insert: who dropped, read, attached or set aside each one
-- is written as it would have been by the app.

\set ON_ERROR_STOP on
select exists (select 1 from public.finance_proofs where file_path like '%/seed-proof-%')
  as already \gset
\if :already
  \echo 'Justificatifs de démonstration déjà présents : rien à faire.'
  \quit
\endif
select count(*) = 0 as not_preprod from auth.users where email = 'malik.durand@preprod.pds' \gset
\if :not_preprod
  \echo 'Refusé : jouer d''abord le jeu Business de la pré-prod (showcase-business.sql).'
  \quit
\endif

\o /dev/null
begin;

create temp table k (name text primary key, id uuid) on commit drop;
insert into k
select 'org', m.organization_id from public.people p
  join public.memberships m on m.person_id = p.id
 where p.email = 'malik.durand@preprod.pds';
insert into k
select split_part(email, '.', 1), id from public.people
 where email in ('malik.durand@preprod.pds', 'elise.fabre@preprod.pds',
                 'claire.morel@preprod.pds', 'lina.haddad@preprod.pds',
                 'tom.mercier@preprod.pds');
create function pg_temp.k(p text) returns uuid language sql as $$
  select id from k where name = p $$;

-- 1. The spends the tickets prove (structure costs, « hors budget »).
insert into public.budget_lines
  (id, organization_id, label, amount_cents, forecast_cents, vat_bp, family, status, spent_on,
   off_budget, supplier_name, note)
values
  ('5eed0001-0000-4000-8000-000000000001', pg_temp.k('org'), 'Ingé son, showcase Lyon',
   90000, 90000, 2000, 'services', 'invoiced', '2026-11-10', true, 'Studio Ombre', null),
  ('5eed0001-0000-4000-8000-000000000002', pg_temp.k('org'), 'Réparation enceinte',
   35000, 35000, null, 'equipment', 'invoiced', '2026-11-12', true, 'SonoFix', null),
  ('5eed0001-0000-4000-8000-000000000003', pg_temp.k('org'), 'Location plateau',
   200000, 200000, 2000, 'studio', 'paid', '2026-11-04', true, 'Loca Plateau', null);

-- 2. The proofs.
alter table public.finance_proofs disable trigger a_guard;

insert into public.finance_proofs
  (organization_id, file_path, file_name, mime, source, email_from, email_subject,
   email_message_id, email_part, uploaded_by, received_at, read_state, read_at, read_values,
   kind, vendor, vendor_verified, amount_cents, amount_verified, vat_cents, vat_verified,
   issued_on, issued_on_verified, reference, reference_verified)
values
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-sncf.pdf', 'QKZ7LM.pdf',
   'application/pdf', 'email', 'claire.morel@preprod.pds', 'Billets train showcase Lyon',
   '<seed-proof-sncf@mail.preprod.pds>', 0, pg_temp.k('claire'), '2026-11-15 08:05+00', 'read',
   '2026-11-15 08:05+00',
   '{"vendor":"SNCF Connect","amountCents":18000,"vatCents":null,"issuedOn":"2026-11-12","reference":"QKZ7LM"}',
   'receipt', 'SNCF Connect', true, 18000, true, null, false, '2026-11-12', true, 'QKZ7LM', true),
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-studio-ombre.pdf', 'F-2026-118.pdf',
   'application/pdf', 'upload', null, null, null, null, pg_temp.k('lina'),
   '2026-11-14 09:12+00', 'read', '2026-11-14 09:12+00',
   '{"vendor":"Studio Ombre","amountCents":108000,"vatCents":18000,"issuedOn":"2026-11-10","reference":"F-2026-118"}',
   'invoice', 'Studio Ombre', true, 108000, true, 18000, true, '2026-11-10', true, 'F-2026-118', true),
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-sonofix.pdf', 'SF-4471.pdf',
   'application/pdf', 'upload', null, null, null, null, pg_temp.k('malik'),
   '2026-11-13 16:40+00', 'read', '2026-11-13 16:40+00',
   '{"vendor":"SonoFix","amountCents":35000,"vatCents":null,"issuedOn":"2026-11-12","reference":"SF-4471"}',
   'invoice', 'SonoFix', true, 35000, true, null, false, '2026-11-12', true, 'SF-4471', true),
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-g7.jpg', 'IMG_4821.jpg',
   'image/jpeg', 'upload', null, null, null, null, pg_temp.k('claire'),
   '2026-11-14 23:48+00', 'read', '2026-11-14 23:48+00',
   '{"vendor":"G7","amountCents":3250,"vatCents":null,"issuedOn":"2026-11-14","reference":null}',
   'receipt', 'G7', false, 3250, false, null, false, '2026-11-14', false, null, false),
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-adobe.pdf', 'IEU2026-88213.pdf',
   'application/pdf', 'upload', null, null, null, null, pg_temp.k('tom'),
   '2026-11-02 07:58+00', 'read', '2026-11-02 07:58+00',
   '{"vendor":"Adobe Systems","amountCents":7199,"vatCents":1200,"issuedOn":"2026-11-01","reference":"IEU2026-88213"}',
   'invoice', 'Adobe Systems', true, 7199, true, 1200, true, '2026-11-01', true, 'IEU2026-88213', true);

insert into public.finance_proofs
  (organization_id, file_path, file_name, mime, source, uploaded_by, received_at, read_state,
   read_at, read_values, kind, vendor, vendor_verified, amount_cents, amount_verified,
   vat_cents, vat_verified, issued_on, issued_on_verified, reference, reference_verified,
   line_id, attached_by, attached_at)
values
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-loca-plateau.pdf', 'LP-2026-031.pdf',
   'application/pdf', 'upload', pg_temp.k('lina'), '2026-11-05 10:30+00', 'read',
   '2026-11-05 10:30+00',
   '{"vendor":"Loca Plateau","amountCents":240000,"vatCents":40000,"issuedOn":"2026-11-04","reference":"LP-2026-031"}',
   'invoice', 'Loca Plateau', true, 240000, true, 40000, true, '2026-11-04', true,
   'LP-2026-031', true, '5eed0001-0000-4000-8000-000000000003', pg_temp.k('malik'),
   '2026-11-05 14:02+00');

insert into public.finance_proofs
  (organization_id, file_path, file_name, mime, source, uploaded_by, received_at, read_state,
   read_at, read_values, kind, vendor, vendor_verified, amount_cents, amount_verified,
   vat_cents, vat_verified, issued_on, issued_on_verified, reference, reference_verified,
   dismissed_at, dismiss_reason, dismissed_by)
values
  (pg_temp.k('org'), pg_temp.k('org') || '/seed-proof-devis.pdf', 'DEVIS-552.pdf',
   'application/pdf', 'upload', pg_temp.k('tom'), '2026-11-09 11:20+00', 'read',
   '2026-11-09 11:20+00',
   '{"vendor":"Imprimerie Lumière","amountCents":46800,"vatCents":7800,"issuedOn":"2026-11-08","reference":"DEVIS-552"}',
   'other', 'Imprimerie Lumière', true, 46800, true, 7800, true, '2026-11-08', true,
   'DEVIS-552', true, '2026-11-09 15:00+00', 'Un devis, pas une facture', pg_temp.k('malik'));

alter table public.finance_proofs enable trigger a_guard;

-- 3. The attached proof is the spend's (what attach_finance_proof writes).
update public.budget_lines
   set proof_path = pg_temp.k('org') || '/seed-proof-loca-plateau.pdf',
       proof_name = 'LP-2026-031.pdf'
 where id = '5eed0001-0000-4000-8000-000000000003';

commit;
\o
\echo 'Justificatifs de démonstration ajoutés (fichiers : node scripts/preprod-proof-files.mjs).'
