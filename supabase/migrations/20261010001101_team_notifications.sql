-- The creative team hears about its project (UX test of 09/10/2026,
-- section 5: the creative director was told neither the launch, nor the
-- Brief ready, nor a call planned with her). Written by trigger, never by the
-- code (CLAUDE.md, Notifications).
--
--   project accepted (launch)   → each creative director: project_launched
--   Brief version approved      → each creative director: brief_approved
--   invited to a project call   → the invited member: call_invited
--
-- A project call may now have attendees, chosen by the project's owner
-- among its team (owner and creative directors): a call never reaches
-- someone who cannot see the project. Meetings keep their own rule.
-- master_delivery_received / master_mastering_delivery_received: kept here
-- for the engineer's deposit (a later migration), so the list of kinds
-- changes once.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
  'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
  'master_final_approved', 'master_mastering_changes_requested',
  'clearance_terms_proposed', 'clearance_terms_validated', 'clearance_terms_rejected',
  'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
  'master_mastering_delivery_received'))
  not valid;

-- ---------------------------------------------------------------------------
-- Launch: the assignment accepted
-- ---------------------------------------------------------------------------
create or replace function public.project_launch_notify_creatives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    for v_person in
      select pc.person_id from public.project_creatives pc
       where pc.project_id = new.project_id
    loop
      perform public.notify(new.organization_id, v_person, 'project_launched',
                            new.project_id, new.id);
    end loop;
  end if;
  return null;
end;
$$;

revoke execute on function public.project_launch_notify_creatives() from public, anon, authenticated;

create trigger z_notify_creatives after update of status on public.project_assignments
  for each row execute function public.project_launch_notify_creatives();

-- ---------------------------------------------------------------------------
-- Brief approved
-- ---------------------------------------------------------------------------
create or replace function public.framing_brief_notify_creatives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if new.state = 'approved' and old.state is distinct from 'approved' then
    for v_person in
      select pc.person_id from public.project_creatives pc
       where pc.project_id = new.project_id
    loop
      perform public.notify(new.organization_id, v_person, 'brief_approved',
                            new.project_id, new.id);
    end loop;
  end if;
  return null;
end;
$$;

revoke execute on function public.framing_brief_notify_creatives() from public, anon, authenticated;

create trigger z_notify_creatives after update of state on public.framing_briefs
  for each row execute function public.framing_brief_notify_creatives();

-- ---------------------------------------------------------------------------
-- Attendees of a project call
-- ---------------------------------------------------------------------------
create or replace function public.call_attendees_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select c.project_id into v_project from public.calls c where c.id = new.call_id;
  if not exists (
    select 1 from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = new.organization_id and m.person_id = new.person_id
       and m.status = 'approved' and a.disabled_at is null
  ) then
    raise exception 'attendee_not_member' using errcode = '23514';
  end if;
  -- A project call: its team only (who can already see the project).
  if v_project is not null and not exists (
    select 1 from public.projects p
     where p.id = v_project and p.owner_person_id = new.person_id
    union all
    select 1 from public.project_creatives pc
     where pc.project_id = v_project and pc.person_id = new.person_id
  ) then
    raise exception 'attendee_not_in_team' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.call_attendees_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select c.project_id into v_project from public.calls c where c.id = new.call_id;
  perform public.notify(new.organization_id, new.person_id,
                        case when v_project is null then 'meeting_invited' else 'call_invited' end,
                        v_project, new.call_id);
  return new;
end;
$$;
