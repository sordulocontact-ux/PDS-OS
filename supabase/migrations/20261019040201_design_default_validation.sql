-- Conception, validation as the proto shows it (« Responsable : … ·
-- validation : Claire Morel », docs/ARCHITECTURE.md § 8 decies): the
-- direction of the label validates the artistic direction and every Fiche
-- Livrable, without a setting to fill first. The validators stay a list
-- (design_validators) the project's owner can change in « Qui fait quoi »
-- (ticket: « Chef de projet : désigne responsables et validateurs »); they
-- are only filled by default. One decision on what was submitted
-- (« global »), never one per section by default.

alter table public.design_workspaces alter column validation_mode set default 'global';
update public.design_workspaces set validation_mode = 'global' where validation_mode <> 'global';

-- The holders of « validate » (the direction) become the validators of a
-- scope that has none. Internal: called by start_design and by the sheets'
-- trigger, never by a person.
create function public.design_default_validators(
  p_project_id uuid, p_scope text, p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or exists (
       select 1 from public.design_validators v
        where v.project_id = p_project_id and v.scope = p_scope
          and v.sheet_id is not distinct from p_sheet_id) then
    return;
  end if;
  insert into public.design_validators (organization_id, project_id, scope, sheet_id, person_id)
  select distinct v_org, p_project_id, p_scope, p_sheet_id, m.person_id
    from public.memberships m
   where m.organization_id = v_org and m.status = 'approved'
     and public.person_has_permission(v_org, m.person_id, 'validate');
end;
$$;

revoke all on function public.design_default_validators(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.start_design(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_stage public.project_stages%rowtype;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;
  select s.* into v_stage from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.project_id = p_project_id and d.key = 'design'
   for update of s;
  if not found then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state = 'not_started' then
    update public.project_stages
       set state = 'in_progress', state_changed_at = now(),
           state_changed_by = public.auth_person_id()
     where id = v_stage.id;
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.design_workspaces (project_id, organization_id, started_at, started_by)
  values (p_project_id, v_org, now(), public.auth_person_id())
  on conflict (project_id) do nothing;
  perform public.design_default_validators(p_project_id, 'direction', null);
end;
$$;

-- Every new sheet gets the direction as its validators.
create function public.design_sheets_default_validators()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.design_default_validators(new.project_id, 'sheet', new.id);
  return null;
end;
$$;

revoke all on function public.design_sheets_default_validators() from public, anon, authenticated;

create trigger z_default_validators after insert on public.design_sheets
  for each row execute function public.design_sheets_default_validators();

-- Projects already in their Conception.
do $$
declare
  r record;
begin
  for r in select w.project_id from public.design_workspaces w loop
    perform public.design_default_validators(r.project_id, 'direction', null);
  end loop;
  for r in select s.project_id, s.id from public.design_sheets s loop
    perform public.design_default_validators(r.project_id, 'sheet', r.id);
  end loop;
end;
$$;
