-- Images joined to a question to PO (Sacha, 13/11/2026: « je voudrais pouvoir
-- ajouter une image dans une conversation avec PO »).
--
-- Private bucket, objects under "<person_id>/<uuid>.<ext>": an image belongs
-- to the person who sent it, like the conversation it is part of
-- (assistant_conversations is private, 20261103100101). Uploaded by
-- /api/assistant/images with the member's session, read back by the same
-- route (the thread, PO's answer), removed with its conversation. Nobody
-- else reads it, not even an administrator.
--
-- Already shrunk by the browser (lib/images/shrink-image.ts, 2,000 px at
-- most); the 5 MB bound is the bucket's own check.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assistant-images', 'assistant-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy assistant_images_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assistant-images'
    and public.try_uuid((storage.foldername(name))[1]) = public.auth_person_id()
  );

create policy assistant_images_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assistant-images'
    and public.try_uuid((storage.foldername(name))[1]) = public.auth_person_id()
  );

create policy assistant_images_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assistant-images'
    and public.try_uuid((storage.foldername(name))[1]) = public.auth_person_id()
  );
