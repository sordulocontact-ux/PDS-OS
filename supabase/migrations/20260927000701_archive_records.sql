-- Archiving artists, masters and projects (docs/ARCHITECTURE.md § 2 quater).
--
-- Archiving hides a row everywhere and keeps it, with its history and files:
-- it can be restored. Nothing is deleted.
--   * director only: permission archive_records (role_permissions);
--   * archived_at is written by the functions below only — clients lose the
--     column grant they had since the first domain migration;
--   * refused while the row is in use:
--       artist   credited on a live master, or artist of a live project
--       master   linked to a live project
--       project  launched (it has stages: its work lives in them)
--   * restoring is refused when it would bring back a broken link: a master
--     whose artist is archived, a project whose master or artist is archived,
--     an artist whose name (or Deezer profile) is now held by a live one;
--   * an archived row is no longer editable, and a transmission waiting on an
--     archived project cannot be answered until it is restored.

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
            'view_all_projects', 'archive_records']
    when 'project_manager' then array['pilot_projects', 'manage_catalog']
    when 'creative_director' then array['creative_work']
    else array[]::text[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- archived_at: through the functions only
-- ---------------------------------------------------------------------------

revoke update (archived_at) on public.artists from authenticated;
revoke update (archived_at) on public.masters from authenticated;
revoke update (archived_at) on public.projects from authenticated;

-- An archived row is not editable (its functions bypass RLS as definer).
drop policy artists_update_catalog on public.artists;
create policy artists_update_catalog on public.artists
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog') and archived_at is null)
  with check (public.has_permission(organization_id, 'manage_catalog'));

drop policy masters_update_catalog on public.masters;
create policy masters_update_catalog on public.masters
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog') and archived_at is null)
  with check (public.has_permission(organization_id, 'manage_catalog'));

drop policy projects_update_before_launch on public.projects;
create policy projects_update_before_launch on public.projects
  for update to authenticated
  using (public.has_permission(organization_id, 'create_projects')
         and public.can_see_project_row(organization_id, id, owner_person_id)
         and not public.is_project_launched(id)
         and archived_at is null)
  with check (public.has_permission(organization_id, 'create_projects')
              and not public.is_project_launched(id));

-- ---------------------------------------------------------------------------
-- Artists
-- ---------------------------------------------------------------------------

create or replace function public.set_artist_archived(p_artist_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artist public.artists%rowtype;
begin
  select * into v_artist from public.artists where id = p_artist_id for update;
  if not found or not public.is_active_member(v_artist.organization_id) then
    raise exception 'record_not_found';
  end if;
  if not public.has_permission(v_artist.organization_id, 'archive_records') then
    raise exception 'not_allowed_to_archive' using errcode = '42501';
  end if;
  -- Already in the asked state: nothing to do.
  if (v_artist.archived_at is not null) = p_archived then
    return;
  end if;

  if p_archived then
    if exists (select 1 from public.master_artists ma
                 join public.masters m on m.id = ma.master_id
                where ma.artist_id = p_artist_id and m.archived_at is null)
       or exists (select 1 from public.projects p
                   where p.artist_id = p_artist_id and p.archived_at is null) then
      raise exception 'artist_in_use';
    end if;
    update public.artists set archived_at = now() where id = p_artist_id;
  else
    begin
      update public.artists set archived_at = null where id = p_artist_id;
    exception when unique_violation then
      -- A live artist now holds this name or this Deezer profile.
      raise exception 'artist_name_taken';
    end;
  end if;
end;
$$;

revoke execute on function public.set_artist_archived(uuid, boolean) from public, anon;
grant execute on function public.set_artist_archived(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------

create or replace function public.set_master_archived(p_master_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.masters%rowtype;
begin
  select * into v_master from public.masters where id = p_master_id for update;
  if not found or not public.is_active_member(v_master.organization_id) then
    raise exception 'record_not_found';
  end if;
  if not public.has_permission(v_master.organization_id, 'archive_records') then
    raise exception 'not_allowed_to_archive' using errcode = '42501';
  end if;
  if (v_master.archived_at is not null) = p_archived then
    return;
  end if;

  if p_archived then
    if exists (select 1 from public.project_masters pm
                 join public.projects p on p.id = pm.project_id
                where pm.master_id = p_master_id and p.archived_at is null) then
      raise exception 'master_in_use';
    end if;
    update public.masters set archived_at = now() where id = p_master_id;
  else
    if exists (select 1 from public.master_artists ma
                 join public.artists a on a.id = ma.artist_id
                where ma.master_id = p_master_id and a.archived_at is not null) then
      raise exception 'master_uses_archived';
    end if;
    update public.masters set archived_at = null where id = p_master_id;
  end if;
end;
$$;

revoke execute on function public.set_master_archived(uuid, boolean) from public, anon;
grant execute on function public.set_master_archived(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create or replace function public.set_project_archived(p_project_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.can_see_project_row(v_project.organization_id, v_project.id,
                                                 v_project.owner_person_id) then
    raise exception 'record_not_found';
  end if;
  if not public.has_permission(v_project.organization_id, 'archive_records') then
    raise exception 'not_allowed_to_archive' using errcode = '42501';
  end if;
  if (v_project.archived_at is not null) = p_archived then
    return;
  end if;

  if p_archived then
    if public.is_project_launched(p_project_id) then
      raise exception 'project_launched';
    end if;
    update public.projects set archived_at = now() where id = p_project_id;
  else
    if exists (select 1 from public.project_masters pm
                 join public.masters m on m.id = pm.master_id
                where pm.project_id = p_project_id and m.archived_at is not null)
       or exists (select 1 from public.artists a
                   where a.id = v_project.artist_id and a.archived_at is not null) then
      raise exception 'project_uses_archived';
    end if;
    update public.projects set archived_at = null where id = p_project_id;
  end if;
end;
$$;

revoke execute on function public.set_project_archived(uuid, boolean) from public, anon;
grant execute on function public.set_project_archived(uuid, boolean) to authenticated;

-- A transmission waiting on an archived project is frozen with it: answering
-- would launch a project nobody sees any more.
create or replace function public.project_assignments_guard_archived()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.projects p
              where p.id = new.project_id and p.archived_at is not null) then
    raise exception 'project_archived';
  end if;
  return new;
end;
$$;

revoke execute on function public.project_assignments_guard_archived() from public, anon, authenticated;

create trigger b_guard_archived before update on public.project_assignments
  for each row execute function public.project_assignments_guard_archived();
