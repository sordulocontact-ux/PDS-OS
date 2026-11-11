-- Projet collectif, lot 1 (docs/pds-mic-plan.md § 0 bis, décisions 1 et 2;
-- § 8, lot 1): the flag and the main artist.
--
--   1. projects.collective: false everywhere by default, no existing project
--      changed. Set by hand or by a script for now (the creation form comes
--      later): no column grant to authenticated.
--   2. The main artist of a collective is projects.artist_id (nullable, same
--      organization, already the artist a content project names). PDS is
--      proposed by the creation form later; no default in the database.
--   3. project_artist_name / project_artist_id read the main artist first
--      for a collective only; any other project keeps its rule (first
--      credit of its first title, else projects.artist_id). Search, the
--      smartlink and the Conception's identity (design_workspaces trigger,
--      use_artist_identity_version, design_references check) follow.
--   4. set_project_main_artist: the owner of a launched collective, or who
--      creates projects before launch, changes it. The Conception's identity
--      already chosen is kept (never rewritten here); the code signals when
--      it no longer belongs to the main artist (risque 2 du plan).

-- 1. The flag ------------------------------------------------------------------

alter table public.projects
  add column collective boolean not null default false;

comment on column public.projects.collective is
  'Projet collectif (docs/pds-mic-plan.md): several artists and titles in one project; its main artist is artist_id.';

-- 2 and 3. The project's artist --------------------------------------------------

-- Display artist of a project: a collective's main artist; else the main
-- credit of its first master, else the artist a project names.
create or replace function public.project_artist_name(p_project_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select a.name
       from public.projects p
       join public.artists a on a.id = p.artist_id
      where p.id = p_project_id and p.collective),
    (select a.name
       from public.project_masters pm
       join public.master_artists ma on ma.master_id = pm.master_id
       join public.artists a on a.id = ma.artist_id
      where pm.project_id = p_project_id
      order by pm.position, ma.position
      limit 1),
    (select a.name
       from public.projects p
       join public.artists a on a.id = p.artist_id
      where p.id = p_project_id)
  );
$$;

revoke execute on function public.project_artist_name(uuid) from public, anon;
grant execute on function public.project_artist_name(uuid) to authenticated;

-- The artist of a project (same rule as project_artist_name).
create or replace function public.project_artist_id(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.artist_id from public.projects p
      where p.id = p_project_id and p.collective),
    (select ma.artist_id
       from public.project_masters pm
       join public.master_artists ma on ma.master_id = pm.master_id
      where pm.project_id = p_project_id
      order by pm.position, ma.position
      limit 1),
    (select p.artist_id from public.projects p where p.id = p_project_id));
$$;
revoke execute on function public.project_artist_id(uuid) from public, anon;
grant execute on function public.project_artist_id(uuid) to authenticated;

-- 4. Changing the main artist ------------------------------------------------------

create or replace function public.set_project_main_artist(
  p_project_id uuid,
  p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if v_project.archived_at is not null
     or not (public.is_project_owner(p_project_id)
             or (public.has_permission(v_project.organization_id, 'create_projects')
                 and not public.is_project_launched(p_project_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if p_artist_id is null then
    raise exception 'artist_required' using errcode = '23514';
  end if;
  if not exists (select 1 from public.artists a
                  where a.id = p_artist_id
                    and a.organization_id = v_project.organization_id
                    and a.archived_at is null) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;
  update public.projects set artist_id = p_artist_id where id = p_project_id;
end;
$$;
revoke execute on function public.set_project_main_artist(uuid, uuid) from public, anon;
grant execute on function public.set_project_main_artist(uuid, uuid) to authenticated;
