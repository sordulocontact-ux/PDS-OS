-- Finance, Ibé's retours of 18/11/2026 (« supprimer un budget qui n'est pas celui d'un projet »,
-- « découper un budget en sous-budgets »).
--
--   1. A budget made by hand (a cost center) is removed by the Finance: deleted when nothing
--      uses it, archived (out of the list, its spends kept) when a spend or a planned show
--      still does. A project's or an artist's budget is never removed from here: the first
--      goes with its project (delete_records), the second with its artist.
--   2. A budget is cut into named parts with an amount (« 20 000 € : 10 000 marketing,
--      10 000 enregistrement »). « Envelope » already means a whole budget in the code, so a
--      slice is a *part*. A spend joins a part (budget_lines.part_id); what a part spent is
--      computed by code from its spends, never stored. The sum of the parts may stay below the
--      budget (the rest is unallocated) and is never refused when above (a budget can be
--      revised under its parts: the page says « Dépassé »).
--
-- Who: the Finance (manage_finance) writes the parts and removes a cost center; the Finance
-- reads (read_finance). A part is written like the other settings of a budget (the PDS share):
-- directly, under RLS. Putting a spend in a part is a function, because a project's or an
-- artist's spends are written by their owners only, yet the Finance sorts every budget.

-- 1. The parts of a budget ---------------------------------------------------------------------
create table public.finance_budget_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  -- The budget cut: a project, an artist or a cost center (no key, like the PDS share).
  target_kind text not null,
  target_id uuid not null,
  name text not null,
  amount_cents bigint not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_budget_parts_id_org_key unique (id, organization_id),
  constraint finance_budget_parts_kind_check
    check (target_kind in ('project', 'artist', 'cost_center')),
  constraint finance_budget_parts_name_check
    check (btrim(name) <> '' and char_length(name) <= 120),
  constraint finance_budget_parts_amount_check
    check (amount_cents >= 0 and amount_cents <= 100000000000)
);
create unique index finance_budget_parts_name_key
  on public.finance_budget_parts (organization_id, target_kind, target_id, lower(name));
create index finance_budget_parts_target_idx
  on public.finance_budget_parts (target_id, target_kind);

create trigger a_set_created_by before insert on public.finance_budget_parts
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.finance_budget_parts
  for each row execute function public.set_updated_at();
create trigger z_log after insert or update or delete on public.finance_budget_parts
  for each row execute function public.log_finance_event();

-- The budget exists in the organization; neither its kind nor its target changes.
create or replace function public.check_budget_part()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_known boolean;
begin
  if tg_op = 'UPDATE' then
    if (new.target_kind, new.target_id, new.organization_id)
         is distinct from (old.target_kind, old.target_id, old.organization_id) then
      raise exception 'part_target_fixed' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.target_kind = 'project' then
    select exists (select 1 from public.projects p
                    where p.id = new.target_id and p.organization_id = new.organization_id)
      into v_known;
  elsif new.target_kind = 'artist' then
    select exists (select 1 from public.artists a
                    where a.id = new.target_id and a.organization_id = new.organization_id)
      into v_known;
  else
    select exists (select 1 from public.finance_cost_centers c
                    where c.id = new.target_id and c.organization_id = new.organization_id)
      into v_known;
  end if;
  if not v_known then
    raise exception 'part_unknown_budget' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_budget_part() from public, anon, authenticated;
create trigger b_check before insert or update on public.finance_budget_parts
  for each row execute function public.check_budget_part();

alter table public.finance_budget_parts enable row level security;
alter table public.finance_budget_parts force row level security;
revoke all on public.finance_budget_parts from anon, authenticated;
grant select, delete on public.finance_budget_parts to authenticated;
grant insert (organization_id, target_kind, target_id, name, amount_cents)
  on public.finance_budget_parts to authenticated;
grant update (name, amount_cents) on public.finance_budget_parts to authenticated;
create policy finance_budget_parts_select on public.finance_budget_parts
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));
create policy finance_budget_parts_insert on public.finance_budget_parts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_budget_parts_update on public.finance_budget_parts
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_finance'))
  with check (public.has_permission(organization_id, 'manage_finance'));
