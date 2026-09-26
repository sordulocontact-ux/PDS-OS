-- Project creation with its team, event projects, and framing that starts
-- from a call (docs/CONTEXTE-PROJET.md § 12).
--
--   * a project may be an event (masters optional, like partnership/content);
--   * create_project can transmit the project to a project manager and attach
--     creative directors in the same transaction: the circuit stays the same
--     (the manager accepts, refuses or asks for a clarification), it simply
--     starts at creation. Both reuse transmit_project / add_project_creative,
--     so the permission checks are the existing ones;
--   * the framing (Brief) opens once the project has a call report. Framings
--     already begun before this migration (stage started, or Brief content
--     written) stay open.

-- ---------------------------------------------------------------------------
-- Event projects
-- ---------------------------------------------------------------------------

alter table public.projects drop constraint projects_type_check;
alter table public.projects
  add constraint projects_type_check
  check (type in ('music_release', 'partnership', 'content', 'event'));

-- ---------------------------------------------------------------------------
-- Creation with the team
-- ---------------------------------------------------------------------------

drop function public.create_project(uuid, text, text, uuid[], date, bigint, text, text);

create or replace function public.create_project(
  p_organization_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_framing_notes text default null,
  -- Transmitted right away when given (transmit_project checks the rights).
  p_assignee_person_id uuid default null,
  p_creative_person_ids uuid[] default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_creative uuid;
begin
  if p_type = 'music_release' and coalesce(cardinality(p_master_ids), 0) = 0 then
    raise exception 'music_release_requires_master';
  end if;

  insert into public.projects (organization_id, title, type, due_date, budget_cents, priority, framing_notes)
  values (p_organization_id, btrim(p_title), p_type, p_due_date, p_budget_cents, p_priority,
          nullif(btrim(p_framing_notes), ''))
  returning id into v_id;

  insert into public.project_masters (organization_id, project_id, master_id, position)
  select p_organization_id, v_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(coalesce(p_master_ids, array[]::uuid[])) with ordinality as u (id, ordinality)
    group by u.id
  ) m;

  if p_assignee_person_id is not null then
    perform public.transmit_project(v_id, p_assignee_person_id, null);
  end if;

  foreach v_creative in array coalesce(p_creative_person_ids, array[]::uuid[])
  loop
    perform public.add_project_creative(v_id, v_creative);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[])
  from public, anon;
grant execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[])
  to authenticated;

-- ---------------------------------------------------------------------------
-- No framing without a call
-- ---------------------------------------------------------------------------

create or replace function public.framing_is_open(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project(p_project_id)
    and (
      exists (select 1 from public.call_reports r
              join public.calls c on c.id = r.call_id
              where c.project_id = p_project_id)
      -- Framings begun before the rule existed.
      or exists (select 1 from public.project_stages s
                 join public.stage_definitions d on d.id = s.stage_definition_id
                 where s.project_id = p_project_id and d.key = 'framing'
                   and s.state <> 'not_started')
      or exists (select 1 from public.field_values f
                 where f.project_id = p_project_id and f.deliverable = 'brief')
      or exists (select 1 from public.needs n where n.project_id = p_project_id)
      or exists (select 1 from public.project_team_members t where t.project_id = p_project_id)
    );
$$;

revoke execute on function public.framing_is_open(uuid) from public, anon;
grant execute on function public.framing_is_open(uuid) to authenticated;

-- Restrictive: added to the owner policies, never replacing them.
create policy field_values_framing_open on public.field_values
  as restrictive for insert to authenticated
  with check (deliverable <> 'brief' or public.framing_is_open(project_id));
create policy needs_framing_open on public.needs
  as restrictive for insert to authenticated
  with check (public.framing_is_open(project_id));
create policy project_team_members_framing_open on public.project_team_members
  as restrictive for insert to authenticated
  with check (public.framing_is_open(project_id));

create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
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
  if v_key = 'launch_strategy' and not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = v_stage.project_id and d.key = 'framing' and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;

  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;
