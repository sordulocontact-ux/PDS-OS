-- Juridique, « le reste », J10 (docs/projet-complet/legal.md E11; proto « Projet complet »,
-- scenario legal:invoice): the invoice of a person paid by their signed contract.
--
-- * A signed contract with a fee waits for its invoice (financial_needs, 20261005001001).
--   The person deposits it through their page by project (/c/, project_contact_links,
--   lot 11), without an account: the PDF, its number, its amount excl. tax — compared to the
--   fee agreed, a gap needs its explanation. The direction may add one received otherwise.
-- * Only the direction (permission « validate ») reads an invoice and its file, and marks it
--   paid with the day and the proof of the transfer: PDS OS never makes a transfer. The
--   Juridique sees where each one stands (legal_invoice_states), never its content.
-- * financial_needs.status follows: waiting_for_invoice → invoiced → paid. States of the
--   invoice itself are computed (paid_on), never stored twice.
-- * One invoice per financial need; it goes with its need (on delete cascade), and the need
--   with its project (delete_project_row).
-- * No bank details here: PDS OS keeps no IBAN (decision of 20/10/2026, docs/ARCHITECTURE.md).

select public.add_notification_kinds(array['legal_invoice_received', 'legal_invoice_paid']);

alter table public.contract_events drop constraint contract_events_kind_check;
alter table public.contract_events add constraint contract_events_kind_check check (kind in (
  'contract_mapping.approved', 'contract.generated', 'contract.revised',
  'contract.submitted', 'contract.approved', 'contract.changes_requested',
  'signature.requested', 'contract.signed', 'contract.terminated',
  'financial_need.created', 'invoice.received', 'invoice.paid'));

alter table public.financial_needs drop constraint financial_needs_status_check;
alter table public.financial_needs add constraint financial_needs_status_check
  check (status in ('waiting_for_invoice', 'invoiced', 'paid'));

create table public.legal_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  financial_need_id uuid not null references public.financial_needs (id) on delete cascade,
  contract_id uuid not null,
  contact_id uuid not null,
  number text not null,
  amount_cents bigint not null,
  -- Required when the amount is not the fee agreed.
  gap_reason text,
  file_path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  received_on date not null,
  due_on date not null,
  -- 'link': deposited by the person; 'team': received otherwise, added by the direction.
  submitted_via text not null,
  added_by uuid references public.people (id),
  paid_on date,
  paid_by uuid references public.people (id),
  paid_proof_path text,
  paid_proof_name text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint legal_invoices_need_key unique (financial_need_id),
  constraint legal_invoices_file_key unique (file_path),
  constraint legal_invoices_number_check check (char_length(btrim(number)) between 1 and 100),
  constraint legal_invoices_amount_check check (amount_cents > 0 and amount_cents < 100000000),
  constraint legal_invoices_gap_check
    check (gap_reason is null or char_length(btrim(gap_reason)) between 1 and 2000),
  constraint legal_invoices_file_check
    check (char_length(file_name) between 1 and 255 and bytes > 0 and bytes <= 20971520),
  constraint legal_invoices_via_check check (submitted_via in ('link', 'team')),
  constraint legal_invoices_due_check check (due_on >= received_on),
  constraint legal_invoices_paid_check
    check ((paid_on is null) = (paid_proof_path is null)
           and (paid_on is null) = (paid_by is null))
);
create index legal_invoices_project_idx on public.legal_invoices (project_id);

alter table public.legal_invoices enable row level security;
alter table public.legal_invoices force row level security;
revoke all on table public.legal_invoices from anon, authenticated;
grant select on public.legal_invoices to authenticated;
-- The direction only: an invoice is the money of the label.
create policy legal_invoices_select_direction on public.legal_invoices
  for select to authenticated
  using (public.has_permission(organization_id, 'validate')
         and public.can_see_project(project_id));

create trigger zz_project_live after insert or update or delete on public.legal_invoices
  for each row execute function public.project_live_tick('project');

