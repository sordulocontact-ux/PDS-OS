-- Finance, new style lot 6 (docs/FINANCE-V2.md, docs/ANALYSE-MIDDAY.md § 7.2):
-- the box of proofs (« boîte à justificatifs »).
--
-- Ibé's ticket « Cockpit Finance » (13/11/2026) keeps « récupération des
-- justificatifs » for later (P2) and asks that every spend keeps its proof.
-- A ticket or an invoice arrives as a file (dropped on the page, or sent by
-- e-mail to po+justificatifs@…), is read, then attached by a person to the
-- spend it proves:
--   - the reading is a proposal: each value (supplier, amount TTC, VAT, day,
--     reference) says whether the code found it as written in the PDF's
--     text; a photo has no text, so nothing of it is « verified » until a
--     person checks it (rule 6: the AI never produces an amount);
--   - which spend it proves is proposed by code (lib/finance/proof-match.ts),
--     never by the AI, and never attached without a person;
--   - attaching puts the file as the spend's proof (budget_lines.proof_path,
--     the slot a Finance spend already has): never a second spend.
-- The table is named finance_proofs: finance_receipts already holds the
-- receipts of the incomes (20261113100101_treasury.sql).
--
-- Not linked to a project (a proof belongs to the organization; the spend it
-- proves may be a project's), so not in delete_project_row: a spend deleted
-- with its project sets its proofs back « to process ».

-- 1. The proofs -------------------------------------------------------------------------------
create table public.finance_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  -- The file, in the private bucket finance-files, under the organization.
  file_path text not null,
  file_name text not null,
  mime text not null,
  source text not null default 'upload',
  -- Who dropped it, or the member who sent it by e-mail.
  uploaded_by uuid references public.people (id) on delete set null,
  email_from text,
  email_subject text,
  email_message_id text,
  -- Its place among the message's files (one e-mail, several proofs).
  email_part integer,
  received_at timestamptz not null default now(),
  -- The reading (by code: pending, then read or failed).
  read_state text not null default 'pending',
  read_at timestamptz,
  -- What the reading gave, as it gave it, before any change by a person.
  read_values jsonb,
  kind text,
  vendor text,
  vendor_verified boolean not null default false,
  amount_cents bigint,
  amount_verified boolean not null default false,
  vat_cents bigint,
  vat_verified boolean not null default false,
  issued_on date,
  issued_on_verified boolean not null default false,
  reference text,
  reference_verified boolean not null default false,
  -- A person confirmed (or corrected) the values.
  checked_by uuid references public.people (id) on delete set null,
  checked_at timestamptz,
  -- The spend it proves, once attached by a person (attach_finance_proof).
  line_id uuid references public.budget_lines (id) on delete set null,
  attached_by uuid references public.people (id) on delete set null,
  attached_at timestamptz,
  -- Set aside (not a proof, a duplicate…), with why.
  dismissed_at timestamptz,
  dismiss_reason text,
  dismissed_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_proofs_id_org_key unique (id, organization_id),
  constraint finance_proofs_path_key unique (file_path),
  constraint finance_proofs_email_key unique (organization_id, email_message_id, email_part),
  constraint finance_proofs_path_check
    check (char_length(file_path) <= 300 and file_path like organization_id::text || '/%'),
  constraint finance_proofs_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 200),
  constraint finance_proofs_mime_check
    check (mime in ('application/pdf', 'image/png', 'image/jpeg')),
  constraint finance_proofs_source_check check (source in ('upload', 'email')),
  constraint finance_proofs_email_check
    check ((source = 'email') = (email_message_id is not null and email_part is not null)
           and coalesce(char_length(email_from), 0) <= 320
           and coalesce(char_length(email_subject), 0) <= 300
           and coalesce(char_length(email_message_id), 0) <= 300),
  constraint finance_proofs_read_check
    check (read_state in ('pending', 'read', 'failed')
           and ((read_state = 'pending') = (read_at is null))),
  constraint finance_proofs_kind_check check (kind is null or kind in ('receipt', 'invoice', 'other')),
  constraint finance_proofs_values_check
    check (coalesce(char_length(vendor), 0) <= 200
           and coalesce(char_length(reference), 0) <= 120
           and (amount_cents is null or (amount_cents > 0 and amount_cents <= 100000000000))
           and (vat_cents is null or (vat_cents >= 0 and vat_cents <= 100000000000))),
  constraint finance_proofs_checked_check check (checked_by is null or checked_at is not null),
  constraint finance_proofs_attached_check check ((line_id is null) = (attached_at is null)),
  constraint finance_proofs_dismiss_check
    check ((dismissed_at is null) = (dismiss_reason is null)
           and (dismiss_reason is null or (btrim(dismiss_reason) <> '' and char_length(dismiss_reason) <= 300))),
  constraint finance_proofs_one_way_check check (line_id is null or dismissed_at is null)
);
create index finance_proofs_org_idx on public.finance_proofs (organization_id, received_at desc);
create index finance_proofs_line_idx on public.finance_proofs (line_id) where line_id is not null;
create index finance_proofs_uploader_idx on public.finance_proofs (uploaded_by);

