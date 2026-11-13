-- Finance (Sacha, 12/11/2026): one page for the team's spending as a whole,
-- every project and every artist, « une vue finance complète ». Read by the
-- direction, the business managers and « business » only (Sacha: « ça sera
-- que ces trois rôles »): a new permission, « read_finance ».
--
-- The page reads aggregates, never the rows themselves: whoever holds
-- read_finance sees every total of the organization, while the rows stay
-- under their own rules (a project's budget lines for its readers, the
-- Dépenses page unchanged). Each function below checks the permission and
-- reads the one ledger, budget_lines (« une dépense = une ligne », § 8 ter):
-- production quotes and the Conception's forecast are not spends and are
-- never added (no double count). No income is recorded in PDS OS: Finance
-- is spending and commitments.

-- 1. The permission ---------------------------------------------------------------------------
create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets',
            'manage_artist_budgets', 'read_finance']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals', 'read_finance']
    when 'business' then array['negotiate', 'manage_network', 'read_finance']
    else array[]::text[]
  end;
$$;

-- 2. Spending by month ------------------------------------------------------------------------
-- Every line of the organization, summed by month of its date, project or
-- artist, poste and state; with how many lines and how many real spends
-- (invoiced or paid) have no proof (no receipt, no file, no invoice: the
-- rule of lacksProof, lib/budget/types.ts). Everything the page shows by
-- period is computed from these rows by code.
create or replace function public.finance_month_totals()
returns table (
  month date,
  project_id uuid,
  artist_id uuid,
  family text,
  status text,
  total_cents bigint,
  line_count integer,
  no_proof_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('month', l.spent_on)::date,
         l.project_id,
         l.artist_id,
         l.family,
         l.status,
         sum(l.amount_cents)::bigint,
         count(*)::integer,
         (count(*) filter (where l.status in ('invoiced', 'paid')
                             and l.attachment_file_id is null
                             and l.artist_attachment_file_id is null
                             and l.invoice_id is null))::integer
    from public.budget_lines l
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
   group by 1, 2, 3, 4, 5;
$$;
revoke execute on function public.finance_month_totals() from public, anon;
grant execute on function public.finance_month_totals() to authenticated;

-- 3. The projects ------------------------------------------------------------------------------
-- The projects that spend or have an envelope: their title, their artist by
-- the rule every page reads (project_artist_id), their envelope.
create or replace function public.finance_projects()
returns table (
  project_id uuid,
  title text,
  artist_id uuid,
  collective boolean,
  archived boolean,
  budget_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, public.project_artist_id(p.id), p.collective,
         p.archived_at is not null, p.budget_cents
    from public.projects p
   where p.organization_id = public.auth_organization_id()
     and public.has_permission(p.organization_id, 'read_finance')
     and (p.budget_cents is not null
          or exists (select 1 from public.budget_lines l where l.project_id = p.id));
$$;
revoke execute on function public.finance_projects() from public, anon;
grant execute on function public.finance_projects() to authenticated;

-- 4. The artists -------------------------------------------------------------------------------
-- The artists that spend (directly or through their projects) or have an
-- open envelope: their name and, with an envelope, what it consumed by the
-- rule of artist_budget_usage (direct spends and its projects', dated in
-- the period; engaged, invoiced or paid; estimated or quoted apart).
create or replace function public.finance_artists()
returns table (
  artist_id uuid,
  name text,
  archived boolean,
  budget_id uuid,
  budget_cents bigint,
  starts_on date,
  ends_on date,
  spent_cents bigint,
  pending_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with org as (
    select public.auth_organization_id() as id
     where public.has_permission(public.auth_organization_id(), 'read_finance')
  ),
  spending as (
    select distinct coalesce(l.artist_id, public.project_artist_id(l.project_id)) as artist_id
      from public.budget_lines l, org
     where l.organization_id = org.id
  ),
  shown as (
    select a.id, a.name, a.archived_at is not null as archived, b.id as budget_id,
           b.amount_cents, b.starts_on, b.ends_on
      from public.artists a
      join org on org.id = a.organization_id
      left join public.artist_budgets b on b.artist_id = a.id and b.closed_at is null
     where b.id is not null or a.id in (select s.artist_id from spending s)
  )
  select s.id, s.name, s.archived, s.budget_id, s.amount_cents, s.starts_on, s.ends_on,
         case when s.budget_id is null then null else coalesce(u.spent, 0)::bigint end,
         case when s.budget_id is null then null else coalesce(u.pending, 0)::bigint end
    from shown s
    left join lateral (
      select sum(l.amount_cents) filter (where l.status in ('committed', 'invoiced', 'paid')) as spent,
             sum(l.amount_cents) filter (where l.status in ('planned', 'proposed')) as pending
        from public.budget_lines l
       where s.budget_id is not null
         and l.organization_id = (select id from org)
         and (l.artist_id = s.id or l.project_id = any (public.artist_project_ids(s.id)))
         and l.spent_on >= s.starts_on
         and (s.ends_on is null or l.spent_on <= s.ends_on)
    ) u on true;
$$;
revoke execute on function public.finance_artists() from public, anon;
grant execute on function public.finance_artists() to authenticated;

-- 5. Single spends -----------------------------------------------------------------------------
-- The lines the page names one by one: « À payer » (invoiced, not paid yet,
-- whatever their date: with the invoice's due day and who sent it) and the
-- largest engaged spends of a period. Label, amount, poste, state, target:
-- never the proof, the note nor the bank details.
create or replace function public.finance_lines(p_kind text, p_from date default null,
                                                 p_to date default null, p_limit integer default 50)
returns table (
  line_id uuid,
  label text,
  amount_cents bigint,
  family text,
  status text,
  spent_on date,
  project_id uuid,
  artist_id uuid,
  due_on date,
  contact_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.label, l.amount_cents, l.family, l.status, l.spent_on,
         l.project_id, l.artist_id, i.due_on, c.name
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    left join public.network_contacts c on c.id = i.contact_id
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and case p_kind
           when 'to_pay' then l.status = 'invoiced'
           when 'largest' then l.status in ('committed', 'invoiced', 'paid')
                               and (p_from is null or l.spent_on >= p_from)
                               and (p_to is null or l.spent_on <= p_to)
           else false
         end
   order by case when p_kind = 'to_pay' then coalesce(i.due_on, l.spent_on) end asc nulls last,
            l.amount_cents desc,
            l.id
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
revoke execute on function public.finance_lines(text, date, date, integer) from public, anon;
grant execute on function public.finance_lines(text, date, date, integer) to authenticated;
