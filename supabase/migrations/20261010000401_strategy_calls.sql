-- Stratégie, étape 1 (docs/ARCHITECTURE.md § 6 bis): the entry of the
-- Stratégie and its prepared exchanges.
--   1. « Commencer la stratégie »: the stage is already in progress once the
--      Plan du Projet launches it; the workspace marks that the owner opened
--      the work, so the entry gives way to it;
--   2. strategy calls: a normal call, plus what it is for, who takes part and
--      how it is held. Once processed, its report fills the Stratégie
--      (proposals), never the Cadrage.

-- 1. Workspace -----------------------------------------------------------------

create table public.strategy_workspaces (
  project_id uuid primary key,
  organization_id uuid not null,
  started_at timestamptz not null default now(),
  started_by uuid references public.people (id),
  constraint strategy_workspaces_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.strategy_workspaces enable row level security;
alter table public.strategy_workspaces force row level security;
-- Written by start_strategy only.
grant select on public.strategy_workspaces to authenticated;
create policy strategy_workspaces_select_visible on public.strategy_workspaces
  for select to authenticated using (public.can_see_project(project_id));

-- A strategy already worked on before this migration is started.
insert into public.strategy_workspaces (project_id, organization_id, started_at)
select s.project_id, s.organization_id, coalesce(s.state_changed_at, now())
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where d.key = 'launch_strategy'
   and (s.state in ('awaiting_validation', 'validated')
        or exists (select 1 from public.field_values f
                   where f.project_id = s.project_id and f.deliverable = 'strategy')
        or exists (select 1 from public.levers l where l.project_id = s.project_id)
        or exists (select 1 from public.milestones m where m.project_id = s.project_id))
on conflict (project_id) do nothing;

-- « Commencer la stratégie »: owner only, once the plan has started the stage.
-- Starting twice is harmless (a call processed first may already have).
create function public.start_strategy(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state = 'in_progress') then
    raise exception 'plan_required';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.strategy_workspaces (project_id, organization_id, started_at, started_by)
  values (p_project_id, v_org, now(), public.auth_person_id())
  on conflict (project_id) do nothing;
end;
$$;
revoke execute on function public.start_strategy(uuid) from public, anon;
grant execute on function public.start_strategy(uuid) to authenticated;

-- 2. Strategy calls ---------------------------------------------------------------

create table public.strategy_calls (
  call_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  purpose text not null,
  participants jsonb not null default '[]'::jsonb,
  -- video = visio, in_person = sur place, phone = téléphone.
  format text not null,
  -- Read by framing_calls_check(): a strategy call takes no document.
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint strategy_calls_purpose_check
    check (btrim(purpose) <> '' and char_length(purpose) <= 500),
  constraint strategy_calls_participants_check
    check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 30),
  constraint strategy_calls_format_check check (format in ('video', 'in_person', 'phone')),
  constraint strategy_calls_documents_check check (cardinality(document_ids) = 0),
  constraint strategy_calls_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade,
  constraint strategy_calls_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create index strategy_calls_project_idx on public.strategy_calls (project_id);
alter table public.strategy_calls enable row level security;
alter table public.strategy_calls force row level security;
grant select on public.strategy_calls to authenticated;
grant insert (call_id, organization_id, project_id, purpose, participants, format)
  on public.strategy_calls to authenticated;
create policy strategy_calls_select_visible on public.strategy_calls
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_calls_insert_owner on public.strategy_calls
  for insert to authenticated
  with check (public.is_project_owner(project_id)
              and exists (select 1 from public.calls c
                          where c.id = strategy_calls.call_id
                            and c.project_id = strategy_calls.project_id));

-- Participants are names (a member or someone outside): the same check as
-- the Cadrage's exchanges.
create trigger a_check before insert on public.strategy_calls
  for each row execute function public.framing_calls_check();

-- « Créer l'échange »: the call and its strategy details in one transaction,
-- with the caller's rights (the owner writes the project's calls). Only while
-- the Stratégie can still move: Cadrage validated, Stratégie not submitted.
create function public.create_strategy_call(
  p_project_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb,
  p_purpose text,
  p_participants jsonb,
  p_format text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid;
  v_call uuid;
  v_minutes integer;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null then
    raise exception 'project_not_found';
  end if;
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'framing' and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state in ('not_started', 'in_progress')) then
    raise exception 'stage_locked';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;

  insert into public.calls (organization_id, project_id, title, occurred_at, meeting_url,
                            consent, agenda, duration_minutes)
  values (v_org, p_project_id, p_title, p_occurred_at,
          case when p_format = 'video' then nullif(btrim(p_meeting_url), '') end,
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;

  insert into public.strategy_calls
    (call_id, organization_id, project_id, purpose, participants, format)
  values (v_call, v_org, p_project_id, p_purpose, coalesce(p_participants, '[]'::jsonb),
          p_format);
  return v_call;
end;
$$;
revoke execute on function public.create_strategy_call(uuid, text, timestamptz, text, jsonb, text, jsonb, text)
  from public, anon;
grant execute on function public.create_strategy_call(uuid, text, timestamptz, text, jsonb, text, jsonb, text)
  to authenticated;
