-- Who sees a project (docs/CONTEXTE-PROJET.md § 12):
--   * the director (permission view_all_projects): every project;
--   * a project manager: the projects they own, and the ones waiting for
--     their answer (transmitted, not answered yet) — not after a refusal;
--   * a creative director: the projects whose creative team they are in.
-- Nobody else sees the project nor anything inside it. The catalog (artists,
-- masters) stays visible to every member.

-- ---------------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------------

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects']
    when 'project_manager' then array['pilot_projects', 'manage_catalog']
    when 'creative_director' then array['creative_work']
    else array[]::text[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- Creative team of a project
-- ---------------------------------------------------------------------------

create table public.project_creatives (
  organization_id uuid not null,
  project_id uuid not null,
  person_id uuid not null references public.people (id),
  added_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint project_creatives_pkey primary key (project_id, person_id),
  constraint project_creatives_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index project_creatives_person_idx on public.project_creatives (person_id);

-- ---------------------------------------------------------------------------
-- The visibility rule
-- ---------------------------------------------------------------------------

-- Evaluated on the row itself: an INSERT … RETURNING checks the new row
-- against this policy before the row is visible to a lookup of projects.
create or replace function public.can_see_project_row(p_organization_id uuid, p_project_id uuid, p_owner_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_member(p_organization_id)
    and (
      public.has_permission(p_organization_id, 'view_all_projects')
      or (p_owner_person_id is not null and p_owner_person_id = public.auth_person_id())
      or exists (select 1 from public.project_assignments pa
                 where pa.project_id = p_project_id and pa.status = 'pending'
                   and pa.assignee_person_id = public.auth_person_id())
      or exists (select 1 from public.project_creatives pc
                 where pc.project_id = p_project_id and pc.person_id = public.auth_person_id())
    );
$$;

revoke execute on function public.can_see_project_row(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_see_project_row(uuid, uuid, uuid) to authenticated;

-- Everything inside a project reuses the same rule through its project row.
create or replace function public.can_see_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and public.can_see_project_row(p.organization_id, p.id, p.owner_person_id)
  );
$$;

revoke execute on function public.can_see_project(uuid) from public, anon;
grant execute on function public.can_see_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read policies: member → can see the project
-- ---------------------------------------------------------------------------

drop policy projects_select_members on public.projects;
create policy projects_select_visible on public.projects
  for select to authenticated
  using (public.can_see_project_row(organization_id, id, owner_person_id));

do $$
declare
  t text;
begin
  foreach t in array array['project_stages', 'releases', 'share_links', 'calls', 'field_values',
    'needs', 'project_team_members', 'open_points', 'project_masters', 'project_assignments',
    'levers', 'strategy_deliverables', 'milestones']
  loop
    execute format('drop policy %I on public.%I', t || '_select_members', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (public.can_see_project(project_id))', t || '_select_visible', t);
  end loop;
end;
$$;

-- A task stays visible to whoever it is assigned to.
drop policy tasks_select_members on public.tasks;
create policy tasks_select_visible on public.tasks
  for select to authenticated
  using (public.can_see_project(project_id)
         or (assignee_person_id = public.auth_person_id() and public.is_active_member(organization_id)));

drop policy transcripts_select_members on public.transcripts;
create policy transcripts_select_visible on public.transcripts
  for select to authenticated
  using (exists (select 1 from public.calls c where c.id = call_id and public.can_see_project(c.project_id)));

drop policy call_reports_select_members on public.call_reports;
create policy call_reports_select_visible on public.call_reports
  for select to authenticated
  using (exists (select 1 from public.calls c where c.id = call_id and public.can_see_project(c.project_id)));

drop policy report_items_select_members on public.report_items;
create policy report_items_select_visible on public.report_items
  for select to authenticated
  using (exists (select 1 from public.call_reports r join public.calls c on c.id = r.call_id
                 where r.id = report_id and public.can_see_project(c.project_id)));

drop policy release_links_select_members on public.release_links;
create policy release_links_select_visible on public.release_links
  for select to authenticated
  using (exists (select 1 from public.releases r where r.id = release_id and public.can_see_project(r.project_id)));

-- A validation stays visible to its validator.
drop policy validations_select_members on public.validations;
create policy validations_select_visible on public.validations
  for select to authenticated
  using (validator_person_id = public.auth_person_id()
         or exists (select 1 from public.project_stages s
                    where s.id = project_stage_id and public.can_see_project(s.project_id)));

-- Audio files: "<organization_id>/<call_id>/<file>".
drop policy call_audio_select_members on storage.objects;
create policy call_audio_select_visible
  on storage.objects for select to authenticated
  using (bucket_id = 'call-audio'
         and exists (select 1 from public.calls c
                     where c.id = public.try_uuid((storage.foldername(name))[2])
                       and public.can_see_project(c.project_id)));

alter table public.project_creatives enable row level security;
alter table public.project_creatives force row level security;
revoke all on table public.project_creatives from anon, authenticated;
grant select on table public.project_creatives to authenticated;
create policy project_creatives_select_visible on public.project_creatives
  for select to authenticated using (public.can_see_project(project_id));

-- ---------------------------------------------------------------------------
-- Managing the creative team: the director, or the project's owner
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_creatives(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (public.has_permission(p.organization_id, 'assign_projects')
           or public.is_project_owner(p.id))
  );
$$;

revoke execute on function public.can_manage_creatives(uuid) from public, anon;
grant execute on function public.can_manage_creatives(uuid) to authenticated;

-- Creative directors offered in the picker.
create or replace function public.list_creative_people(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
  from public.people p
  where public.is_active_member(p_organization_id)
    and public.person_has_permission(p_organization_id, p.id, 'creative_work')
  order by p.first_name, p.last_name;
$$;

revoke execute on function public.list_creative_people(uuid) from public, anon;
grant execute on function public.list_creative_people(uuid) to authenticated;

create or replace function public.add_project_creative(p_project_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select p.organization_id into v_org from public.projects p where p.id = p_project_id;
  if v_org is null or not public.is_active_member(v_org) then
    raise exception 'project_not_found';
  end if;
  if not public.can_manage_creatives(p_project_id) then
    raise exception 'not_allowed_to_manage_creatives' using errcode = '42501';
  end if;
  if not public.person_has_permission(v_org, p_person_id, 'creative_work') then
    raise exception 'invalid_creative';
  end if;
  insert into public.project_creatives (organization_id, project_id, person_id, added_by)
  values (v_org, p_project_id, p_person_id, public.auth_person_id())
  on conflict (project_id, person_id) do nothing;
end;
$$;

revoke execute on function public.add_project_creative(uuid, uuid) from public, anon;
grant execute on function public.add_project_creative(uuid, uuid) to authenticated;

create or replace function public.remove_project_creative(p_project_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_creatives(p_project_id) then
    raise exception 'not_allowed_to_manage_creatives' using errcode = '42501';
  end if;
  delete from public.project_creatives
   where project_id = p_project_id and person_id = p_person_id;
end;
$$;

revoke execute on function public.remove_project_creative(uuid, uuid) from public, anon;
grant execute on function public.remove_project_creative(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notification: a creative director learns a project appeared for them
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested',
  'validation_approved', 'validation_rejected', 'task_assigned',
  'project_creative_added'));

create or replace function public.project_creatives_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.organization_id, new.person_id, 'project_creative_added',
                        new.project_id, null);
  return null;
end;
$$;

revoke execute on function public.project_creatives_notify() from public, anon, authenticated;

create trigger z_notify after insert on public.project_creatives
  for each row execute function public.project_creatives_notify();
