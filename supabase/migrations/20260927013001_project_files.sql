-- Files of a project: the same library as an artist's or a title's
-- (20260927012001_catalog_file_library.sql), on the Files page of a launched
-- project. One file = one row; its category is a property, and Tous, Brief,
-- Visuels… are filtered views of the same rows.
--
-- Reading follows the project: whoever sees the project (can_see_project)
-- reads its files, except contracts, read only by the project's owner and
-- the direction (view_all_projects). Writing is the owner's alone, as for
-- everything inside a launched project (is_project_owner): add, edit
-- (name, category, precision), delete.
--
-- The call recordings and the design versions keep their own tables and
-- sections of the page; they are not copied here.

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  category text not null default 'other',
  description text,
  -- "<organization_id>/<project_id>/<uuid>[.<ext>]" in the project-files bucket.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint project_files_category_check
    check (category in ('brief', 'visual', 'contract', 'press', 'other')),
  constraint project_files_description_check
    check (description is null
           or (btrim(description) <> '' and char_length(description) <= 200)),
  constraint project_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint project_files_mime_check check (char_length(mime) between 1 and 255),
  constraint project_files_bytes_check check (bytes > 0 and bytes <= 52428800),
  constraint project_files_path_format
    check (path ~ ('^' || organization_id::text || '/' || project_id::text
                   || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint project_files_path_key unique (path),
  constraint project_files_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create index project_files_project_idx on public.project_files (project_id, created_at desc);

create trigger a_set_created_by before insert on public.project_files
  for each row execute function public.set_created_by();

alter table public.project_files enable row level security;

alter table public.project_files force row level security;

revoke all on public.project_files from anon, authenticated;

-- Who reads a project's contracts: its owner and the direction.
create or replace function public.can_read_project_contracts(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
      or exists (select 1 from public.projects p
                  where p.id = p_project_id
                    and public.has_permission(p.organization_id, 'view_all_projects'));
$$;

revoke execute on function public.can_read_project_contracts(uuid) from public, anon;
grant execute on function public.can_read_project_contracts(uuid) to authenticated;

create policy project_files_select_visible on public.project_files
  for select to authenticated
  using (public.can_see_project(project_id)
         and (category <> 'contract' or public.can_read_project_contracts(project_id)));

create policy project_files_insert_owner on public.project_files
  for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy project_files_update_owner on public.project_files
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy project_files_delete_owner on public.project_files
  for delete to authenticated
  using (public.is_project_owner(project_id));

grant select, delete on public.project_files to authenticated;

grant insert (organization_id, project_id, category, description, path, file_name, mime, bytes)
  on public.project_files to authenticated;

grant update (file_name, category, description) on public.project_files to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, same rules as the rows
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 52428800, null)
on conflict (id) do nothing;

-- Positive rule (as artist-files since 20260927001102): the owner reads
-- everything of their project (an object being uploaded included), the
-- others only objects whose row they can see, which hides contracts.
-- objects.name spelled out: inside the subquery a bare `name` would not be
-- the object's.
create policy project_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
    and (
      public.is_project_owner(public.try_uuid((storage.foldername(objects.name))[2]))
      or exists (select 1 from public.project_files f where f.path = objects.name)
    )
  );

create policy project_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.is_project_owner(public.try_uuid((storage.foldername(objects.name))[2]))
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy project_files_objects_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-files'
         and public.is_project_owner(public.try_uuid((storage.foldername(objects.name))[2])));
