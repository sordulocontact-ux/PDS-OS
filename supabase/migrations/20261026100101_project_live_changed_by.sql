-- Page loads audit (26/10/2026, docs/ARCHITECTURE.md § 3 bis, « Rafraîchissement
-- d'un projet »): a page of a project re-read the whole project on every
-- project_live change, its own writes included (already re-read by the
-- action's revalidatePath), and on every return to the tab. The signal now
-- says who made the change, so the tab where the person acted skips it.
--
-- auth.uid() is the session's user, null for a public link (/c/, /f/…), a
-- cron job or a trigger without a session: those changes always refresh.

alter table public.project_live add column changed_by uuid;

create or replace function public.project_live_bump(p_project_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.project_live (project_id, organization_id, changed_by)
  select p.id, p.organization_id, auth.uid()
    from public.projects p where p.id = p_project_id
  on conflict (project_id) do update
    set version = public.project_live.version + 1,
        changed_at = now(),
        changed_by = excluded.changed_by;
$$;
revoke execute on function public.project_live_bump(uuid) from public, anon, authenticated;