-- 2. Stamps and guards ------------------------------------------------------------------------
-- Who did what is set by the database: the depositor of an upload, who
-- checked the values, who set a proof aside. An attached proof is frozen
-- (it is the spend's now); its spend deleted, it goes back « to process ».
create or replace function public.finance_proofs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_person uuid := public.auth_person_id();
begin
  if tg_op = 'INSERT' then
    if new.source = 'upload' then
      new.uploaded_by := v_person;
    end if;
    new.line_id := null;
    new.attached_by := null;
    new.attached_at := null;
    new.checked_by := null;
    new.checked_at := null;
    new.dismissed_at := null;
    new.dismiss_reason := null;
    new.dismissed_by := null;
    return new;
  end if;
  if old.line_id is not null and new.line_id is null then
    -- The spend is gone (on delete set null): to process again.
    new.attached_by := null;
    new.attached_at := null;
    return new;
  end if;
  if old.line_id is not null and current_user = 'authenticated' then
    raise exception 'proof_attached' using errcode = 'P0001';
  end if;
  if new.file_path is distinct from old.file_path or new.source is distinct from old.source
     or new.uploaded_by is distinct from old.uploaded_by
     or new.received_at is distinct from old.received_at then
    raise exception 'proof_frozen' using errcode = 'P0001';
  end if;
  if new.checked_at is distinct from old.checked_at and current_user = 'authenticated' then
    new.checked_by := case when new.checked_at is null then null else v_person end;
  end if;
  if new.dismissed_at is distinct from old.dismissed_at and current_user = 'authenticated' then
    new.dismissed_by := case when new.dismissed_at is null then null else v_person end;
  end if;
  return new;
end;
$$;
revoke execute on function public.finance_proofs_guard() from public, anon, authenticated;

create trigger a_guard before insert or update on public.finance_proofs
  for each row execute function public.finance_proofs_guard();
create trigger a_set_updated_at before update on public.finance_proofs
  for each row execute function public.set_updated_at();
create trigger z_log after insert or update or delete on public.finance_proofs
  for each row execute function public.log_finance_event();

-- 3. Row security -----------------------------------------------------------------------------
-- Who reads Finance reads every proof; the member who sent one by e-mail
-- reads their own. Who writes Finance drops, reads, checks and sets aside;
-- attaching goes through attach_finance_proof. A proof is never deleted (set
-- aside instead: the file stays in its bucket, the history keeps it).
alter table public.finance_proofs enable row level security;
alter table public.finance_proofs force row level security;
revoke all on public.finance_proofs from anon, authenticated;
grant select on public.finance_proofs to authenticated;
grant insert (organization_id, file_path, file_name, mime) on public.finance_proofs to authenticated;
grant update (read_state, read_at, read_values, kind, vendor, vendor_verified, amount_cents,
              amount_verified, vat_cents, vat_verified, issued_on, issued_on_verified, reference,
              reference_verified, checked_at, dismissed_at, dismiss_reason)
  on public.finance_proofs to authenticated;

create policy finance_proofs_select on public.finance_proofs
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance')
         or (uploaded_by = public.auth_person_id()
             and organization_id = public.auth_organization_id()));
create policy finance_proofs_insert on public.finance_proofs
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_proofs_update on public.finance_proofs
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

-- 4. Attaching a proof to its spend -----------------------------------------------------------
-- By whoever writes Finance, to any spend of the organization still without
-- a proof (a project's or an artist's too: Ibé, « chaque dépense garde son
-- justificatif »). Only the proof columns of the line change, nothing of its
-- amount, state or owner. The values must have been found in the text or
-- checked by a person first. A spend just created with this file as its
-- proof (« Créer la dépense ») is recognised by the file itself.
create or replace function public.attach_finance_proof(p_proof uuid, p_line uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proof public.finance_proofs%rowtype;
  v_line public.budget_lines%rowtype;
  v_invoice_file text;
begin
  select * into v_proof from public.finance_proofs where id = p_proof for update;
  if not found or v_proof.organization_id is distinct from public.auth_organization_id()
     or not public.has_permission(v_proof.organization_id, 'manage_finance') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_proof.dismissed_at is not null then
    raise exception 'proof_dismissed' using errcode = 'P0001';
  end if;
  if v_proof.line_id is not null then
    raise exception 'proof_attached' using errcode = 'P0001';
  end if;
  if v_proof.checked_at is null and not (v_proof.amount_verified and v_proof.issued_on_verified) then
    raise exception 'proof_unchecked' using errcode = 'P0001';
  end if;

  select * into v_line from public.budget_lines
   where id = p_line and organization_id = v_proof.organization_id for update;
  if not found then
    raise exception 'line_not_found' using errcode = 'P0001';
  end if;
  if v_line.refused_at is not null then
    raise exception 'line_refused' using errcode = 'P0001';
  end if;
  if v_line.proof_path is distinct from v_proof.file_path then
    select i.file_path into v_invoice_file from public.project_invoices i where i.id = v_line.invoice_id;
    if v_line.proof_path is not null or v_line.attachment_file_id is not null
       or v_line.artist_attachment_file_id is not null or v_invoice_file is not null then
      raise exception 'line_has_proof' using errcode = 'P0001';
    end if;
    update public.budget_lines
       set proof_path = v_proof.file_path, proof_name = v_proof.file_name
     where id = p_line;
  end if;

  update public.finance_proofs
     set line_id = p_line, attached_by = public.auth_person_id(), attached_at = now()
   where id = p_proof;
end;
$$;
revoke execute on function public.attach_finance_proof(uuid, uuid) from public, anon;
grant execute on function public.attach_finance_proof(uuid, uuid) to authenticated;

-- 5. A proof sent by e-mail -------------------------------------------------------------------
-- The member an address belongs to (an approved account of the
-- organization), for the cron that reads po+justificatifs@ (service role
-- only): a message from anyone else is never taken.
create or replace function public.finance_proof_sender(p_email text)
returns table (person_id uuid, organization_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, m.organization_id
    from public.people p
    join public.accounts a on a.person_id = p.id and a.disabled_at is null
    join public.memberships m on m.approved_account_id = a.id and m.status = 'approved'
   where p.email = public.normalize_email(p_email)
   limit 1;
$$;
revoke execute on function public.finance_proof_sender(text) from public, anon, authenticated;
grant execute on function public.finance_proof_sender(text) to service_role;
