-- Finance, lot 2 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the client invoices and the credit notes.
--
-- « Une facture est reliée au client, au deal et/ou projet, au budget de
-- recette, au montant HT/TTC, à la date d'émission, à l'échéance et au PDF.
-- États : brouillon, envoyée, partiellement encaissée, encaissée, en retard,
-- annulée ou avoir. » « Relances : afficher échéance, jours de retard,
-- responsable, dernière relance et prochaine action. Aucune relance […]
-- n'est envoyée automatiquement sans validation. »
--
-- An income (lot 1) is the « recette prévue »; its invoice is the claim made
-- from it: one invoice per income, its number, day, due day, sent day, VAT
-- and PDF on the income itself (a second invoice for the same money is a
-- second income). The PDF is the one made by the label's invoicing tool or
-- the accountant: PDS OS keeps it, never writes one (« l'expert-comptable
-- conserve la comptabilité officielle »). The state stays computed by code
-- (lib/finance/money-in.ts), never stored.
--
-- A credit note corrects an invoice for a part not received yet: it lowers
-- what is awaited, never the money that came in. A reminder is what someone
-- did (e-mail, call…), entered after the fact: nothing is sent from here.

-- 1. The invoice of an income -----------------------------------------------------------------
alter table public.finance_incomes
  add column vat_bp integer,
  add column deal_id uuid,
  add column owner_person_id uuid references public.people (id) on delete set null,
  add column sent_on date,
  add column file_path text,
  add column file_name text,
  add column next_action text,
  add column next_action_on date,
  -- VAT in basis points (2000 = 20 %); none for an income entered before.
  add constraint finance_incomes_vat_check check (vat_bp is null or vat_bp between 0 and 10000),
  add constraint finance_incomes_sent_check
    check (sent_on is null or (invoice_number is not null and sent_on >= invoiced_on)),
  add constraint finance_incomes_file_check
    check ((file_path is null) = (file_name is null)),
  add constraint finance_incomes_file_name_check
    check (file_name is null or (btrim(file_name) <> '' and char_length(file_name) <= 200)),
  add constraint finance_incomes_next_action_check
    check (next_action is null or (btrim(next_action) <> '' and char_length(next_action) <= 300)),
  add constraint finance_incomes_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete set null (deal_id);
create index finance_incomes_deal_idx on public.finance_incomes (deal_id)
  where deal_id is not null;

-- 2. Reminders --------------------------------------------------------------------------------
create table public.finance_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  income_id uuid not null,
  reminded_on date not null,
  channel text not null,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_reminders_channel_check
    check (channel in ('email', 'phone', 'meeting', 'letter', 'other')),
  constraint finance_reminders_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 500)),
  constraint finance_reminders_income_same_org
    foreign key (income_id, organization_id) references public.finance_incomes (id, organization_id)
    on delete cascade
);
create index finance_reminders_income_idx on public.finance_reminders (income_id, reminded_on desc);

-- 3. Credit notes -----------------------------------------------------------------------------
create table public.finance_credit_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  income_id uuid not null,
  number text not null,
  issued_on date not null,
  amount_cents bigint not null,
  reason text not null,
  file_path text,
  file_name text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint finance_credit_notes_number_check
    check (btrim(number) <> '' and char_length(number) <= 100),
  constraint finance_credit_notes_amount_check
    check (amount_cents > 0 and amount_cents <= 100000000000),
  constraint finance_credit_notes_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint finance_credit_notes_file_check check ((file_path is null) = (file_name is null)),
  constraint finance_credit_notes_income_same_org
    foreign key (income_id, organization_id) references public.finance_incomes (id, organization_id)
    on delete cascade
);
create index finance_credit_notes_income_idx on public.finance_credit_notes (income_id);

create trigger a_set_created_by before insert on public.finance_reminders
  for each row execute function public.set_created_by();
create trigger a_set_created_by before insert on public.finance_credit_notes
  for each row execute function public.set_created_by();

