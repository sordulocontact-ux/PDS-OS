-- The finances, unified (20/10/2026, docs/ARCHITECTURE.md § 8 ter « Factures »).
--
-- Two invoice systems had been coded side by side: the engineer's (Master,
-- 20261020010101: master_invoices, RIB, proof, budget lines « Facturé » then
-- « Payé ») and the one of a person paid by their signed contract (Juridique,
-- 20261020030301: legal_invoices on a financial need). One now holds every
-- invoice of an external person on a project:
--
-- * project_invoices: one row per invoice asked, whatever asks it — the Master
--   final validated (origin 'master': the engineer's rates), a paid contract
--   signed (origin 'contract': its financial need). Deposited on the person's
--   private link (/m, /c) or added by the team « reçue autrement »; the amount
--   compared to what was agreed (a gap says why); due 30 days after receipt;
--   « Marquer comme payée » by the direction alone, on a RIB it confirmed, with
--   the day and the proof of the transfer. PDS OS never makes a transfer.
-- * One « Facturer à » (organization_billing), one RIB per contact
--   (contact_bank_accounts, the direction alone reads the digits).
-- * The budget follows the invoice: budget_lines.invoice_id; a contract's fee
--   gets its line (Engagé) when the contract is signed; at receipt the lines
--   take the invoiced amount (Facturé, the amount agreed kept in
--   committed_cents), then « Payé ». Never counted twice: the invoice moves
--   its lines, it is never added beside them.
-- * Files in the private bucket project-invoices through one-time slots; the
--   former buckets stay readable through the rows that point at them.
-- The former tables are kept with their data (never dropped) and no longer
-- written; their public functions keep their signatures over this table
-- (20261020060201).

-- 0 -----------------------------------------------------------------------------

select public.add_notification_kinds(array['legal_invoice_bank_changed']);

-- 1. The invoices -----------------------------------------------------------------

create table public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  contact_id uuid not null,
  -- What it pays: the engineer's Master ('master'), a signed contract's fee
  -- ('contract', through its financial need).
  origin text not null,
  financial_need_id uuid references public.financial_needs (id) on delete cascade,
  contract_id uuid,
  requested_at timestamptz not null default now(),
  number text,
  amount_cents bigint,
  -- Why the amount differs from what was agreed (required then).
  gap_reason text,
  file_bucket text,
  file_path text,
  file_name text,
  file_bytes bigint,
  received_at timestamptz,
  -- The day it arrived (Paris), and the one it is to be paid before.
  received_on date,
  due_on date,
  -- 'link': deposited by the person; 'team': received otherwise, added.
  received_via text,
  received_by uuid references public.people (id),
  received_how text,
  -- A new RIB came with it (its digits are in contact_bank_accounts).
  bank_changed boolean not null default false,
  paid_on date,
  paid_at timestamptz,
  paid_by uuid references public.people (id),
  proof_bucket text,
  proof_path text,
  proof_name text,
  created_at timestamptz not null default now(),
  constraint project_invoices_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint project_invoices_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint project_invoices_origin_check check (
    (origin = 'master' and financial_need_id is null)
    or (origin = 'contract' and financial_need_id is not null and contract_id is not null)),
  constraint project_invoices_need_key unique (financial_need_id),
  constraint project_invoices_number_check
    check (number is null or (btrim(number) <> '' and char_length(number) <= 100)),
  constraint project_invoices_amount_check
    check (amount_cents is null or amount_cents between 1 and 100000000),
  constraint project_invoices_gap_check
    check (gap_reason is null or (btrim(gap_reason) <> '' and char_length(gap_reason) <= 2000)),
  constraint project_invoices_how_check
    check (received_how is null or (btrim(received_how) <> '' and char_length(received_how) <= 200)),
  constraint project_invoices_via_check check (received_via is null or received_via in ('link', 'team')),
  constraint project_invoices_received_check check (
    (received_at is null) = (received_via is null)
    and (received_at is null) = (received_on is null)
    and (received_at is null) = (due_on is null)
    and (received_at is null or (number is not null and amount_cents is not null
                                 and file_path is not null and file_bucket is not null))),
  constraint project_invoices_due_check check (due_on is null or due_on >= received_on),
  constraint project_invoices_paid_check check (
    (paid_at is null) = (paid_on is null)
    and (paid_at is null) = (proof_path is null)
    and (paid_at is null or received_at is not null))
);
create unique index project_invoices_master_key
  on public.project_invoices (project_id, contact_id) where origin = 'master';
create index project_invoices_project_idx on public.project_invoices (project_id, requested_at);
create index project_invoices_to_pay_idx
  on public.project_invoices (organization_id, due_on) where received_at is not null and paid_at is null;

