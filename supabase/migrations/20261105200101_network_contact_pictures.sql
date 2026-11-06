-- Réseau: a contact's picture (retour d'Ibé du 01/11/2026, « Photo de profil
-- automatique depuis TikTok ou Instagram »). Uploaded by hand, or taken from
-- the contact's public TikTok or Instagram profile when they are saved (the
-- platforms' links expire within days, so the picture is copied here).
--
--   * picture_path: the file in the private `network-pictures` bucket,
--     "<organization_id>/<contact_id>/<uuid>.<ext>".
--   * picture_source: where it comes from: 'upload', 'tiktok', 'instagram',
--     or 'none' (removed by hand: never taken again from a profile until its
--     account changes). Null: never set, a profile may give one.
-- Additive: every row still passes.

alter table public.network_contacts
  add column picture_path text,
  add column picture_source text,
  add constraint network_contacts_picture_source_check
    check (picture_source is null
           or picture_source in ('upload', 'tiktok', 'instagram', 'none')),
  -- A file has a source; 'none' (and null) have no file.
  add constraint network_contacts_picture_pair_check
    check ((picture_path is null) = (picture_source is null or picture_source = 'none')),
  add constraint network_contacts_picture_path_format
    check (picture_path is null
           or picture_path ~ ('^' || organization_id::text || '/' || id::text
                              || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));

grant insert (picture_path, picture_source) on public.network_contacts to authenticated;
grant update (picture_path, picture_source) on public.network_contacts to authenticated;

-- Private bucket: every member reads (the Réseau is shared), manage_network
-- writes, under a contact of the same organization.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('network-pictures', 'network-pictures', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy network_pictures_select_members
  on storage.objects for select to authenticated
  using (bucket_id = 'network-pictures'
         and public.is_active_member(public.try_uuid((storage.foldername(name))[1])));

create policy network_pictures_insert_network
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'network-pictures'
    and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_network')
    -- objects.name spelled out: inside the subquery a bare `name` would be
    -- the contact's name.
    and exists (
      select 1 from public.network_contacts c
       where c.id = public.try_uuid((storage.foldername(objects.name))[2])
         and c.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy network_pictures_delete_network
  on storage.objects for delete to authenticated
  using (bucket_id = 'network-pictures'
         and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_network'));
