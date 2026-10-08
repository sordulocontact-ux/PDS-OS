-- Borrowings (Juridique, ticket 05): the conditions received wait for the
-- direction, and the direction's decision waits for the borrowing's
-- responsible. Asked by Sacha on 07/10/2026: « Chez la direction » sent no
-- notification. Written by trigger, never by the code (CLAUDE.md,
-- Notifications), so nothing can forget it.
--
--   proposed  → every member who may validate: clearance_terms_proposed
--   validated → the borrowing's responsible (else the project's owner):
--               clearance_terms_validated (the contract is ready to send)
--   rejected  → the same: clearance_terms_rejected (a counter-proposal)

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
  'clearance_terms_proposed', 'clearance_terms_validated', 'clearance_terms_rejected'))
  not valid;

create or replace function public.legal_clearance_terms_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype;
  v_person uuid;
  v_responsible uuid;
begin
  select * into v from public.legal_clearances where id = new.clearance_id;
  if not found then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status = 'proposed' then
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate' = any (public.role_permissions(m.role))
    loop
      perform public.notify(v.organization_id, v_person, 'clearance_terms_proposed',
                            v.project_id, v.id);
    end loop;

  elsif tg_op = 'UPDATE' and old.status = 'proposed'
        and new.status in ('validated', 'rejected') then
    v_responsible := coalesce(
      v.responsible_person_id,
      (select p.owner_person_id from public.projects p where p.id = v.project_id));
    perform public.notify(v.organization_id, v_responsible,
                          case new.status when 'validated' then 'clearance_terms_validated'
                                          else 'clearance_terms_rejected' end,
                          v.project_id, v.id);
  end if;
  return new;
end;
$$;

revoke execute on function public.legal_clearance_terms_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.legal_clearance_terms;
create trigger z_notify
  after insert or update of status on public.legal_clearance_terms
  for each row execute function public.legal_clearance_terms_notify();