alter table public.project_invoices enable row level security;
alter table public.project_invoices force row level security;
revoke all on table public.project_invoices from anon, authenticated;
grant select on public.project_invoices to authenticated;
-- The owner and the direction read it, like the budget; every write goes
-- through the functions below.
create policy project_invoices_select on public.project_invoices
  for select to authenticated
  using (public.can_see_project(project_id) and public.can_read_project_budget(project_id));

create trigger zz_project_live after insert or update or delete on public.project_invoices
  for each row execute function public.project_live_tick('project');

comment on table public.master_invoices is
  'Superseded by project_invoices (20261020060101): kept with its data, no longer written.';
comment on table public.legal_invoices is
  'Superseded by project_invoices (20261020060101): kept with its data, no longer written.';
comment on table public.master_payment_proofs is
  'Superseded by project_invoices.proof_* (20261020060101): kept, no longer written.';

-- 2. The budget follows the invoice ----------------------------------------------

alter table public.budget_lines
  add column invoice_id uuid references public.project_invoices (id) on delete set null,
  -- The amount agreed, kept when the invoice changed the line's amount.
  add column committed_cents bigint;
alter table public.budget_lines add constraint budget_lines_committed_check
  check (committed_cents is null or committed_cents >= 0);
create index budget_lines_invoice_idx on public.budget_lines (invoice_id) where invoice_id is not null;

-- A line that follows an invoice is moved by the invoice alone: the owner
-- edits its label or family, never its amount, state, nor deletes it.
create or replace function public.budget_line_follows_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or old.invoice_id is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE'
     or new.status is distinct from old.status
     or new.amount_cents is distinct from old.amount_cents then
    raise exception 'line_follows_invoice' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.budget_line_follows_invoice() from public, anon, authenticated;
create trigger budget_lines_follow_invoice before update or delete on public.budget_lines
  for each row execute function public.budget_line_follows_invoice();