create policy finance_budget_parts_delete on public.finance_budget_parts
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_finance'));

-- A project or an artist deleted takes its parts with it (deleted from their own function,
-- after their spends, which have left the parts by then).
create or replace function public.drop_budget_parts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.finance_budget_parts
   where target_id = old.id and target_kind = tg_argv[0];
  return old;
end;
$$;
revoke execute on function public.drop_budget_parts() from public, anon, authenticated;
create trigger z_drop_parts after delete on public.projects
  for each row execute function public.drop_budget_parts('project');
create trigger z_drop_parts after delete on public.artists
  for each row execute function public.drop_budget_parts('artist');

-- 2. A spend in a part -------------------------------------------------------------------------
-- A part removed lets its spends go back to « non réparti ».
alter table public.budget_lines
  add column part_id uuid,
  add constraint budget_lines_part_same_org
    foreign key (part_id, organization_id)
    references public.finance_budget_parts (id, organization_id) on delete set null (part_id);
create index budget_lines_part_idx on public.budget_lines (part_id) where part_id is not null;

-- Never written by a client: only assign_budget_part() sets it (no column grant).

-- « Rattacher » spends to a part of their budget, or take them out (p_part_id null). The
-- Finance only; every line must belong to the budget the part cuts.
create or replace function public.assign_budget_part(p_line_ids uuid[], p_part_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_organization_id();
  v_part public.finance_budget_parts;
  v_count integer;
begin
  if v_org is null or not public.has_permission(v_org, 'manage_finance') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_part_id is not null then
    select * into v_part from public.finance_budget_parts
     where id = p_part_id and organization_id = v_org;
    if not found then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.budget_lines l
       where l.id = any (p_line_ids)
         and (l.organization_id <> v_org
              or not (case v_part.target_kind
                        when 'project' then l.project_id
                        when 'artist' then l.artist_id
                        else l.cost_center_id end = v_part.target_id))) then
      raise exception 'part_other_budget' using errcode = 'P0001';
    end if;
  end if;
  update public.budget_lines set part_id = p_part_id
   where id = any (p_line_ids) and organization_id = v_org
     and part_id is distinct from p_part_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.assign_budget_part(uuid[], uuid) from public, anon;
grant execute on function public.assign_budget_part(uuid[], uuid) to authenticated;

-- The part of every spend that has one, for whoever reads Finance (a project's or an artist's
-- lines are not readable by table).
create or replace function public.finance_budget_part_lines()
returns table (line_id uuid, part_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.part_id
    from public.budget_lines l
   where l.part_id is not null
     and l.organization_id = public.auth_organization_id()
     and public.has_permission(l.organization_id, 'read_finance');
$$;
revoke execute on function public.finance_budget_part_lines() from public, anon;
grant execute on function public.finance_budget_part_lines() to authenticated;

-- 3. Removing a budget made by hand ------------------------------------------------------------
-- 'deleted' when nothing uses it, 'archived' when a spend or a planned show does (the
-- archived budget leaves the list; its spends and its history stay readable).
create or replace function public.remove_cost_center(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.finance_cost_centers where id = p_id;
  if v_org is null or not public.has_permission(v_org, 'manage_finance') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.budget_lines where cost_center_id = p_id)
     or exists (select 1 from public.finance_shows
                 where cost_center_id = p_id and cancelled_at is null) then
    update public.finance_cost_centers set archived_at = coalesce(archived_at, now())
     where id = p_id;
    return 'archived';
  end if;
  begin
    delete from public.finance_budget_parts where target_kind = 'cost_center' and target_id = p_id;
    delete from public.finance_envelope_shares where target_kind = 'cost_center' and target_id = p_id;
    delete from public.finance_cost_centers where id = p_id;
    return 'deleted';
  exception when foreign_key_violation then
    -- Something this function does not know of points at it: archived, never lost.
    update public.finance_cost_centers set archived_at = coalesce(archived_at, now())
     where id = p_id;
    return 'archived';
  end;
end;
$$;
revoke execute on function public.remove_cost_center(uuid) from public, anon;
grant execute on function public.remove_cost_center(uuid) to authenticated;
