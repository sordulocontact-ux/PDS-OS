-- Finance, lot 5 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the fundings and the engines.
--
-- « Moteurs automatiques : Orchard : 52 000 € tous les 12 titres. PDS MIC :
-- 7 600 € et 10 titres provisoires par émission. PDS SHOW : 5 500 € par
-- live. Pay Later : mensualités, intérêts, crédit disponible. » « Planning
-- financier : tournages, productions et sorties ; avances Orchard et
-- remboursements ; mensualités Pay Later. Déplacer une émission de mars à
-- avril doit recalculer instantanément la trésorerie prévisionnelle. »
--
-- Stored here are only the facts the Finance enters: the Orchard rule and
-- how many titles count since the last advance; the formats (an emission,
-- a live: its cost, its provisional titles) and the shows planned on a day;
-- the Pay Later credit lines and what was drawn on them. What they make
-- happen (the next advances, the shows' costs, the installments) is
-- computed by code at each reading (lib/finance/engines.ts), never stored:
-- moving a show moves the forecast.

-- 1. The Orchard rule -------------------------------------------------------------------------
create table public.finance_engine_settings (
  organization_id uuid primary key references public.organizations (id),
  orchard_tranche_cents bigint not null default 5200000,
  orchard_titles_per_tranche integer not null default 12,
  -- Titles delivered to The Orchard since its last advance: entered by the
  -- Finance, set back when an advance is received.
  orchard_titles_counted integer not null default 0,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  id uuid not null default gen_random_uuid() unique,
  constraint finance_engine_settings_tranche_check
    check (orchard_tranche_cents >= 0 and orchard_tranche_cents <= 100000000000),
  constraint finance_engine_settings_titles_check
    check (orchard_titles_per_tranche between 1 and 1000
           and orchard_titles_counted between 0 and 100000)
);
create trigger a_stamp before insert or update on public.finance_engine_settings
  for each row execute function public.treasury_settings_stamp();

-- 2. Formats and shows ------------------------------------------------------------------------
create table public.finance_show_formats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  cost_cents bigint not null,
  provisional_titles integer not null default 0,
  template_id uuid references public.finance_budget_templates (id) on delete set null,
  archived_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_show_formats_id_org_key unique (id, organization_id),
  constraint finance_show_formats_name_check check (btrim(name) <> '' and char_length(name) <= 80),
  constraint finance_show_formats_cost_check check (cost_cents >= 0 and cost_cents <= 100000000000),
  constraint finance_show_formats_titles_check check (provisional_titles between 0 and 100)
);

create table public.finance_shows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  format_id uuid not null,
  label text not null,
  planned_on date not null,
  -- Once its budget is opened (a cost center), its lines count instead of
  -- the format's cost.
  cost_center_id uuid,
  cancelled_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_shows_label_check check (btrim(label) <> '' and char_length(label) <= 120),
  constraint finance_shows_format_same_org
    foreign key (format_id, organization_id) references public.finance_show_formats (id, organization_id),
  constraint finance_shows_center_same_org
    foreign key (cost_center_id, organization_id)
    references public.finance_cost_centers (id, organization_id) on delete set null (cost_center_id)
);
create index finance_shows_org_idx on public.finance_shows (organization_id, planned_on);

-- 3. Pay Later --------------------------------------------------------------------------------
create table public.finance_credit_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  limit_cents bigint not null,
  archived_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_credit_lines_id_org_key unique (id, organization_id),
  constraint finance_credit_lines_name_check check (btrim(name) <> '' and char_length(name) <= 80),
  constraint finance_credit_lines_limit_check check (limit_cents > 0 and limit_cents <= 100000000000)
);

-- A draw: an amount financed on a day, paid back in monthly installments
-- with a fee (the total cost of the credit, in basis points of the amount).
-- The spend it pays, if any, then leaves the account by its installments,
-- not on its own day.
create table public.finance_credit_draws (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  credit_line_id uuid not null,
  line_id uuid unique references public.budget_lines (id) on delete set null,
  label text not null,
  amount_cents bigint not null,
  drawn_on date not null,
  installments integer not null,
  fee_bp integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_credit_draws_line_same_org
    foreign key (credit_line_id, organization_id)
    references public.finance_credit_lines (id, organization_id) on delete cascade,
  constraint finance_credit_draws_label_check check (btrim(label) <> '' and char_length(label) <= 200),
  constraint finance_credit_draws_amount_check check (amount_cents > 0 and amount_cents <= 100000000000),
  constraint finance_credit_draws_installments_check check (installments between 1 and 60),
  constraint finance_credit_draws_fee_check check (fee_bp between 0 and 5000)
);
create index finance_credit_draws_line_idx on public.finance_credit_draws (credit_line_id);

