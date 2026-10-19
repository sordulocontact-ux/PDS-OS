-- Plan du projet, step 4 of the Cadrage (proto « Projet complet », lot 2,
-- docs/ARCHITECTURE.md § 6 ter): the plan holds every workflow — Stratégie,
-- Conception, Production, Activations, Suivi & bilan (the Marketing),
-- Master, Juridique, Distribution — and « Lancer le plan » starts them all.
-- Before it, every workflow waits (workflow_is_launched), except what had
-- already begun. « Livraison & sortie » (delivery) becomes « Distribution ».
-- launch_plan_workflow keeps its signature and its behaviour.

-- 1. The workflows of a plan ------------------------------------------------

alter table public.project_plan_items
  drop constraint project_plan_items_workflow_check,
  drop constraint project_plan_items_launchable,
  drop constraint project_plan_items_depends_check;

update public.project_plan_items set workflow = 'distribution' where workflow = 'delivery';
update public.project_plan_items
   set depends_on = array_replace(depends_on, 'delivery', 'distribution')
 where 'delivery' = any(depends_on);

alter table public.project_plan_items
  add constraint project_plan_items_workflow_check
    check (workflow is null or workflow in ('strategy', 'master', 'legal', 'design', 'production',
                                            'activations', 'distribution', 'review')),
  -- Only a workflow is launched (an added step or a note never is).
  add constraint project_plan_items_launchable
    check (launched_at is null or workflow is not null),
  add constraint project_plan_items_depends_check
    check (depends_on <@ array['strategy', 'master', 'legal', 'design', 'production',
                               'activations', 'distribution', 'review']);

-- 2. The gate ---------------------------------------------------------------

-- Whether a workflow may be worked on. Stratégie, Master, Juridique: launched
-- from the plan, or begun before it (unchanged). Conception, Production,
-- Activations, Suivi & bilan, Distribution: once the plan is launched (it
-- starts them all), or begun before the plan existed (a Stratégie started,
-- a production sheet, an activation, a distribution dossier, a stage moved).
create or replace function public.workflow_is_launched(p_project_id uuid, p_workflow text)
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
    or (p_workflow in ('design', 'production', 'activations', 'review', 'distribution')
        and exists (select 1 from public.project_plans p where p.project_id = p_project_id))
    or (p_workflow in ('strategy', 'design', 'production', 'activations', 'review') and exists (
          select 1 from public.project_stages s
          join public.stage_definitions d on d.id = s.stage_definition_id
          where s.project_id = p_project_id and d.key = 'launch_strategy'
            and s.state <> 'not_started'))
    or (p_workflow = 'design' and exists (
          select 1 from public.project_stages s
          join public.stage_definitions d on d.id = s.stage_definition_id
          where s.project_id = p_project_id and d.key = 'design' and s.state <> 'not_started'))
    or (p_workflow = 'production' and exists (
          select 1 from public.production_sheets x where x.project_id = p_project_id))
    or (p_workflow = 'activations' and exists (
          select 1 from public.marketing_activations x where x.project_id = p_project_id))
    or (p_workflow = 'distribution' and (
          exists (select 1 from public.distribution_dossiers x where x.project_id = p_project_id)
          or exists (
            select 1 from public.project_stages s
            join public.stage_definitions d on d.id = s.stage_definition_id
            where s.project_id = p_project_id and d.key = 'delivery'
              and s.state <> 'not_started')))
    or (p_workflow = 'master' and (
          exists (select 1 from public.master_briefs b where b.project_id = p_project_id)
          or exists (select 1 from public.master_flow_sources f where f.project_id = p_project_id)))
    or (p_workflow = 'legal' and exists (
          select 1 from public.legal_intakes l where l.project_id = p_project_id))
  );
$$;

-- 3. « Lancer le plan »: every workflow of the plan starts ------------------

