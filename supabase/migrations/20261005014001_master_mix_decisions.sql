-- Master workflow, lot 7: deciding on a version of the mix, then the
-- mastering (ticket "Workflow Master", § 11 and § 12; docs/ARCHITECTURE.md
-- § 8 septies).
--
-- The brief's validator (the project's owner when the brief names none)
-- decides on the latest version of a title: "Valider" makes it the title's
-- Mix final, for good; "Demander une modification" keeps the history and
-- waits for the next version. A decision is never changed, a validated
-- version never replaced silently: a version received afterwards stays
-- after it (the page says so), the Mix final does not move.

alter table public.master_mix_versions
  add column decision text,
  add column decision_note text,
  add column decided_by uuid references public.people (id),
  add column decided_at timestamptz,
  add constraint master_mix_versions_decision_check
    check (decision is null or decision in ('approved', 'changes_requested')),
  add constraint master_mix_versions_decision_note_check
    check (decision_note is null
           or (btrim(decision_note) <> '' and char_length(decision_note) <= 2000)),
  add constraint master_mix_versions_decision_complete
    check ((decision is null) = (decided_at is null));

-- One Mix final per title and project.
create unique index master_mix_versions_final_key
  on public.master_mix_versions (project_id, master_id)
  where decision = 'approved';

create or replace function public.decide_mix_version(
  p_version_id uuid,
  p_decision text,
  p_note text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_validator uuid;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select b.validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p
    left join public.master_briefs b on b.project_id = p.id
   where p.id = v_row.project_id;
  -- The brief's validator decides; without one, the project's owner.
  if v_actor is null
     or v_actor is distinct from coalesce(v_validator, v_owner)
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is not null then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.number > v_row.number) then
    raise exception 'not_latest';
  end if;
  if p_decision = 'approved' and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = v_row.project_id and v.master_id = v_row.master_id
          and v.decision = 'approved') then
    raise exception 'already_final';
  end if;

  update public.master_mix_versions
     set decision = p_decision, decision_note = nullif(btrim(p_note), ''),
         decided_by = v_actor, decided_at = now()
   where id = p_version_id;

  if v_owner is not null and v_owner <> v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, v_actor,
            case p_decision when 'approved' then 'master_mix_approved'
                            else 'master_mix_changes_requested' end,
            v_row.project_id, v_row.id);
  end if;
end;
$$;

revoke execute on function public.decide_mix_version(uuid, text, text) from public, anon;
grant execute on function public.decide_mix_version(uuid, text, text) to authenticated;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
  'master_mix_approved', 'master_mix_changes_requested')) not valid;
