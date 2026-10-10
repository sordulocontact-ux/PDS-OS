-- A project's budget is read by its owner and the direction only (UX test
-- of 09/10/2026, section 5: the creative director read the budget lines and
-- their notes). The lines of the Budget page and the Brief Mix/Master's
-- rates entered in it are the same rows (budget_lines.master_role).
-- Writing does not change: the owner alone.

create or replace function public.can_read_project_budget(p_project_id uuid)
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

revoke execute on function public.can_read_project_budget(uuid) from public, anon;
grant execute on function public.can_read_project_budget(uuid) to authenticated;

drop policy budget_lines_select_visible on public.budget_lines;
create policy budget_lines_select_budget_readers on public.budget_lines
  for select to authenticated
  using (public.can_see_project(project_id) and public.can_read_project_budget(project_id));