-- A draw never exceeds what the credit line still allows (installments
-- already due are paid back).
create or replace function public.finance_credit_draws_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit bigint;
  v_used bigint;
begin
  select limit_cents into v_limit from public.finance_credit_lines
   where id = new.credit_line_id for update;
  select coalesce(sum(
           d.amount_cents - d.amount_cents * least(d.installments,
             greatest(0, (extract(year from age(current_date, d.drawn_on)) * 12
                          + extract(month from age(current_date, d.drawn_on)))::integer))
           / d.installments), 0)
    into v_used
    from public.finance_credit_draws d
   where d.credit_line_id = new.credit_line_id and d.id <> new.id;
  if v_used + new.amount_cents > v_limit then
    raise exception 'credit_over_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger b_guard before insert or update on public.finance_credit_draws
  for each row execute function public.finance_credit_draws_guard();

-- 4. Stamps, history, row security ------------------------------------------------------------
create trigger a_set_created_by before insert on public.finance_show_formats
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_show_formats
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.finance_shows
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_shows
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.finance_credit_lines
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_credit_lines
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.finance_credit_draws
  for each row execute function public.set_created_by();

create trigger z_log after insert or update or delete on public.finance_engine_settings
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_show_formats
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_shows
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_credit_lines
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_credit_draws
  for each row execute function public.log_finance_event();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['finance_engine_settings', 'finance_show_formats', 'finance_shows',
                                 'finance_credit_lines', 'finance_credit_draws']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on public.%I from anon, authenticated', v_table);
    execute format('grant select, insert, update on public.%I to authenticated', v_table);
    execute format($p$create policy %I on public.%I for select to authenticated
                      using (public.has_permission(organization_id, 'read_finance'))$p$,
                   v_table || '_select', v_table);
    execute format($p$create policy %I on public.%I for insert to authenticated
                      with check (public.has_permission(organization_id, 'manage_finance'))$p$,
                   v_table || '_insert', v_table);
    execute format($p$create policy %I on public.%I for update to authenticated
                      using (public.has_permission(organization_id, 'manage_finance'))
                      with check (public.has_permission(organization_id, 'manage_finance'))$p$,
                   v_table || '_update', v_table);
  end loop;
end $$;
-- A draw entered by mistake is removed (the history keeps it).
grant delete on public.finance_credit_draws to authenticated;
create policy finance_credit_draws_delete on public.finance_credit_draws
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_finance'));

-- 5. A spend paid by a draw leaves by its installments ----------------------------------------
create or replace function public.finance_cash_out()
returns table (
  day date,
  status text,
  total_cents bigint,
  line_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when l.status = 'paid' then l.spent_on
              else coalesce(i.due_on, l.due_on, l.spent_on) end,
         l.status,
         sum(public.budget_line_ttc(l.amount_cents, l.vat_bp))::bigint,
         count(*)::integer
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and l.refused_at is null
     and not exists (select 1 from public.finance_credit_draws d where d.line_id = l.id)
   group by 1, 2;
$$;

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
  select l.id, l.label, public.budget_line_ttc(l.amount_cents, l.vat_bp), l.family, l.status,
         l.spent_on, l.project_id, l.artist_id, coalesce(i.due_on, l.due_on),
         coalesce(c.name, sc.name, l.supplier_name)
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    left join public.network_contacts c on c.id = i.contact_id
    left join public.network_contacts sc on sc.id = l.supplier_contact_id
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and case p_kind
           when 'to_pay' then l.status = 'invoiced'
           when 'largest' then l.status in ('committed', 'invoiced', 'paid')
                               and (p_from is null or l.spent_on >= p_from)
                               and (p_to is null or l.spent_on <= p_to)
           when 'upcoming' then l.status <> 'paid'
                                and l.refused_at is null
                                and not exists (select 1 from public.finance_credit_draws d
                                                 where d.line_id = l.id)
                                and (p_to is null
                                     or coalesce(i.due_on, l.due_on, l.spent_on) <= p_to)
           else false
         end
   order by case when p_kind in ('to_pay', 'upcoming')
                 then coalesce(i.due_on, l.due_on, l.spent_on) end asc nulls last,
            l.amount_cents desc,
            l.id
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
