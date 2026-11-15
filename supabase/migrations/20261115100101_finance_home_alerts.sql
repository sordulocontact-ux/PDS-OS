-- Finance on the home page (UX test of 15/11/2026, P8): the director read
-- « Rien ne vous attend » while a budget was 30 778 € over. The home now says
-- how many urgent Finance alerts wait, for whoever reads Finance, without
-- reading the whole treasury: the envelopes over their amount (projects,
-- cost centers), the incomes past their day and not received, the invoiced
-- spends past their due day and not paid (lib/finance/alerts.ts keeps the
-- full list, its « À traiter » group).
create or replace function public.finance_urgent_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with lines as (
    select l.project_id, l.cost_center_id, l.amount_cents, l.status
      from public.budget_lines l
     where l.organization_id = public.auth_organization_id()
       and l.refused_at is null
  )
  select case when not public.has_permission(public.auth_organization_id(), 'read_finance') then 0
  else
    (select count(*) from public.projects p
      where p.organization_id = public.auth_organization_id()
        and p.archived_at is null and p.budget_cents > 0
        and (select coalesce(sum(amount_cents), 0) from lines
              where project_id = p.id and status in ('committed', 'invoiced', 'paid')) > p.budget_cents)
  + (select count(*) from public.finance_cost_centers c
      where c.organization_id = public.auth_organization_id()
        and c.archived_at is null and c.budget_cents > 0
        and (select coalesce(sum(amount_cents), 0) from lines
              where cost_center_id = c.id and status in ('committed', 'invoiced', 'paid')) > c.budget_cents)
  + (select count(*) from public.finance_incomes i
      where i.organization_id = public.auth_organization_id()
        and i.cancelled_at is null
        and coalesce(i.due_on, i.expected_on) < (now() at time zone 'Europe/Paris')::date
        and public.finance_income_settled(i.id) < i.amount_cents)
  + (select count(*) from public.budget_lines l
      left join public.project_invoices v on v.id = l.invoice_id
      where l.organization_id = public.auth_organization_id()
        and l.refused_at is null and l.status = 'invoiced'
        and coalesce(v.due_on, l.due_on, l.spent_on) < (now() at time zone 'Europe/Paris')::date
        and (select coalesce(sum(m.amount_cents), 0) from public.finance_spend_matches m
              where m.line_id = l.id) < public.budget_line_ttc(l.amount_cents, l.vat_bp))
  end::integer;
$$;
revoke execute on function public.finance_urgent_count() from public, anon;
grant execute on function public.finance_urgent_count() to authenticated;
