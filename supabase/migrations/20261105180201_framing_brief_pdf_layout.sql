-- The Brief de cadrage's PDF has a new layout (retour d'Ibé du 02/11/2026 :
-- « niveau hiérarchie, il n'est pas fou »). The files kept by
-- 20261028000701_framing_brief_pdfs are of the old one and are never
-- rewritten (no update, no delete): the new files carry the layout in their
-- name, <brief id>-<state>-<layout>.pdf (lib/framing/brief-pdf-file.ts), so
-- each version is printed again once. The old names stay readable.

drop policy if exists framing_brief_pdfs_select on storage.objects;
create policy framing_brief_pdfs_select
  on storage.objects for select to authenticated
  using (bucket_id = 'framing-brief-pdfs'
         and exists (select 1 from public.framing_briefs b
                      where objects.name ~ ('^' || b.id::text || '-' || b.state || '(-l[0-9]+)?\.pdf$')
                        and public.can_see_project(b.project_id)));

drop policy if exists framing_brief_pdfs_insert on storage.objects;
create policy framing_brief_pdfs_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'framing-brief-pdfs'
              and exists (select 1 from public.framing_briefs b
                           where objects.name ~ ('^' || b.id::text || '-' || b.state || '(-l[0-9]+)?\.pdf$')
                             and b.sent_at is not null
                             and (public.is_project_owner(b.project_id)
                                  or public.has_permission(b.organization_id, 'validate'))));
