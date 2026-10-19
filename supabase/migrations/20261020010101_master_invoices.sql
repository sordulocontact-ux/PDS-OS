-- Master, the engineer's invoice, RIB and payment (docs/projet-complet/
-- master.md § 9, proto `master:final` and `master:invoice`).
--
-- 1. organization_billing: what an invoice is addressed to (« Facturer à »:
--    raison sociale, adresse, SIRET, TVA), written by the administration.
-- 2. master_invoices: one per external engineer and project, requested by
--    PDS OS when every title of the round has its Master final (« Facture
--    demandée … suite à : Master final validé »); deposited by the
--    engineer on their private link (PDF, number, amount, why it differs
--    from the rate committed) or added by the owner « reçue autrement »;
--    marked paid by the direction (date, proof). Read by the project's
--    owner and the direction (can_read_project_budget), like the budget.
-- 3. contact_bank_accounts: the RIB of a contact (« Votre fiche chez
--    PDS »). Read by the direction ONLY (RLS). The first one the engineer
--    gives with their invoice is kept as their card's (proto); a CHANGED
--    one, or one typed by a member from an e-mail, is never used before the
--    direction confirmed it by phone (fraude au RIB). The engineer sees the
--    last four digits only.
-- 4. master_payment_proofs: the proof of the transfer, direction only.
--    PDS OS never makes the transfer: the direction pays from the bank and
--    notes it here.
-- 5. Files in the private bucket `master-finance`, uploaded through
--    one-time slots (as master_delivery_slots): anyone may upload to an
--    open slot's exact path, nothing else; reading follows the row.
-- The budget lines of the engineer's roles follow: invoiced, then paid.

-- 0 --------------------------------------------------------------------------

