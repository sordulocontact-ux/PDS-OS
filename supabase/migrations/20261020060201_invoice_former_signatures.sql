-- The former invoice functions keep their signatures over project_invoices
-- (20261020060101): a private link already sent, or code not yet redeployed,
-- still calls them; they all write the one table now. Their internals that
-- wrote the former tables are dropped (never callable by a client).

-- 1. The engineer's link (/m, and /c through its item) ---------------------------------

create or replace function public.master_link_invoice(p_link_hash text)
returns public.project_invoices
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_t public.master_transmissions%rowtype;
  v public.project_invoices%rowtype;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_t from public.master_transmissions
   where token_hash = p_link_hash and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  select * into v from public.project_invoices
   where project_id = v_t.project_id and contact_id = v_t.contact_id and origin = 'master';
  return v;
end;
$$;
revoke execute on function public.master_link_invoice(text) from public, anon, authenticated;

create or replace function public._get_master_invoice_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.master_link_invoice(p_link_hash);
  v_person jsonb;
begin
  if v.id is null then
    return null;
  end if;
  v_person := public.person_invoices_json(v.project_id, v.contact_id);
  return jsonb_build_object(
    'state', case when v.paid_at is not null then 'paid'
                  when v.received_at is not null then 'received' else 'requested' end,
    'requestedAt', v.requested_at,
    'billTo', v_person -> 'billTo',
    'expected', public.project_invoice_expected(v),
    'rib', v_person -> 'rib',
    'ribPending', v_person -> 'ribPending',
    'number', v.number,
    'amountCents', v.amount_cents,
    'receivedAt', v.received_at,
    'paidOn', v.paid_on);
end;
$$;
revoke execute on function public._get_master_invoice_h(text) from public, anon, authenticated;

create or replace function public._open_master_invoice_slot_h(p_link_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.master_link_invoice(p_link_hash);
begin
  if v.id is null then
    raise exception 'invoice_not_requested' using errcode = 'P0001';
  end if;
  if v.received_at is not null then
    raise exception 'invoice_received' using errcode = 'P0001';
  end if;
  return public.project_invoice_slot(v, 'invoice', 'pdf');
end;
$$;
revoke execute on function public._open_master_invoice_slot_h(text) from public, anon, authenticated;

create or replace function public._submit_master_invoice_h(
  p_link_hash text, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_iban text, p_bic text, p_holder text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.master_link_invoice(p_link_hash);
begin
  if v.id is null then
    raise exception 'invoice_not_requested' using errcode = 'P0001';
  end if;
  perform public.record_project_invoice(
    v, 'link', p_path, p_file_name, p_mime, p_number, p_amount_cents, p_reason,
    (now() at time zone 'Europe/Paris')::date, null, p_iban, p_bic, p_holder);
end;
$$;
revoke execute on function public._submit_master_invoice_h(text, text, text, text, text, bigint, text,
  text, text, text) from public, anon, authenticated;

-- 2. The person's page (/c), a contract's invoice by its financial need ---------------------

create or replace function public.contact_need_invoice(p_contact_token text, p_need_id uuid)
returns public.project_invoices
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
  v public.project_invoices%rowtype;
begin
  if v_link.id is null or p_need_id is null then
    return null;
  end if;
  select * into v from public.project_invoices
   where financial_need_id = p_need_id and project_id = v_link.project_id
     and contact_id = v_link.contact_id;
  return v;
end;
$$;
revoke execute on function public.contact_need_invoice(text, uuid) from public, anon, authenticated;

create or replace function public.get_contact_invoices(p_contact_token text)
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
             'contract', k.title,
             'amountCents', n.amount_cents,
             'billTo', coalesce(b.legal_name, o.name),
             'invoice', case when i.received_at is null then null else jsonb_build_object(
               'number', i.number, 'amountCents', i.amount_cents,
               'receivedOn', i.received_on, 'dueOn', i.due_on, 'paidOn', i.paid_on) end,
             'at', coalesce(i.received_at, n.created_at))
           order by n.created_at), '[]'::jsonb)
      from public.project_invoices i
      join public.financial_needs n on n.id = i.financial_need_id
      join public.contracts k on k.id = i.contract_id
      join public.organizations o on o.id = i.organization_id
      left join public.organization_billing b on b.organization_id = o.id
     where i.project_id = v_link.project_id and i.contact_id = v_link.contact_id
       and i.origin = 'contract');
