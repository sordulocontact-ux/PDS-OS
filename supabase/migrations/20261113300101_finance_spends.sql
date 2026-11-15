-- Finance, lot 3 of Ibé's ticket « PDS OS — Cockpit Finance » (13/11/2026):
-- the spends, in context.
--
-- « Créer une dépense : libellé, montant HT/TTC ; projet, artiste ou centre
-- de coût ; poste budgétaire et fournisseur ; date prévue et échéance ;
-- statut : prévu, commandé, facturé, payé ; financement, caractère
-- refacturable et justificatif ; valideur et commentaire. » « Création
-- depuis Finance, un projet ou un artiste ; rattachement obligatoire à une
-- enveloppe ou à « hors budget » avec alerte. » « Une dépense refacturable
-- doit créer une recette attendue distincte. »
--
-- A spend stays a budget line (four objects: budget, spend, invoice,
-- payment; a payment never creates a second spend). This lot adds:
--   - the cost centers, envelopes outside any project or artist (« frais de
--     structure »…), the Finance's own;
--   - « hors budget »: a line on no envelope at all, which the overview
--     signals;
--   - on a line: its VAT (the amount stays HT, as every budget), its
--     supplier, its due day, rebillable and the expected income created
--     for it, its validator;
--   - the Finance (manage_finance) enters the spends of its cost centers
--     and « hors budget » from Finance; a project's or an artist's spend is
--     entered from its Budget, by whoever writes it (unchanged rules), and
--     the Finance reads them all (« la direction et la Finance voient
--     l'ensemble ») through finance_spends();
--   - the treasury counts what goes out TTC (HT + VAT) when the VAT is known.

-- 1. Cost centers -----------------------------------------------------------------------------
create table public.finance_cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  budget_cents bigint,
  archived_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_cost_centers_id_org_key unique (id, organization_id),
  constraint finance_cost_centers_name_check
    check (btrim(name) <> '' and char_length(name) <= 120),
  constraint finance_cost_centers_budget_check
    check (budget_cents is null or (budget_cents >= 0 and budget_cents <= 100000000000))
);
create unique index finance_cost_centers_name_key
  on public.finance_cost_centers (organization_id, lower(name)) where archived_at is null;

create trigger a_set_created_by before insert on public.finance_cost_centers
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_cost_centers
  for each row execute function public.set_updated_at();
create trigger z_log after insert or update or delete on public.finance_cost_centers
  for each row execute function public.log_finance_event();

alter table public.finance_cost_centers enable row level security;
alter table public.finance_cost_centers force row level security;
revoke all on public.finance_cost_centers from anon, authenticated;
grant select, insert, update on public.finance_cost_centers to authenticated;
create policy finance_cost_centers_select on public.finance_cost_centers
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_cost_centers_insert on public.finance_cost_centers
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_cost_centers_update on public.finance_cost_centers
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));

