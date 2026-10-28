-- The Brief de cadrage's PDF, made once and kept (Sacha 28/10/2026: « le
-- PDF du Brief est super long »). Each download used to start a browser and
-- print again; a version sent to the direction never changes, so its PDF is
-- printed when it is sent and read back afterwards.
--
-- One file per version and state, named <brief id>-<state>.pdf: the PDF
-- says « En attente de validation » or « Validée », so a version that
-- changes state gets a new file. Written once with the user's session
-- (no update, no delete: the first file stays), only for a version that was
-- sent, in its current state, by the project's owner or the direction (who
-- send and validate it); read by whoever sees the project. Anyone else's
-- download is printed on the spot, as before.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('framing-brief-pdfs', 'framing-brief-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy framing_brief_pdfs_select
  on storage.objects for select to authenticated
  using (bucket_id = 'framing-brief-pdfs'
         and exists (select 1 from public.framing_briefs b
                      where objects.name = b.id::text || '-' || b.state || '.pdf'
                        and public.can_see_project(b.project_id)));

create policy framing_brief_pdfs_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'framing-brief-pdfs'
              and exists (select 1 from public.framing_briefs b
                           where objects.name = b.id::text || '-' || b.state || '.pdf'
                             and b.sent_at is not null
                             and (public.is_project_owner(b.project_id)
                                  or public.has_permission(b.organization_id, 'validate'))));
