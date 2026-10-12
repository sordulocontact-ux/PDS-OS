-- Retours Marketing du 11/10/2026, MKT-S1-16 (docs/ARCHITECTURE.md § 6 bis,
-- « Validation avec réserves et plan d'exécution »).
--
--   1. « Valider avec réserves »: an approval may carry reserves, each with
--      its owner, its due date and its state (open, lifted), followed as a
--      task of the owner's Travail, ticked when the reserve is lifted;
--   2. a critical alert of the Brief (a step already overdue in the
--      calendar, a budget over its envelope: flagged `critical` by the code
--      in the version's snapshot) is accepted explicitly by whoever
--      approves, or the version is sent back for a change; the acceptances
--      stay on the review;
--   3. the execution plan of a validated Brief: what the code proposes to
--      create (an activation per retained lever, a task per deliverable
--      with its owner and due date), confirmed by the owner, created at
--      once with the user's session and recorded per source: replaying it
--      never makes a duplicate; each created element keeps its lever or
--      deliverable and the Brief version it comes from.

-- ---------------------------------------------------------------------------
-- 1 and 2. Reviews: accepted alerts, reserves
-- ---------------------------------------------------------------------------

alter table public.strategy_document_reviews
  add column accepted_alerts text[] not null default '{}',
  add column with_reserves boolean not null default false;

create table public.strategy_document_reserves (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  document_id uuid not null,
  review_id uuid not null references public.strategy_document_reviews (id) on delete cascade,
  text text not null,
  owner_person_id uuid not null references public.people (id),
  due_on date not null,
  -- open = to lift; lifted = done, with who, when and how.
  status text not null default 'open',
  lifted_by uuid references public.people (id),
  lifted_at timestamptz,
  lift_note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint strategy_reserves_text_check
    check (btrim(text) <> '' and char_length(text) <= 1000),
  constraint strategy_reserves_status_check check (status in ('open', 'lifted')),
  constraint strategy_reserves_lifted
    check ((status = 'lifted') = (lifted_at is not null)),
  constraint strategy_reserves_note_length
    check (lift_note is null or char_length(lift_note) <= 1000),
  constraint strategy_reserves_id_org_key unique (id, organization_id),
  constraint strategy_reserves_document_same_org foreign key (document_id, organization_id)
    references public.strategy_documents (id, organization_id) on delete cascade,
  constraint strategy_reserves_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index strategy_reserves_document_idx on public.strategy_document_reserves (document_id);
create index strategy_reserves_project_idx
  on public.strategy_document_reserves (project_id) where status = 'open';

alter table public.strategy_document_reserves enable row level security;
alter table public.strategy_document_reserves force row level security;
revoke all on table public.strategy_document_reserves from anon, authenticated;
-- Written only through the functions below (security definer).
grant select on public.strategy_document_reserves to authenticated;
create policy strategy_reserves_select on public.strategy_document_reserves
  for select to authenticated
  using (public.can_see_project(project_id)
         or (owner_person_id = public.auth_person_id()
             and public.is_active_member(organization_id)));

-- The task that follows a reserve in its owner's Travail.
alter table public.tasks add column strategy_reserve_id uuid;
alter table public.tasks add constraint tasks_strategy_reserve_same_org
  foreign key (strategy_reserve_id, organization_id)
  references public.strategy_document_reserves (id, organization_id) on delete cascade;
create unique index tasks_strategy_reserve_key on public.tasks (strategy_reserve_id)
  where strategy_reserve_id is not null;

-- The critical alerts of a version: the `toDecide` entries the code flagged.
create or replace function public.strategy_critical_alerts(p_content jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(e ->> 'key' order by e ->> 'key'), '{}')
    from jsonb_array_elements(coalesce(p_content -> 'toDecide', '[]'::jsonb)) e
   where coalesce((e ->> 'critical')::boolean, false);
$$;
grant execute on function public.strategy_critical_alerts(jsonb) to authenticated;

-- The decision now takes the alerts accepted and the reserves: a new
-- signature, the old one dropped (no caller keeps it).
drop function public.decide_strategy_document(uuid, boolean, text);

-- A reviewer's decision. A change request (with a comment) ends the round:
-- the version is to correct, the others' reviews are cancelled, the stage
-- goes back in progress. An approval accepts every critical alert of the
-- version by name, and may carry reserves (owner, due date): each becomes
-- a task of its owner. The version is approved once every review is; the
-- Brief then validates the stage (V1 frozen) or closes the revision.
create function public.decide_strategy_document(
  p_document_id uuid,
  p_approve boolean,
  p_comment text default null,
  p_accepted_alerts text[] default '{}',
  p_reserves jsonb default '[]')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_review public.strategy_document_reviews%rowtype;
  v_stage_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_reserves jsonb := coalesce(p_reserves, '[]'::jsonb);
  v_reserve jsonb;
  v_owner uuid;
  v_due date;
  v_text text;
  v_reserve_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id for update;
  if not found then
    raise exception 'document_not_found';
  end if;
  select * into v_review from public.strategy_document_reviews
   where document_id = p_document_id and person_id = public.auth_person_id() for update;
  if not found or not public.is_active_member(v_doc.organization_id) then
    raise exception 'not_the_validator';
  end if;
  if v_doc.state <> 'sent' or v_review.state <> 'pending' then
    raise exception 'already_decided';
  end if;
  if not p_approve and v_comment is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if jsonb_typeof(v_reserves) <> 'array' or jsonb_array_length(v_reserves) > 20 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  if p_approve then
    -- Every critical alert is accepted by name, or the version goes back.
    if exists (select 1 from unnest(public.strategy_critical_alerts(v_doc.content)) k
               where not (k = any (coalesce(p_accepted_alerts, '{}')))) then
      raise exception 'critical_alert_unaccepted' using errcode = 'P0001';
    end if;
    for v_reserve in select * from jsonb_array_elements(v_reserves) loop
      v_text := nullif(btrim(coalesce(v_reserve ->> 'text', '')), '');
      begin
        v_owner := (v_reserve ->> 'owner_person_id')::uuid;
        v_due := (v_reserve ->> 'due_on')::date;
      exception when others then
        raise exception 'invalid_reserve' using errcode = '23514';
      end;
      if v_text is null or char_length(v_text) > 1000 or v_due is null or v_due < v_today
         or v_owner is null or not exists (
           select 1 from public.memberships m
            where m.person_id = v_owner and m.organization_id = v_doc.organization_id
              and m.status = 'approved') then
        raise exception 'invalid_reserve' using errcode = '23514';
      end if;
      insert into public.strategy_document_reserves
        (organization_id, project_id, document_id, review_id, text, owner_person_id,
         due_on, created_by)
      values (v_doc.organization_id, v_doc.project_id, p_document_id, v_review.id, v_text,
              v_owner, v_due, public.auth_person_id())
      returning id into v_reserve_id;
      insert into public.tasks
        (organization_id, project_id, assignee_person_id, title, due_date,
         strategy_reserve_id, created_by)
      values (v_doc.organization_id, v_doc.project_id, v_owner,
              left('Lever la réserve : ' || v_text, 300), v_due, v_reserve_id,
              public.auth_person_id());
    end loop;
  end if;

  update public.strategy_document_reviews
     set state = case when p_approve then 'approved' else 'changes_requested' end,
         comment = v_comment, decided_at = now(),
         accepted_alerts = case when p_approve
           then public.strategy_critical_alerts(v_doc.content) else '{}' end,
         with_reserves = p_approve and jsonb_array_length(v_reserves) > 0
   where id = v_review.id;
  -- The stage's validation follows this function only (validations guard).
  perform set_config('pds.strategy_decision', 'on', true);
  select project_stage_id into v_stage_id from public.validations where id = v_doc.validation_id;

  if not p_approve then
    update public.strategy_document_reviews set state = 'cancelled'
     where document_id = p_document_id and state = 'pending';
    update public.strategy_documents
       set state = 'changes_requested', change_comment = v_comment,
           decided_at = now(), decided_by = public.auth_person_id()
     where id = p_document_id;
    if v_doc.validation_id is not null then
      update public.validations
         set state = 'rejected', decision_comment = v_comment, decided_at = now()
       where id = v_doc.validation_id and state = 'pending';
      update public.project_stages
         set state = 'in_progress', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    return;
  end if;

  if v_doc.validation_id is not null then
    update public.validations
       set state = 'approved', decision_comment = v_comment, decided_at = now()
     where id = v_doc.validation_id and state = 'pending'
       and validator_person_id = public.auth_person_id();
  end if;
  if exists (select 1 from public.strategy_document_reviews
             where document_id = p_document_id and state = 'pending') then
    return;
  end if;

  update public.strategy_documents
     set state = 'approved', decided_at = now(), decided_by = public.auth_person_id()
   where id = p_document_id;
  if v_doc.kind = 'brief' then
    if v_stage_id is not null then
      update public.project_stages
         set state = 'validated', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    update public.strategy_workspaces
       set revision_opened_at = null, revision_opened_by = null
     where project_id = v_doc.project_id;
  end if;
end;
$$;
revoke execute on function public.decide_strategy_document(uuid, boolean, text, text[], jsonb)
  from public, anon;
grant execute on function public.decide_strategy_document(uuid, boolean, text, text[], jsonb)
  to authenticated;

-- « Lever la réserve »: its owner or the project's owner, with how it was
-- lifted; its task is ticked in the same transaction.
create or replace function public.lift_strategy_reserve(p_reserve_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserve public.strategy_document_reserves%rowtype;
begin
  select * into v_reserve from public.strategy_document_reserves
   where id = p_reserve_id for update;
  if not found then
    raise exception 'reserve_not_found';
  end if;
  if not public.is_active_member(v_reserve.organization_id)
     or not (v_reserve.owner_person_id = public.auth_person_id()
             or public.is_project_owner(v_reserve.project_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reserve.status <> 'open' then
    raise exception 'already_decided';
  end if;
  update public.strategy_document_reserves
     set status = 'lifted', lifted_at = now(), lifted_by = public.auth_person_id(),
         lift_note = left(nullif(btrim(coalesce(p_note, '')), ''), 1000)
   where id = p_reserve_id;
  update public.tasks set status = 'done', done_at = now()
   where strategy_reserve_id = p_reserve_id and status = 'todo';
end;
$$;
revoke execute on function public.lift_strategy_reserve(uuid, text) from public, anon;
grant execute on function public.lift_strategy_reserve(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Execution plan of a validated Brief
-- ---------------------------------------------------------------------------

create table public.strategy_execution_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The Brief version it comes from.
  document_id uuid not null,
  -- One element per source, ever: « activation:<lever> », « task:<deliverable> ».
  item_key text not null,
  kind text not null,
  lever_id uuid,
  deliverable_id uuid,
  activation_id uuid,
  task_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint strategy_execution_kind_check check (kind in ('activation', 'task')),
  constraint strategy_execution_key unique (project_id, item_key),
  constraint strategy_execution_shape check (
    (kind = 'activation' and lever_id is not null and deliverable_id is null)
    or (kind = 'task' and deliverable_id is not null)),
  constraint strategy_execution_document_same_org foreign key (document_id, organization_id)
    references public.strategy_documents (id, organization_id) on delete cascade,
  constraint strategy_execution_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint strategy_execution_lever_same_org foreign key (lever_id, organization_id)
    references public.levers (id, organization_id) on delete cascade,
  constraint strategy_execution_deliverable_same_org foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete cascade,
  constraint strategy_execution_activation_fkey foreign key (activation_id)
    references public.marketing_activations (id) on delete set null,
  constraint strategy_execution_task_fkey foreign key (task_id)
    references public.tasks (id) on delete set null
);
create index strategy_execution_document_idx on public.strategy_execution_items (document_id);
create index strategy_execution_activation_idx on public.strategy_execution_items (activation_id)
  where activation_id is not null;

alter table public.strategy_execution_items enable row level security;
alter table public.strategy_execution_items force row level security;
revoke all on table public.strategy_execution_items from anon, authenticated;
grant select on public.strategy_execution_items to authenticated;
grant insert (organization_id, project_id, document_id, item_key, kind, lever_id,
              deliverable_id) on public.strategy_execution_items to authenticated;
grant update (activation_id, task_id) on public.strategy_execution_items to authenticated;
create policy strategy_execution_select on public.strategy_execution_items
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_execution_insert on public.strategy_execution_items
  for insert to authenticated
  with check (public.is_project_owner(project_id) and public.is_active_member(organization_id));
create policy strategy_execution_update on public.strategy_execution_items
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create trigger a_set_created_by before insert on public.strategy_execution_items
  for each row execute function public.set_created_by();

-- « Confirmer le plan d'exécution »: security invoker, so the activations'
-- and tasks' own policies decide (the project's owner). The plan comes from
-- the latest validated Brief only. Every element is first recorded by its
-- source key: one already there is skipped, so a replayed or double-clicked
-- confirmation never creates twice. Returns how many were created.
create or replace function public.apply_strategy_execution(p_document_id uuid, p_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_item jsonb;
  v_kind text;
  v_lever public.levers%rowtype;
  v_deliverable public.strategy_deliverables%rowtype;
  v_key text;
  v_entry uuid;
  v_target uuid;
  v_activation_kind text;
  v_created integer := 0;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id;
  if not found or v_doc.kind <> 'brief' or v_doc.state <> 'approved' then
    raise exception 'brief_not_validated' using errcode = 'P0001';
  end if;
  if not public.is_project_owner(v_doc.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if exists (select 1 from public.strategy_documents b
             where b.project_id = v_doc.project_id and b.kind = 'brief'
               and b.state = 'approved' and b.version > v_doc.version) then
    raise exception 'version_superseded' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_kind := v_item ->> 'kind';
    if v_kind = 'activation' then
      select * into v_lever from public.levers
       where id = (v_item ->> 'lever_id')::uuid and project_id = v_doc.project_id
         and state = 'selected' and review_status = 'confirmed';
      if not found then
        raise exception 'lever_not_selected' using errcode = '23514';
      end if;
      v_activation_kind := v_item ->> 'activation_kind';
      if v_activation_kind not in ('content', 'influence', 'press', 'event', 'other') then
        v_activation_kind := 'other';
      end if;
      v_key := 'activation:' || v_lever.id;
      insert into public.strategy_execution_items
        (organization_id, project_id, document_id, item_key, kind, lever_id)
      values (v_doc.organization_id, v_doc.project_id, v_doc.id, v_key, 'activation', v_lever.id)
      on conflict (project_id, item_key) do nothing
      returning id into v_entry;
      continue when v_entry is null;
      insert into public.marketing_activations
        (organization_id, project_id, kind, mode, title, source_kind, lever_id)
      values (v_doc.organization_id, v_doc.project_id, v_activation_kind,
              case when v_activation_kind in ('influence', 'press') then 'internal' end,
              left(v_lever.label, 200), 'lever', v_lever.id)
      returning id into v_target;
      update public.strategy_execution_items set activation_id = v_target where id = v_entry;
    elsif v_kind = 'task' then
      select * into v_deliverable from public.strategy_deliverables
       where id = (v_item ->> 'deliverable_id')::uuid and project_id = v_doc.project_id;
      if not found or v_deliverable.assignee_person_id is null
         or v_deliverable.due_date is null then
        raise exception 'deliverable_not_planned' using errcode = '23514';
      end if;
      v_key := 'task:' || v_deliverable.id;
      insert into public.strategy_execution_items
        (organization_id, project_id, document_id, item_key, kind, lever_id, deliverable_id)
      values (v_doc.organization_id, v_doc.project_id, v_doc.id, v_key, 'task',
              v_deliverable.lever_id, v_deliverable.id)
      on conflict (project_id, item_key) do nothing
      returning id into v_entry;
      continue when v_entry is null;
      insert into public.tasks
        (organization_id, project_id, assignee_person_id, title, due_date, deliverable_id)
      values (v_doc.organization_id, v_doc.project_id, v_deliverable.assignee_person_id,
              left('Livrer : ' || v_deliverable.title, 300), v_deliverable.due_date,
              v_deliverable.id)
      returning id into v_target;
      update public.strategy_execution_items set task_id = v_target where id = v_entry;
    else
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    v_created := v_created + 1;
  end loop;
  return v_created;
end;
$$;
revoke execute on function public.apply_strategy_execution(uuid, jsonb) from public, anon;
grant execute on function public.apply_strategy_execution(uuid, jsonb) to authenticated;

-- A deleted project takes its plan and reserves along (cascade on the
-- project); a deleted lever or deliverable takes its record, never the
-- activation or task already made.