-- One-time paths of the private bucket, where a file is uploaded before its row exists.
create table public.legal_invoice_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  financial_need_id uuid not null references public.financial_needs (id) on delete cascade,
  kind text not null,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint legal_invoice_slots_path_key unique (path),
  constraint legal_invoice_slots_kind_check check (kind in ('invoice', 'proof'))
);
create index legal_invoice_slots_need_idx on public.legal_invoice_slots (financial_need_id);
alter table public.legal_invoice_slots enable row level security;
alter table public.legal_invoice_slots force row level security;
revoke all on table public.legal_invoice_slots from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('legal-invoices', 'legal-invoices', false, 20971520,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create function public.is_open_legal_invoice_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.legal_invoice_slots s
                  where s.path = p_path and s.used_at is null and s.expires_at > now());
$$;
revoke execute on function public.is_open_legal_invoice_slot(text) from public;
grant execute on function public.is_open_legal_invoice_slot(text) to anon, authenticated;

create policy legal_invoices_objects_insert
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'legal-invoices' and public.is_open_legal_invoice_slot(objects.name));
create policy legal_invoices_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'legal-invoices'
         and exists (select 1 from public.legal_invoices i
                      where (i.file_path = objects.name or i.paid_proof_path = objects.name)
                        and public.has_permission(i.organization_id, 'validate')
                        and public.can_see_project(i.project_id)));

-- A slot of the bucket for a need: <org>/<project>/<uuid>[.<ext>], 30 minutes.
create function public.legal_invoice_slot(
  p_need public.financial_needs, p_kind text, p_ext text)
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
  if v_ext <> '' and v_ext !~ '^[a-z0-9]{1,10}$' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_path := p_need.organization_id || '/' || p_need.project_id || '/' || gen_random_uuid()
            || case when v_ext = '' then '' else '.' || v_ext end;
  insert into public.legal_invoice_slots (organization_id, financial_need_id, kind, path, expires_at)
  values (p_need.organization_id, p_need.id, p_kind, v_path, now() + interval '30 minutes');
  return v_path;
end;
$$;
revoke execute on function public.legal_invoice_slot(public.financial_needs, text, text)
  from public, anon, authenticated;

-- The slot is used once, and its file is there.
create function public.use_legal_invoice_slot(p_need_id uuid, p_kind text, p_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.legal_invoice_slots%rowtype;
begin
  select * into v_slot from public.legal_invoice_slots
   where path = p_path and financial_need_id = p_need_id and kind = p_kind and used_at is null
   for update;
  if not found or not exists (select 1 from storage.objects o
                               where o.bucket_id = 'legal-invoices' and o.name = p_path) then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  update public.legal_invoice_slots set used_at = now() where id = v_slot.id;
end;
$$;
revoke execute on function public.use_legal_invoice_slot(uuid, text, text)
  from public, anon, authenticated;

-- The need of a person's page: open link, same contact and project, contract signed.
create function public.contact_financial_need(p_contact_token text, p_need_id uuid)
returns public.financial_needs
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
  v public.financial_needs%rowtype;
begin
  if v_link.id is null or p_need_id is null then
    return null;
  end if;
  select n.* into v from public.financial_needs n
    join public.contracts c on c.id = n.contract_id
   where n.id = p_need_id and n.contact_id = v_link.contact_id
     and n.project_id = v_link.project_id and c.status = 'signed';
  return v;
end;
$$;
revoke execute on function public.contact_financial_need(text, uuid) from public, anon, authenticated;

-- What the person's page shows of their invoices: each signed contract with a fee, what is
-- expected, whom to invoice, and where their invoice stands (never another person's).
create function public.get_contact_invoices(p_contact_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
begin
  if v_link.id is null then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'needId', n.id,
             'contract', c.title,
             'amountCents', n.amount_cents,
             'billTo', o.name,
             'invoice', case when i.id is null then null else jsonb_build_object(
               'number', i.number, 'amountCents', i.amount_cents,
               'receivedOn', i.received_on, 'dueOn', i.due_on, 'paidOn', i.paid_on) end,
             'at', coalesce(i.created_at, n.created_at))
           order by n.created_at), '[]'::jsonb)
      from public.financial_needs n
      join public.contracts c on c.id = n.contract_id and c.status = 'signed'
      join public.organizations o on o.id = n.organization_id
      left join public.legal_invoices i on i.financial_need_id = n.id
     where n.project_id = v_link.project_id and n.contact_id = v_link.contact_id);
