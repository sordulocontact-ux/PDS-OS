-- Retours Marketing du 12/10/2026, MKT-C2-11 (docs/ARCHITECTURE.md § 8 decies,
-- « Demandes de validation »).
--
--   1. A request says, beyond its frozen scope (sections, version, pieces):
--      a message to the validators and, if any, the date a decision is
--      expected by (`message`, `due_on`).
--   2. Its scope is immutable: a decision is refused when what was sent
--      changed since (`submission_outdated`) — never approved silently. The
--      requester (or the owner) withdraws it (« withdrawn ») and sends a new
--      version.
--   3. A validator may approve with reserves (`design_decisions.reserves`);
--      a decision keeps the role it was taken as (validator or delegate).
--   4. The validators of the scope (and active delegates) are notified of a
--      request; its author of the decision. Both lead to the decision page.

alter table public.design_submissions
  add column message text,
  add column due_on date,
  drop constraint design_submissions_status_check,
  add constraint design_submissions_status_check
    check (status in ('pending', 'approved', 'changes_requested', 'rejected', 'withdrawn')),
  add constraint design_submissions_message_length
    check (char_length(coalesce(message, '')) <= 2000);

alter table public.design_decisions
  add column reserves text,
  add column decided_role text,
  add constraint design_decisions_reserves_check
    check ((reserves is null or decision = 'approved') and char_length(coalesce(reserves, '')) <= 2000),
  add constraint design_decisions_role_check
    check (decided_role is null or decided_role in ('validator', 'delegate'));

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'project_transmitted',
    'project_accepted',
    'project_refused',
    'project_clarification_requested',
    'validation_requested',
    'validation_approved',
    'validation_rejected',
    'task_assigned',
    'project_creative_added',
    'design_version_submitted',
    'design_version_approved',
    'design_version_changes_requested',
    'contract_review_requested',
    'contract_approved',
    'contract_changes_requested',
    'meeting_invited',
    'master_transmission_received',
    'master_mix_version_received',
    'master_mix_approved',
    'master_mix_changes_requested',
    'master_mastering_version_received',
    'master_final_approved',
    'master_mastering_changes_requested',
    'clearance_terms_proposed',
    'clearance_terms_validated',
    'clearance_terms_rejected',
    'strategy_review_requested',
    'strategy_review_approved',
    'strategy_review_changes_requested',
    'strategy_review_reminder',
    'project_launched',
    'brief_approved',
    'call_invited',
    'master_delivery_received',
    'master_mastering_delivery_received',
    'legal_form_received',
    'call_report_shared',
    'master_engineer_signal',
    'design_version_discarded',
    'design_submission_requested',
    'design_submission_decided'])) not valid;

drop function public.submit_design_direction(uuid, text[]);
drop function public.submit_design_sheet(uuid);
drop function public.decide_design_submission(uuid, text, text, text);

create function public.submit_design_direction(p_project_id uuid, p_sections text[], p_message text DEFAULT NULL::text, p_due_on date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_mode text;
  v_id uuid;
begin
  if not (public.is_project_owner(p_project_id) or exists (
            select 1 from public.design_assignments a
            where a.project_id = p_project_id and a.scope = 'direction' and a.ended_at is null
              and a.person_id = public.auth_person_id())
          or public.design_delegated(p_project_id, 'direction', null, 'responsible')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if cardinality(coalesce(p_sections, '{}')) = 0 or exists (
       select 1 from unnest(p_sections) s
       where s <> 'direction' and not exists (
         select 1 from public.design_deliverables d
         where d.id::text = s and d.project_id = p_project_id)) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if not exists (select 1 from public.design_validators v
                 where v.project_id = p_project_id and v.scope = 'direction') then
    raise exception 'validator_required';
  end if;
  select w.validation_mode, w.organization_id into v_mode, v_org
    from public.design_workspaces w where w.project_id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || 'direction'));
  if exists (select 1 from public.design_submissions s
             where s.project_id = p_project_id and s.kind = 'direction' and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  if char_length(coalesce(p_message, '')) > 2000
     or p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.design_submissions
    (organization_id, project_id, kind, number, sections, snapshot, mode, submitted_by,
     message, due_on)
  values (v_org, p_project_id, 'direction',
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where project_id = p_project_id and kind = 'direction'),
          p_sections, public.design_direction_snapshot(p_project_id, p_sections),
          coalesce(v_mode, 'per_section'), public.auth_person_id(),
          nullif(btrim(coalesce(p_message, '')), ''), p_due_on)
  returning id into v_id;
  return v_id;
