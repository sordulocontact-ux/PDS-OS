-- Production › Postproduction: one cycle per version (Ibé's tests of 13/10,
-- PROD-029 to PROD-033).
--   * a version is numbered by the database only (it already was) and knows
--     the version it follows (PROD-032);
--   * one submission (« Soumettre aux retours ») then one decision, taken on
--     a version under review: valider, demander des corrections, refuser
--     (PROD-033) — « validation finale » is no longer a second submission;
--   * « Demander des corrections » is a request addressed to someone
--     (PROD-031): the feedback kept for it, a recipient, a due date, a
--     message, and its state — brouillon, envoyée, consultée, traitée;
--   * the validators are told when a version is submitted, the recipient
--     (when a member) when corrections are sent (PROD-028, PROD-031).

-- 1. A version follows the one before it ---------------------------------------

alter table public.production_versions
  add column previous_version_id uuid,
  add constraint production_versions_previous_same_org foreign key (previous_version_id, organization_id)
    references public.production_versions (id, organization_id) on delete set null (previous_version_id);

-- Existing versions follow the one numbered just before (before the check
-- below forbids moving a version).
update public.production_versions v
   set previous_version_id = p.id
  from public.production_versions p
 where p.sheet_id = v.sheet_id and p.number = v.number - 1 and v.previous_version_id is null;

create or replace function public.production_versions_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.person_id, new.contact_id);
  if new.file_id is not null and not exists (
    select 1 from public.production_files f where f.id = new.file_id and f.sheet_id = new.sheet_id) then
    raise exception 'file_not_of_sheet' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('production_versions:' || new.sheet_id::text));
    select v.id, v.number + 1 into new.previous_version_id, new.number
      from public.production_versions v
     where v.sheet_id = new.sheet_id
     order by v.number desc limit 1;
    new.number := coalesce(new.number, 1);
    new.status := 'draft';
  elsif old.status <> 'draft'
        and (new.label, new.file_id, new.url, new.notes, new.person_id, new.contact_id)
            is distinct from
            (old.label, old.file_id, old.url, old.notes, old.person_id, old.contact_id) then
    raise exception 'version_submitted' using errcode = '23514';
  elsif new.previous_version_id is distinct from old.previous_version_id
        or new.number <> old.number then
    raise exception 'version_moved' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 2. The correction request -----------------------------------------------------

create table public.production_correction_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- The version the corrections are about: one request per version.
  version_id uuid not null,
  -- Who must act: a member of PDS or a contact of the Réseau, always one.
  person_id uuid references public.people (id),
  contact_id uuid,
  due_on date not null,
  message text,
  -- draft = brouillon; sent = envoyée; viewed = consultée; treated = traitée
  -- (a later version was submitted).
  status text not null default 'draft',
  sent_by uuid references public.people (id),
  sent_at timestamptz,
  -- How many times it was sent again (« Relancer »).
  reminders integer not null default 0,
  viewed_at timestamptz,
  treated_at timestamptz,
  treated_version_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_correction_requests_id_org_key unique (id, organization_id),
  constraint production_correction_requests_version_key unique (version_id),
  constraint production_correction_requests_status_check
    check (status in ('draft', 'sent', 'viewed', 'treated')),
  constraint production_correction_requests_recipient_check
    check ((person_id is null) <> (contact_id is null)),
  constraint production_correction_requests_message_check
    check (message is null or char_length(message) <= 4000),
  constraint production_correction_requests_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_correction_requests_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_correction_requests_version_same_org foreign key (version_id, organization_id)
    references public.production_versions (id, organization_id) on delete cascade,
  constraint production_correction_requests_treated_same_org foreign key (treated_version_id, organization_id)
    references public.production_versions (id, organization_id) on delete set null (treated_version_id),
  constraint production_correction_requests_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_correction_requests_sheet_idx
  on public.production_correction_requests (sheet_id);
create trigger a_set_created_by before insert on public.production_correction_requests
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_correction_requests
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_correction_requests
  for each row execute function public.set_updated_at();

alter table public.production_correction_requests enable row level security;
alter table public.production_correction_requests force row level security;
revoke all on table public.production_correction_requests from anon, authenticated;
-- Written through the functions below only.
grant select on public.production_correction_requests to authenticated;
create policy production_correction_requests_select on public.production_correction_requests
  for select to authenticated using (public.can_see_project(project_id));

-- The feedback a request carries (the list sent is the list kept, PROD-030).
alter table public.production_version_comments
  add column request_id uuid,
  add constraint production_version_comments_request_same_org foreign key (request_id, organization_id)
    references public.production_correction_requests (id, organization_id) on delete set null (request_id);