create or replace function public.launch_project_plan(p_project_id uuid, p_items jsonb)
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
  v_executor uuid;
  v_launch boolean;
  v_launched text[] := '{}';
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
    v_executor := nullif(v_item ->> 'executorPersonId', '')::uuid;
    if not public.plan_person_ok(v_org, v_owner) or not public.plan_person_ok(v_org, v_executor) then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    -- « Lancer le plan » starts every workflow of the plan, whatever its
    -- column: the column says the order of priority, not a lock.
    v_launch := v_workflow is not null;
    insert into public.project_plan_items
      (organization_id, plan_id, project_id, column_key, workflow, title, why,
       owner_person_id, executor_person_id, due_date, depends_on, position, launched_at, launched_by)
    values
      (v_org, v_plan, p_project_id, v_column, v_workflow, btrim(v_item ->> 'title'),
       nullif(btrim(coalesce(v_item ->> 'why', '')), ''), v_owner, v_executor,
       nullif(v_item ->> 'dueDate', '')::date,
       coalesce((select array_agg(x) from jsonb_array_elements_text(
                   coalesce(v_item -> 'dependsOn', '[]'::jsonb)) x), '{}'),
       v_position,
       case when v_launch then now() end,
       case when v_launch then public.auth_person_id() end);
    if v_launch then
      v_launched := v_launched || v_workflow;
      if v_workflow = 'strategy' then
        perform public.start_strategy_stage(p_project_id);
      end if;
    end if;
    v_position := v_position + 1;
  end loop;

  insert into public.project_plan_events (organization_id, project_id, plan_id, kind, detail, actor_person_id)
  values (v_org, p_project_id, v_plan, 'launched',
          jsonb_build_object('launched', to_jsonb(v_launched), 'steps', v_position),
          public.auth_person_id());
  return v_plan;
end;
$$;

-- 4. « Lancer maintenant » / « Ajouter et lancer »: every workflow ---------

create or replace function public.launch_plan_workflow(
  p_project_id uuid,
  p_workflow text,
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
  v_item uuid;
  v_added boolean := false;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_workflow is null or p_workflow not in ('strategy', 'master', 'legal', 'design', 'production',
                                                 'activations', 'distribution', 'review') then
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
      from public.project_plan_items i where i.plan_id = v_plan
    returning id into v_item;
    v_added := true;
  else
    update public.project_plan_items
       set launched_at = now(), launched_by = public.auth_person_id()
     where plan_id = v_plan and workflow = p_workflow and launched_at is null
    returning id into v_item;
    if v_item is null then
      raise exception 'invalid_transition';
    end if;
  end if;

  insert into public.project_plan_events
    (organization_id, project_id, plan_id, item_id, kind, detail, actor_person_id)
  values (v_org, p_project_id, v_plan, v_item, 'workflow_launched',
          jsonb_build_object('workflow', p_workflow, 'added', v_added), public.auth_person_id());

  if p_workflow = 'strategy' then
    perform public.start_strategy_stage(p_project_id);
  end if;
end;
$$;

-- 5. « Modifier l'étape »: a workflow may sit in « À anticiper » -----------

create or replace function public.update_project_plan_item(
  p_item_id uuid,
  p_column text,
  p_title text,
  p_owner uuid,
  p_executor uuid,
  p_due_date date,
  p_depends_on text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.project_plan_items%rowtype;
  v_after public.project_plan_items%rowtype;
begin
  select * into v_item from public.project_plan_items where id = p_item_id for update;
  if not found or not public.can_see_project(v_item.project_id) then
    raise exception 'item_not_found';
  end if;
  if not public.is_project_owner(v_item.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_column is null or p_column not in ('focus', 'next', 'meanwhile', 'anticipate')
     -- A note stays one; a workflow may be « À anticiper » (Distribution,
     -- Suivi & bilan, proto « Projet complet »).
     or (v_item.column_key = 'anticipate' and v_item.workflow is null and p_column <> 'anticipate') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if not public.plan_person_ok(v_item.organization_id, p_owner)
     or not public.plan_person_ok(v_item.organization_id, p_executor) then
    raise exception 'invalid_owner' using errcode = '23514';
  end if;
  if v_item.workflow is not null and p_title is not null and btrim(p_title) <> v_item.title then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  update public.project_plan_items
     set column_key = p_column,
         title = case when v_item.workflow is null and nullif(btrim(coalesce(p_title, '')), '') is not null
                      then btrim(p_title) else title end,
         owner_person_id = p_owner,
         executor_person_id = p_executor,
         due_date = p_due_date,
         depends_on = coalesce(p_depends_on, '{}'),
         updated_at = now(), updated_by = public.auth_person_id()
   where id = p_item_id
  returning * into v_after;

  if public.plan_item_snapshot(v_item) is distinct from public.plan_item_snapshot(v_after) then
    insert into public.project_plan_events
      (organization_id, project_id, plan_id, item_id, kind, detail, actor_person_id)
    values (v_item.organization_id, v_item.project_id, v_item.plan_id, p_item_id, 'step_updated',
            jsonb_build_object('before', public.plan_item_snapshot(v_item),
                               'after', public.plan_item_snapshot(v_after)),
            public.auth_person_id());
  end if;
end;
$$;