-- The amount committed for an engineer: the amount agreed of their roles'
-- lines, even once an invoice changed them.
create or replace function public.master_invoice_expected(p_project_id uuid, p_contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 0 then null else jsonb_build_object(
           'total', sum(coalesce(l.committed_cents, l.amount_cents)),
           'mix', sum(coalesce(l.committed_cents, l.amount_cents)) filter (where l.master_role = 'mix'),
           'mastering', sum(coalesce(l.committed_cents, l.amount_cents))
                          filter (where l.master_role = 'mastering')) end
    from public.budget_lines l
   where l.project_id = p_project_id
     and l.master_role = any (coalesce(public.master_contact_roles(p_project_id, p_contact_id), '{}'))
     and l.status in ('committed', 'invoiced', 'paid');
$$;
revoke execute on function public.master_invoice_expected(uuid, uuid) from public, anon, authenticated;

-- What was agreed for an invoice: the engineer's rates, or the contract's fee.
create or replace function public.project_invoice_expected(p_invoice public.project_invoices)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_invoice.origin = 'master'
              then public.master_invoice_expected(p_invoice.project_id, p_invoice.contact_id)
              else (select jsonb_build_object('total', n.amount_cents)
                      from public.financial_needs n where n.id = p_invoice.financial_need_id) end;
$$;
revoke execute on function public.project_invoice_expected(public.project_invoices)
  from public, anon, authenticated;

-- The lines an engineer's invoice moves: their roles' (linked once).
create or replace function public.link_master_invoice_lines(p_invoice public.project_invoices)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.budget_lines set invoice_id = p_invoice.id
   where project_id = p_invoice.project_id and invoice_id is null
     and master_role = any (coalesce(public.master_contact_roles(p_invoice.project_id,
                                                                 p_invoice.contact_id), '{}'));
$$;
revoke execute on function public.link_master_invoice_lines(public.project_invoices)
  from public, anon, authenticated;

-- Received: the lines take the invoiced amount (shared by what each one had
-- agreed, the last one keeping the rounding); paid: « Payé ».
create or replace function public.apply_invoice_to_budget(p_invoice public.project_invoices)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_count integer;
  v_left bigint := p_invoice.amount_cents;
  v_i integer := 0;
  v_share bigint;
  r record;
begin
  if p_invoice.origin = 'master' then
    perform public.link_master_invoice_lines(p_invoice);
  end if;
  if p_invoice.paid_at is not null then
    update public.budget_lines set status = 'paid', note = 'Facture n° ' || p_invoice.number || ' payée'
     where invoice_id = p_invoice.id;
    return;
  end if;
  if p_invoice.received_at is null then
    return;
  end if;
  select sum(coalesce(committed_cents, amount_cents)), count(*) into v_total, v_count
    from public.budget_lines where invoice_id = p_invoice.id;
  for r in select id, coalesce(committed_cents, amount_cents) as agreed
             from public.budget_lines where invoice_id = p_invoice.id
            order by master_role nulls last, created_at, id loop
    v_i := v_i + 1;
    v_share := case when v_i = v_count then v_left
                    when coalesce(v_total, 0) = 0 then 0
                    else round(p_invoice.amount_cents::numeric * r.agreed / v_total)::bigint end;
    v_left := v_left - v_share;
    update public.budget_lines
       set committed_cents = case when v_share <> r.agreed then r.agreed end,
           amount_cents = v_share, status = 'invoiced', note = 'Facture n° ' || p_invoice.number
     where id = r.id;
  end loop;
end;
$$;
revoke execute on function public.apply_invoice_to_budget(public.project_invoices)
  from public, anon, authenticated;

-- 3. Asked by PDS OS -----------------------------------------------------------------

-- Each external engineer once every title of the round has its Master final
-- (the invoice never blocks the release). External: they received a link.
create or replace function public.request_master_invoices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
begin
  if new.stage <> 'mastering' or new.decision is distinct from 'approved'
     or old.decision is not distinct from 'approved' then
    return null;
  end if;
  if exists (
    select 1 from public.project_masters pm
     where pm.project_id = new.project_id
       and exists (select 1 from public.master_mix_versions mv
                    where mv.project_id = new.project_id and mv.master_id = pm.master_id)
       and not exists (select 1 from public.master_mix_versions mv
                        where mv.project_id = new.project_id and mv.master_id = pm.master_id
                          and mv.stage = 'mastering' and mv.decision = 'approved')) then
    return null;
  end if;
  for v in
    insert into public.project_invoices (organization_id, project_id, contact_id, origin)
    select distinct t.organization_id, t.project_id, t.contact_id, 'master'
      from public.master_transmissions t
     where t.project_id = new.project_id
       and cardinality(coalesce(public.master_contact_roles(t.project_id, t.contact_id), '{}')) > 0
    on conflict (project_id, contact_id) where origin = 'master' do nothing
    returning *
  loop
    perform public.link_master_invoice_lines(v);
  end loop;
  return null;
end;
$$;
revoke execute on function public.request_master_invoices() from public, anon, authenticated;

-- A paid contract signed: its invoice is asked, its fee enters the budget
-- (Engagé), once.
create or replace function public.request_contract_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_label text;
begin
  if new.project_id is null then
    return null;
  end if;
  insert into public.project_invoices
    (organization_id, project_id, contact_id, origin, financial_need_id, contract_id, requested_at)
  values (new.organization_id, new.project_id, new.contact_id, 'contract', new.id, new.contract_id,
          new.created_at)
  on conflict (financial_need_id) do nothing
  returning id into v_id;
  if v_id is null then
    return null;
  end if;
  -- The contract's title, with the person's name when it does not say it.
  select left(case when position(c.name in k.title) > 0 then k.title
                   else c.name || ' · ' || k.title end, 200) into v_label
    from public.network_contacts c, public.contracts k
   where c.id = new.contact_id and k.id = new.contract_id;
  insert into public.budget_lines
    (organization_id, project_id, label, amount_cents, status, family, note, invoice_id)
  values (new.organization_id, new.project_id, coalesce(v_label, 'Contrat'), new.amount_cents,
          'committed', 'services', 'Contrat signé · facture attendue', v_id);
  return null;
end;
$$;
revoke execute on function public.request_contract_invoice() from public, anon, authenticated;
create trigger z_request_invoice after insert on public.financial_needs
  for each row execute function public.request_contract_invoice();

-- 4. Files -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-invoices', 'project-invoices', false, 20971520,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create table public.project_invoice_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null references public.project_invoices (id) on delete cascade,
  -- 'invoice' (the person or the team), 'proof' (the direction).
  kind text not null,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint project_invoice_slots_path_key unique (path),
  constraint project_invoice_slots_kind_check check (kind in ('invoice', 'proof'))
);
create index project_invoice_slots_invoice_idx
  on public.project_invoice_slots (invoice_id, created_at desc);
alter table public.project_invoice_slots enable row level security;
alter table public.project_invoice_slots force row level security;
revoke all on table public.project_invoice_slots from anon, authenticated;

create or replace function public.is_open_invoice_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_invoice_slots s
                  where s.path = p_path and s.used_at is null and s.expires_at > now());
$$;
revoke execute on function public.is_open_invoice_slot(text) from public;
grant execute on function public.is_open_invoice_slot(text) to anon, authenticated;

