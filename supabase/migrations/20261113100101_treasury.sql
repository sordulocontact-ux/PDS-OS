-- Finance, lot 1 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the treasury and the money coming in.
--
-- « L'écran d'accueil doit répondre immédiatement à trois questions : combien
-- avons-nous, qu'est-ce qui va entrer ou sortir, et où faut-il agir ? » Until
-- now PDS OS knew only what goes out (budget_lines). This lot adds:
--   - the bank balance, entered as a statement (« solde de départ », the
--     ticket's MVP: « import CSV ou ajout manuel ») and the minimum reserve;
--   - the money coming in (« recette prévue → facture client → encaissement »):
--     an income, and the receipts that settle it, partially or in several
--     times. A receipt settles an income: it never creates a second one (the
--     ticket's central rule, for money in);
--   - the history of every change (« auteur, date, ancienne valeur, nouvelle
--     valeur »), written by trigger.
-- The balance today and the forecast are computed by code at each reading
-- (lib/finance/treasury.ts), never stored.
--
-- Who: « La direction et la Finance voient l'ensemble » (ticket), the Finance
-- being the business managers and « business » (Sacha, 13/11/2026). They read
-- (read_finance, 20261112150101) and now write (manage_finance).

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
            'manage_artist_budgets', 'read_finance', 'manage_finance']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals', 'read_finance', 'manage_finance']
    when 'business' then array['negotiate', 'manage_network', 'read_finance', 'manage_finance']
    else array[]::text[]
  end;
$$;

-- 2. The bank balance and the reserve ---------------------------------------------------------
-- A statement of the account: its balance on a day. The latest one (by day,
-- then by entry) is where the computed balance starts; a wrong one is
-- corrected by entering another, never changed (the history keeps both).
create table public.treasury_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  balance_cents bigint not null,
  as_of date not null,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint treasury_balances_amount_check check (abs(balance_cents) <= 100000000000),
  constraint treasury_balances_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 500))
);
create index treasury_balances_latest_idx
  on public.treasury_balances (organization_id, as_of desc, created_at desc);

-- The minimum reserve: under it, the treasury warns (« Passage sous la
-- réserve minimale »).
create table public.treasury_settings (
  organization_id uuid primary key references public.organizations (id),
  reserve_cents bigint not null default 0,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint treasury_settings_reserve_check
    check (reserve_cents >= 0 and reserve_cents <= 100000000000)
);

-- 3. The money coming in ----------------------------------------------------------------------
-- An income: what is expected (advance, service, label refund, rebilling,
-- distribution, partnership…), from whom, for which project or artist, on
-- which day; then its invoice (number, day, due day). Its state (expected,
-- invoiced, late, partly received, received, cancelled) is computed from it
-- and its receipts, never stored.
create table public.finance_incomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  label text not null,
  kind text not null,
  amount_cents bigint not null,
  -- Who pays: a contact of the Réseau, or a name only (docs/DESIGN.md § 4).
  contact_id uuid,
  payer_name text,
  project_id uuid,
  artist_id uuid,
  expected_on date not null,
  invoice_number text,
  invoiced_on date,
  due_on date,
  note text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.people (id),
  cancel_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_incomes_id_org_key unique (id, organization_id),
  constraint finance_incomes_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint finance_incomes_kind_check check (kind in (
    'advance', 'service', 'label_refund', 'rebilling', 'distribution', 'partnership', 'other')),
  constraint finance_incomes_amount_check
    check (amount_cents > 0 and amount_cents <= 100000000000),
  constraint finance_incomes_payer_check
    check (payer_name is null or (btrim(payer_name) <> '' and char_length(payer_name) <= 200)),
  constraint finance_incomes_invoice_check
    check ((invoice_number is null) = (invoiced_on is null)),
  constraint finance_incomes_number_check
    check (invoice_number is null
           or (btrim(invoice_number) <> '' and char_length(invoice_number) <= 100)),
  constraint finance_incomes_due_check
    check (due_on is null or invoiced_on is null or due_on >= invoiced_on),
  constraint finance_incomes_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 1000)),
  constraint finance_incomes_cancel_check
    check ((cancelled_at is null) = (cancel_reason is null)),
  constraint finance_incomes_cancel_reason_check
    check (cancel_reason is null
           or (btrim(cancel_reason) <> '' and char_length(cancel_reason) <= 1000)),
  constraint finance_incomes_org_fkey
    foreign key (organization_id) references public.organizations (id),
  -- A deleted project, artist or contact leaves the money where it was.
  constraint finance_incomes_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
    on delete set null (contact_id),
  constraint finance_incomes_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete set null (project_id),
  constraint finance_incomes_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
    on delete set null (artist_id)
);
create index finance_incomes_org_idx on public.finance_incomes (organization_id, expected_on);
create index finance_incomes_project_idx on public.finance_incomes (project_id)
  where project_id is not null;
