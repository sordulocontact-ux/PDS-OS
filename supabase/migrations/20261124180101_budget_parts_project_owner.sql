-- A project's owner files the spends of their project in its sub-budgets (Sacha, 24/11/2026:
-- « ajouter une dépense dans le sous-budget marketing de Ciel ouvert » in one gesture).
--
-- Until now only the Finance read the parts and put a spend in one (20261120120101): a
-- project's spends, written by its owner alone, reached « Hors sous-budget » and waited for the
-- Finance to file them. The owner now reads the parts of the projects they own and puts their
-- spends in one, from the spend form. Cutting a budget (writing the parts) stays the Finance's.
--
-- And the Finance cuts a project's budget even when it does not see the project: the check of the
-- budget a part cuts read the project with the session, so a business manager (no
-- view_all_projects) got « part_unknown_budget » on « Découper ce budget ».

-- 0. The budget a part cuts is checked whatever the writer sees ---------------------------------
alter function public.check_budget_part() security definer;

-- 1. The owner reads the parts of their projects ------------------------------------------------
drop policy finance_budget_parts_select on public.finance_budget_parts;
create policy finance_budget_parts_select on public.finance_budget_parts
  for select to authenticated
  using (public.has_permission(organization_id, 'read_finance')
         or (target_kind = 'project' and public.is_project_owner(target_id)));

-- 2. And puts a spend of their project in one of its parts, or takes it out --------------------
create or replace function public.assign_budget_part(p_line_ids uuid[], p_part_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_organization_id();
  v_finance boolean;
  v_part public.finance_budget_parts;
  v_count integer;
begin
  if v_org is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_finance := public.has_permission(v_org, 'manage_finance');
  if p_part_id is not null then
    select * into v_part from public.finance_budget_parts
     where id = p_part_id and organization_id = v_org;
    if not found
       or not (v_finance
               or (v_part.target_kind = 'project' and public.is_project_owner(v_part.target_id))) then
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
  -- Anyone but the Finance moves only the spends of the projects they own.
  if not v_finance and exists (
    select 1 from public.budget_lines l
     where l.id = any (p_line_ids)
       and (l.organization_id <> v_org
            or l.project_id is null
            or not public.is_project_owner(l.project_id))) then
    raise exception 'forbidden' using errcode = '42501';
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

-- 3. And reads which part each spend of their projects is in -----------------------------------
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
     and (public.has_permission(l.organization_id, 'read_finance')
          or (l.project_id is not null and public.is_project_owner(l.project_id)));
$$;
revoke execute on function public.finance_budget_part_lines() from public, anon;
grant execute on function public.finance_budget_part_lines() to authenticated;
