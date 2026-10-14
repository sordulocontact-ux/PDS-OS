-- Production › checks before the shoot that cannot lie (Ibé's tests of
-- 13/10, PROD-008, PROD-017, PROD-018).
--   * a check is confirmed only on its evidence — the location confirmed,
--     every position held and available, the equipment booked, the shoot
--     date set, the budget within its envelope with nothing to arbitrate,
--     the call sheet's call time written; permits and the backup plan on a
--     written proof — or by a derogation: a reason and its author, kept;
--   * each check has a responsible (a member or a Réseau contact);
--   * « Sauvegarde prévue » joins the checks (required);
--   * when the data behind a confirmed check changes, the check reopens by
--     itself (unless derogated) and the sheet is no longer « prête »;
--   * the shoot's start tells the team members holding a position.

-- 1. The checks ------------------------------------------------------------------

alter table public.production_readiness_checks
  drop constraint production_readiness_checks_key_check,
  add constraint production_readiness_checks_key_check check (key in (
    'location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet', 'permits', 'backup')),
  add column person_id uuid references public.people (id),
  add column contact_id uuid,
  add column derogation_reason text,
  add column derogated_by uuid references public.people (id),
  add column derogated_at timestamptz,
  add constraint production_readiness_checks_holder_check check (person_id is null or contact_id is null),
  add constraint production_readiness_checks_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  add constraint production_readiness_checks_derogation_check check (
    (derogation_reason is null) = (derogated_at is null)
    and (derogation_reason is null or char_length(derogation_reason) between 1 and 1000));

