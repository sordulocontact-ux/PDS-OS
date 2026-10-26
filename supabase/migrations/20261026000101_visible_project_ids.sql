-- Project visibility computed once per statement, not once per row
-- (docs/ARCHITECTURE.md § 12, « Visibilité des projets »).
--
-- 137 policies read `can_see_project(project_id)`. A SECURITY DEFINER function
-- with its own search_path is never inlined: Postgres ran the whole check
-- (membership, permission, owner, assignment, creative, engineer, production)
-- for every row read, about 1.5 ms a row, so several seconds for a page.
-- They now compare the row's project with the set of projects the viewer
-- may see, computed once per statement (an InitPlan).
--
-- visible_project_ids() is the set form of can_see_project_row(): both must
-- say the same. supabase/tests/visible-project-ids.test.sql checks it for
-- every kind of viewer; a new way to see a project goes into both.

create or replace function public.visible_project_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    -- auth_person_id(): an enabled account.
    select a.id as account_id, a.person_id
      from public.accounts a
     where a.id = auth.uid()
       and a.disabled_at is null
  ),
  orgs as (
    -- is_active_member() and has_permission(…, 'view_all_projects').
    select m.organization_id,
           bool_or('view_all_projects' = any (public.role_permissions(m.role))) as sees_all
      from public.memberships m
      join me on me.account_id = m.approved_account_id
     where m.status = 'approved'
     group by m.organization_id
  )
  select coalesce(array_agg(p.id), '{}')
    from public.projects p
    join orgs o on o.organization_id = p.organization_id
   cross join me
   where o.sees_all
      or p.owner_person_id = me.person_id
      or p.id in (select pa.project_id from public.project_assignments pa
                   where pa.status = 'pending' and pa.assignee_person_id = me.person_id)
      or p.id in (select pc.project_id from public.project_creatives pc
                   where pc.person_id = me.person_id)
      -- The in-house engineer of the Master (20261020010601).
      or p.id in (select mb.project_id from public.master_briefs mb
                   where me.person_id in (mb.mix_person_id, mb.mastering_person_id))
      or p.id in (select ps.project_id from public.production_sheets ps
                   where me.person_id in (ps.line_producer_person_id,
                                          ps.quote_validator_person_id, ps.dop_person_id));
$$;

revoke execute on function public.visible_project_ids() from public, anon;
grant execute on function public.visible_project_ids() to authenticated;

-- Reading the projects themselves. The set is taken before the statement
-- runs: a project created by this very statement (INSERT … RETURNING) is not
-- in it, so the per-row check stays behind, for those rows only.
alter policy projects_select_visible on public.projects
  using (id = any ((select public.visible_project_ids())::uuid[])
         or public.can_see_project_row(organization_id, id, owner_person_id));

-- Every policy that reads `can_see_project(project_id)`, alone or within a
-- larger condition. A policy on another column (r.project_id in a subquery)
-- keeps the per-row function.
do $$
declare
  r record;
  v_set constant text := '(project_id = any ((select public.visible_project_ids())::uuid[]))';
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (qual like '%can_see_project(project_id)%'
            or with_check like '%can_see_project(project_id)%')
  loop
    execute format(
      'alter policy %I on %I.%I%s%s',
      r.policyname, r.schemaname, r.tablename,
      case when r.qual is not null
           then format(' using (%s)', replace(r.qual, 'can_see_project(project_id)', v_set))
           else '' end,
      case when r.with_check is not null
           then format(' with check (%s)', replace(r.with_check, 'can_see_project(project_id)', v_set))
           else '' end);
  end loop;
end $$;
