-- The creative team deposits in the project's library (UX test of
-- 09/10/2026, section 5: the creative director could deposit nothing before
-- the Conception). From the launch on, a creative director of the project
-- adds Visuels and Autres (references, first leads), and edits or deletes
-- only her own files, kept in those two categories. Brief, Contrats and
-- Presse stay the owner's, as everything else in a launched project.

create or replace function public.is_project_creative(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_creatives pc
      join public.projects p on p.id = pc.project_id
     where pc.project_id = p_project_id
       and pc.person_id = public.auth_person_id()
       and public.is_active_member(p.organization_id)
  );
$$;

revoke execute on function public.is_project_creative(uuid) from public, anon;
grant execute on function public.is_project_creative(uuid) to authenticated;

create policy project_files_insert_creative on public.project_files
  for insert to authenticated
  with check (public.is_project_creative(project_id)
              and category in ('visual', 'other'));

create policy project_files_update_creative on public.project_files
  for update to authenticated
  using (public.is_project_creative(project_id)
         and created_by = public.auth_person_id()
         and category in ('visual', 'other'))
  with check (public.is_project_creative(project_id)
              and created_by = public.auth_person_id()
              and category in ('visual', 'other'));

create policy project_files_delete_creative on public.project_files
  for delete to authenticated
  using (public.is_project_creative(project_id)
         and created_by = public.auth_person_id()
         and category in ('visual', 'other'));

-- Storage: she uploads into her project's folder, reads what she uploads
-- (the row comes right after), deletes her own objects.
create policy project_files_objects_insert_creative
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.is_project_creative(public.try_uuid((storage.foldername(objects.name))[2]))
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy project_files_objects_select_creative
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and objects.owner_id = auth.uid()::text
    and public.is_project_creative(public.try_uuid((storage.foldername(objects.name))[2]))
  );

create policy project_files_objects_delete_creative
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and objects.owner_id = auth.uid()::text
    and public.is_project_creative(public.try_uuid((storage.foldername(objects.name))[2]))
  );
