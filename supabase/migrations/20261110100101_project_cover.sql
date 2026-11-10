-- The project's cover (retour « Vue d'ensemble du projet : pochette… »,
-- Akili 05/11/2026, proto validated by Sacha 10/11/2026): an image chosen
-- at creation or later, optional, shown at the head of the overview. Without
-- one, the app draws a default visual (never stored).
--
-- It is the project's identity, not the delivered artwork: the Conception's
-- cover sheet and the Distribution's cover stay where they are.
--
-- projects.cover_path: "<organization_id>/<project_id>/<uuid>.<ext>" in the
-- private `project-covers` bucket. Written only through set_project_cover():
-- the direction (create_projects) before the plan is launched, then only the
-- project's owner — the rule of every write inside a launched project
-- (is_project_owner), which the table's RLS (projects_update_before_launch)
-- cannot express for a single column.

alter table public.projects
  add column cover_path text;

alter table public.projects
  add constraint projects_cover_path_format
    check (cover_path is null
           or cover_path ~ ('^' || organization_id::text || '/' || id::text
                            || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));

-- ---------------------------------------------------------------------------
-- Who may change it
-- ---------------------------------------------------------------------------

create or replace function public.can_edit_project_cover(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
     where p.id = p_project_id
       and p.archived_at is null
       and (
         public.is_project_owner(p.id)
         or (not public.is_project_launched(p.id)
             and public.has_permission(p.organization_id, 'create_projects')
             and public.can_see_project_row(p.organization_id, p.id, p.owner_person_id))
       )
  );
$$;

revoke execute on function public.can_edit_project_cover(uuid) from public, anon;
grant execute on function public.can_edit_project_cover(uuid) to authenticated;

-- Records the uploaded image (no path: back to the default visual)
-- and returns the path it replaces, for the caller to remove the object
-- with its own session (storage RLS below). The format check is the
-- table's constraint.
create or replace function public.set_project_cover(p_project_id uuid, p_path text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
begin
  if not public.can_edit_project_cover(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select cover_path into v_previous
    from public.projects
   where id = p_project_id
     for update;
  update public.projects
     set cover_path = p_path
   where id = p_project_id;
  return v_previous;
end;
$$;

revoke execute on function public.set_project_cover(uuid, text) from public, anon;
grant execute on function public.set_project_cover(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Private bucket, objects under "<organization_id>/<project_id>/<uuid>.<ext>".
-- Whoever sees the project reads its cover; whoever may change it writes and
-- removes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-covers', 'project-covers', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy project_covers_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-covers'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
    and public.can_see_project(public.try_uuid((storage.foldername(name))[2]))
  );

create policy project_covers_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-covers'
    -- objects.name spelled out: inside the subquery a bare `name` would not
    -- be the object's.
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
    and public.can_edit_project_cover(public.try_uuid((storage.foldername(name))[2]))
  );

create policy project_covers_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-covers'
    and public.can_edit_project_cover(public.try_uuid((storage.foldername(name))[2]))
  );
