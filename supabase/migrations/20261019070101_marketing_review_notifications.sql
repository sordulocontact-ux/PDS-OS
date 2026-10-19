-- Marketing › Suivi & bilan, lot 7 R5 (proto « Projet complet », ticket « Bilan,
-- validation et clôture », docs/ARCHITECTURE.md § 8 terdecies): whoever is
-- expected next is told.
--   - a version of the bilan submitted → the direction (holders of « validate »);
--   - the direction's decision on it → who submitted it;
--   - the Marketing closing asked → the direction;
--   - the closing decided → who asked;
--   - the Marketing reopened → the project's responsible.
-- Written by triggers only (CLAUDE.md, « Notifications »), never to the actor.
-- No table, no right changes: the tables keep their RLS.

select public.add_notification_kinds(array['marketing_report_submitted',
  'marketing_report_decided', 'marketing_closure_requested',
  'marketing_closure_decided', 'marketing_closure_reopened']);

-- The direction of an organisation: every active holder of « validate » but
-- the actor (sole_validator raises when there are several; a notification
-- never stops a write).
create or replace function public.marketing_review_notify_direction(
  p_org uuid, p_project uuid, p_actor uuid, p_kind text, p_subject uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select p_org, m.person_id, p_actor, p_kind, p_project, p_subject
    from public.memberships m
   where m.organization_id = p_org
     and m.status = 'approved'
     and m.person_id is distinct from p_actor
     and public.person_has_permission(p_org, m.person_id, 'validate');
$$;
revoke execute on function public.marketing_review_notify_direction(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;

create or replace function public.marketing_report_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = 'to_validate' and old.state is distinct from 'to_validate' then
    perform public.marketing_review_notify_direction(new.organization_id, new.project_id,
      new.submitted_by, 'marketing_report_submitted', new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_report_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.marketing_reports;
create trigger z_notify after update of state on public.marketing_reports
  for each row execute function public.marketing_report_notify();

create or replace function public.marketing_report_approval_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_to uuid;
begin
  select coalesce(r.submitted_by, r.created_by) into v_to
    from public.marketing_reports r where r.id = new.report_id;
  if v_to is not null and v_to is distinct from new.validator_person_id then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, v_to, new.validator_person_id, 'marketing_report_decided',
            new.project_id, new.report_id);
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_report_approval_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.marketing_report_approvals;
create trigger z_notify after insert on public.marketing_report_approvals
  for each row execute function public.marketing_report_approval_notify();

create or replace function public.marketing_closure_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    perform public.marketing_review_notify_direction(new.organization_id, new.project_id,
      new.requested_by, 'marketing_closure_requested', new.id);
  elsif old.state = 'requested' and new.state <> 'requested'
        and new.requested_by is distinct from new.decided_by then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, new.requested_by, new.decided_by, 'marketing_closure_decided',
            new.project_id, new.id);
  elsif new.state = 'reopened' and old.state <> 'reopened' then
    select p.owner_person_id into v_owner from public.projects p where p.id = new.project_id;
    if v_owner is not null and v_owner is distinct from new.reopened_by then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (new.organization_id, v_owner, new.reopened_by, 'marketing_closure_reopened',
              new.project_id, new.id);
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_closure_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.marketing_closures;
create trigger z_notify after insert or update of state on public.marketing_closures
  for each row execute function public.marketing_closure_notify();