-- 2. A spend in context -----------------------------------------------------------------------
alter table public.budget_lines
  add column cost_center_id uuid,
  add column off_budget boolean not null default false,
  add column vat_bp integer,
  add column supplier_contact_id uuid,
  add column supplier_name text,
  add column due_on date,
  add column rebillable boolean not null default false,
  -- The proof of a Finance spend (cost center, « hors budget »), in the
  -- bucket finance-files: a project's or an artist's keeps its library.
  add column proof_path text,
  add column proof_name text,
  add column validator_person_id uuid references public.people (id) on delete set null,
  add constraint budget_lines_cost_center_same_org
    foreign key (cost_center_id, organization_id)
    references public.finance_cost_centers (id, organization_id),
  add constraint budget_lines_supplier_same_org
    foreign key (supplier_contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete set null (supplier_contact_id),
  add constraint budget_lines_vat_check check (vat_bp is null or vat_bp between 0 and 10000),
  add constraint budget_lines_supplier_name_check
    check (supplier_name is null or (btrim(supplier_name) <> '' and char_length(supplier_name) <= 200)),
  add constraint budget_lines_proof_check check ((proof_path is null) = (proof_name is null)),
  add constraint budget_lines_proof_name_check
    check (proof_name is null or (btrim(proof_name) <> '' and char_length(proof_name) <= 200));
create index budget_lines_cost_center_idx on public.budget_lines (cost_center_id)
  where cost_center_id is not null;

-- One envelope, or « hors budget » (none at all).
alter table public.budget_lines drop constraint budget_lines_one_owner;
alter table public.budget_lines add constraint budget_lines_one_owner
  check (num_nonnulls(project_id, artist_id, cost_center_id) = case when off_budget then 0 else 1 end);

grant insert (cost_center_id, off_budget, vat_bp, supplier_contact_id, supplier_name, due_on,
              rebillable, proof_path, proof_name, validator_person_id)
  on public.budget_lines to authenticated;
grant update (vat_bp, supplier_contact_id, supplier_name, due_on, rebillable, proof_path, proof_name,
              validator_person_id)
  on public.budget_lines to authenticated;

-- « Une dépense refacturable doit créer une recette attendue distincte »:
-- the expected income says which spend it rebills (the Finance owns it; the
-- spend stays its envelope's). A rebillable spend with no live income
-- rebilling it is signalled on the overview.
alter table public.finance_incomes
  add column source_line_id uuid references public.budget_lines (id) on delete set null;
create index finance_incomes_source_line_idx on public.finance_incomes (source_line_id)
  where source_line_id is not null;

-- The Finance writes the spends of its cost centers and those « hors
-- budget », which have no project nor artist. A project's or an artist's
-- spends keep their rules (its owner writes; the direction reads and
-- validates, never writes; budget.test.sql): the Finance reads them through
-- finance_spends(). The history keeps each change of every line.
create policy budget_lines_select_finance on public.budget_lines
  for select to authenticated
  using (project_id is null and artist_id is null
         and public.has_permission(organization_id, 'read_finance'));
create policy budget_lines_insert_finance on public.budget_lines
  for insert to authenticated
  with check (project_id is null and artist_id is null
              and public.has_permission(organization_id, 'manage_finance'));
create policy budget_lines_update_finance on public.budget_lines
  for update to authenticated
  using (project_id is null and artist_id is null
         and public.has_permission(organization_id, 'manage_finance'))
  with check (project_id is null and artist_id is null
              and public.has_permission(organization_id, 'manage_finance'));
create policy budget_lines_delete_finance on public.budget_lines
  for delete to authenticated
  using (project_id is null and artist_id is null
         and public.has_permission(organization_id, 'manage_finance'));

create trigger z_finance_log after insert or update or delete on public.budget_lines
  for each row execute function public.log_finance_event();

-- 3. What goes out, TTC -----------------------------------------------------------------------
-- A line's money out: its HT plus its VAT when known (an old line, HT only,
-- counts as it is).
create or replace function public.budget_line_ttc(p_amount bigint, p_vat integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select round(p_amount * (10000 + coalesce(p_vat, 0)) / 10000.0)::bigint;
$$;

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

-- 4. Every spend, for Finance › Dépenses ------------------------------------------------------
-- One row per line of the organization, for whoever reads Finance: where it
-- goes (project, artist, cost center or none), from whom, when, its state,
-- its proof and its rebilling. The lines keep their own rules for writing.
create or replace function public.finance_spends()
returns table (
  line_id uuid,
  label text,
  amount_cents bigint,
  vat_bp integer,
  family text,
  family_detail text,
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
  select l.id, l.label, l.amount_cents, l.vat_bp, l.family, l.family_detail, l.status,
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

-- 5. Names --------------------------------------------------------------------------------------
-- Lot 2's targets, plus the cost centers.
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
     and 'read_finance' = any (public.role_permissions(m.role))
  union all
  select 'cost_center', cc.id, cc.name, cc.archived_at is not null
    from public.finance_cost_centers cc
   where cc.organization_id = public.auth_organization_id()
     and public.has_permission(cc.organization_id, 'read_finance');
$$;
