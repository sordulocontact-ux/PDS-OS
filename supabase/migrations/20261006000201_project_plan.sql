-- Plan du Projet (ticket « Cadrage intelligent », § 9 ; docs/ARCHITECTURE.md
-- § 6 ter). Once the Brief is validated, the code proposes what starts now,
-- what follows, what runs in parallel and what to anticipate; a person edits
-- it and « Lancer le plan » records it and launches the workflows it starts.
-- Nothing is launched silently: Stratégie, Master and Juridique wait for the
-- plan (decision of 06/10/2026), except where one had already begun.

create table public.project_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The validated version the plan was built from (none for a Cadrage
  -- validated before the Brief had versions).
  brief_id uuid references public.framing_briefs (id),
  launched_by uuid references public.people (id),
  launched_at timestamptz not null default now(),
  constraint project_plans_project_key unique (project_id),
  constraint project_plans_id_org_key unique (id, organization_id),
  constraint project_plans_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);

create table public.project_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plan_id uuid not null,
  project_id uuid not null,
  column_key text not null,
  workflow text,
  title text not null,
  why text,
  owner_person_id uuid references public.people (id),
  position integer not null default 0,
  launched_at timestamptz,
  launched_by uuid references public.people (id),
  constraint project_plan_items_column_check
    check (column_key in ('focus', 'next', 'meanwhile', 'anticipate')),
  constraint project_plan_items_workflow_check
    check (workflow is null or workflow in ('strategy', 'master', 'legal', 'design', 'delivery')),
  constraint project_plan_items_title_check check (btrim(title) <> '' and char_length(title) <= 200),
  constraint project_plan_items_why_check check (why is null or char_length(why) <= 500),
  -- Only the three workflows that wait for the plan are ever launched.
  constraint project_plan_items_launchable
    check (launched_at is null or workflow in ('strategy', 'master', 'legal')),
  constraint project_plan_items_plan_same_org foreign key (plan_id, organization_id)
    references public.project_plans (id, organization_id) on delete cascade,
  constraint project_plan_items_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create unique index project_plan_items_workflow_key on public.project_plan_items (plan_id, workflow)
  where workflow is not null;
create index project_plan_items_project_idx on public.project_plan_items (project_id, workflow);

alter table public.project_plans enable row level security;
alter table public.project_plans force row level security;
alter table public.project_plan_items enable row level security;
alter table public.project_plan_items force row level security;
grant select on public.project_plans, public.project_plan_items to authenticated;
create policy project_plans_select_visible on public.project_plans
  for select to authenticated using (public.can_see_project(project_id));
create policy project_plan_items_select_visible on public.project_plan_items
  for select to authenticated using (public.can_see_project(project_id));

-- Whether a workflow may be worked on: launched from the plan, or already
-- begun before the plan existed (a Master brief or source, a Cadrage
-- juridique, a Stratégie started).
create function public.workflow_is_launched(p_project_id uuid, p_workflow text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project(p_project_id) and (
    exists (select 1 from public.project_plan_items i
            where i.project_id = p_project_id and i.workflow = p_workflow
              and i.launched_at is not null)
    or (p_workflow = 'strategy' and exists (
          select 1 from public.project_stages s
          join public.stage_definitions d on d.id = s.stage_definition_id
          where s.project_id = p_project_id and d.key = 'launch_strategy'
            and s.state <> 'not_started'))
    or (p_workflow = 'master' and (
          exists (select 1 from public.master_briefs b where b.project_id = p_project_id)
          or exists (select 1 from public.master_flow_sources f where f.project_id = p_project_id)))
    or (p_workflow = 'legal' and exists (
          select 1 from public.legal_intakes l where l.project_id = p_project_id))
  );
$$;

-- Starts the Stratégie stage of a project (inside the plan's functions).
create function public.start_strategy_stage(p_project_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.project_stages s
     set state = 'in_progress', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
    from public.stage_definitions d
   where d.id = s.stage_definition_id and s.project_id = p_project_id
     and d.key = 'launch_strategy' and s.state = 'not_started';
$$;
revoke execute on function public.start_strategy_stage(uuid) from public, anon, authenticated;

-- « Lancer le plan »: the plan as the person left it, once. Each item names
-- its column, title, reason and owner; the workflows placed in Focus or
-- Pendant ce temps start now, the others wait for « Lancer maintenant ».
create function public.launch_project_plan(p_project_id uuid, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_plan uuid;
  v_brief uuid;
  v_item jsonb;
  v_position integer := 0;
  v_column text;
  v_workflow text;
  v_owner uuid;
  v_launch boolean;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id for update;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'framing' and s.state = 'validated') then
    raise exception 'framing_not_validated';
  end if;
  if exists (select 1 from public.project_plans where project_id = p_project_id) then
    raise exception 'plan_already_launched';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  select id into v_brief from public.framing_briefs
   where project_id = p_project_id and state = 'approved' order by version desc limit 1;
  insert into public.project_plans (organization_id, project_id, brief_id, launched_by)
  values (v_org, p_project_id, v_brief, public.auth_person_id())
  returning id into v_plan;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_column := v_item ->> 'column';
    v_workflow := nullif(v_item ->> 'workflow', '');
    v_owner := nullif(v_item ->> 'ownerPersonId', '')::uuid;
    if v_owner is not null and not exists (
      select 1 from public.memberships m
      where m.person_id = v_owner and m.organization_id = v_org and m.status = 'approved') then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    v_launch := v_workflow in ('strategy', 'master', 'legal') and v_column in ('focus', 'meanwhile');
    insert into public.project_plan_items
      (organization_id, plan_id, project_id, column_key, workflow, title, why,
       owner_person_id, position, launched_at, launched_by)
    values
      (v_org, v_plan, p_project_id, v_column, v_workflow, btrim(v_item ->> 'title'),
       nullif(btrim(coalesce(v_item ->> 'why', '')), ''), v_owner, v_position,
       case when v_launch then now() end,
       case when v_launch then public.auth_person_id() end);
    if v_launch and v_workflow = 'strategy' then
      perform public.start_strategy_stage(p_project_id);
    end if;
    v_position := v_position + 1;
  end loop;
  return v_plan;
end;
$$;

-- « Lancer maintenant »: a workflow of the plan that was waiting (Ensuite).
create function public.launch_plan_workflow(p_project_id uuid, p_workflow text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_workflow not in ('strategy', 'master', 'legal') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.project_plan_items
     set launched_at = now(), launched_by = public.auth_person_id()
   where project_id = p_project_id and workflow = p_workflow and launched_at is null;
  if not found then
    raise exception 'invalid_transition';
  end if;
  if p_workflow = 'strategy' then
    perform public.start_strategy_stage(p_project_id);
  end if;
end;
$$;

-- The Stratégie no longer follows the Cadrage on its own: it starts from the
-- plan (launch_project_plan), and start_stage refuses it before.
create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
  v_previous text;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'not_started' then
    raise exception 'invalid_transition';
  end if;

  select d.key into v_key from public.stage_definitions d where d.id = v_stage.stage_definition_id;
  if v_key = 'framing' and not public.framing_is_open(v_stage.project_id) then
    raise exception 'framing_requires_call';
  end if;
  v_previous := case v_key
    when 'launch_strategy' then 'framing'
    when 'design' then 'launch_strategy'
  end;
  if v_previous is not null and not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = v_stage.project_id and d.key = v_previous and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;
  if v_key = 'launch_strategy' and not exists (
    select 1 from public.project_plan_items i
    where i.project_id = v_stage.project_id and i.workflow = 'strategy'
      and i.launched_at is not null) then
    raise exception 'plan_required';
  end if;

  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;
