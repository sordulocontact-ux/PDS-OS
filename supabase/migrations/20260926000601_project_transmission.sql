-- Handing a project over to a project manager (docs/CONTEXTE-PROJET.md § 12,
-- "Circuit d'attribution"):
--   1. the director transmits the project to a project manager;
--   2. the project manager accepts, refuses, or asks for a clarification;
--   3. refusal or clarification: the project goes back to the director with
--      the message, who may transmit it again (same person or another);
--   4. acceptance launches the project: the manager becomes its owner and the
--      stages are created. Never before.
-- Every transmission is kept (history). States change through the two
-- functions below only: clients have no write access to the table.

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  assignee_person_id uuid not null references public.people (id),
  assigned_by uuid references public.people (id),
  -- Optional message from the director (the answer to a clarification, say).
  note text,
  status text not null default 'pending',
  -- Required when refusing or asking for a clarification.
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint project_assignments_status_check
    check (status in ('pending', 'accepted', 'refused', 'clarification_requested')),
  constraint project_assignments_note_length check (note is null or char_length(note) <= 5000),
  constraint project_assignments_response_length
    check (response is null or char_length(response) <= 5000),
  constraint project_assignments_response_required
    check (status not in ('refused', 'clarification_requested')
           or btrim(coalesce(response, '')) <> ''),
  constraint project_assignments_responded_when_closed
    check ((status = 'pending') = (responded_at is null)),
  constraint project_assignments_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

-- One transmission waiting at a time per project.
create unique index project_assignments_one_pending
  on public.project_assignments (project_id) where status = 'pending';
create index project_assignments_project_idx
  on public.project_assignments (project_id, created_at desc);
create index project_assignments_assignee_pending_idx
  on public.project_assignments (assignee_person_id) where status = 'pending';

alter table public.project_assignments enable row level security;
alter table public.project_assignments force row level security;
revoke all on table public.project_assignments from anon, authenticated;
grant select on table public.project_assignments to authenticated;
create policy project_assignments_select_members on public.project_assignments
  for select to authenticated using (public.is_active_member(organization_id));

-- The owner is set at acceptance only, never by a client.
revoke update (owner_person_id) on public.projects from authenticated;

-- Does this person (not necessarily the caller) hold the permission?
-- Approved membership, account not disabled.
create or replace function public.person_has_permission(
  p_organization_id uuid,
  p_person_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id
    where m.organization_id = p_organization_id
      and m.person_id = p_person_id
      and m.status = 'approved'
      and a.disabled_at is null
      and p_permission = any (public.role_permissions(m.role))
  );
$$;

revoke execute on function public.person_has_permission(uuid, uuid, text) from public, anon, authenticated;

-- People a project can be transmitted to, for the director's picker.
create or replace function public.list_assignable_people(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
  from public.people p
  where public.has_permission(p_organization_id, 'assign_projects')
    and public.person_has_permission(p_organization_id, p.id, 'pilot_projects')
  order by p.first_name, p.last_name;
$$;

revoke execute on function public.list_assignable_people(uuid) from public, anon;
grant execute on function public.list_assignable_people(uuid) to authenticated;

create or replace function public.transmit_project(
  p_project_id uuid,
  p_assignee_person_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_id uuid;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.is_active_member(v_project.organization_id) then
    raise exception 'project_not_found';
  end if;
  if not public.has_permission(v_project.organization_id, 'assign_projects') then
    raise exception 'not_allowed_to_transmit' using errcode = '42501';
  end if;
  if v_project.archived_at is not null then
    raise exception 'project_archived';
  end if;
  if exists (select 1 from public.project_stages s where s.project_id = p_project_id) then
    raise exception 'project_already_launched';
  end if;
  if exists (select 1 from public.project_assignments pa
             where pa.project_id = p_project_id and pa.status = 'pending') then
    raise exception 'assignment_pending';
  end if;
  if not public.person_has_permission(v_project.organization_id, p_assignee_person_id, 'pilot_projects') then
    raise exception 'invalid_assignee';
  end if;

  insert into public.project_assignments (organization_id, project_id, assignee_person_id, assigned_by, note)
  values (v_project.organization_id, p_project_id, p_assignee_person_id, public.auth_person_id(),
          nullif(btrim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.transmit_project(uuid, uuid, text) from public, anon;
grant execute on function public.transmit_project(uuid, uuid, text) to authenticated;

create or replace function public.respond_to_assignment(
  p_assignment_id uuid,
  p_decision text,
  p_response text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.project_assignments%rowtype;
begin
  select * into v_assignment from public.project_assignments where id = p_assignment_id for update;
  if not found or not public.is_active_member(v_assignment.organization_id) then
    raise exception 'assignment_not_found';
  end if;
  if v_assignment.assignee_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_assignment.organization_id, 'pilot_projects') then
    raise exception 'not_the_assignee' using errcode = '42501';
  end if;
  if v_assignment.status <> 'pending' then
    raise exception 'assignment_closed';
  end if;
  if p_decision not in ('accepted', 'refused', 'clarification_requested') then
    raise exception 'invalid_decision';
  end if;
  if p_decision <> 'accepted' and btrim(coalesce(p_response, '')) = '' then
    raise exception 'response_required';
  end if;

  update public.project_assignments
     set status = p_decision,
         response = nullif(btrim(p_response), ''),
         responded_at = now()
   where id = p_assignment_id;

  if p_decision = 'accepted' then
    -- Launch: the manager owns the project, one stage per active definition.
    update public.projects
       set owner_person_id = v_assignment.assignee_person_id
     where id = v_assignment.project_id;

    insert into public.project_stages (organization_id, project_id, stage_definition_id)
    select v_assignment.organization_id, v_assignment.project_id, d.id
    from public.stage_definitions d
    where d.organization_id = v_assignment.organization_id
      and d.archived_at is null
    on conflict (project_id, stage_definition_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.respond_to_assignment(uuid, text, text) from public, anon;
grant execute on function public.respond_to_assignment(uuid, text, text) to authenticated;

-- Replaced by the launch in respond_to_assignment (its trigger was dropped in …000501).
drop function public.projects_create_stages();
