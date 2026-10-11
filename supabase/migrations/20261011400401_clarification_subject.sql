-- PROJ-UX-02: a request for clarification says what it is about.
--
-- Before: « Demander une précision » was a free message in the answer, the
-- director's reply the note of the next transmission. Now the request also
-- carries its subject (budget, dates, scope, team, other), so the history
-- lists each request with its author, date, subject, question, reply and
-- whether it was answered (paired by code with the next transmission,
-- lib/projects/clarifications.ts). The words stay readable only through
-- project_assignment_messages() (…20261010001601).

alter table public.project_assignments
  add column clarification_subject text,
  add constraint project_assignments_subject_check
    check (clarification_subject is null
           or (clarification_subject in ('budget', 'timing', 'scope', 'team', 'other')
               and status = 'clarification_requested'));
grant select (clarification_subject) on public.project_assignments to authenticated;

drop function public.respond_to_assignment(uuid, text, text);

create or replace function public.respond_to_assignment(
  p_assignment_id uuid,
  p_decision text,
  p_response text default null,
  p_subject text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.project_assignments%rowtype;
begin
  select * into v_assignment from public.project_assignments where id = p_assignment_id for update;
  if not found or not public.is_active_member(v_assignment.organization_id) then
    raise exception 'assignment_not_found';
  end if;
  if v_assignment.assignee_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_assignment.organization_id, 'pilot_projects') then
    raise exception 'not_the_assignee' using errcode = '42501';
  end if;
  if v_assignment.status <> 'pending' then
    raise exception 'assignment_closed';
  end if;
  if p_decision not in ('accepted', 'refused', 'clarification_requested') then
    raise exception 'invalid_decision';
  end if;
  if p_decision <> 'accepted' and btrim(coalesce(p_response, '')) = '' then
    raise exception 'response_required';
  end if;

  update public.project_assignments
     set status = p_decision,
         response = nullif(btrim(p_response), ''),
         responded_at = now(),
         -- A clarification says what it is about (PROJ-UX-02).
         clarification_subject = case when p_decision = 'clarification_requested'
                                      then coalesce(p_subject, 'other') end
   where id = p_assignment_id;

  if p_decision = 'accepted' then
    -- Launch: the manager owns the project, one stage per active definition.
    update public.projects
       set owner_person_id = v_assignment.assignee_person_id
     where id = v_assignment.project_id;

    insert into public.project_stages (organization_id, project_id, stage_definition_id)
    select v_assignment.organization_id, v_assignment.project_id, d.id
    from public.stage_definitions d
    where d.organization_id = v_assignment.organization_id
      and d.archived_at is null
    on conflict (project_id, stage_definition_id) do nothing;
  end if;
end;
$$;
revoke execute on function public.respond_to_assignment(uuid, text, text, text) from public, anon;
grant execute on function public.respond_to_assignment(uuid, text, text, text) to authenticated;
