-- Retours BUG + UX consolidés du 11/10/2026, lot 6 et lot 7 (A) :
--   PROJ-UX-06  corrections du Brief ciblées par dimension ou question, avec
--               statut, auteur, date et résolution ;
--   PROJ-BUG-05 une V2 inchangée n'est plus renvoyée sans dérogation écrite,
--               et le Brief n'est plus validé avec une demande obligatoire
--               encore ouverte ;
--   PROJ-UX-07  les étapes du plan du projet portent un exécutant, une
--               échéance et leurs dépendances, se modifient, s'ajoutent et se
--               réordonnent après le lancement, et tout est historisé.
-- docs/ARCHITECTURE.md § 6 (« Demandes de correction du Brief ») and § 6 ter.

-- 1. Requests --------------------------------------------------------------

-- One line per request of the validator, anchored to a dimension and, when
-- it names one, a question. Never deleted: a request is resolved (changed,
-- or justified without change) by the owner, or withdrawn by the validator,
-- each time with who, when and why.
create table public.framing_brief_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The version the validator read when asking.
  brief_id uuid not null,
  dimension text not null,
  question_key text,
  body text not null,
  mandatory boolean not null default true,
  state text not null default 'open',
  resolution text,
  resolution_note text,
  -- The version that carries the change, for a request resolved by one.
  resolved_brief_id uuid references public.framing_briefs (id) on delete cascade,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.people (id),
  resolved_at timestamptz,
  constraint framing_brief_requests_dimension_check
    check (dimension in ('objective', 'timing', 'budget', 'team', 'start', 'legal')),
  constraint framing_brief_requests_question_check
    check (question_key is null or public.framing_key_dimension(question_key) = dimension),
  constraint framing_brief_requests_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint framing_brief_requests_state_check
    check (state in ('open', 'resolved', 'rejected')),
  constraint framing_brief_requests_resolution_check
    check ((state = 'open' and resolution is null and resolved_at is null)
           or (state = 'resolved' and resolution in ('modified', 'justified') and resolved_at is not null)
           or (state = 'rejected' and resolution = 'withdrawn' and resolved_at is not null)),
  -- Resolving without a change, or withdrawing, always says why.
  constraint framing_brief_requests_reason_check
    check (resolution is null or resolution = 'modified'
           or btrim(coalesce(resolution_note, '')) <> ''),
  constraint framing_brief_requests_note_length check (char_length(resolution_note) <= 2000),
  constraint framing_brief_requests_brief_same_org foreign key (brief_id, organization_id)
    references public.framing_briefs (id, organization_id) on delete cascade,
  constraint framing_brief_requests_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index framing_brief_requests_project_idx
  on public.framing_brief_requests (project_id, state);

alter table public.framing_brief_requests enable row level security;
alter table public.framing_brief_requests force row level security;
grant select on public.framing_brief_requests to authenticated;
-- Read by whoever reads the Brief (the project, or the validator of it).
create policy framing_brief_requests_select_visible on public.framing_brief_requests
  for select to authenticated
  using (public.can_see_project(project_id)
         or exists (select 1 from public.framing_briefs b
                    join public.validations v on v.id = b.validation_id
                    where b.id = framing_brief_requests.brief_id
                      and v.validator_person_id = public.auth_person_id()));

-- A derogation for a version sent again without change (PROJ-BUG-05).
alter table public.framing_briefs add column unchanged_reason text;
alter table public.framing_briefs add constraint framing_briefs_unchanged_reason_length
  check (char_length(unchanged_reason) <= 1000);

-- The answers of a Brief snapshot (lib/framing/brief-snapshot.ts), item by
-- item: words and lines only, never the sources. Optionally one dimension,
-- or one question. Two versions say the same thing when these are equal.
create function public.framing_brief_answers(p_content jsonb, p_dimension text, p_key text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('k', i ->> 'key', 'v', i -> 'value',
                                               'l', coalesce(i -> 'lines', '[]'::jsonb))
                            order by i ->> 'key'), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_content -> 'dimensions', '[]'::jsonb)) d
    cross join jsonb_array_elements(coalesce(d -> 'items', '[]'::jsonb)) i
   where (p_dimension is null or d ->> 'dimension' = p_dimension)
     and (p_key is null or i ->> 'key' = p_key);
