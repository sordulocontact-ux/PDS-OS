-- Finance, lot 7 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the alerts read what the bank already paid.
--
-- A spend matched in full with bank transactions (lot 6) is paid for
-- Finance, whatever its own state (its writers keep it): finance_spends()
-- says how much of it the bank matched, so that the alerts, the spends'
-- views and the exports never announce it « à payer ».

drop function public.finance_spends();
create function public.finance_spends()
returns table (
  line_id uuid,
  label text,
  amount_cents bigint,
  forecast_cents bigint,
  vat_bp integer,
  family text,
  family_detail text,
  subpost text,
  status text,
  spent_on date,
  due_on date,
  project_id uuid,
  artist_id uuid,
  cost_center_id uuid,
  off_budget boolean,
  supplier_contact_id uuid,
  supplier_name text,
  rebillable boolean,
  rebill_income_id uuid,
  validator_person_id uuid,
  proof_path text,
  proof_name text,
  note text,
  has_proof boolean,
  refused boolean,
  created_at timestamptz,
  matched_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.label, l.amount_cents, coalesce(l.forecast_cents, l.amount_cents), l.vat_bp,
         l.family, l.family_detail, l.subpost, l.status,
         l.spent_on, coalesce(i.due_on, l.due_on), l.project_id, l.artist_id, l.cost_center_id,
         l.off_budget, l.supplier_contact_id,
         coalesce(sc.name, l.supplier_name, c.name), l.rebillable,
         (select fi.id from public.finance_incomes fi
           where fi.source_line_id = l.id and fi.cancelled_at is null
           order by fi.created_at limit 1),
         l.validator_person_id, l.proof_path, l.proof_name, l.note,
         (l.attachment_file_id is not null or l.artist_attachment_file_id is not null
          or l.proof_path is not null or i.file_path is not null),
         l.refused_at is not null, l.created_at,
         (select coalesce(sum(m.amount_cents), 0) from public.finance_spend_matches m
           where m.line_id = l.id)::bigint
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    left join public.network_contacts c on c.id = i.contact_id
    left join public.network_contacts sc on sc.id = l.supplier_contact_id
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
   order by coalesce(i.due_on, l.due_on, l.spent_on) desc, l.created_at desc
   limit 2000;
$$;
revoke execute on function public.finance_spends() from public, anon;
grant execute on function public.finance_spends() to authenticated;
