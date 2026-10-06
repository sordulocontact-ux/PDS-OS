-- Juridique: every action of the plan is a task of the Travail, ticked by its
-- sources (Sacha's feedback of 05/10/2026: « pourquoi on doit créer la tâche,
-- elle pourrait se créer toute seule ? »). docs/ARCHITECTURE.md § 8 sexies.
--
--   * launch_legal_plan creates a task for every action that has a
--     responsible, not only those to start now: one that waits for another
--     is shown « en attente » by the code (its dependencies' tasks);
--   * a task is ticked in the same transaction as the source that makes its
--     action done (fiche complete, contract signed, publishing split at
--     100 %, clearance secured, SACEM declaration confirmed):
--     legal_plan_item_done + legal_tick_tasks, called by triggers on each
--     source table. Never unticked by them;
--   * changing an action's responsible or due date moves its task, or
--     creates it when the action had no responsible yet; an action without
--     a date makes a task without a date (tasks.due_date nullable for the
--     plan's tasks only);
--   * add_legal_plan_items: actions that appeared after the launch (a person
--     credited since), added to the active plan with their task;
--   * legal_plan_items.subject (who or what, for a grouped list) and
--     credit_ids (the credits a contract is for: its person's contact is
--     found from them once linked);
--   * create_legal_plan_task is gone: nothing is created by hand any more.

alter table public.legal_plan_items
  add column subject text,
  add column credit_ids uuid[] not null default '{}';
alter table public.legal_plan_items
  add constraint legal_plan_items_subject_check
    check (subject is null or char_length(subject) <= 200);

-- An action's due date is optional in the plan (« Échéance · facultatif »):
-- its task may have none, every other task keeps one.
alter table public.tasks alter column due_date drop not null;
alter table public.tasks add constraint tasks_due_date_required
  check (due_date is not null or legal_plan_item_id is not null);

create unique index tasks_legal_plan_item_key on public.tasks (legal_plan_item_id)
  where legal_plan_item_id is not null;

drop function if exists public.create_legal_plan_task(uuid);

-- ---------------------------------------------------------------------------
-- When an action is done, read from its sources (the same rules as the
-- Suivi, lib/legal/tracking/sources.ts).
-- ---------------------------------------------------------------------------

create or replace function public.legal_plan_item_done(p_item public.legal_plan_items)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_item.kind
    -- Every person credited on the project's titles has a complete fiche.
    when 'onboarding' then not exists (
      select 1 from public.master_contributors c
        join public.project_masters pm on pm.master_id = c.master_id
       where pm.project_id = p_item.project_id
         and (c.contact_id is null or not exists (
           select 1 from public.legal_forms f
            where f.project_id = p_item.project_id and f.contact_id = c.contact_id
              and f.status = 'complete')))
    -- A signed contract of the project binds the person of these credits.
    when 'contract' then exists (
      select 1 from public.contracts k
        join public.contract_parties cp on cp.contract_id = k.id
        join public.master_contributors c on c.contact_id = cp.contact_id
       where k.project_id = p_item.project_id and k.status = 'signed'
         and c.id = any (p_item.credit_ids))
    when 'splits' then coalesce((
      select sum(s.share) from public.master_splits s
       where s.master_id = p_item.master_id and s.kind = 'publishing'), 0) >= 100
    when 'clearance' then exists (
      select 1 from public.legal_clearances c
       where c.id::text = split_part(p_item.item_key, ':', 2) and c.status = 'cleared')
    when 'formality' then exists (
      select 1 from public.master_declarations d
       where d.master_id = p_item.master_id and d.organism = 'sacem'
         and d.status = 'confirmed')
    else false
  end;
$$;

create or replace function public.legal_tick_tasks(p_project_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tasks t
     set status = 'done', done_at = now()
    from public.legal_plan_items i
   where t.legal_plan_item_id = i.id
     and t.status = 'todo'
     and i.project_id = any (p_project_ids)
     and public.legal_plan_item_done(i);
$$;

-- The task of an action: its responsible, due on its date or the project's.
create or replace function public.legal_plan_item_task(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.legal_plan_items%rowtype;
  v_due date;
begin
  select * into v_item from public.legal_plan_items where id = p_item_id;
  if not found or v_item.responsible_person_id is null
     or v_item.status in ('done', 'obsolete') then
    return;
  end if;
  select coalesce(v_item.due_on, p.due_date) into v_due
    from public.projects p where p.id = v_item.project_id;
  if exists (select 1 from public.tasks where legal_plan_item_id = p_item_id) then
    update public.tasks
       set assignee_person_id = v_item.responsible_person_id,
           due_date = v_due
     where legal_plan_item_id = p_item_id and status = 'todo'
       and (assignee_person_id is distinct from v_item.responsible_person_id
            or due_date is distinct from v_due);
  elsif not public.legal_plan_item_done(v_item) then
    insert into public.tasks
      (organization_id, project_id, title, assignee_person_id, due_date, created_by,
       legal_plan_item_id)
    values (v_item.organization_id, v_item.project_id, v_item.label,
            v_item.responsible_person_id, v_due, public.auth_person_id(), v_item.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sources: each one ticks the tasks of the projects it belongs to.
-- ---------------------------------------------------------------------------

create or replace function public.legal_tick_from_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_projects uuid[];
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  if tg_table_name in ('legal_forms', 'legal_clearances', 'contracts') then
    v_projects := array[v_row.project_id];
  elsif tg_table_name = 'contract_parties' then
    select array_agg(project_id) into v_projects
      from public.contracts where id = v_row.contract_id and project_id is not null;
  else
    select array_agg(project_id) into v_projects
      from public.project_masters where master_id = v_row.master_id;
  end if;
  if v_projects is not null and v_projects <> '{}' and v_projects[1] is not null then
    perform public.legal_tick_tasks(v_projects);
  end if;
  return null;
end;
$$;

create trigger z_legal_tick after insert or update of status on public.legal_forms
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after update of status on public.contracts
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after insert on public.contract_parties
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after insert or update of contact_id or delete
  on public.master_contributors
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after insert or update or delete on public.master_splits
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after update of status on public.legal_clearances
  for each row execute function public.legal_tick_from_source();
create trigger z_legal_tick after insert or update or delete on public.master_declarations
  for each row execute function public.legal_tick_from_source();

-- A delegation (update_legal_plan_item) moves the task with it.
create or replace function public.legal_plan_items_sync_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.legal_plan_item_task(new.id);
  perform public.legal_tick_tasks(array[new.project_id]);
  return null;
end;
$$;

create trigger z_sync_task after update of responsible_person_id, due_on
  on public.legal_plan_items
  for each row execute function public.legal_plan_items_sync_task();

-- ---------------------------------------------------------------------------
-- Launch: every action with a responsible becomes a task.
-- ---------------------------------------------------------------------------

create or replace function public.insert_legal_plan_item(
  p_org uuid,
  p_plan uuid,
  p_project_id uuid,
  p_item jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_responsible uuid := nullif(p_item ->> 'responsible_person_id', '')::uuid;
  v_id uuid;
begin
  -- A responsible holds manage_legal in this organization.
  if v_responsible is not null
     and not public.person_has_permission(p_org, v_responsible, 'manage_legal') then
    raise exception 'legal_plan_responsible_invalid' using errcode = 'P0001';
  end if;
  -- Credits of the project's titles only.
  if exists (
    select 1 from unnest(coalesce(array(
      select jsonb_array_elements_text(coalesce(p_item -> 'credit_ids', '[]'))::uuid), '{}')) cid
     where not exists (
       select 1 from public.master_contributors c
         join public.project_masters pm on pm.master_id = c.master_id
        where c.id = cid and pm.project_id = p_project_id)
  ) then
    raise exception 'legal_plan_credit_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_plan_items
    (organization_id, plan_id, project_id, item_key, kind, master_id, label, detail, why,
     subject, credit_ids, status, depends_on, responsible_person_id, due_on)
  values (
    p_org, p_plan, p_project_id, p_item ->> 'key', p_item ->> 'kind',
    nullif(p_item ->> 'master_id', '')::uuid, p_item ->> 'label', p_item ->> 'detail',
    p_item ->> 'why', left(p_item ->> 'subject', 200),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_item -> 'credit_ids', '[]'))::uuid), '{}'),
    p_item ->> 'status',
    coalesce(array(select jsonb_array_elements_text(p_item -> 'depends_on')), '{}'),
    v_responsible, nullif(p_item ->> 'due_on', '')::date)
  returning id into v_id;
  perform public.legal_plan_item_task(v_id);
  return v_id;
end;
$$;

revoke execute on function public.insert_legal_plan_item(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;

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

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    perform public.insert_legal_plan_item(v_org, v_plan, p_project_id, v_item);
  end loop;
  perform public.legal_tick_tasks(array[p_project_id]);
  return v_plan;
end;
$$;

-- Actions that appeared after the launch, with their task; a key already
-- in the plan is left as it is.
create or replace function public.add_legal_plan_items(p_project_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_plan uuid;
  v_item jsonb;
  v_added integer := 0;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or public.auth_person_id() is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_plan from public.legal_plans
   where project_id = p_project_id and status = 'active';
  if v_plan is null then raise exception 'legal_plan_not_launched' using errcode = 'P0001'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 200 then
    raise exception 'legal_plan_items_invalid' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    continue when exists (select 1 from public.legal_plan_items
                           where plan_id = v_plan and item_key = v_item ->> 'key');
    perform public.insert_legal_plan_item(v_org, v_plan, p_project_id, v_item);
    v_added := v_added + 1;
  end loop;
  perform public.legal_tick_tasks(array[p_project_id]);
  return v_added;
end;
$$;

revoke execute on function public.legal_plan_item_done(public.legal_plan_items)
  from public, anon, authenticated;
revoke execute on function public.legal_tick_tasks(uuid[]) from public, anon, authenticated;
revoke execute on function public.legal_plan_item_task(uuid) from public, anon, authenticated;
revoke execute on function public.legal_tick_from_source() from public, anon, authenticated;
revoke execute on function public.legal_plan_items_sync_task() from public, anon, authenticated;
revoke execute on function public.launch_legal_plan(uuid, jsonb) from public, anon;
revoke execute on function public.add_legal_plan_items(uuid, jsonb) from public, anon;
grant execute on function public.launch_legal_plan(uuid, jsonb) to authenticated;
grant execute on function public.add_legal_plan_items(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Plans already launched: their waiting actions get their task now, and
-- what is already done is ticked.
-- ---------------------------------------------------------------------------

do $$
declare
  v_item uuid;
begin
  -- Contracts of a plan launched before credit_ids: their credits found by
  -- the person's name, compared as lib/utils/search.ts does (case, accents
  -- of French, spaces and dashes ignored; no unaccent extension here).
  update public.legal_plan_items i
     set credit_ids = array(
       select c.id from public.master_contributors c
         join public.project_masters pm on pm.master_id = c.master_id
        where pm.project_id = i.project_id
          and regexp_replace(translate(lower(c.name),
                'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'),
                '[[:space:]-]+', '', 'g') = substr(i.item_key, 10))
   where i.kind = 'contract' and i.credit_ids = '{}';

  -- Their subject, for the grouped lists: the person, the title, the work.
  update public.legal_plan_items i
     set subject = case i.kind
       when 'contract' then (select c.name from public.master_contributors c
                              where c.id = any (i.credit_ids) limit 1)
       when 'clearance' then (select c.work from public.legal_clearances c
                               where c.id::text = split_part(i.item_key, ':', 2))
       else (select m.title from public.masters m where m.id = i.master_id)
     end
   where i.subject is null and i.kind <> 'onboarding';

  for v_item in
    select i.id from public.legal_plan_items i
     where i.responsible_person_id is not null
       and i.status not in ('done', 'obsolete')
       and not exists (select 1 from public.tasks t where t.legal_plan_item_id = i.id)
  loop
    perform public.legal_plan_item_task(v_item);
  end loop;
  perform public.legal_tick_tasks(array(select distinct project_id from public.legal_plan_items));
end;
$$;