$$;

-- « Valider le Brief » / « Demander une modification ». A change request is
-- now a list of requests, each anchored to a dimension (and a question when
-- it names one); the reopened dimensions follow from them. The legacy call
-- (a comment and dimensions, no requests) still works. Validating is refused
-- while a mandatory request is open: the validator withdraws it first, with
-- a reason, which is the only derogation.
drop function public.decide_framing_brief(uuid, boolean, text, text[]);
create function public.decide_framing_brief(
  p_validation_id uuid,
  p_approve boolean,
  p_comment text default null,
  p_dimensions text[] default null,
  p_requests jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brief public.framing_briefs%rowtype;
  v_dimensions text[];
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_request jsonb;
begin
  select * into v_brief from public.framing_briefs where validation_id = p_validation_id;
  if not found then
    raise exception 'brief_not_found';
  end if;

  if p_approve then
    if exists (select 1 from public.framing_brief_requests
               where project_id = v_brief.project_id and state = 'open' and mandatory) then
      raise exception 'requests_open' using errcode = '23514';
    end if;
    perform public.decide_validation(p_validation_id, true, v_comment);
    return;
  end if;

  if p_requests is not null then
    if jsonb_typeof(p_requests) <> 'array' or jsonb_array_length(p_requests) = 0 then
      raise exception 'requests_required' using errcode = '23514';
    end if;
    if jsonb_array_length(p_requests) > 30 then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    select array_agg(distinct r ->> 'dimension' order by r ->> 'dimension') into v_dimensions
      from jsonb_array_elements(p_requests) r;
    -- The validation keeps a readable comment: the requests, one per line.
    if v_comment is null then
      select string_agg(btrim(r ->> 'body'), E'\n') into v_comment
        from jsonb_array_elements(p_requests) r;
    end if;
  else
    select array_agg(distinct d order by d) into v_dimensions
      from unnest(coalesce(p_dimensions, '{}')) d;
  end if;
  if v_comment is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if v_dimensions is null
     or not v_dimensions <@ array['objective', 'timing', 'budget', 'team', 'start', 'legal'] then
    raise exception 'dimensions_required' using errcode = '23514';
  end if;

  -- Checks who decides, and when.
  perform public.decide_validation(p_validation_id, false, v_comment);
  update public.framing_briefs set reopened_dimensions = v_dimensions
   where id = v_brief.id;

  if p_requests is not null then
    for v_request in select * from jsonb_array_elements(p_requests) loop
      insert into public.framing_brief_requests
        (organization_id, project_id, brief_id, dimension, question_key, body, mandatory, created_by)
      values
        (v_brief.organization_id, v_brief.project_id, v_brief.id, v_request ->> 'dimension',
         nullif(v_request ->> 'questionKey', ''), btrim(coalesce(v_request ->> 'body', '')),
         coalesce((v_request ->> 'mandatory')::boolean, true), public.auth_person_id());
    end loop;
  end if;
end;
$$;
revoke execute on function public.decide_framing_brief(uuid, boolean, text, text[], jsonb) from public, anon;
grant execute on function public.decide_framing_brief(uuid, boolean, text, text[], jsonb) to authenticated;

-- The owner answers a request: « corrigée » when the latest version changed
-- what it points at since the version it was asked on (compared here, never
-- trusted from the browser), otherwise justified in writing.
create function public.resolve_framing_brief_request(p_request_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.framing_brief_requests%rowtype;
  v_asked public.framing_briefs%rowtype;
  v_latest public.framing_briefs%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_resolution text := 'justified';
begin
  select * into v_request from public.framing_brief_requests where id = p_request_id for update;
  if not found or not public.can_see_project(v_request.project_id) then
    raise exception 'request_not_found';
  end if;
  if not public.is_project_owner(v_request.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_request.state <> 'open' then
    raise exception 'already_decided';
  end if;
  if not public.framing_is_editable(v_request.project_id) then
    raise exception 'stage_locked';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  select * into v_asked from public.framing_briefs where id = v_request.brief_id;
  select * into v_latest from public.framing_briefs
   where project_id = v_request.project_id order by version desc limit 1;
  if v_latest.version > v_asked.version
     and public.framing_brief_answers(v_latest.content, v_request.dimension, v_request.question_key)
         is distinct from
         public.framing_brief_answers(v_asked.content, v_request.dimension, v_request.question_key) then
    v_resolution := 'modified';
  elsif v_note is null then
    raise exception 'justification_required' using errcode = '23514';
  end if;

  update public.framing_brief_requests
     set state = 'resolved', resolution = v_resolution, resolution_note = v_note,
         resolved_brief_id = case when v_resolution = 'modified' then v_latest.id end,
         resolved_by = public.auth_person_id(), resolved_at = now()
   where id = p_request_id;
  return v_resolution;
end;
$$;
revoke execute on function public.resolve_framing_brief_request(uuid, text) from public, anon;
grant execute on function public.resolve_framing_brief_request(uuid, text) to authenticated;

-- The validator withdraws one of their requests, with a reason: the request
-- no longer blocks the validation (« rejetée »), and says why.
create function public.withdraw_framing_brief_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.framing_brief_requests%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_request from public.framing_brief_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if not exists (select 1 from public.framing_briefs b
                 join public.validations v on v.id = b.validation_id
                 where b.id = v_request.brief_id
                   and v.validator_person_id = public.auth_person_id()) then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_request.state <> 'open' then
    raise exception 'already_decided';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.framing_brief_requests
     set state = 'rejected', resolution = 'withdrawn', resolution_note = v_reason,
         resolved_by = public.auth_person_id(), resolved_at = now()
   where id = p_request_id;
end;
$$;
revoke execute on function public.withdraw_framing_brief_request(uuid, text) from public, anon;
grant execute on function public.withdraw_framing_brief_request(uuid, text) to authenticated;

-- « Envoyer en validation »: refused while a mandatory request is open, and,
-- for a version that says exactly what the last version sent said, refused
-- without a written derogation, kept on the version.
drop function public.send_framing_brief(uuid, text);
create function public.send_framing_brief(
  p_brief_id uuid,
  p_note text default null,
  p_unchanged_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brief public.framing_briefs%rowtype;
  v_previous public.framing_briefs%rowtype;
  v_stage public.project_stages%rowtype;
  v_validation uuid;
  v_reason text := nullif(btrim(coalesce(p_unchanged_reason, '')), '');
begin
  select * into v_brief from public.framing_briefs where id = p_brief_id for update;
  if not found or not public.can_see_project(v_brief.project_id) then
    raise exception 'brief_not_found';
  end if;
  if not public.is_project_owner(v_brief.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_brief.state <> 'pending' then
    raise exception 'invalid_transition';
  end if;
  if exists (select 1 from public.framing_briefs
             where project_id = v_brief.project_id and version > v_brief.version) then
    raise exception 'version_superseded';
  end if;
  if exists (select 1 from public.framing_brief_requests
             where project_id = v_brief.project_id and state = 'open' and mandatory) then
    raise exception 'requests_open' using errcode = '23514';
  end if;
  select * into v_previous from public.framing_briefs
   where project_id = v_brief.project_id and version < v_brief.version and sent_at is not null
   order by version desc limit 1;
  if found and public.framing_brief_answers(v_previous.content, null, null)
               = public.framing_brief_answers(v_brief.content, null, null) then
    if v_reason is null then
      raise exception 'brief_unchanged' using errcode = '23514';
    end if;
    if char_length(v_reason) > 1000 then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
  else
    v_reason := null;
  end if;

  v_stage := public.framing_stage_for_update(v_brief.project_id);
  v_validation := public.request_validation(v_stage.id, p_note);
  update public.framing_briefs
     set state = 'sent', validation_id = v_validation, sent_at = now(),
         unchanged_reason = v_reason
   where id = p_brief_id;
  return v_validation;
end;
$$;
revoke execute on function public.send_framing_brief(uuid, text, text) from public, anon;
grant execute on function public.send_framing_brief(uuid, text, text) to authenticated;

-- 2. Plan steps --------------------------------------------------------------

-- Who carries a step (owner_person_id, « pilote ») and who does it
-- (« exécutant ») may differ; a step has a due date and the workflows it
-- waits for. A step without workflow outside « À anticiper » is one a person
-- added (« Ajouter une étape »).
alter table public.project_plan_items
  add column executor_person_id uuid references public.people (id),
  add column due_date date,
  add column depends_on text[] not null default '{}',
  add column updated_at timestamptz,
  add column updated_by uuid references public.people (id),
  -- An added step has no workflow to read its progress from: a person says
  -- it is done (a workflow's step reads its own state, never this).
  add column done_at timestamptz,
  add column done_by uuid references public.people (id);
alter table public.project_plan_items add constraint project_plan_items_depends_check
  check (depends_on <@ array['strategy', 'master', 'legal', 'design', 'delivery']);

-- The plan's history: every launch, addition, change and move, with who and
-- when, and the values before and after. Written by the functions only.
create table public.project_plan_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  plan_id uuid not null,
  item_id uuid references public.project_plan_items (id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint project_plan_events_kind_check
    check (kind in ('launched', 'workflow_launched', 'step_added', 'step_updated', 'step_moved',
                    'step_done', 'step_reopened')),
  constraint project_plan_events_plan_same_org foreign key (plan_id, organization_id)
    references public.project_plans (id, organization_id) on delete cascade,
  constraint project_plan_events_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index project_plan_events_project_idx on public.project_plan_events (project_id, created_at desc);
alter table public.project_plan_events enable row level security;
alter table public.project_plan_events force row level security;
grant select on public.project_plan_events to authenticated;
create policy project_plan_events_select_visible on public.project_plan_events
  for select to authenticated using (public.can_see_project(project_id));

-- A pilot or an executor is an approved member of the organization.
create function public.plan_person_ok(p_org uuid, p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_person is null or exists (
    select 1 from public.memberships m
    where m.person_id = p_person and m.organization_id = p_org and m.status = 'approved');
$$;
revoke execute on function public.plan_person_ok(uuid, uuid) from public, anon, authenticated;

create function public.plan_item_snapshot(p_item public.project_plan_items)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('title', p_item.title, 'column', p_item.column_key,
                            'owner', p_item.owner_person_id, 'executor', p_item.executor_person_id,
                            'dueDate', p_item.due_date, 'dependsOn', to_jsonb(p_item.depends_on));
$$;

-- « Lancer le plan »: as before, plus each step's executor, due date and
-- dependencies, and the launch in the plan's history.
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
    v_launch := v_workflow in ('strategy', 'master', 'legal') and v_column in ('focus', 'meanwhile');
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

-- « Lancer maintenant » / « Ajouter et lancer »: as before, and recorded.
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

-- « Modifier l'étape » once the plan runs: column, title (an added step
-- only), pilot, executor, due date, dependencies. Moving a step never
-- launches it: launching stays its own confirmed action.
create function public.update_project_plan_item(
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
     -- A workflow is never a note; a note stays one.
     or (v_item.workflow is not null and p_column = 'anticipate')
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
revoke execute on function public.update_project_plan_item(uuid, text, text, uuid, uuid, date, text[]) from public, anon;
grant execute on function public.update_project_plan_item(uuid, text, text, uuid, uuid, date, text[]) to authenticated;

-- « Ajouter une étape » once the plan runs: a step a person names, at the
-- end of its column.
create function public.add_project_plan_item(
  p_project_id uuid,
  p_title text,
  p_column text,
  p_owner uuid,
  p_executor uuid,
  p_due_date date,
  p_depends_on text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.project_plans%rowtype;
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  select * into v_plan from public.project_plans where project_id = p_project_id for update;
  if not found then
    raise exception 'plan_required';
  end if;
  if p_column is null or p_column not in ('focus', 'next', 'meanwhile', 'anticipate')
     or nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if not public.plan_person_ok(v_plan.organization_id, p_owner)
     or not public.plan_person_ok(v_plan.organization_id, p_executor) then
    raise exception 'invalid_owner' using errcode = '23514';
  end if;

  insert into public.project_plan_items
    (organization_id, plan_id, project_id, column_key, workflow, title, owner_person_id,
     executor_person_id, due_date, depends_on, position, updated_at, updated_by)
  select v_plan.organization_id, v_plan.id, p_project_id, p_column, null, btrim(p_title), p_owner,
         p_executor, p_due_date, coalesce(p_depends_on, '{}'),
         coalesce(max(i.position), -1) + 1, now(), public.auth_person_id()
    from public.project_plan_items i where i.plan_id = v_plan.id
  returning id into v_id;

  insert into public.project_plan_events
    (organization_id, project_id, plan_id, item_id, kind, detail, actor_person_id)
  select v_plan.organization_id, p_project_id, v_plan.id, v_id, 'step_added',
         jsonb_build_object('after', public.plan_item_snapshot(i)), public.auth_person_id()
    from public.project_plan_items i where i.id = v_id;
  return v_id;
end;
$$;
revoke execute on function public.add_project_plan_item(uuid, text, text, uuid, uuid, date, text[]) from public, anon;
grant execute on function public.add_project_plan_item(uuid, text, text, uuid, uuid, date, text[]) to authenticated;

-- « Monter » / « Descendre » a step within its column.
create function public.move_project_plan_item(p_item_id uuid, p_offset integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.project_plan_items%rowtype;
  v_other public.project_plan_items%rowtype;
begin
  select * into v_item from public.project_plan_items where id = p_item_id for update;
  if not found or not public.can_see_project(v_item.project_id) then
    raise exception 'item_not_found';
  end if;
  if not public.is_project_owner(v_item.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_offset not in (-1, 1) then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  select * into v_other from public.project_plan_items
   where plan_id = v_item.plan_id and column_key = v_item.column_key and id <> v_item.id
     and ((p_offset < 0 and position < v_item.position) or (p_offset > 0 and position > v_item.position))
   order by case when p_offset < 0 then -position else position end
   limit 1
   for update;
  if not found then
    raise exception 'invalid_transition';
  end if;
  update public.project_plan_items set position = v_other.position,
         updated_at = now(), updated_by = public.auth_person_id()
   where id = v_item.id;
  update public.project_plan_items set position = v_item.position where id = v_other.id;
  insert into public.project_plan_events
    (organization_id, project_id, plan_id, item_id, kind, detail, actor_person_id)
  values (v_item.organization_id, v_item.project_id, v_item.plan_id, v_item.id, 'step_moved',
          jsonb_build_object('column', v_item.column_key, 'offset', p_offset), public.auth_person_id());
end;
$$;
revoke execute on function public.move_project_plan_item(uuid, integer) from public, anon;
grant execute on function public.move_project_plan_item(uuid, integer) to authenticated;

-- « Marquer comme faite » / « Rouvrir » an added step (never a workflow's).
create function public.set_project_plan_item_done(p_item_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.project_plan_items%rowtype;
begin
  select * into v_item from public.project_plan_items where id = p_item_id for update;
  if not found or not public.can_see_project(v_item.project_id) then
    raise exception 'item_not_found';
  end if;
  if not public.is_project_owner(v_item.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_item.workflow is not null or (v_item.done_at is not null) = p_done then
    raise exception 'invalid_transition';
  end if;
  update public.project_plan_items
     set done_at = case when p_done then now() end,
         done_by = case when p_done then public.auth_person_id() end,
         updated_at = now(), updated_by = public.auth_person_id()
   where id = p_item_id;
  insert into public.project_plan_events
    (organization_id, project_id, plan_id, item_id, kind, actor_person_id)
  values (v_item.organization_id, v_item.project_id, v_item.plan_id, p_item_id,
          case when p_done then 'step_done' else 'step_reopened' end, public.auth_person_id());
end;
$$;
revoke execute on function public.set_project_plan_item_done(uuid, boolean) from public, anon;
grant execute on function public.set_project_plan_item_done(uuid, boolean) to authenticated;