-- 3. One decision on a version under review ----------------------------------------

-- « Valider » or « Refuser » a version under review (or still in the former
-- final validation). Validating records the creative decision on the
-- delivery; corrections go through request_production_corrections, which
-- names who must act.
create or replace function public.decide_production_version(
  p_version_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_deliverable uuid;
  v_me uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status not in ('in_review', 'final_review') then
    raise exception 'invalid_transition';
  end if;
  if p_decision = 'changes' then
    raise exception 'recipient_required';
  end if;
  if p_decision not in ('approve', 'refuse') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_decision = 'refuse' and v_note is null then
    raise exception 'reason_required';
  end if;
  update public.production_versions
     set status = case p_decision when 'approve' then 'approved' else 'refused' end,
         decided_by = v_me, decided_at = now(), decision_note = v_note
   where id = v.id;
  if p_decision = 'approve' then
    select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
    insert into public.deliverable_deliveries
      (organization_id, project_id, deliverable_id, version_id, final_set_by, approved_by, approved_at)
    values (v.organization_id, v.project_id, v_deliverable, v.id, v_me, v_me, now())
    on conflict (deliverable_id) do update
      set version_id = excluded.version_id, approved_by = excluded.approved_by,
          approved_at = excluded.approved_at, checked_by = null, checked_at = null,
          delivered_by = null, delivered_at = null;
  end if;
end;
$$;

-- The former « Demander des corrections » without a recipient is closed.
create or replace function public.request_production_version_changes(p_version_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'recipient_required';
end;
$$;

-- « Demander des corrections »: the feedback kept (open or acknowledged, of
-- this version), who must act, by when, and a message. The version moves to
-- « Corrections demandées »; the request is a draft until it is sent.
create function public.request_production_corrections(
  p_version_id uuid, p_comment_ids uuid[], p_person_id uuid, p_contact_id uuid,
  p_due_on date, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_me uuid := public.auth_person_id();
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_ids uuid[] := coalesce(p_comment_ids, '{}');
  v_id uuid;
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status not in ('in_review', 'final_review') then
    raise exception 'invalid_transition';
  end if;
  if (p_person_id is null) = (p_contact_id is null) then
    raise exception 'recipient_required';
  end if;
  perform public.production_holder_check(v.organization_id, p_person_id, p_contact_id);
  if p_due_on is null then
    raise exception 'due_required';
  end if;
  if p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'due_in_past';
  end if;
  if v_message is not null and char_length(v_message) > 4000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_ids) i
              where not exists (select 1 from public.production_version_comments c
                                 where c.id = i and c.version_id = v.id
                                   and c.status in ('open', 'acknowledged'))) then
    raise exception 'comment_not_pending';
  end if;
  if cardinality(v_ids) = 0 and v_message is null then
    raise exception 'nothing_to_correct';
  end if;

  update public.production_versions
     set status = 'changes_requested', decided_by = v_me, decided_at = now(),
         decision_note = v_message
   where id = v.id;
  insert into public.production_correction_requests
    (organization_id, project_id, sheet_id, version_id, person_id, contact_id, due_on, message)
  values (v.organization_id, v.project_id, v.sheet_id, v.id, p_person_id, p_contact_id,
          p_due_on, v_message)
  returning id into v_id;
  update public.production_version_comments set request_id = v_id where id = any (v_ids);
  return v_id;
end;
$$;
revoke execute on function public.request_production_corrections(uuid, uuid[], uuid, uuid, date, text)
  from public, anon;
grant execute on function public.request_production_corrections(uuid, uuid[], uuid, uuid, date, text)
  to authenticated;

-- Change who must act, the due date or the message, until it is treated
-- (« Réaffecter », PROD-031): the same request, never a copy.
create function public.update_production_corrections(
  p_request_id uuid, p_person_id uuid, p_contact_id uuid, p_due_on date, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.production_correction_requests%rowtype;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  select * into r from public.production_correction_requests where id = p_request_id for update;
  if not found or not public.can_see_project(r.project_id) then
    raise exception 'request_not_found';
  end if;
  if not public.production_can_review(r.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status = 'treated' then
    raise exception 'request_treated';
  end if;
  if (p_person_id is null) = (p_contact_id is null) then
    raise exception 'recipient_required';
  end if;
  perform public.production_holder_check(r.organization_id, p_person_id, p_contact_id);
  if p_due_on is null then
    raise exception 'due_required';
  end if;
  if p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'due_in_past';
  end if;
  if v_message is not null and char_length(v_message) > 4000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.production_correction_requests
     set person_id = p_person_id, contact_id = p_contact_id, due_on = p_due_on,
         message = v_message,
         -- A new recipient has not seen it yet.
         status = case when (person_id, contact_id) is distinct from (p_person_id, p_contact_id)
                            and status = 'viewed' then 'sent' else status end,
         viewed_at = case when (person_id, contact_id) is distinct from (p_person_id, p_contact_id)
                          then null else viewed_at end
   where id = r.id;
end;
$$;
revoke execute on function public.update_production_corrections(uuid, uuid, uuid, date, text)
  from public, anon;
grant execute on function public.update_production_corrections(uuid, uuid, uuid, date, text)
  to authenticated;

-- « Transmettre » (the first time) or « Relancer » (again): PDS OS sends no
-- e-mail; the person copies the message or the link, then says it is sent.
-- A member recipient is notified in the app.
create function public.send_production_corrections(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.production_correction_requests%rowtype;
  v_me uuid := public.auth_person_id();
  v_deliverable uuid;
begin
  select * into r from public.production_correction_requests where id = p_request_id for update;
  if not found or not public.can_see_project(r.project_id) then
    raise exception 'request_not_found';
  end if;
  if not public.production_can_review(r.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if r.status = 'treated' then
    raise exception 'request_treated';
  end if;
  update public.production_correction_requests
     set status = case when status = 'draft' then 'sent' else status end,
         sent_by = v_me, sent_at = now(),
         reminders = case when status = 'draft' then 0 else reminders + 1 end
   where id = r.id;
  if r.person_id is not null and r.person_id is distinct from v_me then
    select deliverable_id into v_deliverable from public.production_sheets where id = r.sheet_id;
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (r.organization_id, r.person_id, v_me, 'production_corrections_sent', r.project_id,
            v_deliverable);
  end if;
end;
$$;
revoke execute on function public.send_production_corrections(uuid) from public, anon;
grant execute on function public.send_production_corrections(uuid) to authenticated;

-- 4. Submitting: the validators are told; earlier requests are treated --------------

create function public.production_version_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.auth_person_id();
  v_deliverable uuid;
begin
  if new.status = 'in_review' and old.status = 'draft' then
    -- The corrections asked on earlier versions are answered by this one.
    update public.production_correction_requests r
       set status = 'treated', treated_at = now(), treated_version_id = new.id
      from public.production_versions p
     where p.id = r.version_id and p.sheet_id = new.sheet_id and p.number < new.number
       and r.status <> 'treated';
    select deliverable_id into v_deliverable from public.production_sheets where id = new.sheet_id;
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select new.organization_id, who.person_id, v_me, 'production_version_submitted',
           new.project_id, v_deliverable
      from (select p.owner_person_id as person_id from public.projects p where p.id = new.project_id
            union
            select pc.person_id from public.project_creatives pc where pc.project_id = new.project_id)
           as who
     where who.person_id is not null and who.person_id is distinct from v_me;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_version_submitted() from public, anon, authenticated;
create trigger c_submitted after update of status on public.production_versions
  for each row execute function public.production_version_submitted();

-- One submission: « review ». The former « final » still lands in review.
create or replace function public.submit_production_version(p_version_id uuid, p_target text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_organize(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_target not in ('review', 'final') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v.file_id is null and v.url is null then
    raise exception 'version_without_media';
  end if;
  if v.status <> 'draft' then
    raise exception 'invalid_transition';
  end if;
  update public.production_versions
     set status = 'in_review', submitted_by = public.auth_person_id(), submitted_at = now()
   where id = v.id;
end;
$$;

-- 5. Notifications ----------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'project_transmitted', 'project_accepted', 'project_refused',
    'project_clarification_requested', 'validation_requested', 'validation_approved',
    'validation_rejected', 'task_assigned', 'project_creative_added',
    'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
    'contract_review_requested', 'contract_approved', 'contract_changes_requested',
    'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
    'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
    'master_final_approved', 'master_mastering_changes_requested', 'clearance_terms_proposed',
    'clearance_terms_validated', 'clearance_terms_rejected', 'strategy_review_requested',
    'strategy_review_approved', 'strategy_review_changes_requested', 'strategy_review_reminder',
    'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
    'master_mastering_delivery_received', 'legal_form_received', 'call_report_shared',
    'master_engineer_signal', 'design_version_discarded', 'design_submission_requested',
    'design_submission_decided',
    'production_version_submitted', 'production_corrections_sent'])) not valid;