end;
$$;

create or replace function public.open_legal_invoice_slot(p_contact_token text, p_need_id uuid, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.contact_need_invoice(p_contact_token, p_need_id);
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

create or replace function public.submit_legal_invoice(
  p_contact_token text, p_need_id uuid, p_path text, p_file_name text, p_mime text,
  p_bytes bigint, p_number text, p_amount_cents bigint, p_gap_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype := public.contact_need_invoice(p_contact_token, p_need_id);
begin
  if v.id is null then
    raise exception 'invoice_link_closed' using errcode = 'P0001';
  end if;
  perform public.record_project_invoice(
    v, 'link', p_path, p_file_name, p_mime, p_number, p_amount_cents, p_gap_reason,
    (now() at time zone 'Europe/Paris')::date, null, null, null, null);
end;
$$;

-- 3. The team ----------------------------------------------------------------------------

create or replace function public.open_master_finance_slot(p_invoice_id uuid, p_kind text, p_ext text)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select public.open_invoice_slot(p_invoice_id, p_kind, p_ext);
$$;

create or replace function public.record_master_invoice_other(
  p_invoice_id uuid, p_path text, p_file_name text, p_mime text, p_number text,
  p_amount_cents bigint, p_reason text, p_how text, p_iban text, p_bic text, p_holder text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select public.add_received_invoice(p_invoice_id, p_path, p_file_name, p_mime, p_number,
                                     p_amount_cents, p_reason, null, p_how, p_iban, p_bic, p_holder);
$$;

create or replace function public.pay_master_invoice(
  p_invoice_id uuid, p_paid_on date, p_path text, p_file_name text, p_mime text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select public.pay_invoice(p_invoice_id, p_paid_on, p_path, p_file_name, p_mime);
$$;

create or replace function public.open_legal_invoice_team_slot(p_need_id uuid, p_kind text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.project_invoices where financial_need_id = p_need_id;
  if v_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.open_invoice_slot(v_id, p_kind, p_ext);
end;
$$;

create or replace function public.add_legal_invoice(
  p_need_id uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint,
  p_number text, p_amount_cents bigint, p_gap_reason text, p_received_on date)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.project_invoices where financial_need_id = p_need_id;
  if v_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.add_received_invoice(v_id, p_path, p_file_name, p_mime, p_number, p_amount_cents,
                                      p_gap_reason, p_received_on, null, null, null, null);
  return v_id;
end;
$$;

create or replace function public.mark_legal_invoice_paid(
  p_invoice_id uuid, p_paid_on date, p_proof_path text, p_proof_name text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select public.pay_invoice(
    p_invoice_id, p_paid_on, p_proof_path, p_proof_name,
    case when p_proof_path ~* '\.png$' then 'image/png'
         when p_proof_path ~* '\.jpe?g$' then 'image/jpeg' else 'application/pdf' end);
$$;

-- The Juridique (manage_legal): where each contract's invoice stands.
create or replace function public.legal_invoice_states(p_project_id uuid)
returns table (financial_need_id uuid, contact_id uuid, state text, due_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select s.financial_need_id, s.contact_id,
         case when s.state = 'rib' then 'to_pay' else s.state end, s.due_on
    from public.project_invoice_states(p_project_id) s
    join public.projects p on p.id = p_project_id
   where s.origin = 'contract' and public.has_permission(p.organization_id, 'manage_legal');
$$;

-- 4. Internals of the former tables, no longer called ---------------------------------------

drop function public.record_master_invoice_row(public.master_invoices, text, text, text, text, text,
  bigint, text, text);
drop function public.check_master_invoice_amount(public.master_invoices, bigint, text);
drop function public.open_master_finance_slot_row(public.master_invoices, text, text);
drop function public.take_master_finance_slot(uuid, text, text, text);
drop function public.add_contact_bank_account(public.master_invoices, text, text, text, text);
drop function public.master_invoice_of_link(text);
drop function public.record_legal_invoice(public.financial_needs, text, text, text, text, bigint, text,
  bigint, text, date);
drop function public.legal_invoice_slot(public.financial_needs, text, text);
drop function public.use_legal_invoice_slot(uuid, text, text);
drop function public.contact_financial_need(text, uuid);