create index finance_incomes_artist_idx on public.finance_incomes (artist_id)
  where artist_id is not null;

-- A receipt: money actually received for an income, on a day. Several make
-- a partial then a full settlement; they never add up to more than the
-- income.
create table public.finance_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  income_id uuid not null,
  amount_cents bigint not null,
  received_on date not null,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_receipts_amount_check
    check (amount_cents > 0 and amount_cents <= 100000000000),
  constraint finance_receipts_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 500)),
  constraint finance_receipts_income_same_org
    foreign key (income_id, organization_id) references public.finance_incomes (id, organization_id)
    on delete cascade
);
create index finance_receipts_income_idx on public.finance_receipts (income_id);
create index finance_receipts_org_idx on public.finance_receipts (organization_id, received_on);

create trigger a_set_created_by before insert on public.treasury_balances
  for each row execute function public.set_created_by();
create trigger a_set_created_by before insert on public.finance_incomes
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_incomes
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.finance_receipts
  for each row execute function public.set_created_by();

-- Who changed the reserve, who cancelled an income: the session's person.
create or replace function public.treasury_settings_stamp()
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
create trigger a_stamp before insert or update on public.treasury_settings
  for each row execute function public.treasury_settings_stamp();

-- An income keeps what it received: its amount never goes under its
-- receipts, an income with receipts is not cancelled (its money came in),
-- a cancelled one is never reopened nor changed.
create or replace function public.finance_incomes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_received bigint;
begin
  if old.cancelled_at is not null then
    raise exception 'income_cancelled' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into v_received
    from public.finance_receipts where income_id = new.id;
  if new.amount_cents < v_received then
    raise exception 'amount_below_received' using errcode = 'P0001';
  end if;
  if new.cancelled_at is not null then
    if v_received > 0 then
      raise exception 'income_has_receipts' using errcode = 'P0001';
    end if;
    new.cancelled_by := public.auth_person_id();
  end if;
  return new;
end;
$$;
create trigger b_guard before update on public.finance_incomes
  for each row execute function public.finance_incomes_guard();

-- A receipt settles a live income, within what it still awaits. The income
-- is locked so that two receipts entered at once cannot exceed it.
create or replace function public.finance_receipts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_income public.finance_incomes%rowtype;
  v_received bigint;
begin
  select * into v_income from public.finance_incomes
   where id = new.income_id for update;
  if v_income.cancelled_at is not null then
    raise exception 'income_cancelled' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into v_received
    from public.finance_receipts where income_id = new.income_id;
  if v_received + new.amount_cents > v_income.amount_cents then
    raise exception 'receipt_over_amount' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger b_guard before insert on public.finance_receipts
  for each row execute function public.finance_receipts_guard();

-- 4. History ----------------------------------------------------------------------------------
-- « Conserver auteur, date, ancienne valeur, nouvelle valeur » (ticket): one
-- row per change of the tables above, written by trigger only.
create table public.finance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  entity text not null,
  row_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  seq bigint generated always as identity,
  constraint finance_events_action_check check (action in ('insert', 'update', 'delete'))
);
create index finance_events_row_idx on public.finance_events (row_id, seq desc);
create index finance_events_org_idx on public.finance_events (organization_id, created_at desc);

create or replace function public.log_finance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.finance_events (organization_id, entity, row_id, action, before, after,
                                     actor_person_id)
  values ((v_row ->> 'organization_id')::uuid,
          tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'organization_id')::uuid,
          lower(tg_op),
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end,
          public.auth_person_id());
  return coalesce(new, old);
end;
$$;
revoke execute on function public.log_finance_event() from public, anon, authenticated;

