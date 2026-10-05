-- Juridique: the plan's actions become tasks (docs/ARCHITECTURE.md
-- § 8 sexies, Sacha's feedback of 04/10/2026: « c'est du travail à donner ? »).
--
--   * legal_plan_items.why: the one sentence that says why an action exists,
--     written by code with the plain label;
--   * tasks.legal_plan_item_id: the task of the project's Travail an action
--     became; launch_legal_plan creates one per action to start now with a
--     responsible, due on its date or the project's;
--   * create_legal_plan_task: the task of an action freed later, created on
--     demand from the Suivi (an explicit click, never a hidden write).
-- A task is ticked by its person as any task; the Suivi says when the
-- action is really done (its sources) and offers to tick it.

alter table public.legal_plan_items add column why text;
alter table public.legal_plan_items
  add constraint legal_plan_items_why_check check (why is null or char_length(why) <= 500);

alter table public.tasks
  add column legal_plan_item_id uuid references public.legal_plan_items (id) on delete set null;
create index tasks_legal_plan_item_idx on public.tasks (legal_plan_item_id)
  where legal_plan_item_id is not null;

create or replace function public.launch_legal_plan(p_project_id uuid, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_plan uuid;
  v_item jsonb;
  v_responsible uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.legal_intakes
     where project_id = p_project_id and status = 'confirmed'
  ) then
    raise exception 'legal_intake_not_confirmed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_plans where project_id = p_project_id) then
    raise exception 'legal_plan_already_launched' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 200 then
    raise exception 'legal_plan_items_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_plans
    (organization_id, project_id, status, confirmed_by, confirmed_at, launched_by, launched_at)
  values (v_org, p_project_id, 'active', v_person, now(), v_person, now())
  returning id into v_plan;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_responsible := nullif(v_item ->> 'responsible_person_id', '')::uuid;
    -- A responsible holds manage_legal in this organization.
    if v_responsible is not null
       and not public.person_has_permission(v_org, v_responsible, 'manage_legal') then
      raise exception 'legal_plan_responsible_invalid' using errcode = 'P0001';
    end if;
    insert into public.legal_plan_items
      (organization_id, plan_id, project_id, item_key, kind, master_id, label, detail, why,
       status, depends_on, responsible_person_id, due_on)
    values (
      v_org, v_plan, p_project_id, v_item ->> 'key', v_item ->> 'kind',
      nullif(v_item ->> 'master_id', '')::uuid, v_item ->> 'label', v_item ->> 'detail',
      v_item ->> 'why', v_item ->> 'status',
      coalesce(array(select jsonb_array_elements_text(v_item -> 'depends_on')), '{}'),
      v_responsible, nullif(v_item ->> 'due_on', '')::date);
  end loop;

  -- A task in the project's Travail for every action to start now that has
  -- a responsible: assigned to them (notified by tasks_notify), due on the
  -- action's date, else the project's. Without a date, no task (the server
  -- action asks for one before launching).
  insert into public.tasks
    (organization_id, project_id, title, assignee_person_id, due_date, created_by,
     legal_plan_item_id)
  select i.organization_id, i.project_id, i.label, i.responsible_person_id,
         coalesce(i.due_on, p.due_date), v_person, i.id
    from public.legal_plan_items i
    join public.projects p on p.id = i.project_id
   where i.plan_id = v_plan
     and i.status = 'action_now'
     and i.responsible_person_id is not null
     and coalesce(i.due_on, p.due_date) is not null;

  return v_plan;
end;
$$;


create or replace function public.create_legal_plan_task(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.legal_plan_items%rowtype;
  v_person uuid := public.auth_person_id();
  v_due date;
  v_task uuid;
begin
  select * into v_item from public.legal_plan_items where id = p_item_id;
  if not found or v_person is null
     or not public.has_permission(v_item.organization_id, 'manage_legal')
     or not public.can_see_project(v_item.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_item.responsible_person_id is null then
    raise exception 'legal_task_responsible_missing' using errcode = 'P0001';
  end if;
  select coalesce(v_item.due_on, p.due_date) into v_due
    from public.projects p where p.id = v_item.project_id;
  if v_due is null then
    raise exception 'legal_task_due_missing' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tasks where legal_plan_item_id = p_item_id) then
    raise exception 'legal_task_exists' using errcode = 'P0001';
  end if;

  insert into public.tasks
    (organization_id, project_id, title, assignee_person_id, due_date, created_by,
     legal_plan_item_id)
  values (v_item.organization_id, v_item.project_id, v_item.label,
          v_item.responsible_person_id, v_due, v_person, v_item.id)
  returning id into v_task;
  return v_task;
end;
$$;

revoke execute on function public.create_legal_plan_task(uuid) from public, anon;
grant execute on function public.create_legal_plan_task(uuid) to authenticated;