end;
$function$;

create function public.submit_design_sheet(p_sheet_id uuid, p_message text DEFAULT NULL::text, p_due_on date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_sheets%rowtype;
  v_mode text;
  v_sections text[];
  v_id uuid;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not (public.is_project_owner(v.project_id) or exists (
            select 1 from public.design_assignments a
            where a.sheet_id = v.id and a.ended_at is null
              and a.person_id = public.auth_person_id())
          or public.design_delegated(v.project_id, 'sheet', v.id, 'responsible')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked';
  end if;
  if not exists (select 1 from public.design_assignments a
                 where a.sheet_id = v.id and a.ended_at is null) then
    raise exception 'responsible_required';
  end if;
  if not exists (select 1 from public.design_validators x where x.sheet_id = v.id) then
    raise exception 'validator_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v.id::text));
  if exists (select 1 from public.design_submissions s
             where s.sheet_id = v.id and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  -- A series follows its own tracking when set (MKT-C2-07): grouped = one
  -- decision, decomposed = one per item; else the project's mode.
  select case v.tracking when 'global' then 'global'
                         when 'per_item' then 'per_section'
                         else w.validation_mode end
    into v_mode from public.design_workspaces w
   where w.project_id = v.project_id;
  select array['sheet'] || coalesce(array_agg(i.id::text order by i.number), '{}')
    into v_sections from public.design_sheet_items i where i.sheet_id = v.id;
  if char_length(coalesce(p_message, '')) > 2000
     or p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.design_submissions
    (organization_id, project_id, kind, sheet_id, number, sections, snapshot, mode, submitted_by,
     message, due_on)
  values (v.organization_id, v.project_id, 'sheet', v.id,
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where sheet_id = v.id),
          v_sections, public.design_sheet_snapshot(v.id),
          coalesce(v_mode, 'per_section'), public.auth_person_id(),
          nullif(btrim(coalesce(p_message, '')), ''), p_due_on)
  returning id into v_id;
  return v_id;
end;
$function$;

create function public.decide_design_submission(p_submission_id uuid, p_section text, p_decision text, p_comment text, p_reserves text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_submissions%rowtype;
  v_section text := coalesce(p_section, '');
  v_decided integer;
  v_status text;
begin
  select * into v from public.design_submissions where id = p_submission_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'submission_not_found';
  end if;
  if not exists (select 1 from public.design_validators x
                 where x.project_id = v.project_id and x.scope = v.kind
                   and x.sheet_id is not distinct from v.sheet_id
                   and x.person_id = public.auth_person_id())
     and not public.design_delegated(v.project_id, v.kind, v.sheet_id, 'validator') then
    raise exception 'not_a_validator' using errcode = '42501';
  end if;
  -- MKT-C2-08: nobody approves what they submitted, unless the governance
  -- of the project explicitly allows it.
  if v.submitted_by = public.auth_person_id() and not coalesce((
       select w.allow_self_approval from public.design_workspaces w
        where w.project_id = v.project_id), false) then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  if (v.mode = 'global' and v_section <> '')
     or (v.mode = 'per_section' and not (v_section = any (v.sections))) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if p_decision <> 'approved' and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;
  if p_decision <> 'approved' and nullif(btrim(coalesce(p_reserves, '')), '') is not null then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- MKT-C2-11: the request's scope is immutable — what was sent changed
  -- since (an intention, a reference, the sheet): never decided silently.
  if (case v.kind when 'direction'
         then public.design_direction_snapshot(v.project_id, v.sections)
         else public.design_sheet_snapshot(v.sheet_id) end) is distinct from v.snapshot then
    raise exception 'submission_outdated' using errcode = '23514';
  end if;
  insert into public.design_decisions
    (organization_id, project_id, submission_id, section, decision, comment, decided_by,
     reserves, decided_role)
  values (v.organization_id, v.project_id, v.id, v_section, p_decision,
          nullif(btrim(coalesce(p_comment, '')), ''), public.auth_person_id(),
          nullif(btrim(coalesce(p_reserves, '')), ''),
          case when exists (select 1 from public.design_validators x
                             where x.project_id = v.project_id and x.scope = v.kind
                               and x.sheet_id is not distinct from v.sheet_id
                               and x.person_id = public.auth_person_id())
               then 'validator' else 'delegate' end);

  select count(*) into v_decided from public.design_decisions d where d.submission_id = v.id;
  if v.mode = 'per_section' and v_decided < cardinality(v.sections) then
    return;
  end if;
  select case when bool_or(d.decision = 'rejected') then 'rejected'
              when bool_or(d.decision = 'changes_requested') then 'changes_requested'
              else 'approved' end
    into v_status from public.design_decisions d where d.submission_id = v.id;
  update public.design_submissions set status = v_status, closed_at = now() where id = v.id;
end;
$function$;

revoke execute on function public.submit_design_direction(uuid, text[], text, date) from public, anon;
grant execute on function public.submit_design_direction(uuid, text[], text, date) to authenticated;
revoke execute on function public.submit_design_sheet(uuid, text, date) from public, anon;
grant execute on function public.submit_design_sheet(uuid, text, date) to authenticated;
revoke execute on function public.decide_design_submission(uuid, text, text, text, text) from public, anon;
grant execute on function public.decide_design_submission(uuid, text, text, text, text) to authenticated;

-- The requester, or the project's owner, withdraws a pending request.
create or replace function public.withdraw_design_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_submissions%rowtype;
begin
  select * into v from public.design_submissions where id = p_submission_id for update;
  if v.id is null or not (v.submitted_by = public.auth_person_id()
                          or public.is_project_owner(v.project_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  update public.design_submissions set status = 'withdrawn', closed_at = now()
   where id = p_submission_id;
end;
$$;
revoke execute on function public.withdraw_design_submission(uuid) from public, anon;
grant execute on function public.withdraw_design_submission(uuid) to authenticated;

-- Notifications: the validators (and active delegates) of a request, its
-- author of the decision.
create or replace function public.design_submissions_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if tg_op = 'INSERT' then
    for v_person in
      select x.person_id from public.design_validators x
       where x.project_id = new.project_id and x.scope = new.kind
         and x.sheet_id is not distinct from new.sheet_id
      union
      select d.to_person_id from public.design_delegations d
       where d.project_id = new.project_id and d.scope = new.kind
         and d.sheet_id is not distinct from new.sheet_id and d.role = 'validator'
         and d.revoked_at is null
         and (now() at time zone 'Europe/Paris')::date between d.starts_on and d.ends_on
    loop
      if v_person is distinct from new.submitted_by then
        perform public.notify(new.organization_id, v_person, 'design_submission_requested',
                              new.project_id, new.id);
      end if;
    end loop;
  elsif old.status = 'pending' and new.status in ('approved', 'changes_requested', 'rejected')
        and new.submitted_by is not null then
    perform public.notify(new.organization_id, new.submitted_by, 'design_submission_decided',
                          new.project_id, new.id);
  end if;
  return null;
end;
$$;
create trigger z_notify after insert or update of status on public.design_submissions
  for each row execute function public.design_submissions_notify();

-- Whether what a pending request carries is still what the project holds:
-- the decision page says so before a validator decides.
create or replace function public.design_submission_is_current(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (case s.kind when 'direction'
            then public.design_direction_snapshot(s.project_id, s.sections)
            else public.design_sheet_snapshot(s.sheet_id) end) is not distinct from s.snapshot
    from public.design_submissions s
   where s.id = p_submission_id and public.can_see_project(s.project_id);
$$;
revoke execute on function public.design_submission_is_current(uuid) from public, anon;
grant execute on function public.design_submission_is_current(uuid) to authenticated;
