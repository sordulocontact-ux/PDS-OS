-- A workflow left out of the Plan du Projet (removed before « Lancer le
-- plan », or never proposed) could never start: the plan launches once and
-- « Lancer maintenant » only updated an existing item. Now it adds the
-- workflow to the launched plan, in Focus, owned by the person who launches
-- it, then starts it (audit of 07/10/2026; docs/ARCHITECTURE.md § 6 ter).
-- A removed Stratégie no longer blocks Conception and Sortie for good.

drop function public.launch_plan_workflow(uuid, text);

create function public.launch_plan_workflow(
  p_project_id uuid,
  p_workflow text,
  -- Title and reason of the item when the plan does not hold the workflow
  -- yet (written by code, lib/plan/actions.ts); ignored otherwise.
  p_title text default null,
  p_why text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_plan uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_workflow is null or p_workflow not in ('strategy', 'master', 'legal') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  select p.id, p.organization_id into v_plan, v_org
    from public.project_plans p where p.project_id = p_project_id for update;
  if not found then
    raise exception 'plan_required';
  end if;

  if not exists (select 1 from public.project_plan_items
                 where plan_id = v_plan and workflow = p_workflow) then
    if p_title is null or btrim(p_title) = '' then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    insert into public.project_plan_items
      (organization_id, plan_id, project_id, column_key, workflow, title, why,
       owner_person_id, position, launched_at, launched_by)
    select v_org, v_plan, p_project_id, 'focus', p_workflow, btrim(p_title),
           nullif(btrim(coalesce(p_why, '')), ''), public.auth_person_id(),
           coalesce(max(i.position), -1) + 1, now(), public.auth_person_id()
      from public.project_plan_items i where i.plan_id = v_plan;
  else
    update public.project_plan_items
       set launched_at = now(), launched_by = public.auth_person_id()
     where plan_id = v_plan and workflow = p_workflow and launched_at is null;
    if not found then
      raise exception 'invalid_transition';
    end if;
  end if;

  if p_workflow = 'strategy' then
    perform public.start_strategy_stage(p_project_id);
  end if;
end;
$$;