end;
$$;
revoke execute on function public.get_contact_invoices(text) from public;
grant execute on function public.get_contact_invoices(text) to anon, authenticated;

-- « Envoyer ma facture », step 1: a one-time path where the browser uploads the PDF.
create function public.open_legal_invoice_slot(p_contact_token text, p_need_id uuid, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.financial_needs%rowtype := public.contact_financial_need(p_contact_token, p_need_id);
begin
  if v.id is null then
    raise exception 'invoice_link_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_invoices where financial_need_id = v.id) then
    raise exception 'invoice_exists' using errcode = 'P0001';
  end if;
  return public.legal_invoice_slot(v, 'invoice', p_ext);
end;
$$;
revoke execute on function public.open_legal_invoice_slot(text, uuid, text) from public;
grant execute on function public.open_legal_invoice_slot(text, uuid, text) to anon, authenticated;

-- The invoice written, whoever sends it; the money's state follows; the direction is told.
create function public.record_legal_invoice(
  p_need public.financial_needs, p_via text, p_path text, p_file_name text, p_mime text,
  p_bytes bigint, p_number text, p_amount_cents bigint, p_gap_reason text, p_received_on date)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_gap text := nullif(btrim(coalesce(p_gap_reason, '')), '');
  v_person uuid;
begin
  if exists (select 1 from public.legal_invoices where financial_need_id = p_need.id) then
    raise exception 'invoice_exists' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_number, '')), '') is null
     or p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents >= 100000000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- An amount that is not the fee agreed says why.
  if p_amount_cents <> p_need.amount_cents and v_gap is null then
    raise exception 'invoice_gap_reason_required' using errcode = 'P0001';
  end if;
  perform public.use_legal_invoice_slot(p_need.id, 'invoice', p_path);
  insert into public.legal_invoices
    (organization_id, project_id, financial_need_id, contract_id, contact_id, number,
     amount_cents, gap_reason, file_path, file_name, mime, bytes, received_on, due_on,
     submitted_via, added_by)
  values (p_need.organization_id, p_need.project_id, p_need.id, p_need.contract_id,
          p_need.contact_id, left(btrim(p_number), 100), p_amount_cents,
          case when p_amount_cents <> p_need.amount_cents then left(v_gap, 2000) end,
          p_path, left(btrim(coalesce(nullif(p_file_name, ''), 'Facture.pdf')), 255),
          left(coalesce(nullif(p_mime, ''), 'application/pdf'), 255), p_bytes,
          p_received_on, p_received_on + 30, p_via,
          case when p_via = 'team' then public.auth_person_id() end)
  returning id into v_id;
  update public.financial_needs set status = 'invoiced' where id = p_need.id;
  -- The journal says it arrived, never what it says (the direction's only).
  perform public.log_contract_event(p_need.organization_id, p_need.contract_id,
                                    p_need.project_id, 'invoice.received');
  for v_person in
    select m.person_id from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = p_need.organization_id
       and m.status = 'approved' and a.disabled_at is null
       and 'validate' = any (public.role_permissions(m.role))
  loop
    perform public.notify(p_need.organization_id, v_person, 'legal_invoice_received',
                          p_need.project_id, p_need.contact_id);
  end loop;
  return v_id;
end;
$$;
revoke execute on function public.record_legal_invoice(
  public.financial_needs, text, text, text, text, bigint, text, bigint, text, date)
  from public, anon, authenticated;

-- « Envoyer ma facture », step 2, by the person's link.
create function public.submit_legal_invoice(
  p_contact_token text, p_need_id uuid, p_path text, p_file_name text, p_mime text,
  p_bytes bigint, p_number text, p_amount_cents bigint, p_gap_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.financial_needs%rowtype := public.contact_financial_need(p_contact_token, p_need_id);
begin
  if v.id is null then
    raise exception 'invoice_link_closed' using errcode = 'P0001';
  end if;
  perform public.record_legal_invoice(
    v, 'link', p_path, p_file_name, p_mime, p_bytes, p_number, p_amount_cents, p_gap_reason,
    (now() at time zone 'Europe/Paris')::date);
end;
$$;
revoke execute on function public.submit_legal_invoice(
  text, uuid, text, text, text, bigint, text, bigint, text) from public;
grant execute on function public.submit_legal_invoice(
  text, uuid, text, text, text, bigint, text, bigint, text) to anon, authenticated;

-- A file of the direction (an invoice received otherwise, a proof of transfer): a slot first.
create function public.open_legal_invoice_team_slot(p_need_id uuid, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.financial_needs%rowtype;
begin
  select * into v from public.financial_needs where id = p_need_id;
  if not found or v.project_id is null
     or not public.has_permission(v.organization_id, 'validate')
     or not public.can_see_project(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind not in ('invoice', 'proof') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  return public.legal_invoice_slot(v, p_kind, p_ext);
end;
$$;
revoke execute on function public.open_legal_invoice_team_slot(uuid, text, text) from public, anon;
grant execute on function public.open_legal_invoice_team_slot(uuid, text, text) to authenticated;

-- « Ajouter une facture reçue autrement » (the direction).
create function public.add_legal_invoice(
  p_need_id uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint,
  p_number text, p_amount_cents bigint, p_gap_reason text, p_received_on date)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.financial_needs%rowtype;
begin
  select * into v from public.financial_needs where id = p_need_id;
  if not found or v.project_id is null
     or not public.has_permission(v.organization_id, 'validate')
     or not public.can_see_project(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_received_on is null or p_received_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  return public.record_legal_invoice(
    v, 'team', p_path, p_file_name, p_mime, p_bytes, p_number, p_amount_cents, p_gap_reason,
    p_received_on);
end;
$$;
revoke execute on function public.add_legal_invoice(
  uuid, text, text, text, bigint, text, bigint, text, date) from public, anon;
grant execute on function public.add_legal_invoice(
  uuid, text, text, text, bigint, text, bigint, text, date) to authenticated;

-- « Marquer comme payée »: the day and the proof of the transfer, made outside PDS OS.
create function public.mark_legal_invoice_paid(
  p_invoice_id uuid, p_paid_on date, p_proof_path text, p_proof_name text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.legal_invoices%rowtype;
  v_owner uuid;
begin
  select * into v from public.legal_invoices where id = p_invoice_id for update;
  if not found
     or not public.has_permission(v.organization_id, 'validate')
     or not public.can_see_project(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.paid_on is not null then
    raise exception 'invoice_already_paid' using errcode = 'P0001';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Europe/Paris')::date
     or p_paid_on < v.received_on - 365 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.use_legal_invoice_slot(v.financial_need_id, 'proof', p_proof_path);
  update public.legal_invoices
     set paid_on = p_paid_on, paid_by = public.auth_person_id(), paid_at = now(),
         paid_proof_path = p_proof_path,
         paid_proof_name = left(btrim(coalesce(nullif(p_proof_name, ''), 'Preuve')), 255)
   where id = v.id;
  update public.financial_needs set status = 'paid' where id = v.financial_need_id;
  perform public.log_contract_event(v.organization_id, v.contract_id, v.project_id,
                                    'invoice.paid');
  select owner_person_id into v_owner from public.projects where id = v.project_id;
  if v_owner is not null then
    perform public.notify(v.organization_id, v_owner, 'legal_invoice_paid', v.project_id,
                          v.contact_id);
  end if;
end;
$$;
revoke execute on function public.mark_legal_invoice_paid(uuid, date, text, text) from public, anon;
grant execute on function public.mark_legal_invoice_paid(uuid, date, text, text) to authenticated;

-- Where each invoice of a project stands, for the Juridique (manage_legal): never the
-- number, the amount invoiced nor the file — the direction's only.
create function public.legal_invoice_states(p_project_id uuid)
returns table (financial_need_id uuid, contact_id uuid, state text, due_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.contact_id,
         case when i.id is null then 'asked' when i.paid_on is null then 'to_pay' else 'paid' end,
         i.due_on
    from public.financial_needs n
    left join public.legal_invoices i on i.financial_need_id = n.id
   where n.project_id = p_project_id
     and public.has_permission(n.organization_id, 'manage_legal')
     and public.can_see_project(p_project_id);
$$;
revoke execute on function public.legal_invoice_states(uuid) from public, anon;
grant execute on function public.legal_invoice_states(uuid) to authenticated;
