-- Column rights of the Conception's new fields (20261019040101 to 040501):
-- a late addition's format is written with it; a sheet's cover format and
-- « Modifier (nouvelle version) », and an element's « Publié le », by the
-- people design_sheet_can_edit lets through (RLS unchanged).

grant insert (format) on public.design_deliverables to authenticated;
grant update (file_format, new_version_at) on public.design_sheets to authenticated;
grant update (publish_date) on public.design_sheet_items to authenticated;
