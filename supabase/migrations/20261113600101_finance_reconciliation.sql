-- Finance, lot 6 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the bank reconciliation (« Rapprochement Qonto »).
--
-- « MVP : import CSV ou ajout manuel, rapprochement proposé, validation
-- humaine. » « Au paiement ou à l'encaissement Qonto, PDS OS propose un
-- rapprochement selon le montant, la date, le tiers et la référence. La
-- validation humaine reste obligatoire dans le MVP. Les paiements partiels
-- et multiples sont supportés. » « Quand la transaction Qonto de 400 €
-- apparaît, elle est rapprochée de la facture et ne crée pas une seconde
-- dépense. » « Détection de doublons. »
--
-- A bank transaction is imported (CSV of Qonto, its id keeps an import from
-- being entered twice) or entered by hand. Reconciling it, always by a
-- person:
--   - money in, with an income: it becomes that income's receipt (the
--     receipt keeps the transaction), never a second income;
--   - money out, with a spend: a match links them, never a second spend;
--     a spend fully matched counts as paid on the transaction's day for the
--     treasury (the spend itself keeps its writers and its own state).
-- A transaction is matched for at most its amount, in one or several parts;
-- one that needs nothing (bank fees…) is set aside with its reason.

-- 1. Transactions -----------------------------------------------------------------------------
create table public.finance_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  booked_on date not null,
  -- Signed: money in > 0, money out < 0.
  amount_cents bigint not null,
  counterparty text,
  reference text,
  label text,
  external_id text,
  source text not null default 'manual',
  ignored_at timestamptz,
  ignore_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_bank_transactions_id_org_key unique (id, organization_id),
  constraint finance_bank_transactions_external_key unique (organization_id, external_id),
  constraint finance_bank_transactions_amount_check
    check (amount_cents <> 0 and abs(amount_cents) <= 100000000000),
  constraint finance_bank_transactions_source_check check (source in ('csv', 'manual')),
  constraint finance_bank_transactions_text_check
    check (coalesce(char_length(counterparty), 0) <= 200
           and coalesce(char_length(reference), 0) <= 300
           and coalesce(char_length(label), 0) <= 300
           and coalesce(char_length(external_id), 0) <= 120),
  constraint finance_bank_transactions_ignore_check
    check ((ignored_at is null) = (ignore_reason is null)
           and (ignore_reason is null or (btrim(ignore_reason) <> '' and char_length(ignore_reason) <= 300)))
);
create index finance_bank_transactions_org_idx
  on public.finance_bank_transactions (organization_id, booked_on desc);

-- 2. Matches ----------------------------------------------------------------------------------
-- An income's receipt may come from a transaction.
alter table public.finance_receipts
  add column transaction_id uuid,
  add constraint finance_receipts_transaction_same_org
    foreign key (transaction_id, organization_id)
    references public.finance_bank_transactions (id, organization_id) on delete cascade;
create index finance_receipts_transaction_idx on public.finance_receipts (transaction_id)
  where transaction_id is not null;

create table public.finance_spend_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  transaction_id uuid not null,
  line_id uuid not null references public.budget_lines (id) on delete cascade,
  amount_cents bigint not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_spend_matches_amount_check check (amount_cents > 0),
  constraint finance_spend_matches_transaction_same_org
    foreign key (transaction_id, organization_id)
    references public.finance_bank_transactions (id, organization_id) on delete cascade
);
create index finance_spend_matches_transaction_idx on public.finance_spend_matches (transaction_id);
create index finance_spend_matches_line_idx on public.finance_spend_matches (line_id);

-- What a transaction already settles: its receipts and its matches.
create or replace function public.finance_transaction_used(p_transaction uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce((select sum(amount_cents) from public.finance_receipts
                    where transaction_id = p_transaction), 0)
       + coalesce((select sum(amount_cents) from public.finance_spend_matches
                    where transaction_id = p_transaction), 0);
$$;

-- A transaction settles money of its own direction, within its amount, and
-- never once set aside.
create or replace function public.finance_transaction_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tx public.finance_bank_transactions%rowtype;
begin
  if new.transaction_id is null then
    return new;
  end if;
  select * into v_tx from public.finance_bank_transactions
   where id = new.transaction_id for update;
  if v_tx.ignored_at is not null then
    raise exception 'transaction_ignored' using errcode = 'P0001';
  end if;
  if (tg_table_name = 'finance_receipts' and v_tx.amount_cents < 0)
     or (tg_table_name = 'finance_spend_matches' and v_tx.amount_cents > 0) then
    raise exception 'transaction_direction' using errcode = 'P0001';
  end if;
  if public.finance_transaction_used(new.transaction_id) + new.amount_cents > abs(v_tx.amount_cents) then
    raise exception 'transaction_over_amount' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger c_transaction before insert on public.finance_receipts
  for each row execute function public.finance_transaction_guard();
create trigger c_transaction before insert on public.finance_spend_matches
  for each row execute function public.finance_transaction_guard();

-- A transaction set aside settles nothing (« ignorée » after its matches).
create or replace function public.finance_bank_transactions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ignored_at is not null and old.ignored_at is null
     and public.finance_transaction_used(new.id) > 0 then
    raise exception 'transaction_matched' using errcode = 'P0001';
  end if;
  if new.amount_cents is distinct from old.amount_cents
     or new.booked_on is distinct from old.booked_on then
    raise exception 'transaction_frozen' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger b_guard before update on public.finance_bank_transactions
  for each row execute function public.finance_bank_transactions_guard();

-- 3. Stamps, history, row security ------------------------------------------------------------
create trigger a_set_created_by before insert on public.finance_bank_transactions
  for each row execute function public.set_created_by();
create trigger a_set_created_by before insert on public.finance_spend_matches
  for each row execute function public.set_created_by();
create trigger z_log after insert or update or delete on public.finance_bank_transactions
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_spend_matches
  for each row execute function public.log_finance_event();

alter table public.finance_bank_transactions enable row level security;
alter table public.finance_bank_transactions force row level security;
alter table public.finance_spend_matches enable row level security;
alter table public.finance_spend_matches force row level security;
revoke all on public.finance_bank_transactions, public.finance_spend_matches from anon, authenticated;
grant select, insert, update, delete on public.finance_bank_transactions to authenticated;
grant select, insert, delete on public.finance_spend_matches to authenticated;

create policy finance_bank_transactions_select on public.finance_bank_transactions
  for select to authenticated using (public.has_permission(organization_id, 'read_finance'));
create policy finance_bank_transactions_insert on public.finance_bank_transactions
  for insert to authenticated with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_bank_transactions_update on public.finance_bank_transactions
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));
-- A transaction entered by hand by mistake is removed with its matches.
create policy finance_bank_transactions_delete on public.finance_bank_transactions
  for delete to authenticated
  using (source = 'manual' and public.has_permission(organization_id, 'manage_finance'));