-- What a check rests on, read in the sheet's own data. Permits and backup
-- rest on a written proof (the note).
create function public.production_check_evidence(p_sheet_id uuid, p_key text, p_note text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found then
    return false;
  end if;
  return case p_key
    when 'location' then s.location_status = 'confirmed'
    when 'team' then
      exists (select 1 from public.production_needs n where n.sheet_id = s.id)
      and not exists (
        select 1 from public.production_needs n
         where n.sheet_id = s.id
           and n.headcount > (select count(*) from public.production_assignments a
                               where a.need_id = n.id and a.availability <> 'unavailable'))
      and not exists (
        select 1 from public.production_assignments a
          join public.production_needs n on n.id = a.need_id
         where n.sheet_id = s.id and a.availability = 'to_confirm')
    when 'equipment' then
      exists (select 1 from public.production_equipment e where e.sheet_id = s.id)
      and not exists (
        select 1 from public.production_equipment e
         where e.sheet_id = s.id
           and e.status not in ('booked', 'picked_up', 'to_return', 'returned', 'incident'))
    when 'schedule' then s.shoot_date is not null
    when 'budget' then
      s.budget_envelope_cents is not null
      and not exists (select 1 from public.production_budget_lines b
                       where b.sheet_id = s.id and b.status = 'to_decide')
      and coalesce((select sum(b.amount_cents) from public.production_budget_lines b
                     where b.sheet_id = s.id), 0) <= s.budget_envelope_cents
    when 'call_sheet' then exists (
      select 1 from public.production_call_sheets c
       where c.sheet_id = s.id and btrim(coalesce(c.call_time, '')) <> '')
    when 'permits' then btrim(coalesce(p_note, '')) <> ''
    when 'backup' then btrim(coalesce(p_note, '')) <> ''
    else false
  end;
end;
$$;
revoke execute on function public.production_check_evidence(uuid, text, text) from public, anon;
grant execute on function public.production_check_evidence(uuid, text, text) to authenticated;

-- « Confirmer », « Retirer », « Rendre requis » / « Ne pas exiger »: a
-- confirmation without its evidence is refused (« Déroger » instead).
create or replace function public.set_production_check(
  p_sheet_id uuid, p_key text, p_confirmed boolean, p_required boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_required boolean;
  v_note text;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_key not in ('location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet',
                   'permits', 'backup') then
    raise exception 'invalid_check' using errcode = '22023';
  end if;
  v_note := coalesce(nullif(btrim(coalesce(p_note, '')), ''),
                     (select c.note from public.production_readiness_checks c
                       where c.sheet_id = p_sheet_id and c.key = p_key));
  if p_confirmed and not public.production_check_evidence(p_sheet_id, p_key, v_note) then
    raise exception '%', case when p_key in ('permits', 'backup') then 'proof_required'
                              else 'evidence_missing' end;
  end if;
  v_required := coalesce(p_required, (select c.required from public.production_readiness_checks c
                                       where c.sheet_id = p_sheet_id and c.key = p_key),
                         public.production_check_default_required(p_key));
  insert into public.production_readiness_checks
    (organization_id, project_id, sheet_id, key, required, confirmed_by, confirmed_at, note)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_key, v_required,
          case when p_confirmed then public.auth_person_id() end,
          case when p_confirmed then now() end,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (sheet_id, key) do update
    set required = excluded.required,
        confirmed_by = case when p_confirmed is null then production_readiness_checks.confirmed_by
                            else excluded.confirmed_by end,
        confirmed_at = case when p_confirmed is null then production_readiness_checks.confirmed_at
                            else excluded.confirmed_at end,
        -- A confirmation on evidence, or a withdrawal, ends a derogation.
        derogation_reason = case when p_confirmed is null then production_readiness_checks.derogation_reason end,
        derogated_by = case when p_confirmed is null then production_readiness_checks.derogated_by end,
        derogated_at = case when p_confirmed is null then production_readiness_checks.derogated_at end,
        note = coalesce(excluded.note, production_readiness_checks.note),
        updated_at = now();
  if v_sheet.ready_at is not null and exists (
    select 1 from public.production_readiness_checks c
     where c.sheet_id = p_sheet_id and c.key = p_key and c.required and c.confirmed_at is null) then
    update public.production_sheets set ready_at = null, ready_by = null where id = p_sheet_id;
  end if;
end;
$$;

-- « Déroger »: the check counts as confirmed without its evidence, with a
-- reason and its author (the owner, while Production runs).
create function public.derogate_production_check(p_sheet_id uuid, p_key text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_me uuid := public.auth_person_id();
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_key not in ('location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet',
                   'permits', 'backup') then
    raise exception 'invalid_check' using errcode = '22023';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  insert into public.production_readiness_checks
    (organization_id, project_id, sheet_id, key, required, confirmed_by, confirmed_at,
     derogation_reason, derogated_by, derogated_at)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_key,
          public.production_check_default_required(p_key), v_me, now(), v_reason, v_me, now())
  on conflict (sheet_id, key) do update
    set confirmed_by = v_me, confirmed_at = now(), derogation_reason = v_reason,
        derogated_by = v_me, derogated_at = now(), updated_at = now();
end;
$$;
revoke execute on function public.derogate_production_check(uuid, text, text) from public, anon;
grant execute on function public.derogate_production_check(uuid, text, text) to authenticated;

-- « Attribuer »: who secures a check (PROD-017).
create function public.assign_production_check(
  p_sheet_id uuid, p_key text, p_person_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_key not in ('location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet',
                   'permits', 'backup') then
    raise exception 'invalid_check' using errcode = '22023';
  end if;
  perform public.production_holder_check(v_sheet.organization_id, p_person_id, p_contact_id);
  insert into public.production_readiness_checks
    (organization_id, project_id, sheet_id, key, required, person_id, contact_id)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_key,
          public.production_check_default_required(p_key), p_person_id, p_contact_id)
  on conflict (sheet_id, key) do update
    set person_id = p_person_id, contact_id = p_contact_id, updated_at = now();
end;
$$;
revoke execute on function public.assign_production_check(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.assign_production_check(uuid, text, uuid, uuid) to authenticated;

-- « Prête pour tournage », with the backup among the checks.
create or replace function public.mark_production_ready(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(array['location', 'team', 'equipment', 'schedule', 'budget',
                               'call_sheet', 'permits', 'backup']) k(key)
      left join public.production_readiness_checks c
             on c.sheet_id = p_sheet_id and c.key = k.key
     where coalesce(c.required, public.production_check_default_required(k.key))
       and c.confirmed_at is null) then
    raise exception 'checks_open';
  end if;
  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id()
   where id = p_sheet_id;
end;
$$;

-- 2. The checks follow their data -----------------------------------------------------

-- A confirmed check whose evidence is gone reopens (a derogation stays);
-- a required check reopened takes « prête » back.
create function public.production_recheck(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.production_readiness_checks c
     set confirmed_by = null, confirmed_at = null, updated_at = now()
   where c.sheet_id = p_sheet_id and c.confirmed_at is not null
     and c.derogation_reason is null
     and not public.production_check_evidence(p_sheet_id, c.key, c.note);
  update public.production_sheets s
     set ready_at = null, ready_by = null
   where s.id = p_sheet_id and s.ready_at is not null
     and exists (
       select 1 from unnest(array['location', 'team', 'equipment', 'schedule', 'budget',
                                  'call_sheet', 'permits', 'backup']) k(key)
         left join public.production_readiness_checks c
                on c.sheet_id = p_sheet_id and c.key = k.key
        where coalesce(c.required, public.production_check_default_required(k.key))
          and c.confirmed_at is null);
end;
$$;
revoke execute on function public.production_recheck(uuid) from public, anon, authenticated;

create function public.production_recheck_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet uuid;
begin
  if tg_table_name = 'production_assignments' then
    select n.sheet_id into v_sheet from public.production_needs n
     where n.id = coalesce(new.need_id, old.need_id);
  elsif tg_table_name = 'production_sheets' then
    v_sheet := new.id;
  else
    v_sheet := coalesce(new.sheet_id, old.sheet_id);
  end if;
  if v_sheet is not null then
    perform public.production_recheck(v_sheet);
  end if;
  return null;
end;
$$;
revoke execute on function public.production_recheck_row() from public, anon, authenticated;

create trigger z_recheck after update of location_status, shoot_date, budget_envelope_cents
  on public.production_sheets
  for each row execute function public.production_recheck_row();
create trigger z_recheck after insert or update or delete on public.production_needs
  for each row execute function public.production_recheck_row();
create trigger z_recheck after insert or update or delete on public.production_assignments
  for each row execute function public.production_recheck_row();
create trigger z_recheck after insert or update or delete on public.production_equipment
  for each row execute function public.production_recheck_row();
create trigger z_recheck after insert or update or delete on public.production_budget_lines
  for each row execute function public.production_recheck_row();
create trigger z_recheck after insert or update or delete on public.production_call_sheets
  for each row execute function public.production_recheck_row();

-- The log keeps a derogation with its reason.
create or replace function public.production_checks_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.confirmed_at is not null then
      perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
        new.id, 'confirmed', null,
        jsonb_build_object('key', new.key, 'confirmed', true, 'note', new.note,
                           'derogation', new.derogation_reason));
    end if;
    return null;
  end if;
  if (new.confirmed_at is null) <> (old.confirmed_at is null)
     or new.derogation_reason is distinct from old.derogation_reason then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
      new.id, 'confirmed', jsonb_build_object('key', old.key, 'confirmed', old.confirmed_at is not null),
      jsonb_build_object('key', new.key, 'confirmed', new.confirmed_at is not null,
                         'note', new.note, 'derogation', new.derogation_reason));
  end if;
  if new.required is distinct from old.required then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
      new.id, 'required', jsonb_build_object('key', old.key, 'required', old.required),
      jsonb_build_object('key', new.key, 'required', new.required));
  end if;
  return null;
end;
$$;

-- 3. The shoot starts: the team is told (PROD-018) ------------------------------------

create function public.production_shoot_started()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.auth_person_id();
  v_deliverable uuid;
begin
  if new.state = 'in_progress' and (tg_op = 'INSERT' or old.state is distinct from 'in_progress') then
    select deliverable_id into v_deliverable from public.production_sheets where id = new.sheet_id;
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select distinct new.organization_id, a.person_id, v_me, 'production_shoot_started',
           new.project_id, v_deliverable
      from public.production_assignments a
      join public.production_needs n on n.id = a.need_id
     where n.sheet_id = new.sheet_id and a.person_id is not null
       and a.availability <> 'unavailable' and a.person_id is distinct from v_me;
  end if;
  return null;
end;
$$;
revoke execute on function public.production_shoot_started() from public, anon, authenticated;
create trigger z_started after insert or update of state on public.production_shoots
  for each row execute function public.production_shoot_started();

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
    'production_version_submitted', 'production_corrections_sent',
    'production_export_deposited', 'production_shoot_started'])) not valid;