create trigger z_log after insert or update or delete on public.treasury_balances
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.treasury_settings
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_incomes
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_receipts
  for each row execute function public.log_finance_event();

-- 5. Row security -----------------------------------------------------------------------------
alter table public.treasury_balances enable row level security;
alter table public.treasury_balances force row level security;
alter table public.treasury_settings enable row level security;
alter table public.treasury_settings force row level security;
alter table public.finance_incomes enable row level security;
alter table public.finance_incomes force row level security;
alter table public.finance_receipts enable row level security;
alter table public.finance_receipts force row level security;
alter table public.finance_events enable row level security;
alter table public.finance_events force row level security;

revoke all on public.treasury_balances, public.treasury_settings, public.finance_incomes,
              public.finance_receipts, public.finance_events
  from anon, authenticated;
grant select on public.treasury_balances, public.treasury_settings, public.finance_incomes,
                public.finance_receipts, public.finance_events
  to authenticated;
-- A statement is entered, never changed; a receipt entered by mistake is
-- removed (the history keeps it); an income is cancelled, never deleted.
grant insert on public.treasury_balances to authenticated;
grant insert, update on public.treasury_settings to authenticated;
grant insert, update on public.finance_incomes to authenticated;
grant insert, delete on public.finance_receipts to authenticated;

create policy treasury_balances_select on public.treasury_balances
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy treasury_balances_insert on public.treasury_balances
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));

create policy treasury_settings_select on public.treasury_settings
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy treasury_settings_insert on public.treasury_settings
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy treasury_settings_update on public.treasury_settings
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

create policy finance_incomes_select on public.finance_incomes
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_incomes_insert on public.finance_incomes
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance')
              and cancelled_at is null);
create policy finance_incomes_update on public.finance_incomes
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

create policy finance_receipts_select on public.finance_receipts
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_receipts_insert on public.finance_receipts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_receipts_delete on public.finance_receipts
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_finance'));

create policy finance_events_select on public.finance_events
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));

-- 6. What goes out, for the treasury ----------------------------------------------------------
-- The spends by day, as the treasury reads them: a paid line went out on its
-- day; a line still to pay goes out on its invoice's due day, else on its
-- own day. A refused quote never goes out. Totals only: the lines keep their
-- own rules.
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
              else coalesce(i.due_on, l.spent_on) end,
         l.status,
         sum(l.amount_cents)::bigint,
         count(*)::integer
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and l.refused_at is null
   group by 1, 2;
$$;
revoke execute on function public.finance_cash_out() from public, anon;
grant execute on function public.finance_cash_out() to authenticated;

-- 7. Single spends, with what is still to pay -------------------------------------------------
-- 20261112150101's kinds, plus « upcoming »: every line not paid yet (not a
-- refused quote) going out up to p_to, by the day it goes out, for the
-- treasury's calendar and « Prochaines opérations ».
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
           when 'upcoming' then l.status <> 'paid'
                                and l.refused_at is null
                                and (p_to is null or coalesce(i.due_on, l.spent_on) <= p_to)
           else false
         end
   order by case when p_kind in ('to_pay', 'upcoming') then coalesce(i.due_on, l.spent_on) end
              asc nulls last,
            l.amount_cents desc,
            l.id
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
revoke execute on function public.finance_lines(text, date, date, integer) from public, anon;
grant execute on function public.finance_lines(text, date, date, integer) to authenticated;

-- 8. What an income can name ------------------------------------------------------------------
-- The live projects and artists, to pick an income's and to name every
-- target on the Finance pages, for whoever reads Finance (a business does
-- not read every project: the names only, nothing else of them).
create or replace function public.finance_targets()
returns table (
  kind text,
  id uuid,
  name text,
  archived boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'project', p.id, p.title, p.archived_at is not null
    from public.projects p
   where p.organization_id = public.auth_organization_id()
     and public.has_permission(p.organization_id, 'read_finance')
  union all
  select 'artist', a.id, a.name, a.archived_at is not null
    from public.artists a
   where a.organization_id = public.auth_organization_id()
     and public.has_permission(a.organization_id, 'read_finance');
$$;
revoke execute on function public.finance_targets() from public, anon;
grant execute on function public.finance_targets() to authenticated;