create policy finance_spend_matches_select on public.finance_spend_matches
  for select to authenticated using (public.has_permission(organization_id, 'read_finance'));
create policy finance_spend_matches_insert on public.finance_spend_matches
  for insert to authenticated with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_spend_matches_delete on public.finance_spend_matches
  for delete to authenticated using (public.has_permission(organization_id, 'manage_finance'));

grant insert (transaction_id) on public.finance_receipts to authenticated;

-- 4. A spend fully matched is paid, for the treasury ------------------------------------------
-- Its money out: TTC; matched for all of it, it left on its last
-- transaction's day, whatever its own state.
create or replace function public.finance_line_matched(p_line uuid)
returns table (cents bigint, last_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(m.amount_cents), 0)::bigint, max(t.booked_on)
    from public.finance_spend_matches m
    join public.finance_bank_transactions t on t.id = m.transaction_id
   where m.line_id = p_line;
$$;
revoke execute on function public.finance_line_matched(uuid) from public, anon, authenticated;

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
  select case when m.cents >= public.budget_line_ttc(l.amount_cents, l.vat_bp) then m.last_on
              when l.status = 'paid' then l.spent_on
              else coalesce(i.due_on, l.due_on, l.spent_on) end,
         case when m.cents >= public.budget_line_ttc(l.amount_cents, l.vat_bp) then 'paid'
              else l.status end,
         sum(public.budget_line_ttc(l.amount_cents, l.vat_bp))::bigint,
         count(*)::integer
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    cross join lateral public.finance_line_matched(l.id) m
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
  select l.id, l.label, public.budget_line_ttc(l.amount_cents, l.vat_bp) - m.cents, l.family,
         l.status, l.spent_on, l.project_id, l.artist_id, coalesce(i.due_on, l.due_on),
         coalesce(c.name, sc.name, l.supplier_name)
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    left join public.network_contacts c on c.id = i.contact_id
    left join public.network_contacts sc on sc.id = l.supplier_contact_id
    cross join lateral public.finance_line_matched(l.id) m
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and case p_kind
           when 'to_pay' then l.status = 'invoiced'
                              and m.cents < public.budget_line_ttc(l.amount_cents, l.vat_bp)
           when 'largest' then l.status in ('committed', 'invoiced', 'paid')
                               and (p_from is null or l.spent_on >= p_from)
                               and (p_to is null or l.spent_on <= p_to)
           when 'upcoming' then l.status <> 'paid'
                                and l.refused_at is null
                                and m.cents < public.budget_line_ttc(l.amount_cents, l.vat_bp)
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

-- 5. What a debit can match ---------------------------------------------------------------------
-- Every spend not paid back by the bank yet, with what is left of it TTC,
-- its supplier and day: the candidates of a debit (lib/finance/reconcile.ts).
create or replace function public.finance_match_candidates()
returns table (
  line_id uuid,
  label text,
  left_cents bigint,
  day date,
  supplier text,
  invoice_number text,
  project_id uuid,
  artist_id uuid,
  cost_center_id uuid,
  matched_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.label, public.budget_line_ttc(l.amount_cents, l.vat_bp) - m.cents,
         coalesce(i.due_on, l.due_on, l.spent_on), coalesce(sc.name, l.supplier_name, c.name),
         i.number, l.project_id, l.artist_id, l.cost_center_id, m.cents
    from public.budget_lines l
    left join public.project_invoices i on i.id = l.invoice_id
    left join public.network_contacts c on c.id = i.contact_id
    left join public.network_contacts sc on sc.id = l.supplier_contact_id
    cross join lateral public.finance_line_matched(l.id) m
   where l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance')
     and l.refused_at is null
     and l.status in ('committed', 'invoiced', 'paid')
     and m.cents < public.budget_line_ttc(l.amount_cents, l.vat_bp)
   order by coalesce(i.due_on, l.due_on, l.spent_on) desc
   limit 500;
$$;
revoke execute on function public.finance_match_candidates() from public, anon;
grant execute on function public.finance_match_candidates() to authenticated;