-- 4. What an income still awaits --------------------------------------------------------------
-- Its amount, less what came in and what credit notes took off. Receipts
-- and credit notes never add up to more than the amount. Read with the
-- session (its RLS): only the Finance writes either.
create or replace function public.finance_income_settled(p_income uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce((select sum(amount_cents) from public.finance_receipts
                    where income_id = p_income), 0)
       + coalesce((select sum(amount_cents) from public.finance_credit_notes
                    where income_id = p_income), 0);
$$;
revoke execute on function public.finance_income_settled(uuid) from public, anon;
grant execute on function public.finance_income_settled(uuid) to authenticated;

create or replace function public.finance_incomes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_received bigint;
  v_credited bigint;
begin
  if old.cancelled_at is not null then
    raise exception 'income_cancelled' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into v_received
    from public.finance_receipts where income_id = new.id;
  select coalesce(sum(amount_cents), 0) into v_credited
    from public.finance_credit_notes where income_id = new.id;
  if new.amount_cents < v_received + v_credited then
    raise exception 'amount_below_received' using errcode = 'P0001';
  end if;
  if new.cancelled_at is not null then
    if v_received > 0 then
      raise exception 'income_has_receipts' using errcode = 'P0001';
    end if;
    if v_credited > 0 then
      raise exception 'income_has_credits' using errcode = 'P0001';
    end if;
    new.cancelled_by := public.auth_person_id();
  end if;
  return new;
end;
$$;

create or replace function public.finance_receipts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_income public.finance_incomes%rowtype;
begin
  select * into v_income from public.finance_incomes
   where id = new.income_id for update;
  if v_income.cancelled_at is not null then
    raise exception 'income_cancelled' using errcode = 'P0001';
  end if;
  if public.finance_income_settled(new.income_id) + new.amount_cents > v_income.amount_cents then
    raise exception 'receipt_over_amount' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- A credit note corrects an invoice that exists, within what it awaits.
create or replace function public.finance_credit_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_income public.finance_incomes%rowtype;
begin
  select * into v_income from public.finance_incomes
   where id = new.income_id for update;
  if v_income.cancelled_at is not null then
    raise exception 'income_cancelled' using errcode = 'P0001';
  end if;
  if v_income.invoice_number is null then
    raise exception 'credit_without_invoice' using errcode = 'P0001';
  end if;
  if new.issued_on < v_income.invoiced_on then
    raise exception 'credit_before_invoice' using errcode = 'P0001';
  end if;
  if public.finance_income_settled(new.income_id) + new.amount_cents > v_income.amount_cents then
    raise exception 'credit_over_amount' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger b_guard before insert on public.finance_credit_notes
  for each row execute function public.finance_credit_notes_guard();

-- 5. History and row security -----------------------------------------------------------------
create trigger z_log after insert or update or delete on public.finance_reminders
  for each row execute function public.log_finance_event();
create trigger z_log after insert or update or delete on public.finance_credit_notes
  for each row execute function public.log_finance_event();

alter table public.finance_reminders enable row level security;
alter table public.finance_reminders force row level security;
alter table public.finance_credit_notes enable row level security;
alter table public.finance_credit_notes force row level security;

revoke all on public.finance_reminders, public.finance_credit_notes from anon, authenticated;
grant select on public.finance_reminders, public.finance_credit_notes to authenticated;
-- A reminder entered by mistake is removed (the history keeps it); a credit
-- note is a document sent to the client: entered, never changed nor removed.
grant insert, delete on public.finance_reminders to authenticated;
grant insert on public.finance_credit_notes to authenticated;

create policy finance_reminders_select on public.finance_reminders
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_reminders_insert on public.finance_reminders
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_reminders_delete on public.finance_reminders
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_finance'));

create policy finance_credit_notes_select on public.finance_credit_notes
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_credit_notes_insert on public.finance_credit_notes
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));

-- 6. Files: the PDF of an invoice, of a credit note ------------------------------------------
-- <organization>/<uuid>.<ext>, uploaded by the browser with the session
-- (lib/finance/upload-file.ts), then named on its row by a server action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finance-files', 'finance-files', false, 20971520,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create or replace function public.finance_file_allowed(p_name text, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.has_permission(((storage.foldername(p_name))[1])::uuid, p_permission);
exception when invalid_text_representation then
  return false;
end;
$$;
revoke execute on function public.finance_file_allowed(text, text) from public, anon;
grant execute on function public.finance_file_allowed(text, text) to authenticated;

create policy finance_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'finance-files'
              and public.finance_file_allowed(objects.name, 'manage_finance'));
create policy finance_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'finance-files'
         and public.finance_file_allowed(objects.name, 'read_finance'));

-- 7. What an income can name ------------------------------------------------------------------
-- Lot 1's projects and artists, plus the deals (« reliée au deal ») and the
-- members who read Finance (« responsable » of an invoice to chase).
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
     and public.has_permission(a.organization_id, 'read_finance')
  union all
  select 'deal', d.id, coalesce(nullif(concat_ws(' · ', a.name, p.title), ''), d.kind),
         d.abandoned_at is not null
    from public.deals d
    left join public.artists a on a.id = d.artist_id
    left join public.projects p on p.id = d.project_id
   where d.organization_id = public.auth_organization_id()
     and public.has_permission(d.organization_id, 'read_finance')
  union all
  select 'member', pe.id, btrim(concat_ws(' ', pe.first_name, pe.last_name)), false
    from public.memberships m
    join public.people pe on pe.id = m.person_id
   where m.organization_id = public.auth_organization_id()
     and public.has_permission(m.organization_id, 'read_finance')
     and m.status = 'approved'
     and 'read_finance' = any (public.role_permissions(m.role));
$$;
