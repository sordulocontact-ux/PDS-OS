-- What a transmission says (the director's message, the project manager's
-- answer: a refusal's reason, a question and its reply) is no longer read by
-- everyone who sees the project (UX test of 09/10/2026, section 5: the next
-- project manager and the creative director read why the first one refused,
-- and the exchange about the budget).
--
-- Who reads the words of a transmission: the person it was sent to, the
-- person who sent it, and the members who transmit projects
-- (assign_projects: the direction decides what comes next). Everyone else
-- still sees the history (who, when, the decision), not the words.
--
-- The two columns are withheld from direct reads (column grants); the
-- readers get them through project_assignment_messages().

revoke select on table public.project_assignments from authenticated;
grant select (id, organization_id, project_id, assignee_person_id, assigned_by, status,
              responded_at, created_at)
  on public.project_assignments to authenticated;

create or replace function public.project_assignment_messages(p_project_id uuid)
returns table (assignment_id uuid, note text, response text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.note, a.response
    from public.project_assignments a
   where a.project_id = p_project_id
     and (a.note is not null or a.response is not null)
     and public.is_active_member(a.organization_id)
     and (a.assignee_person_id = public.auth_person_id()
          or a.assigned_by = public.auth_person_id()
          or public.has_permission(a.organization_id, 'assign_projects'));
$$;

revoke execute on function public.project_assignment_messages(uuid) from public, anon;
grant execute on function public.project_assignment_messages(uuid) to authenticated;
