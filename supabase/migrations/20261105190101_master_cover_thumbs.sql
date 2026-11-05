-- Cover of a title (retour « Ajouter une cover avec versions mises à jour »,
-- 01/11/2026): the latest « Pochette » image of its files
-- (lib/catalog/cover-rules.ts). When it is filed, the browser also sends a
-- small JPEG copy beside it, at "<path>.thumb.jpg", shown by the lists
-- instead of a 3000 px original.
--
-- That copy has no master_files row: the positive read rule of 20260927012001
-- (manage_catalog, or an object that is a file of a title) would hide it from
-- the members who read the file without manage_catalog. It is now readable
-- by whoever reads the file it copies. Contracts never have one (only an
-- `artwork` image gets a copy), and an object named so without a file stays
-- hidden. Writing and deleting keep their rules (manage_catalog).

drop policy master_files_objects_select on storage.objects;

create policy master_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'master-files'
    and public.is_active_member(public.try_uuid((storage.foldername(objects.name))[1]))
    and (
      public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
      or exists (select 1 from public.master_files f where f.path = objects.name)
      or (
        objects.name like '%.thumb.jpg'
        and exists (
          select 1 from public.master_files f
           where f.category = 'artwork'
             and f.path = left(objects.name, -length('.thumb.jpg'))
        )
      )
    )
  );
