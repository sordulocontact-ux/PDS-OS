-- Finance, lot 4 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the detailed budgets.
--
-- « Chaque enveloppe affiche : budget initial, révisions, prévu, engagé,
-- facturé, payé, reste disponible, remboursable/refacturable et écart au
-- prévisionnel. Le camembert montre la répartition par poste. » « J4Y : part
-- financée par PDS réglable de 0 à 100 %. » « Dioo : saisie ou import ligne
-- par ligne, total automatique et comparaison au réel. » « PDS MIC 7 600 € /
-- émission : modèle réutilisable par émission. » « Les postes et sous-postes
-- doivent pouvoir être saisis manuellement ou importés. » « Toute exception,
-- révision ou dépassement est validé et tracé. »
--
-- This lot adds:
--   - the forecast of a line: its amount when it was entered, kept when the
--     line is then engaged, invoiced or paid at another amount (« écart au
--     prévisionnel » = what the lines cost now less what they were forecast);
--   - the sub-post of a line (« sous-poste »), under its poste (family);
--   - the revisions of an envelope (project, artist, cost center), traced by
--     trigger: before, after, who, when, and why when given;
--   - the share PDS finances of an envelope (100 % by default);
--   - the templates of an envelope (lines to copy into a new cost center,
--     an emission, a live, a shooting).

-- 1. A line's forecast and sub-post -----------------------------------------------------------
alter table public.budget_lines
  add column forecast_cents bigint,
  add column subpost text,
  add constraint budget_lines_forecast_check
    check (forecast_cents is null or forecast_cents >= 0),
  add constraint budget_lines_subpost_check
    check (subpost is null or (btrim(subpost) <> '' and char_length(subpost) <= 120));
update public.budget_lines set forecast_cents = amount_cents where forecast_cents is null;

create or replace function public.budget_line_forecast()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.forecast_cents := coalesce(new.forecast_cents, new.amount_cents);
  return new;
end;
$$;
create trigger a_forecast before insert on public.budget_lines
  for each row execute function public.budget_line_forecast();

-- The forecast is set once, by the trigger: never written by a client.
grant insert (subpost) on public.budget_lines to authenticated;
grant update (subpost) on public.budget_lines to authenticated;

-- 2. Revisions of an envelope -----------------------------------------------------------------
create table public.budget_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  target_kind text not null,
  target_id uuid not null,
  before_cents bigint,
  after_cents bigint,
  reason text,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint budget_revisions_kind_check
    check (target_kind in ('project', 'artist_budget', 'cost_center'))
);
create index budget_revisions_target_idx on public.budget_revisions (target_id, created_at);

alter table public.budget_revisions enable row level security;
alter table public.budget_revisions force row level security;
revoke all on public.budget_revisions from anon, authenticated;
grant select on public.budget_revisions to authenticated;
create policy budget_revisions_select on public.budget_revisions
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));

-- Written by trigger on every change of an envelope's amount; the reason
-- comes from revise_cost_center() (the session's setting), else none.
create or replace function public.log_budget_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before bigint;
  v_after bigint;
  v_kind text;
begin
  if tg_table_name = 'projects' then
    v_kind := 'project'; v_before := old.budget_cents; v_after := new.budget_cents;
  elsif tg_table_name = 'artist_budgets' then
    v_kind := 'artist_budget'; v_before := old.amount_cents; v_after := new.amount_cents;
  else
    v_kind := 'cost_center'; v_before := old.budget_cents; v_after := new.budget_cents;
  end if;
  if v_before is distinct from v_after then
    insert into public.budget_revisions (organization_id, target_kind, target_id, before_cents,
                                         after_cents, reason, actor_person_id)
    values (new.organization_id, v_kind, new.id, v_before, v_after,
            nullif(current_setting('pds.revision_reason', true), ''),
            public.auth_person_id());
  end if;
  return new;
end;
$$;
revoke execute on function public.log_budget_revision() from public, anon, authenticated;

create trigger z_budget_revision after update of budget_cents on public.projects
  for each row execute function public.log_budget_revision();
create trigger z_budget_revision after update of amount_cents on public.artist_budgets
  for each row execute function public.log_budget_revision();
create trigger z_budget_revision after update of budget_cents on public.finance_cost_centers
  for each row execute function public.log_budget_revision();

-- « Réviser l'enveloppe » of a cost center, with its reason.
create or replace function public.revise_cost_center(p_id uuid, p_cents bigint, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 500 then
    raise exception 'revision_reason_required' using errcode = 'P0001';
  end if;
  perform set_config('pds.revision_reason', btrim(p_reason), true);
  update public.finance_cost_centers set budget_cents = p_cents where id = p_id;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform set_config('pds.revision_reason', '', true);
end;
$$;
revoke execute on function public.revise_cost_center(uuid, bigint, text) from public, anon;
grant execute on function public.revise_cost_center(uuid, bigint, text) to authenticated;

-- 3. The share PDS finances -------------------------------------------------------------------
create table public.finance_envelope_shares (
  organization_id uuid not null references public.organizations (id),
  target_kind text not null,
  target_id uuid not null,
  pds_share_bp integer not null default 10000,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, target_kind, target_id),
  -- Its id, for the history.
  id uuid not null default gen_random_uuid() unique,
  constraint finance_envelope_shares_kind_check
    check (target_kind in ('project', 'artist', 'cost_center')),
  constraint finance_envelope_shares_bp_check check (pds_share_bp between 0 and 10000)
);
create trigger a_stamp before insert or update on public.finance_envelope_shares
  for each row execute function public.treasury_settings_stamp();
create trigger z_log after insert or update or delete on public.finance_envelope_shares
  for each row execute function public.log_finance_event();

alter table public.finance_envelope_shares enable row level security;
alter table public.finance_envelope_shares force row level security;
revoke all on public.finance_envelope_shares from anon, authenticated;
grant select, insert, update on public.finance_envelope_shares to authenticated;
create policy finance_envelope_shares_select on public.finance_envelope_shares
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_envelope_shares_insert on public.finance_envelope_shares
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_envelope_shares_update on public.finance_envelope_shares
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

-- 4. Templates --------------------------------------------------------------------------------
-- Lines to copy into a new envelope: [{label, family, subpost, amount_cents}].
create table public.finance_budget_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  lines jsonb not null,
  archived_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_budget_templates_name_check
    check (btrim(name) <> '' and char_length(name) <= 120),
  constraint finance_budget_templates_lines_check
    check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 200)
);
create trigger a_set_created_by before insert on public.finance_budget_templates
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_budget_templates
  for each row execute function public.set_updated_at();
create trigger z_log after insert or update or delete on public.finance_budget_templates
  for each row execute function public.log_finance_event();

alter table public.finance_budget_templates enable row level security;
alter table public.finance_budget_templates force row level security;
revoke all on public.finance_budget_templates from anon, authenticated;
grant select, insert, update on public.finance_budget_templates to authenticated;
create policy finance_budget_templates_select on public.finance_budget_templates
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_budget_templates_insert on public.finance_budget_templates
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_budget_templates_update on public.finance_budget_templates
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

-- 5. Every spend, with its forecast and sub-post ----------------------------------------------
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
  created_at timestamptz
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
         l.refused_at is not null, l.created_at
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