-- Reading a file follows its row: an invoice, its readers (the owner and
-- the direction); a proof of transfer, the direction.
create or replace function public.project_invoice_file_readable(p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_invoices i
                  where i.file_bucket = p_bucket and i.file_path = p_path
                    and public.can_see_project(i.project_id)
                    and public.can_read_project_budget(i.project_id))
      or exists (select 1 from public.project_invoices i
                  where i.proof_bucket = p_bucket and i.proof_path = p_path
                    and public.is_direction(i.organization_id)
                    and public.can_see_project(i.project_id));
$$;
revoke execute on function public.project_invoice_file_readable(text, text) from public, anon;
grant execute on function public.project_invoice_file_readable(text, text) to authenticated;

create policy project_invoices_objects_insert_slot on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'project-invoices' and public.is_open_invoice_slot(objects.name));
create policy project_invoices_objects_select on storage.objects
  for select to authenticated
  using (bucket_id in ('project-invoices', 'master-finance', 'legal-invoices')
         and public.project_invoice_file_readable(bucket_id, objects.name));

-- A slot: <org>/<project>/<invoice>/<uuid>.<ext>, thirty minutes. An invoice
-- is a PDF; a proof, a PDF or a capture of the bank.
create or replace function public.project_invoice_slot(
  p_invoice public.project_invoices, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ext text := lower(btrim(coalesce(p_ext, '')));
  v_path text;
begin
  if (p_kind = 'invoice' and v_ext <> 'pdf')
     or (p_kind = 'proof' and v_ext not in ('pdf', 'png', 'jpg', 'jpeg'))
     or p_kind not in ('invoice', 'proof') then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if (select count(*) from public.project_invoice_slots s
       where s.invoice_id = p_invoice.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits' using errcode = 'P0001';
  end if;
  v_path := p_invoice.organization_id || '/' || p_invoice.project_id || '/' || p_invoice.id || '/'
            || gen_random_uuid() || '.' || v_ext;
  insert into public.project_invoice_slots (organization_id, invoice_id, kind, path, expires_at)
  values (p_invoice.organization_id, p_invoice.id, p_kind, v_path, now() + interval '30 minutes');
  return v_path;
end;
$$;
revoke execute on function public.project_invoice_slot(public.project_invoices, text, text)
  from public, anon, authenticated;

-- The slot used once, the object there, of the right kind: its size.
create or replace function public.take_invoice_slot(
  p_invoice_id uuid, p_kind text, p_path text, p_mime text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.project_invoice_slots%rowtype;
  v_found boolean;
  v_bytes bigint;
begin
  select * into v_slot from public.project_invoice_slots
   where path = p_path and invoice_id = p_invoice_id and kind = p_kind for update;
  if not found or v_slot.used_at is not null then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  select true, (o.metadata ->> 'size')::bigint into v_found, v_bytes
    from storage.objects o where o.bucket_id = 'project-invoices' and o.name = p_path;
  if v_found is null then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  if (p_kind = 'invoice' and p_mime is distinct from 'application/pdf')
     or (p_kind = 'proof' and coalesce(p_mime, '') not in ('application/pdf', 'image/png', 'image/jpeg')) then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  update public.project_invoice_slots set used_at = now() where id = v_slot.id;
  return v_bytes;
end;
$$;
revoke execute on function public.take_invoice_slot(uuid, text, text, text)
  from public, anon, authenticated;

-- 5. Receipt, RIB, payment (shared) -------------------------------------------------------

-- A RIB given with an invoice. The contact's first one, on their own link,
-- is kept as their card's; any other waits for the direction's phone call
-- (a former unconfirmed one is replaced by it), and the direction is told.
create or replace function public.add_invoice_bank_account(
  p_invoice public.project_invoices, p_source text, p_iban text, p_bic text, p_holder text)
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
    update public.project_invoices set bank_changed = true where id = p_invoice.id;
    perform public.notify_direction(
      p_invoice.organization_id,
      case when p_invoice.origin = 'master' then 'master_bank_details_changed'
           else 'legal_invoice_bank_changed' end,
      p_invoice.project_id,
      case when p_invoice.origin = 'master' then p_invoice.id else p_invoice.contact_id end,
      public.auth_person_id());
  end if;
end;
$$;
revoke execute on function public.add_invoice_bank_account(public.project_invoices, text, text, text, text)
  from public, anon, authenticated;

-- The invoice received, whoever sends it: the file, the number, the amount
-- against what was agreed (a gap says why), a RIB when PDS has none or a new
-- one; then the budget, the contract's money, the journal and who is told.
create or replace function public.record_project_invoice(
  p_invoice public.project_invoices, p_via text, p_path text, p_file_name text, p_mime text,
  p_number text, p_amount_cents bigint, p_reason text, p_received_on date, p_how text,
  p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
  v_number text := nullif(btrim(coalesce(p_number, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_iban text := nullif(btrim(coalesce(p_iban, '')), '');
  v_expected bigint := (public.project_invoice_expected(p_invoice) ->> 'total')::bigint;
  v_bytes bigint;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
  v_master boolean := p_invoice.origin = 'master';
begin
  select * into v from public.project_invoices where id = p_invoice.id for update;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  if v_number is null or char_length(v_number) > 100 then
    raise exception 'number_required' using errcode = '23514';
  end if;
  if p_amount_cents is null or p_amount_cents < 1 or p_amount_cents > 100000000 then
    raise exception 'invalid_amount' using errcode = '23514';
  end if;
  if v_expected is not null and p_amount_cents <> v_expected
     and (v_reason is null or char_length(v_reason) > 2000) then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if v_iban is null and not exists (select 1 from public.contact_bank_accounts a
                                     where a.contact_id = v.contact_id and a.superseded_at is null) then
    raise exception 'rib_required' using errcode = '23514';
  end if;
  if v_iban is not null and not public.iban_valid(upper(regexp_replace(v_iban, '\s', '', 'g'))) then
    raise exception 'invalid_iban' using errcode = '23514';
  end if;
  if p_received_on is null or p_received_on > (now() at time zone 'Europe/Paris')::date
     or p_received_on < (v.requested_at at time zone 'Europe/Paris')::date - 365 then
    raise exception 'invalid_date' using errcode = '23514';
  end if;
  v_bytes := public.take_invoice_slot(v.id, 'invoice', p_path, p_mime);
  update public.project_invoices
     set number = v_number, amount_cents = p_amount_cents,
         gap_reason = case when v_expected is not null and p_amount_cents <> v_expected
                           then left(v_reason, 2000) end,
         file_bucket = 'project-invoices', file_path = p_path,
         file_name = left(btrim(coalesce(nullif(p_file_name, ''), 'Facture.pdf')), 255),
         file_bytes = v_bytes, received_at = now(), received_on = p_received_on,
         due_on = p_received_on + 30, received_via = p_via,
         received_by = case when p_via = 'team' then v_actor end,
         received_how = case when p_via = 'team' then left(nullif(btrim(coalesce(p_how, '')), ''), 200) end
   where id = v.id
  returning * into v;
  if v_iban is not null then
    perform public.add_invoice_bank_account(v, case when p_via = 'link' then 'link' else 'member' end,
                                            v_iban, p_bic, p_holder);
  end if;
  perform public.apply_invoice_to_budget(v);
  if not v_master then
    update public.financial_needs set status = 'invoiced' where id = v.financial_need_id;
    -- The journal says it arrived, never what it says.
    perform public.log_contract_event(v.organization_id, v.contract_id, v.project_id,
                                      'invoice.received', null);
  end if;
  select owner_person_id into v_owner from public.projects where id = v.project_id;
  if v_owner is not null and v_owner is distinct from v_actor then
    perform public.notify(v.organization_id, v_owner,
                          case when v_master then 'master_invoice_received' else 'legal_invoice_received' end,
                          v.project_id, case when v_master then v.id else v.contact_id end);
  end if;
  perform public.notify_direction(
    v.organization_id, case when v_master then 'master_invoice_received' else 'legal_invoice_received' end,
    v.project_id, case when v_master then v.id else v.contact_id end, v_actor, v_owner);
end;
$$;
revoke execute on function public.record_project_invoice(public.project_invoices, text, text, text, text,
  text, bigint, text, date, text, text, text, text) from public, anon, authenticated;

-- 6. The person's side (their private link) ------------------------------------------------

-- Who a private token is: the person's page by project (/c), or an
-- engineer's Master link (/m). Null: closed, expired or unknown.
create or replace function public.invoice_person_of_token(
  p_token text, out project_id uuid, out contact_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_token);
begin
  if v_link.id is not null then
    project_id := v_link.project_id;
    contact_id := v_link.contact_id;
    return;
  end if;
  select t.project_id, t.contact_id into project_id, contact_id
    from public.master_transmissions t
   where t.token_hash = public.link_token_hash(p_token) and t.revoked_at is null
     and t.expires_at > now()
   limit 1;
end;
$$;
revoke execute on function public.invoice_person_of_token(text) from public, anon, authenticated;

-- An invoice of this person on this project (null: not theirs).
create or replace function public.invoice_of_person(p_token text, p_invoice_id uuid)
returns public.project_invoices
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_who record;
  v public.project_invoices%rowtype;
begin
  select * into v_who from public.invoice_person_of_token(p_token);
  if v_who.project_id is null or p_invoice_id is null then
    return null;
  end if;
  select * into v from public.project_invoices
   where id = p_invoice_id and project_id = v_who.project_id and contact_id = v_who.contact_id;
  return v;
end;
$$;
revoke execute on function public.invoice_of_person(text, uuid) from public, anon, authenticated;

-- « Votre facture »: whom to invoice, the person's RIB (masked), and each of
-- their invoices on the project (never another person's).
create or replace function public.person_invoices_json(p_project_id uuid, p_contact_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_current public.contact_bank_accounts%rowtype;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  select * into v_current from public.contact_bank_accounts
   where contact_id = p_contact_id and verified_at is not null and superseded_at is null
   order by verified_at desc limit 1;
  return jsonb_build_object(
    'billTo', (select jsonb_build_object('legalName', coalesce(b.legal_name, o.name),
                                         'address', b.address, 'siret', b.siret, 'vat', b.vat_number)
                 from public.organizations o
                 left join public.organization_billing b on b.organization_id = o.id
                where o.id = v_org),
    'rib', case when v_current.id is null then null
                else jsonb_build_object('masked', public.mask_iban(v_current.iban),
                                        'holder', v_current.holder) end,
    'ribPending', exists (select 1 from public.contact_bank_accounts
                           where contact_id = p_contact_id and verified_at is null
                             and superseded_at is null),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id,
               'origin', i.origin,
               'contract', k.title,
               'state', case when i.paid_at is not null then 'paid'
                             when i.received_at is not null then 'received' else 'requested' end,
               'requestedAt', i.requested_at,
               'expected', public.project_invoice_expected(i),
               'number', i.number,
               'amountCents', i.amount_cents,
               'receivedAt', i.received_at,
               'dueOn', i.due_on,
               'paidOn', i.paid_on) order by i.requested_at, i.id)
        from public.project_invoices i
        left join public.contracts k on k.id = i.contract_id
       where i.project_id = p_project_id and i.contact_id = p_contact_id), '[]'::jsonb));
end;
$$;
revoke execute on function public.person_invoices_json(uuid, uuid) from public, anon, authenticated;

create or replace function public.get_person_invoices(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_who record;
begin
  select * into v_who from public.invoice_person_of_token(p_token);
  if v_who.project_id is null then
    return null;
  end if;
  return public.person_invoices_json(v_who.project_id, v_who.contact_id);
end;
$$;
revoke execute on function public.get_person_invoices(text) from public;
grant execute on function public.get_person_invoices(text) to anon, authenticated;

-- « Envoyer ma facture », step 1: a one-time path for the PDF.
create or replace function public.open_person_invoice_slot(p_token text, p_invoice_id uuid, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.invoice_of_person(p_token, p_invoice_id);
begin
  if v.id is null then
    raise exception 'invoice_link_closed' using errcode = 'P0001';
  end if;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  return public.project_invoice_slot(v, 'invoice', p_ext);
end;
$$;
revoke execute on function public.open_person_invoice_slot(text, uuid, text) from public;
grant execute on function public.open_person_invoice_slot(text, uuid, text) to anon, authenticated;

-- Step 2: the invoice recorded, received today, with a RIB if theirs changed
-- (or the first one: a RIB is needed to be paid).
create or replace function public.submit_person_invoice(
  p_token text, p_invoice_id uuid, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.invoice_of_person(p_token, p_invoice_id);
begin
  if v.id is null then
    raise exception 'invoice_link_closed' using errcode = 'P0001';
  end if;
  perform public.record_project_invoice(
    v, 'link', p_path, p_file_name, p_mime, p_number, p_amount_cents, p_reason,
    (now() at time zone 'Europe/Paris')::date, null, p_iban, p_bic, p_holder);
end;
$$;
revoke execute on function public.submit_person_invoice(text, uuid, text, text, text, text, bigint,
  text, text, text, text) from public;
grant execute on function public.submit_person_invoice(text, uuid, text, text, text, text, bigint,
  text, text, text, text) to anon, authenticated;

-- 7. The team's side ---------------------------------------------------------------------

-- Who adds an invoice received otherwise: the project's owner or the
-- direction. Who pays: the direction alone.
create or replace function public.can_add_project_invoice(p_invoice public.project_invoices)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project(p_invoice.project_id)
     and (public.is_project_owner(p_invoice.project_id) or public.is_direction(p_invoice.organization_id));
$$;
revoke execute on function public.can_add_project_invoice(public.project_invoices)
  from public, anon, authenticated;

-- A slot: the PDF of an invoice received otherwise, or the proof of transfer.
create or replace function public.open_invoice_slot(p_invoice_id uuid, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
begin
  select * into v from public.project_invoices where id = p_invoice_id;
  if not found
     or p_kind not in ('invoice', 'proof')
     or (p_kind = 'invoice' and not public.can_add_project_invoice(v))
     or (p_kind = 'proof' and not (public.is_direction(v.organization_id)
                                   and public.can_see_project(v.project_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind = 'invoice' and v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  if p_kind = 'proof' and (v.received_at is null or v.paid_at is not null) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  return public.project_invoice_slot(v, p_kind, p_ext);
end;
$$;
revoke execute on function public.open_invoice_slot(uuid, text, text) from public, anon;
grant execute on function public.open_invoice_slot(uuid, text, text) to authenticated;

-- « Ajouter une facture reçue autrement » (the owner or the direction), with
-- the person's RIB when PDS has none, or a new one: always confirmed by the
-- direction before any payment.
create or replace function public.add_received_invoice(
  p_invoice_id uuid, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_received_on date, p_how text,
  p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
begin
  select * into v from public.project_invoices where id = p_invoice_id;
  if not found or not public.can_add_project_invoice(v) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.record_project_invoice(
    v, 'team', p_path, p_file_name, p_mime, p_number, p_amount_cents, p_reason,
    coalesce(p_received_on, (now() at time zone 'Europe/Paris')::date), p_how,
    p_iban, p_bic, p_holder);
end;
$$;
revoke execute on function public.add_received_invoice(uuid, text, text, text, text, bigint, text, date,
  text, text, text, text) from public, anon;
grant execute on function public.add_received_invoice(uuid, text, text, text, text, bigint, text, date,
  text, text, text, text) to authenticated;

-- « Marquer comme payée » (the direction): the transfer made from PDS's bank
-- on a confirmed RIB, its day and its proof noted. PDS OS pays nothing.
create or replace function public.pay_invoice(
  p_invoice_id uuid, p_paid_on date, p_path text, p_file_name text, p_mime text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
  v_actor uuid := public.auth_person_id();
  v_owner uuid;
  v_master boolean;
begin
  select * into v from public.project_invoices where id = p_invoice_id for update;
  if not found or not public.is_direction(v.organization_id)
     or not public.can_see_project(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.received_at is null or v.paid_at is not null then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if public.contact_bank_state(v.contact_id) is distinct from 'verified' then
    raise exception 'rib_unverified' using errcode = 'P0001';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Europe/Paris')::date
     or p_paid_on < v.received_on then
    raise exception 'invalid_date' using errcode = '23514';
  end if;
  perform public.take_invoice_slot(v.id, 'proof', p_path, p_mime);
  update public.project_invoices
     set paid_on = p_paid_on, paid_at = now(), paid_by = v_actor,
         proof_bucket = 'project-invoices', proof_path = p_path,
         proof_name = left(btrim(coalesce(nullif(p_file_name, ''), 'Preuve')), 255)
   where id = v.id
  returning * into v;
  perform public.apply_invoice_to_budget(v);
  v_master := v.origin = 'master';
  if not v_master then
    update public.financial_needs set status = 'paid' where id = v.financial_need_id;
    perform public.log_contract_event(v.organization_id, v.contract_id, v.project_id,
                                      'invoice.paid', null);
  end if;
  select owner_person_id into v_owner from public.projects where id = v.project_id;
  if v_owner is not null and v_owner is distinct from v_actor then
    perform public.notify(v.organization_id, v_owner,
                          case when v_master then 'master_invoice_paid' else 'legal_invoice_paid' end,
                          v.project_id, case when v_master then v.id else v.contact_id end);
  end if;
end;
$$;
revoke execute on function public.pay_invoice(uuid, date, text, text, text) from public, anon;
grant execute on function public.pay_invoice(uuid, date, text, text, text) to authenticated;

-- Where each invoice of a project stands, for whoever follows it without
-- reading it (the Juridique, « Prêt pour la sortie »): never the number, the
-- amount nor the file.
create or replace function public.project_invoice_states(p_project_id uuid)
returns table (invoice_id uuid, origin text, contact_id uuid, contact_name text,
               financial_need_id uuid, contract_id uuid, state text, received_on date,
               due_on date, paid_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.origin, i.contact_id, c.name, i.financial_need_id, i.contract_id,
         case when i.paid_at is not null then 'paid'
              when i.received_at is null then 'asked'
              when exists (select 1 from public.contact_bank_accounts a
                            where a.contact_id = i.contact_id and a.verified_at is null
                              and a.superseded_at is null) then 'rib'
              else 'to_pay' end,
         i.received_on, i.due_on, i.paid_on
    from public.project_invoices i
    join public.network_contacts c on c.id = i.contact_id
   where i.project_id = p_project_id
     and public.can_see_project(p_project_id)
     and (public.has_permission(i.organization_id, 'manage_legal')
          or public.can_read_project_budget(p_project_id))
   order by i.requested_at, i.id;
$$;
revoke execute on function public.project_invoice_states(uuid) from public, anon;
grant execute on function public.project_invoice_states(uuid) to authenticated;

-- 8. The data of the two former systems ------------------------------------------------

insert into public.project_invoices
  (id, organization_id, project_id, contact_id, origin, requested_at, number, amount_cents,
   gap_reason, file_bucket, file_path, file_name, file_bytes, received_at, received_on, due_on,
   received_via, received_by, received_how, bank_changed, paid_on, paid_at, paid_by,
   proof_bucket, proof_path, proof_name, created_at)
select m.id, m.organization_id, m.project_id, m.contact_id, 'master', m.requested_at, m.number,
       m.amount_cents, m.amount_reason,
       case when m.file_path is not null then 'master-finance' end, m.file_path, m.file_name,
       m.file_bytes, m.received_at,
       (m.received_at at time zone 'Europe/Paris')::date,
       (m.received_at at time zone 'Europe/Paris')::date + 30,
       case m.received_via when 'link' then 'link' when 'other' then 'team' end,
       m.received_by, m.received_how, m.bank_changed,
       case when p.path is not null then m.paid_on end,
       case when p.path is not null then m.paid_at end,
       case when p.path is not null then m.paid_by end,
       case when p.path is not null then 'master-finance' end, p.path, p.file_name, m.created_at
  from public.master_invoices m
  left join public.master_payment_proofs p on p.invoice_id = m.id
on conflict do nothing;

insert into public.project_invoices
  (id, organization_id, project_id, contact_id, origin, financial_need_id, contract_id,
   requested_at, number, amount_cents, gap_reason, file_bucket, file_path, file_name, file_bytes,
   received_at, received_on, due_on, received_via, received_by, paid_on, paid_at, paid_by,
   proof_bucket, proof_path, proof_name, created_at)
select l.id, l.organization_id, l.project_id, l.contact_id, 'contract', l.financial_need_id,
       l.contract_id, n.created_at, l.number, l.amount_cents, l.gap_reason, 'legal-invoices',
       l.file_path, l.file_name, l.bytes, l.created_at, l.received_on, l.due_on, l.submitted_via,
       l.added_by, l.paid_on, l.paid_at, l.paid_by,
       case when l.paid_proof_path is not null then 'legal-invoices' end, l.paid_proof_path,
       l.paid_proof_name, l.created_at
  from public.legal_invoices l
  join public.financial_needs n on n.id = l.financial_need_id
on conflict do nothing;

-- A signed contract's fee still awaiting its invoice: asked now.
insert into public.project_invoices
  (organization_id, project_id, contact_id, origin, financial_need_id, contract_id, requested_at)
select n.organization_id, n.project_id, n.contact_id, 'contract', n.id, n.contract_id, n.created_at
  from public.financial_needs n
 where n.project_id is not null
on conflict do nothing;

-- The engineers' lines follow their invoice; a contract's fee gets its line.
select public.link_master_invoice_lines(i) from public.project_invoices i where i.origin = 'master';
insert into public.budget_lines
  (organization_id, project_id, label, amount_cents, status, family, note, invoice_id)
select i.organization_id, i.project_id,
       left(case when position(c.name in k.title) > 0 then k.title
                 else c.name || ' · ' || k.title end, 200),
       coalesce(i.amount_cents, n.amount_cents),
       case when i.paid_at is not null then 'paid' when i.received_at is not null then 'invoiced'
            else 'committed' end,
       'services',
       case when i.paid_at is not null then 'Facture n° ' || i.number || ' payée'
            when i.received_at is not null then 'Facture n° ' || i.number
            else 'Contrat signé · facture attendue' end,
       i.id
  from public.project_invoices i
  join public.financial_needs n on n.id = i.financial_need_id
  join public.network_contacts c on c.id = i.contact_id
  join public.contracts k on k.id = i.contract_id
 where i.origin = 'contract'
   and not exists (select 1 from public.budget_lines b where b.invoice_id = i.id);
update public.budget_lines b set committed_cents = n.amount_cents
  from public.project_invoices i join public.financial_needs n on n.id = i.financial_need_id
 where b.invoice_id = i.id and i.origin = 'contract' and b.amount_cents <> n.amount_cents
   and b.committed_cents is null;
