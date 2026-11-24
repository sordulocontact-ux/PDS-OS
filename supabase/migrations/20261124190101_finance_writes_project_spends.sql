-- The Finance writes the spends of every project (Sacha, 24/11/2026: « je suis DG, je devrais
-- pouvoir le faire, un DG ou business peut faire tout ce qu'il veut sur la finance, c'est son
-- rôle »).
--
-- Until now a project's spends were written by its owner alone (« dans un projet lancé, seul son
-- responsable écrit ») and read by the owner and the direction: the Finance could not put a
-- spend on « Ciel ouvert » from Dépenses. Whoever manages the Finance (manage_finance: the
-- direction, business managers, business) now adds, changes and removes them, and whoever reads
-- the Finance reads them. The owner keeps their rights; the rest of a project (framing, calls,
-- release…) stays the owner's.

create policy budget_lines_select_finance_projects on public.budget_lines
  for select to authenticated
  using (project_id is not null and public.has_permission(organization_id, 'read_finance'));

create policy budget_lines_insert_finance_projects on public.budget_lines
  for insert to authenticated
  with check (project_id is not null and public.has_permission(organization_id, 'manage_finance'));

create policy budget_lines_update_finance_projects on public.budget_lines
  for update to authenticated
  using (project_id is not null and public.has_permission(organization_id, 'manage_finance'))
  with check (project_id is not null and public.has_permission(organization_id, 'manage_finance'));

create policy budget_lines_delete_finance_projects on public.budget_lines
  for delete to authenticated
  using (project_id is not null and public.has_permission(organization_id, 'manage_finance'));
