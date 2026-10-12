-- JUR-11 (retours Juridique du 11/10/2026, docs/ARCHITECTURE.md § 8 sexies,
-- « Fiches de renseignements »): a fiche's life is said at each step,
-- with its instant. Opening the public link is noted once (opening is not
-- answering), and a fiche received through it notifies who prepared it and
-- the project's responsible: no more state seen only after a reload. The
-- pages also re-read themselves through project_live (…20261012100201).

alter table public.legal_forms add column opened_at timestamptz;

-- The person opened their link (the public page notes it once, without
-- account). An expired or revoked link notes nothing.
create function public.note_legal_form_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  update public.legal_forms
     set opened_at = now()
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and opened_at is null
     and status in ('link_generated', 'sent')
     and expires_at > now();
end;
$$;
revoke execute on function public.note_legal_form_opened(text) from public;
grant execute on function public.note_legal_form_opened(text) to anon, authenticated;

-- A new kind of notification: the fiche came back.
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
  'strategy_review_requested', 'strategy_review_approved',
  'strategy_review_changes_requested', 'strategy_review_reminder',
  'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
  'master_mastering_delivery_received', 'legal_form_received'))
  not valid;

-- The fiche was submitted (by its public link, so without an actor): who
-- prepared it and the project's responsible are told, once each.
create or replace function public.legal_forms_notify_received()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.submitted_at is null and new.submitted_at is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select distinct new.organization_id, r.person_id, null::uuid, 'legal_form_received',
           new.project_id, new.id
      from (
        select new.created_by as person_id
        union
        select p.owner_person_id from public.projects p where p.id = new.project_id
      ) r
     where r.person_id is not null;
  end if;
  return null;
end;
$$;
revoke execute on function public.legal_forms_notify_received() from public, anon, authenticated;

create trigger z_notify_received after update of submitted_at on public.legal_forms
  for each row execute function public.legal_forms_notify_received();