-- The direction: the people who decide the money (the general director).
create or replace function public.is_direction(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(p_org, 'validate');
$$;
revoke execute on function public.is_direction(uuid) from public, anon;
grant execute on function public.is_direction(uuid) to authenticated;

-- Tell every member of the direction (never the actor, nor who was
-- already told by another way: p_skip).
create or replace function public.notify_direction(
  p_org uuid, p_kind text, p_project uuid, p_subject uuid, p_actor uuid, p_skip uuid default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select p_org, m.person_id, p_actor, p_kind, p_project, p_subject
    from public.memberships m
   where m.organization_id = p_org and m.status = 'approved'
     and 'validate' = any (public.role_permissions(m.role))
     and m.person_id is distinct from p_actor
     and m.person_id is distinct from p_skip;
$$;
revoke execute on function public.notify_direction(uuid, text, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;

-- An IBAN well formed and its check digits right (ISO 13616, mod 97).
create or replace function public.iban_valid(p_iban text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
  v_digits text := '';
  v_rest integer := 0;
  c text;
begin
  if v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;
  v := substr(v, 5) || substr(v, 1, 4);
  foreach c in array regexp_split_to_array(v, '') loop
    v_digits := v_digits || case when c ~ '[A-Z]' then (ascii(c) - 55)::text else c end;
  end loop;
  while length(v_digits) > 0 loop
    v_rest := ((v_rest::text || substr(v_digits, 1, 7))::bigint % 97)::integer;
    v_digits := substr(v_digits, 8);
  end loop;
  return v_rest = 1;
end;
$$;
revoke execute on function public.iban_valid(text) from public;
grant execute on function public.iban_valid(text) to anon, authenticated;

select public.add_notification_kinds(array['master_invoice_received', 'master_bank_details_changed',
                                           'master_invoice_paid']);

-- 1 --------------------------------------------------------------------------

create table public.organization_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  legal_name text not null,
  address text not null,
  siret text,
  vat_number text,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint organization_billing_legal_name_check
    check (btrim(legal_name) <> '' and char_length(legal_name) <= 200),
  constraint organization_billing_address_check
    check (btrim(address) <> '' and char_length(address) <= 500),
  constraint organization_billing_siret_check
    check (siret is null or siret ~ '^[0-9 ]{9,20}$'),
  constraint organization_billing_vat_check
    check (vat_number is null or (btrim(vat_number) <> '' and char_length(vat_number) <= 30))
);
alter table public.organization_billing enable row level security;
alter table public.organization_billing force row level security;
revoke all on table public.organization_billing from anon, authenticated;
grant select on public.organization_billing to authenticated;
grant insert (organization_id, legal_name, address, siret, vat_number)
  on public.organization_billing to authenticated;
grant update (legal_name, address, siret, vat_number) on public.organization_billing to authenticated;
create policy organization_billing_select on public.organization_billing
  for select to authenticated using (public.is_active_member(organization_id));
create policy organization_billing_insert on public.organization_billing
  for insert to authenticated with check (public.has_permission(organization_id, 'administer'));
create policy organization_billing_update on public.organization_billing
  for update to authenticated
  using (public.has_permission(organization_id, 'administer'))
  with check (public.has_permission(organization_id, 'administer'));
create or replace function public.organization_billing_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := public.auth_person_id();
  new.updated_at := now();
  return new;
end;
$$;
create trigger a_stamp before insert or update on public.organization_billing
  for each row execute function public.organization_billing_stamp();

-- 2 --------------------------------------------------------------------------

create table public.master_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  contact_id uuid not null,
  requested_at timestamptz not null default now(),
  number text,
  amount_cents bigint,
  -- Why the amount differs from the rate committed (required then).
  amount_reason text,
  file_path text,
  file_name text,
  file_bytes bigint,
  received_at timestamptz,
  -- 'link': deposited by the engineer; 'other': added by the owner.
  received_via text,
  received_by uuid references public.people (id),
  -- « Par e-mail, en main propre… »
  received_how text,
  -- A new RIB came with this invoice (its digits are in contact_bank_accounts).
  bank_changed boolean not null default false,
  paid_on date,
  paid_at timestamptz,
  paid_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_invoices_project_contact_key unique (project_id, contact_id),
  constraint master_invoices_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint master_invoices_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint master_invoices_number_check
    check (number is null or (btrim(number) <> '' and char_length(number) <= 60)),
  constraint master_invoices_amount_check
    check (amount_cents is null or amount_cents between 1 and 100000000),
  constraint master_invoices_reason_check
    check (amount_reason is null or (btrim(amount_reason) <> '' and char_length(amount_reason) <= 1000)),
  constraint master_invoices_how_check
    check (received_how is null or (btrim(received_how) <> '' and char_length(received_how) <= 200)),
  constraint master_invoices_via_check check (received_via is null or received_via in ('link', 'other')),
  constraint master_invoices_received_check check (
    (received_at is null) = (received_via is null)
    and (received_at is null or (number is not null and amount_cents is not null
                                 and file_path is not null))),
  constraint master_invoices_paid_check check (
    (paid_at is null) = (paid_on is null) and (paid_at is null or received_at is not null))
);
create index master_invoices_project_idx on public.master_invoices (project_id);

alter table public.master_invoices enable row level security;
alter table public.master_invoices force row level security;
revoke all on table public.master_invoices from anon, authenticated;
grant select on public.master_invoices to authenticated;
-- The owner and the direction read it, like the budget; every write goes
-- through the functions below.
create policy master_invoices_select on public.master_invoices
  for select to authenticated
  using (public.can_see_project(project_id) and public.can_read_project_budget(project_id));

-- The roles an engineer holds on the project's Master, from the Brief.
create or replace function public.master_contact_roles(p_project_id uuid, p_contact_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
           case when b.mix_contact_id = p_contact_id then 'mix' end,
           case when (b.mastering_same_engineer and b.mix_contact_id = p_contact_id)
                  or (not b.mastering_same_engineer and b.mastering_contact_id = p_contact_id)
                then 'mastering' end], null)
    from public.master_briefs b where b.project_id = p_project_id;
$$;
revoke execute on function public.master_contact_roles(uuid, uuid) from public, anon, authenticated;

-- The amount committed for an engineer (« Montant attendu »): the lines of
-- their roles once accepted, in cents; null when nothing was committed.
create or replace function public.master_invoice_expected(p_project_id uuid, p_contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 0 then null else jsonb_build_object(
           'total', sum(l.amount_cents),
           'mix', sum(l.amount_cents) filter (where l.master_role = 'mix'),
           'mastering', sum(l.amount_cents) filter (where l.master_role = 'mastering')) end
    from public.budget_lines l
   where l.project_id = p_project_id
     and l.master_role = any (coalesce(public.master_contact_roles(p_project_id, p_contact_id), '{}'))
     and l.status in ('committed', 'invoiced', 'paid');
$$;
revoke execute on function public.master_invoice_expected(uuid, uuid) from public, anon, authenticated;

-- PDS OS asks each external engineer for their invoice once every title of
-- the round has its Master final (the master validated: the invoice never
-- blocks the release). An engineer is external when they received a link.
create or replace function public.request_master_invoices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage <> 'mastering' or new.decision is distinct from 'approved'
     or old.decision is not distinct from 'approved' then
    return null;
  end if;
  if exists (
    select 1 from public.project_masters pm
     where pm.project_id = new.project_id
       and exists (select 1 from public.master_mix_versions v
                    where v.project_id = new.project_id and v.master_id = pm.master_id)
       and not exists (select 1 from public.master_mix_versions v
                        where v.project_id = new.project_id and v.master_id = pm.master_id
                          and v.stage = 'mastering' and v.decision = 'approved')) then
    return null;
  end if;
  insert into public.master_invoices (organization_id, project_id, contact_id)
  select distinct t.organization_id, t.project_id, t.contact_id
    from public.master_transmissions t
   where t.project_id = new.project_id
     and cardinality(coalesce(public.master_contact_roles(t.project_id, t.contact_id), '{}')) > 0
  on conflict (project_id, contact_id) do nothing;
  return null;
end;
$$;
revoke execute on function public.request_master_invoices() from public, anon, authenticated;
create trigger master_mix_versions_request_invoices
  after update of decision on public.master_mix_versions
  for each row execute function public.request_master_invoices();

-- 3 --------------------------------------------------------------------------

create table public.contact_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contact_id uuid not null,
  iban text not null,
  bic text,
  holder text not null,
  -- 'link': given by the contact on their private link; 'member': typed
  -- by a member (an invoice received another way).
  source text not null default 'link',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  -- Confirmed by the direction, by phone, before any payment (verified_by
  -- null: the contact's first RIB, given on their own link).
  verified_at timestamptz,
  verified_by uuid references public.people (id),
  -- A newer account confirmed took its place.
  superseded_at timestamptz,
  constraint contact_bank_accounts_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade,
  constraint contact_bank_accounts_iban_check check (public.iban_valid(iban)),
  constraint contact_bank_accounts_bic_check
    check (bic is null or bic ~ '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  constraint contact_bank_accounts_holder_check
    check (btrim(holder) <> '' and char_length(holder) <= 200),
  constraint contact_bank_accounts_source_check check (source in ('link', 'member'))
);
create index contact_bank_accounts_contact_idx
  on public.contact_bank_accounts (contact_id, created_at desc);

alter table public.contact_bank_accounts enable row level security;
alter table public.contact_bank_accounts force row level security;
revoke all on table public.contact_bank_accounts from anon, authenticated;
grant select on public.contact_bank_accounts to authenticated;
-- The direction alone reads a RIB: never the owner, never the API for
-- anyone else.
create policy contact_bank_accounts_select_direction on public.contact_bank_accounts
  for select to authenticated using (public.is_direction(organization_id));

-- What anyone of the project may know of a contact's RIB: none, verified,
-- or a new one to confirm (never a digit).
create or replace function public.contact_bank_state(p_contact_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.network_contacts c
                      where c.id = p_contact_id and public.is_active_member(c.organization_id))
      then null
    when exists (select 1 from public.contact_bank_accounts a
                  where a.contact_id = p_contact_id and a.verified_at is null
                    and a.superseded_at is null) then 'pending'
    when exists (select 1 from public.contact_bank_accounts a
                  where a.contact_id = p_contact_id and a.verified_at is not null
                    and a.superseded_at is null) then 'verified'
    else 'none' end;
$$;
revoke execute on function public.contact_bank_state(uuid) from public, anon;
grant execute on function public.contact_bank_state(uuid) to authenticated;

-- The masked account (« FR76 •••• •••• 4567 »).
create or replace function public.mask_iban(p_iban text)
returns text
language sql
immutable
set search_path = ''
as $$
  select substr(p_iban, 1, 4) || ' •••• •••• ' || right(p_iban, 4);
$$;
revoke execute on function public.mask_iban(text) from public, anon, authenticated;

-- « Confirmer le nouveau RIB »: the direction called the contact at the
-- number of their Network card; the box is checked, or it is refused.
create or replace function public.confirm_contact_bank_account(p_account_id uuid, p_phone_checked boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.contact_bank_accounts%rowtype;
begin
  select * into v from public.contact_bank_accounts where id = p_account_id for update;
  if not found or not public.is_direction(v.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_phone_checked is distinct from true then
    raise exception 'phone_check_required' using errcode = '23514';
  end if;
  if v.verified_at is not null or v.superseded_at is not null then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;
  update public.contact_bank_accounts set superseded_at = now()
   where contact_id = v.contact_id and id <> v.id and superseded_at is null;
  update public.contact_bank_accounts
     set verified_at = now(), verified_by = public.auth_person_id()
   where id = v.id;
end;
$$;
revoke execute on function public.confirm_contact_bank_account(uuid, boolean) from public, anon;
grant execute on function public.confirm_contact_bank_account(uuid, boolean) to authenticated;

-- 4 --------------------------------------------------------------------------

create table public.master_payment_proofs (
  invoice_id uuid primary key references public.master_invoices (id) on delete cascade,
  organization_id uuid not null,
  path text not null,
  file_name text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_payment_proofs_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255)
);
alter table public.master_payment_proofs enable row level security;
alter table public.master_payment_proofs force row level security;
revoke all on table public.master_payment_proofs from anon, authenticated;
grant select on public.master_payment_proofs to authenticated;
create policy master_payment_proofs_select_direction on public.master_payment_proofs
  for select to authenticated using (public.is_direction(organization_id));

-- 5 --------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('master-finance', 'master-finance', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create table public.master_finance_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null references public.master_invoices (id) on delete cascade,
  -- 'invoice' (the engineer or the owner), 'proof' (the direction).
  kind text not null,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint master_finance_slots_path_key unique (path),
  constraint master_finance_slots_kind_check check (kind in ('invoice', 'proof'))
);
create index master_finance_slots_invoice_idx on public.master_finance_slots (invoice_id, created_at desc);
alter table public.master_finance_slots enable row level security;
alter table public.master_finance_slots force row level security;
revoke all on table public.master_finance_slots from anon, authenticated;

create or replace function public.is_open_finance_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_finance_slots s
                  where s.path = p_path and s.used_at is null and s.expires_at > now());
$$;
revoke execute on function public.is_open_finance_slot(text) from public;
grant execute on function public.is_open_finance_slot(text) to anon, authenticated;

-- Reading a file follows its row: an invoice, its readers; a proof, the
-- direction.
create or replace function public.master_finance_readable(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_invoices i
                  where i.file_path = p_path and public.can_see_project(i.project_id)
                    and public.can_read_project_budget(i.project_id))
      or exists (select 1 from public.master_payment_proofs p
                  where p.path = p_path and public.is_direction(p.organization_id));
$$;
revoke execute on function public.master_finance_readable(text) from public, anon;
grant execute on function public.master_finance_readable(text) to authenticated;

create policy master_finance_objects_insert_slot on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'master-finance' and public.is_open_finance_slot(objects.name));
create policy master_finance_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'master-finance' and public.master_finance_readable(objects.name));

-- A slot in the bucket: <org>/<invoice>/<uuid>.<ext>, valid thirty minutes.
create or replace function public.open_master_finance_slot_row(
  p_invoice public.master_invoices, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ext text := lower(coalesce(p_ext, ''));
  v_path text;
begin
  if (p_kind = 'invoice' and v_ext <> 'pdf')
     or (p_kind = 'proof' and v_ext not in ('pdf', 'png', 'jpg', 'jpeg')) then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if (select count(*) from public.master_finance_slots s
       where s.invoice_id = p_invoice.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits' using errcode = 'P0001';
  end if;
  v_path := p_invoice.organization_id || '/' || p_invoice.id || '/' || gen_random_uuid() || '.' || v_ext;
  insert into public.master_finance_slots (organization_id, invoice_id, kind, path, expires_at)
  values (p_invoice.organization_id, p_invoice.id, p_kind, v_path, now() + interval '30 minutes');
  return v_path;
end;
$$;
revoke execute on function public.open_master_finance_slot_row(public.master_invoices, text, text)
  from public, anon, authenticated;

-- The slot used and the object there, of the right kind: its size.
create or replace function public.take_master_finance_slot(
  p_invoice_id uuid, p_kind text, p_path text, p_mime text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.master_finance_slots%rowtype;
  v_bytes bigint;
begin
  select * into v_slot from public.master_finance_slots
   where path = p_path and invoice_id = p_invoice_id and kind = p_kind for update;
  if not found or v_slot.used_at is not null then
    raise exception 'slot_unknown' using errcode = 'P0001';
  end if;
  select (o.metadata ->> 'size')::bigint into v_bytes
    from storage.objects o where o.bucket_id = 'master-finance' and o.name = p_path;
  if v_bytes is null then
    raise exception 'file_missing' using errcode = 'P0001';
  end if;
  if (p_kind = 'invoice' and p_mime is distinct from 'application/pdf')
     or (p_kind = 'proof' and coalesce(p_mime, '') not in ('application/pdf', 'image/png', 'image/jpeg')) then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  update public.master_finance_slots set used_at = now() where id = v_slot.id;
  return v_bytes;
end;
$$;
revoke execute on function public.take_master_finance_slot(uuid, text, text, text)
  from public, anon, authenticated;

-- The invoice an engineer's link answers to (null: none requested yet).
create or replace function public.master_invoice_of_link(p_link_hash text)
returns public.master_invoices
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_t public.master_transmissions%rowtype;
  v public.master_invoices%rowtype;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_t from public.master_transmissions
   where token_hash = p_link_hash and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  select * into v from public.master_invoices
   where project_id = v_t.project_id and contact_id = v_t.contact_id;
  return v;
end;
$$;
revoke execute on function public.master_invoice_of_link(text) from public, anon, authenticated;

-- A RIB given with an invoice. The contact's first one, on their own link,
-- is kept as their card's; any other waits for the direction's phone call
-- (a former unconfirmed one is replaced by it), and the direction is told.
create or replace function public.add_contact_bank_account(
  p_invoice public.master_invoices, p_source text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_iban text := nullif(upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g')), '');
  v_bic text := nullif(upper(regexp_replace(coalesce(p_bic, ''), '\s', '', 'g')), '');
  v_holder text := nullif(btrim(coalesce(p_holder, '')), '');
  v_first boolean;
begin
  if v_iban is null or not public.iban_valid(v_iban) then
    raise exception 'invalid_iban' using errcode = '23514';
  end if;
  if v_bic is not null and v_bic !~ '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$' then
    raise exception 'invalid_bic' using errcode = '23514';
  end if;
  if v_holder is null or char_length(v_holder) > 200 then
    raise exception 'holder_required' using errcode = '23514';
  end if;
  v_first := p_source = 'link' and not exists (
    select 1 from public.contact_bank_accounts a where a.contact_id = p_invoice.contact_id);
  update public.contact_bank_accounts set superseded_at = now()
   where contact_id = p_invoice.contact_id and verified_at is null and superseded_at is null;
  insert into public.contact_bank_accounts
    (organization_id, contact_id, iban, bic, holder, source, created_by, verified_at)
  values (p_invoice.organization_id, p_invoice.contact_id, v_iban, v_bic, v_holder, p_source,
          public.auth_person_id(), case when v_first then now() end);
  if not v_first then
    update public.master_invoices set bank_changed = true where id = p_invoice.id;
    perform public.notify_direction(p_invoice.organization_id, 'master_bank_details_changed',
                                    p_invoice.project_id, p_invoice.id, public.auth_person_id());
  end if;
end;
$$;
revoke execute on function public.add_contact_bank_account(public.master_invoices, text, text, text, text)
  from public, anon, authenticated;

-- 6. The engineer's side (link) ------------------------------------------------

-- « Votre facture »: null until PDS asks for it.
create function public._get_master_invoice_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype := public.master_invoice_of_link(p_link_hash);
  v_current public.contact_bank_accounts%rowtype;
  v_pending boolean;
begin
  if v.id is null then
    return null;
  end if;
  select * into v_current from public.contact_bank_accounts
   where contact_id = v.contact_id and verified_at is not null and superseded_at is null
   order by verified_at desc limit 1;
  v_pending := exists (select 1 from public.contact_bank_accounts
                        where contact_id = v.contact_id and verified_at is null
                          and superseded_at is null);
  return jsonb_build_object(
    'state', case when v.paid_at is not null then 'paid'
                  when v.received_at is not null then 'received' else 'requested' end,
    'requestedAt', v.requested_at,
    'billTo', (select jsonb_build_object('legalName', b.legal_name, 'address', b.address,
                                         'siret', b.siret, 'vat', b.vat_number)
                 from public.organization_billing b where b.organization_id = v.organization_id),
    'expected', public.master_invoice_expected(v.project_id, v.contact_id),
    'rib', case when v_current.id is null then null
                else jsonb_build_object('masked', public.mask_iban(v_current.iban),
                                        'holder', v_current.holder) end,
    'ribPending', v_pending,
    'number', v.number,
    'amountCents', v.amount_cents,
    'receivedAt', v.received_at,
    'paidOn', v.paid_on);
end;
$$;
revoke execute on function public._get_master_invoice_h(text) from public, anon, authenticated;

create function public.get_master_invoice(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public._get_master_invoice_h(public.link_token_hash(p_token));
end;
$$;
revoke execute on function public.get_master_invoice(text) from public;
grant execute on function public.get_master_invoice(text) to anon, authenticated;

create function public.get_master_invoice(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public._get_master_invoice_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$$;
revoke execute on function public.get_master_invoice(text, uuid) from public;
grant execute on function public.get_master_invoice(text, uuid) to anon, authenticated;

-- « La facture (PDF) »: a one-time path where the browser uploads it.
create function public._open_master_invoice_slot_h(p_link_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype := public.master_invoice_of_link(p_link_hash);
begin
  if v.id is null then
    raise exception 'invoice_not_requested' using errcode = 'P0001';
  end if;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  return public.open_master_finance_slot_row(v, 'invoice', 'pdf');
end;
$$;
revoke execute on function public._open_master_invoice_slot_h(text) from public, anon, authenticated;

create function public.open_master_invoice_slot(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._open_master_invoice_slot_h(public.link_token_hash(p_token));
end;
$$;
revoke execute on function public.open_master_invoice_slot(text) from public;
grant execute on function public.open_master_invoice_slot(text) to anon, authenticated;

create function public.open_master_invoice_slot(p_contact_token text, p_item_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._open_master_invoice_slot_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$$;
revoke execute on function public.open_master_invoice_slot(text, uuid) from public;
grant execute on function public.open_master_invoice_slot(text, uuid) to anon, authenticated;

-- The amount checked against the rate committed: a different one says why.
create or replace function public.check_master_invoice_amount(
  p_invoice public.master_invoices, p_amount_cents bigint, p_reason text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_expected bigint := (public.master_invoice_expected(p_invoice.project_id, p_invoice.contact_id)
                        ->> 'total')::bigint;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_amount_cents is null or p_amount_cents < 1 or p_amount_cents > 100000000 then
    raise exception 'invalid_amount' using errcode = '23514';
  end if;
  if v_expected is not null and p_amount_cents <> v_expected
     and (v_reason is null or char_length(v_reason) > 1000) then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  return case when v_expected is null or p_amount_cents <> v_expected then v_reason end;
end;
$$;
revoke execute on function public.check_master_invoice_amount(public.master_invoices, bigint, text)
  from public, anon, authenticated;

-- The invoice recorded, the budget lines of the roles invoiced, the owner
-- and the direction told.
create or replace function public.record_master_invoice_row(
  p_invoice public.master_invoices, p_via text, p_path text, p_file_name text, p_mime text,
  p_number text, p_amount_cents bigint, p_reason text, p_how text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_number text := nullif(btrim(coalesce(p_number, '')), '');
  v_name text := left(btrim(coalesce(nullif(p_file_name, ''), 'Facture.pdf')), 255);
  v_reason text;
  v_bytes bigint;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
begin
  if v_number is null or char_length(v_number) > 60 then
    raise exception 'number_required' using errcode = '23514';
  end if;
  v_reason := public.check_master_invoice_amount(p_invoice, p_amount_cents, p_reason);
  v_bytes := public.take_master_finance_slot(p_invoice.id, 'invoice', p_path, p_mime);
  update public.master_invoices
     set number = v_number, amount_cents = p_amount_cents, amount_reason = v_reason,
         file_path = p_path, file_name = v_name, file_bytes = v_bytes,
         received_at = now(), received_via = p_via,
         received_by = case when p_via = 'other' then v_actor end,
         received_how = case when p_via = 'other' then nullif(btrim(coalesce(p_how, '')), '') end
   where id = p_invoice.id;
  update public.budget_lines
     set status = 'invoiced', note = 'Facture n° ' || v_number
   where project_id = p_invoice.project_id
     and master_role = any (coalesce(public.master_contact_roles(p_invoice.project_id,
                                                                 p_invoice.contact_id), '{}'))
     and status in ('proposed', 'committed');
  select owner_person_id into v_owner from public.projects where id = p_invoice.project_id;
  if v_owner is not null and v_owner is distinct from v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (p_invoice.organization_id, v_owner, v_actor, 'master_invoice_received',
            p_invoice.project_id, p_invoice.id);
  end if;
  perform public.notify_direction(p_invoice.organization_id, 'master_invoice_received',
                                  p_invoice.project_id, p_invoice.id, v_actor, v_owner);
end;
$$;
revoke execute on function public.record_master_invoice_row(public.master_invoices, text, text, text,
  text, text, bigint, text, text) from public, anon, authenticated;

-- « Envoyer ma facture » (the engineer, by their link): the PDF uploaded,
-- the number, the amount (why it differs), and a new RIB if theirs changed
-- (or the first one: a RIB is needed to be paid).
create function public._submit_master_invoice_h(
  p_link_hash text, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype := public.master_invoice_of_link(p_link_hash);
  v_iban text := nullif(upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g')), '');
  v_bic text := nullif(upper(regexp_replace(coalesce(p_bic, ''), '\s', '', 'g')), '');
  v_holder text := nullif(btrim(coalesce(p_holder, '')), '');
begin
  if v.id is null then
    raise exception 'invoice_not_requested' using errcode = 'P0001';
  end if;
  select * into v from public.master_invoices where id = v.id for update;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  if v_iban is null and not exists (select 1 from public.contact_bank_accounts a
                                     where a.contact_id = v.contact_id and a.superseded_at is null) then
    raise exception 'rib_required' using errcode = '23514';
  end if;
  if v_iban is not null and not public.iban_valid(v_iban) then
    raise exception 'invalid_iban' using errcode = '23514';
  end if;
  perform public.record_master_invoice_row(v, 'link', p_path, p_file_name, p_mime, p_number,
                                           p_amount_cents, p_reason, null);
  if v_iban is not null then
    perform public.add_contact_bank_account(v, 'link', v_iban, v_bic, v_holder);
  end if;
end;
$$;
revoke execute on function public._submit_master_invoice_h(text, text, text, text, text, bigint, text,
  text, text, text) from public, anon, authenticated;

create function public.submit_master_invoice(
  p_token text, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._submit_master_invoice_h(public.link_token_hash(p_token), p_path, p_file_name,
    p_mime, p_number, p_amount_cents, p_reason, p_iban, p_bic, p_holder);
end;
$$;
revoke execute on function public.submit_master_invoice(text, text, text, text, text, bigint, text,
  text, text, text) from public;
grant execute on function public.submit_master_invoice(text, text, text, text, text, bigint, text,
  text, text, text) to anon, authenticated;

create function public.submit_master_invoice(
  p_contact_token text, p_item_id uuid, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._submit_master_invoice_h(public.contact_item_hash('master', p_contact_token, p_item_id),
    p_path, p_file_name, p_mime, p_number, p_amount_cents, p_reason, p_iban, p_bic, p_holder);
end;
$$;
revoke execute on function public.submit_master_invoice(text, uuid, text, text, text, text, bigint,
  text, text, text, text) from public;
grant execute on function public.submit_master_invoice(text, uuid, text, text, text, text, bigint,
  text, text, text, text) to anon, authenticated;

-- 7. The team's side -----------------------------------------------------------

-- A slot for the owner (an invoice received another way) or the direction
-- (the proof of the transfer).
create or replace function public.open_master_finance_slot(p_invoice_id uuid, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype;
begin
  select * into v from public.master_invoices where id = p_invoice_id;
  if not found
     or (p_kind = 'invoice' and not public.is_project_owner(v.project_id))
     or (p_kind = 'proof' and not public.is_direction(v.organization_id))
     or p_kind not in ('invoice', 'proof') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind = 'invoice' and v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  if p_kind = 'proof' and (v.received_at is null or v.paid_at is not null) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  return public.open_master_finance_slot_row(v, p_kind, p_ext);
end;
$$;
revoke execute on function public.open_master_finance_slot(uuid, text, text) from public, anon;
grant execute on function public.open_master_finance_slot(uuid, text, text) to authenticated;

-- « Ajouter une facture reçue autrement » (the owner), with the engineer's
-- RIB when PDS has none, or a new one: always confirmed by the direction.
create or replace function public.record_master_invoice_other(
  p_invoice_id uuid, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_how text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype;
begin
  select * into v from public.master_invoices where id = p_invoice_id for update;
  if not found or not public.is_project_owner(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_iban, '')), '') is null
     and not exists (select 1 from public.contact_bank_accounts a
                      where a.contact_id = v.contact_id and a.superseded_at is null) then
    raise exception 'rib_required' using errcode = '23514';
  end if;
  if nullif(btrim(coalesce(p_iban, '')), '') is not null
     and not public.iban_valid(upper(regexp_replace(p_iban, '\s', '', 'g'))) then
    raise exception 'invalid_iban' using errcode = '23514';
  end if;
  perform public.record_master_invoice_row(v, 'other', p_path, p_file_name, p_mime, p_number,
                                           p_amount_cents, p_reason, p_how);
  if nullif(btrim(coalesce(p_iban, '')), '') is not null then
    perform public.add_contact_bank_account(v, 'member', p_iban, p_bic, p_holder);
  end if;
end;
$$;
revoke execute on function public.record_master_invoice_other(uuid, text, text, text, text, bigint,
  text, text, text, text, text) from public, anon;
grant execute on function public.record_master_invoice_other(uuid, text, text, text, text, bigint,
  text, text, text, text, text) to authenticated;

-- « Marquer comme payée » (the direction): the transfer was made from the
-- bank, on a confirmed RIB; its date and proof noted. PDS OS pays nothing.
create or replace function public.pay_master_invoice(
  p_invoice_id uuid, p_paid_on date, p_path text, p_file_name text, p_mime text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_invoices%rowtype;
  v_actor uuid := public.auth_person_id();
  v_owner uuid;
begin
  select * into v from public.master_invoices where id = p_invoice_id for update;
  if not found or not public.is_direction(v.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.received_at is null or v.paid_at is not null then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if public.contact_bank_state(v.contact_id) is distinct from 'verified' then
    raise exception 'rib_unverified' using errcode = 'P0001';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Europe/Paris')::date
     or p_paid_on < (v.received_at at time zone 'Europe/Paris')::date - 1 then
    raise exception 'invalid_date' using errcode = '23514';
  end if;
  perform public.take_master_finance_slot(v.id, 'proof', p_path, p_mime);
  insert into public.master_payment_proofs (invoice_id, organization_id, path, file_name, created_by)
  values (v.id, v.organization_id, p_path,
          left(btrim(coalesce(nullif(p_file_name, ''), 'Preuve')), 255), v_actor);
  update public.master_invoices set paid_on = p_paid_on, paid_at = now(), paid_by = v_actor
   where id = v.id;
  update public.budget_lines set status = 'paid', note = 'Facture n° ' || v.number || ' payée'
   where project_id = v.project_id
     and master_role = any (coalesce(public.master_contact_roles(v.project_id, v.contact_id), '{}'))
     and status = 'invoiced';
  select owner_person_id into v_owner from public.projects where id = v.project_id;
  if v_owner is not null and v_owner is distinct from v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_owner, v_actor, 'master_invoice_paid', v.project_id, v.id);
  end if;
end;
$$;
revoke execute on function public.pay_master_invoice(uuid, date, text, text, text) from public, anon;
grant execute on function public.pay_master_invoice(uuid, date, text, text, text) to authenticated;
