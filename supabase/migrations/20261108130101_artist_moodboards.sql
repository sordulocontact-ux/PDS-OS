-- Moodboards of an artist (retour du 31/10/2026, onglet Identité : « uploader
-- directement un moodboard qui a été fait par notre directeur artistique »).
--
-- A new category of the artist's library, shown on its Identité tab and in
-- its Fichiers. Outside the identity's versions: a moodboard dropped is there
-- at once, no proposal to the DG.
--
-- The creative director drops it himself (creative_work, as he writes the
-- identity), in this category only, and edits or deletes his own; the
-- Catalogue (manage_catalog) keeps every right on every file. Same rule as
-- the creative team in a project's library (project_files_*_creative).

alter table public.artist_files drop constraint artist_files_category_check;
alter table public.artist_files add constraint artist_files_category_check
  check (category in ('press', 'photo', 'contract', 'audio', 'moodboard', 'other'));

create policy artist_files_insert_creative on public.artist_files
  for insert to authenticated
  with check (public.has_permission(organization_id, 'creative_work')
              and category = 'moodboard');

create policy artist_files_update_creative on public.artist_files
  for update to authenticated
  using (public.has_permission(organization_id, 'creative_work')
         and created_by = public.auth_person_id()
         and category = 'moodboard')
  with check (public.has_permission(organization_id, 'creative_work')
              and created_by = public.auth_person_id()
              and category = 'moodboard');

create policy artist_files_delete_creative on public.artist_files
  for delete to authenticated
  using (public.has_permission(organization_id, 'creative_work')
         and created_by = public.auth_person_id()
         and category = 'moodboard');

-- The object goes up before its row: the creative director may put one under
-- an artist of his organization, then read or delete his own.
create policy artist_files_objects_insert_creative
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artist-files'
    and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'creative_work')
    and exists (
      select 1 from public.artists a
       where a.id = public.try_uuid((storage.foldername(objects.name))[2])
         and a.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy artist_files_objects_select_creative
  on storage.objects for select to authenticated
  using (bucket_id = 'artist-files'
         and owner_id = (auth.uid())::text
         and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'creative_work'));

create policy artist_files_objects_delete_creative
  on storage.objects for delete to authenticated
  using (bucket_id = 'artist-files'
         and owner_id = (auth.uid())::text
         and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'creative_work'));
