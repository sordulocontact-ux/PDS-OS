-- Audit of Ibé's written feedback (28/10/2026): the P0 still open, held by the database and not
-- only by the screens.
--
-- 1. JUR-11 — PDS's countersignature belongs to one version of the contract. A revised clause
--    (revise_contract_document, also behind revise_contract_clause) cancels it; « Marquer comme
--    signé » requires it on the latest version (contract_countersign_missing).
-- 2. MKT-PROD-002 — « Confirmer : préparation validée » no longer believes the browser's
--    synthesis line by line: the lines the database can read (place, date, checklist, quote,
--    proposal, blockers) are checked again, and a line said ready that is not refuses the
--    confirmation (ready_snapshot_stale), so a direct call cannot skip the direction.
-- 3. JUR-03 — a change to a generated bulletin cancels the signatures of its version
--    (superseded_at, event signatures.superseded); they stay readable, never valid.
-- 4. JUR-03 — PDS Éditions' line of the bulletin (house, from the confirmed split) is signed in
--    PDS OS by the direction (sign_formality_for_house): a simple electronic signature, dated,
--    tied to the account, like the contracts' countersignature.
-- 5. JUR-06 / JUR-12 — a fiche missing what the contract needs is never validated
--    (legal_form_missing, legal_form_incomplete), and « déjà payé » alone is never a reason for
--    « pas d'accord nécessaire » (mapping_reason_only_paid), in SQL as in the code.

set lock_timeout = '5s';

-- ===========================================================================================
-- 1. Countersignature tied to a version (JUR-11)
-- ===========================================================================================

alter table public.contracts add column pds_signed_version integer;

-- Countersignatures given before this migration were on the latest version (they could not be
-- revised after without this column being the bug it fixes).
update public.contracts c
   set pds_signed_version = (select max(d.version) from public.contract_documents d
                              where d.contract_id = c.id)
 where c.pds_signed_at is not null;

-- contract_events: one more kind, whatever the list holds when this runs.
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'contract_events_kind_check' and conrelid = 'public.contract_events'::regclass;
  select array_agg(distinct replace(k, '"', '')) into v_kinds
    from regexp_matches(v_def, '''([^'']+)''', 'g') m,
         unnest(case when m[1] like '{%' then string_to_array(btrim(m[1], '{}'), ',')
                     else array[m[1]] end) k;
  v_kinds := array(select distinct k from unnest(v_kinds || array['contract.countersign_voided']) k);
  alter table public.contract_events drop constraint contract_events_kind_check;
  execute format('alter table public.contract_events add constraint contract_events_kind_check '
                 'check (kind = any (%L::text[]))', v_kinds);
end $$;

create or replace function public.revise_contract_document(
  p_contract_id uuid,
  p_body text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_last public.contract_documents%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_edit_contract(p_contract_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_contract.status not in ('draft', 'approved') then
    raise exception 'contract_wrong_status';
  end if;
  select * into v_last from public.contract_documents
   where contract_id = p_contract_id order by version desc limit 1;
  if not found then raise exception 'contract_document_missing'; end if;
  if v_comment is null then raise exception 'contract_comment_required'; end if;
  if p_body is null or p_body = v_last.body then raise exception 'contract_body_unchanged'; end if;

  insert into public.contract_documents
    (organization_id, contract_id, version, template_id, template_version, body, fields,
     comment)
  values (v_contract.organization_id, p_contract_id, v_last.version + 1, v_last.template_id,
          v_last.template_version, p_body, v_last.fields, left(v_comment, 2000));
  if v_contract.status = 'approved' then
    update public.contracts set status = 'draft' where id = p_contract_id;
  end if;
  perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                    v_contract.project_id, 'contract.revised', v_comment);
  -- PDS signed the version before: that signature does not carry to this one (JUR-11).
  if v_contract.pds_signed_at is not null then
    update public.contracts
       set pds_signed_by = null, pds_signed_at = null, pds_signed_version = null
     where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.countersign_voided',
                                      'v' || v_contract.pds_signed_version);
  end if;
end;
$$;

-- advance_contract (20261024000201), the same but for the version of the countersignature.
create or replace function public.advance_contract(
  p_contract_id uuid,
  p_action text,
  p_comment text default null,
  p_signed_on date default null,
  p_checked boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_editor boolean;
  v_validator boolean;
  v_generated boolean;
  v_version integer;
  v_person uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;

  v_editor := public.has_permission(v_contract.organization_id, 'manage_contracts')
              and (v_contract.owner_person_id = v_me
                   or public.has_permission(v_contract.organization_id, 'view_all_projects'));
  v_validator := public.has_permission(v_contract.organization_id, 'validate');
  select max(version) into v_version from public.contract_documents
   where contract_id = p_contract_id;
  v_generated := v_version is not null;

  if p_action = 'submit' then
    if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'in_review' where id = p_contract_id;
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v_contract.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate' = any (public.role_permissions(m.role))
    loop
      perform public.notify(v_contract.organization_id, v_person, 'contract_review_requested',
                            v_contract.project_id, p_contract_id);
    end loop;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.submitted');

  elsif p_action in ('approve', 'request_changes') then
    if v_contract.status <> 'in_review' then raise exception 'contract_wrong_status'; end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_action = 'request_changes' and v_comment is null then
      raise exception 'contract_comment_required';
    end if;
    update public.contracts
       set status = case p_action when 'approve' then 'approved' else 'draft' end,
           review_comment = v_comment,
           reviewed_by = v_me,
           reviewed_at = now()
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          case p_action when 'approve' then 'contract_approved'
                                        else 'contract_changes_requested' end,
                          v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id,
                                      case p_action when 'approve' then 'contract.approved'
                                                    else 'contract.changes_requested' end,
                                      v_comment);

  elsif p_action = 'send' then
    if v_contract.status <> 'approved' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and v_comment is null then
      raise exception 'contract_send_proof_required';
    end if;
    update public.contracts set status = 'sent' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'signature.requested',
                                      v_comment);

  elsif p_action = 'countersign' then
    -- PDS signs the version validated and sent, by the direction (JUR-11), and that version only.
    if v_contract.status not in ('approved', 'sent') or v_contract.pds_signed_at is not null then
      raise exception 'contract_wrong_status';
    end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts
       set pds_signed_by = v_me, pds_signed_at = now(), pds_signed_version = v_version
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          'contract_approved', v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.countersigned',
                                      case when v_version is not null then 'v' || v_version end);

  elsif p_action = 'sign' then
    if v_contract.status not in ('approved', 'sent') then
      raise exception 'contract_wrong_status';
    end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_signed_on is null or p_signed_on > current_date then
      raise exception 'contract_signed_on_invalid';
    end if;
    if v_generated and not (
      exists (select 1 from public.contract_files
               where contract_id = p_contract_id and category = 'signed'
                 and via_contact_id is not null)
      or (exists (select 1 from public.contract_files
                   where contract_id = p_contract_id and category = 'signed')
          and exists (select 1 from public.contract_files
                       where contract_id = p_contract_id and category = 'evidence'))
    ) then
      raise exception 'contract_proof_missing';
    end if;
    -- Both parties, on the same version, and a check (JUR-11): never « signed » on one
    -- signature, nor on PDS's signature of a version since revised.
    if v_generated and (v_contract.pds_signed_at is null
                        or v_contract.pds_signed_version is distinct from v_version) then
      raise exception 'contract_countersign_missing';
    end if;
    if v_generated and p_checked is not true then
      raise exception 'contract_signature_unchecked';
    end if;
    update public.contracts
       set status = 'signed', signed_on = p_signed_on,
           signature_checked_by = case when v_generated then v_me end,
           signature_checked_at = case when v_generated then now() end
     where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.signed');

  elsif p_action = 'terminate' then
    if v_contract.status <> 'signed' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'terminated' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.terminated');

  else
    raise exception 'contract_unknown_action';
  end if;
end;
$$;

-- ===========================================================================================
-- 2. The synthesis before the shoot, checked by the database (MKT-PROD-002)
-- ===========================================================================================

-- The lines of the synthesis (lib/production/ready-synthesis.ts) the database knows are not
-- ready. Never more severe than the code: a line it cannot read (notes, the place's fit with
-- the quote) is left to the code.
create function public.production_ready_unmet(p_sheet_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.production_sheets where id = p_sheet_id),
  approved as (
    select max(q.number) as number from public.production_quotes q
     where q.sheet_id = p_sheet_id and q.status = 'approved'),
  retained as (
    -- The proposal retained: the newest validated on both sides.
    select max(v.number) as number from public.production_direction_versions v
     where v.sheet_id = p_sheet_id and v.int_status = 'approved'
       and v.ext_status in ('approved', 'none')),
  checklist as (
    select k.key, k.row_key,
           exists (select 1 from public.production_plan_actions a
                     left join public.tasks t on t.id = a.task_id
                    where a.sheet_id = p_sheet_id and a.template_key = 'checklist_' || k.key
                      and (a.done_at is not null or t.status = 'done')) as done
      from (values ('crew', 'crew'), ('schedule', 'plan'), ('gear', 'gear')) k (key, row_key))
  select array_remove(array[
    case when not exists (select 1 from public.production_location_options o
                           where o.sheet_id = p_sheet_id and o.status = 'chosen')
         then 'place' end,
    case when not exists (select 1 from public.production_schedule_decisions d
                           where d.sheet_id = p_sheet_id and d.replaced_at is null)
         then 'date' end,
    case when not (select done from checklist where row_key = 'crew') then 'crew' end,
    case when not (select done from checklist where row_key = 'plan') then 'plan' end,
    case when not (select done from checklist where row_key = 'gear') then 'gear' end,
    case when (select number from approved) is null
           or (s.quote_revision_at is not null and s.quote_revision_reason is not null)
           or exists (select 1 from public.production_quotes q
                       where q.sheet_id = p_sheet_id and q.number > (select number from approved))
         then 'quote' end,
    case when (s.direction_revision_at is not null and s.direction_revision_reason is not null)
           or ((select number from retained) is null and s.direction_status <> 'approved')
           or exists (select 1 from public.production_direction_versions v
                       where v.sheet_id = p_sheet_id and v.number > (select number from retained))
         then 'direction' end,
    case when exists (select 1 from public.step_blockers b
                       where b.project_id = s.project_id and b.module = 'production'
                         and b.subject_id = s.deliverable_id and b.lifted_at is null)
         then 'blockers' end
  ], null)
  from s;
$$;
revoke execute on function public.production_ready_unmet(uuid) from public, anon, authenticated;

-- confirm_production_ready (20261026300101), the same after one more check of the snapshot.
create or replace function public.confirm_production_ready(
  p_sheet_id uuid, p_snapshot jsonb, p_force_reason text, p_plan jsonb default null)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  s public.production_sheets%rowtype;
  v_missing integer;
  v_critical text[];
  v_plan jsonb := '[]'::jsonb;
  v_key text;
  v_line jsonb;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.organization is distinct from 'external' then
    raise exception 'not_external';
  end if;
  if s.ready_at is not null then
    raise exception 'already_ready';
  end if;
  if s.ready_request_at is not null then
    raise exception 'request_pending';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_snapshot) = 0
     or jsonb_array_length(p_snapshot) > 20 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- Every critical line is there, and none the database knows unmet is said ready: the
  -- browser's synthesis is never believed on its word (MKT-PROD-002).
  if exists (select 1 from unnest(array['place', 'date', 'crew', 'plan', 'quote', 'direction',
                                        'blockers']) k
              where not exists (select 1 from jsonb_array_elements(p_snapshot) r
                                 where r ->> 'key' = k))
     or exists (select 1 from jsonb_array_elements(p_snapshot) r
                 where coalesce((r ->> 'ok')::boolean, false)
                   and r ->> 'key' = any (public.production_ready_unmet(s.id))) then
    raise exception 'ready_snapshot_stale' using errcode = 'P0001';
  end if;
  select count(*) into v_missing from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false;
  select coalesce(array_agg(distinct r ->> 'key'), '{}') into v_critical
    from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false
     and public.production_ready_critical(r ->> 'key');
  if v_missing > 0 and btrim(coalesce(p_force_reason, '')) = '' then
    raise exception 'reason_required';
  end if;

  if cardinality(v_critical) > 0 then
    -- A catch-up line for each critical point: a member, a day not past.
    if jsonb_typeof(coalesce(p_plan, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_plan) > 20 then
      raise exception 'plan_required';
    end if;
    foreach v_key in array v_critical loop
      select l into v_line from jsonb_array_elements(p_plan) l where l ->> 'key' = v_key limit 1;
      if v_line is null or nullif(v_line ->> 'personId', '') is null
         or nullif(v_line ->> 'dueOn', '') is null then
        raise exception 'plan_required';
      end if;
      if (v_line ->> 'dueOn')::date < v_today then
        raise exception 'plan_due_past';
      end if;
      if not exists (select 1 from public.memberships m
                      where m.organization_id = s.organization_id
                        and m.person_id = (v_line ->> 'personId')::uuid and m.status = 'approved') then
        raise exception 'plan_person_invalid';
      end if;
      v_plan := v_plan || jsonb_build_array(jsonb_build_object(
        'key', v_key, 'personId', v_line ->> 'personId', 'dueOn', v_line ->> 'dueOn',
        'label', (select r ->> 'label' from jsonb_array_elements(p_snapshot) r
                   where r ->> 'key' = v_key limit 1)));
    end loop;
    update public.production_sheets
       set ready_request_at = now(), ready_request_by = public.auth_person_id(),
           ready_request_snapshot = p_snapshot, ready_request_reason = left(btrim(p_force_reason), 1000),
           ready_request_plan = v_plan
     where id = s.id;
    perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready_requested',
      null, jsonb_build_object('critical', to_jsonb(v_critical), 'reason', btrim(p_force_reason), 'plan', v_plan));
    -- To who decides: the direction and the quote validator, never the asker.
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select distinct s.organization_id, m.person_id, public.auth_person_id(), 'production_ready_requested',
           s.project_id, s.deliverable_id
      from public.memberships m
     where m.organization_id = s.organization_id and m.status = 'approved'
       and ('administer' = any (public.role_permissions(m.role))
            or m.person_id = s.quote_validator_person_id)
       and m.person_id is distinct from public.auth_person_id();
    return 'requested';
  end if;

  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id(), ready_snapshot = p_snapshot,
         ready_forced_reason = case when v_missing > 0 then left(btrim(p_force_reason), 1000) end,
         ready_reopened_at = null, ready_reopened_because = '{}'
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready',
    jsonb_build_object('ready', s.ready_at is not null, 'snapshot', s.ready_snapshot),
    jsonb_build_object('ready', true, 'forced', v_missing > 0,
                       'reason', nullif(btrim(coalesce(p_force_reason, '')), '')));
  return 'ready';
end;
$function$;

-- ===========================================================================================
-- 3 and 4. The bulletin's signatures: superseded by a change, PDS Éditions signed by the
-- direction (JUR-03)
-- ===========================================================================================

alter table public.legal_formality_signatures
  add column superseded_at timestamptz,
  add column house boolean not null default false,
  add constraint legal_formality_signatures_house_check
    check (not house or (role = 'publisher' and contact_id is null));

alter table public.legal_formality_signatures
  drop constraint legal_formality_signatures_via_check,
  add constraint legal_formality_signatures_via_check
    check (via is null or via in ('link', 'other', 'house'));

-- The signatures of a version a newer one replaced, before this migration: superseded then.
update public.legal_formality_signatures s
   set superseded_at = d.created_at
  from public.legal_formality_documents d
 where d.formality_id = s.formality_id and d.version = s.document_version + 1
   and s.superseded_at is null;

do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'legal_formality_events_kind_check'
     and conrelid = 'public.legal_formality_events'::regclass;
  select array_agg(distinct replace(k, '"', '')) into v_kinds
    from regexp_matches(v_def, '''([^'']+)''', 'g') m,
         unnest(case when m[1] like '{%' then string_to_array(btrim(m[1], '{}'), ',')
                     else array[m[1]] end) k;
  v_kinds := array(select distinct k from unnest(v_kinds || array['signatures.superseded']) k);
  alter table public.legal_formality_events drop constraint legal_formality_events_kind_check;
  execute format('alter table public.legal_formality_events add constraint '
                 'legal_formality_events_kind_check check (kind = any (%L::text[]))', v_kinds);
end $$;

-- The signatures of the current version stop being valid: the data they signed changed.
create function public.supersede_formality_signatures(p_formality public.legal_formalities)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_rows integer;
  v_signed integer;
begin
  select max(version) into v_version from public.legal_formality_documents
   where formality_id = p_formality.id;
  if v_version is null then return; end if;
  with gone as (
    update public.legal_formality_signatures
       set superseded_at = now()
     where formality_id = p_formality.id and document_version <= v_version
       and superseded_at is null
    returning status)
  select count(*), count(*) filter (where status = 'signed') into v_rows, v_signed from gone;
  -- The note: the version and how many signatures it had gathered.
  if v_rows > 0 then
    perform public.log_formality_event(p_formality, 'signatures.superseded',
      'v' || v_version || ' · ' || v_signed
      || case when v_signed > 1 then ' signatures reçues' else ' signature reçue' end);
  end if;
end;
$$;
revoke execute on function public.supersede_formality_signatures(public.legal_formalities)
  from public, anon, authenticated;

-- save_formality_values (20261005007001), the same but for the signatures it cancels.
create or replace function public.save_formality_values(p_formality_id uuid, p_values jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_key text;
  v_entry jsonb;
begin
  if v.status in ('submitted', 'processing') then
    raise exception 'formality_submitted' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception 'formality_values_invalid' using errcode = 'P0001'; end if;
  for v_key, v_entry in select * from jsonb_each(p_values) loop
    -- After an external correction, only the fields it reopened.
    continue when v.status = 'action_required' and not (v_key = any (v.reopened));
    insert into public.legal_formality_values
      (formality_id, field_key, organization_id, value, source, status, validated_by, validated_at)
    values (p_formality_id, v_key, v.organization_id, coalesce(v_entry -> 'value', 'null'::jsonb),
            left(coalesce(nullif(v_entry ->> 'source', ''), 'Saisi'), 200), 'validated',
            public.auth_person_id(), now())
    on conflict (formality_id, field_key) do update
      set value = excluded.value, source = excluded.source, status = 'validated',
          validated_by = excluded.validated_by, validated_at = excluded.validated_at;
    update public.legal_formalities set reopened = array_remove(reopened, v_key)
     where id = p_formality_id;
  end loop;
  perform public.log_formality_event(v, 'formality.values_validated');
  -- A change after a version was generated calls for a new version, and the signatures of
  -- that version no longer hold (JUR-03).
  if v.status in ('document_ready', 'signatures_pending', 'ready_to_submit') then
    perform public.supersede_formality_signatures(v);
  end if;
  update public.legal_formalities
     set status = case
       when status = 'action_required' and cardinality(reopened) = 0 then 'collecting_data'
       when status in ('document_ready', 'signatures_pending', 'ready_to_submit') then 'collecting_data'
       else status end
   where id = p_formality_id;
  perform public.formality_settle(p_formality_id);
end;
$$;

-- generate_formality_document (20261020070101), the same but for the versions it replaces and
-- PDS Éditions' line.
create or replace function public.generate_formality_document(p_formality_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_version integer;
  v_content jsonb;
  v_item jsonb;
  v_contact uuid;
  v_house boolean;
  v_house_named boolean := false;
begin
  if v.status not in ('ready_to_generate', 'document_ready', 'signatures_pending') then
    raise exception 'formality_not_ready' using errcode = 'P0001';
  end if;
  if cardinality(public.formality_missing(p_formality_id)) > 0 then
    raise exception 'formality_missing' using errcode = 'P0001',
      detail = array_to_string(public.formality_missing(p_formality_id), ',');
  end if;
  -- The version replaced: its signatures no longer hold.
  perform public.supersede_formality_signatures(v);
  select coalesce(jsonb_object_agg(field_key, jsonb_build_object('value', value, 'source', source)), '{}')
    into v_content from public.legal_formality_values where formality_id = p_formality_id;
  select coalesce(max(version), 0) + 1 into v_version
    from public.legal_formality_documents where formality_id = p_formality_id;
  insert into public.legal_formality_documents (organization_id, formality_id, version, content, created_by)
  values (v.organization_id, p_formality_id, v_version, v_content, public.auth_person_id());

  -- « Le bulletin doit être signé par tous les ayants droit »: the creators
  -- who sign and the publishers, for this version, with the Réseau contact named.
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'creators' -> 'value', '[]')) loop
    continue when not coalesce((v_item ->> 'signs')::boolean, false);
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id)
    values (v.organization_id, p_formality_id, v_version,
            left(btrim(concat_ws(' ', v_item ->> 'first_name', v_item ->> 'last_name')), 200),
            coalesce(v_item ->> 'quality', 'author'), v_contact);
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'publishers' -> 'value', '[]')) loop
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    -- PDS Éditions (from the confirmed split): signed by the direction, never on a link. One
    -- line at most, never one with a Réseau contact.
    v_house := coalesce((v_item ->> 'house')::boolean, false) and v_contact is null
               and not v_house_named;
    v_house_named := v_house_named or v_house;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id, house)
    values (v.organization_id, p_formality_id, v_version, left(btrim(v_item ->> 'name'), 200),
            'publisher', v_contact, v_house);
  end loop;
  update public.legal_formalities
     set status = case when exists (
           select 1 from public.legal_formality_signatures
            where formality_id = p_formality_id and document_version = v_version)
         then 'signatures_pending' else 'ready_to_submit' end,
         partial_reason = null
   where id = p_formality_id;
  perform public.log_formality_event(v, 'document.generated', 'v' || v_version);
  return v_version;
end;
$$;

-- « Signer pour PDS Éditions »: the direction signs the house's line of the current version in
-- PDS OS — a simple electronic signature, dated, tied to the account (as the contracts'
-- countersignature, 20261024000201).
create function public.sign_formality_for_house(p_signature_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sig public.legal_formality_signatures%rowtype;
  v public.legal_formalities%rowtype;
begin
  select * into v_sig from public.legal_formality_signatures where id = p_signature_id for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from public.legal_formalities where id = v_sig.formality_id;
  if public.auth_person_id() is null
     or not public.can_see_project(v.project_id)
     or not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_sig.house or v_sig.superseded_at is not null then
    raise exception 'formality_signature_closed' using errcode = 'P0001';
  end if;
  perform public.settle_formality_signature(
    v_sig, 'house', 'Signature électronique simple dans PDS OS, par la direction',
    (now() at time zone 'Europe/Paris')::date, null, null, null);
end;
$$;
revoke execute on function public.sign_formality_for_house(uuid) from public, anon;
grant execute on function public.sign_formality_for_house(uuid) to authenticated;

-- ===========================================================================================
-- 5. A fiche complete before it is validated (JUR-06), « déjà payé » refused (JUR-12)
-- ===========================================================================================

-- What a contract needs from the latest fiche received (lib/legal/forms/completeness.ts): the
-- legal name, an e-mail, an address (a company: its name, SIRET and billing address) and, for
-- an author, a composer or an arranger, the IPI/COAD number. No fiche received: « submission ».
create function public.legal_form_missing(p_form_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select roles, coalesce(person, '{}'::jsonb) as person from public.legal_form_submissions
     where form_id = p_form_id order by created_at desc limit 1)
  select coalesce(
    (select array_agg(k order by n)
       from s, unnest(array['legal_first_name', 'legal_last_name', 'email']
                      || case when s.person ->> 'entity_type' = 'company'
                              then array['company_name', 'siret', 'billing']
                              else array['address'] end
                      || case when s.roles && array['author', 'composer', 'arranger']
                              then array['ipi_coad'] else '{}'::text[] end)
              with ordinality u (k, n)
      where btrim(coalesce(s.person ->> k, '')) = ''),
    case when exists (select 1 from s) then '{}'::text[] else array['submission'] end);
$$;
revoke execute on function public.legal_form_missing(uuid) from public, anon;
grant execute on function public.legal_form_missing(uuid) to authenticated;

-- review_legal_form (20261024000101), the same after the fiche's completeness.
create or replace function public.review_legal_form(p_form_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_corrections jsonb;
  v_key text;
  v_value jsonb;
begin
  select * into v_form from public.legal_forms where id = p_form_id for update;
  if not found
     or not public.has_permission(v_form.organization_id, 'manage_legal')
     or not public.can_see_project(v_form.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_form.status <> 'action_required' then
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
  if v_form.complement_requested_at is not null then
    raise exception 'legal_form_complement_pending' using errcode = 'P0001';
  end if;
  -- « Une fiche reçue n'est pas automatiquement complète » (JUR-06).
  if cardinality(public.legal_form_missing(p_form_id)) > 0 then
    raise exception 'legal_form_incomplete' using errcode = 'P0001',
      detail = array_to_string(public.legal_form_missing(p_form_id), ',');
  end if;
  if p_accept then
    select corrections into v_corrections from public.legal_form_submissions
     where form_id = p_form_id order by created_at desc limit 1;
    for v_key, v_value in select * from jsonb_each(coalesce(v_corrections, '{}'))
    loop
      update public.contact_legal_details
         set details = details || jsonb_build_object(v_key, v_value -> 'after'),
             updated_at = now()
       where contact_id = v_form.contact_id;
    end loop;
    update public.network_contacts
       set email = case when v_corrections ? 'email'
                         and btrim(v_corrections #>> '{email,after}') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                     then btrim(v_corrections #>> '{email,after}') else email end,
           phone = case when v_corrections ? 'phone'
                     then nullif(btrim(v_corrections #>> '{phone,after}'), '') else phone end
     where id = v_form.contact_id
       and (v_corrections ? 'email' or v_corrections ? 'phone');
  end if;
  update public.legal_forms
     set status = 'complete', completed_at = now(), validated_by = public.auth_person_id()
   where id = p_form_id;
end;
$$;

-- A payment alone assigns no right (JUR-12; lib/legal/contracts/no-deal.ts, same rule): the
-- reason says it was paid and names no agreement that covers the rights, nor why none is
-- opened. « pas de contrat », « sans accord »… name none.
create function public.reason_only_paid(p_reason text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_reason, '') ~* '\m(pay|réglé|facturé|rémunéré|défrayé)'
     and regexp_replace(coalesce(p_reason, ''),
                        '\m(pas de|pas d''|pas d’|sans|aucune?|ni)\s*(contrat|cession|accord|licence|convention)',
                        '', 'gi')
         !~* '(contrat|cession|accord|licence|convention|aucun droit|n''ouvre|n’ouvre|libre de droits)';
$$;
revoke execute on function public.reason_only_paid(text) from public, anon;
grant execute on function public.reason_only_paid(text) to authenticated;

-- approve_contract_mapping (20261019090101), the same but for « déjà payé ».
create or replace function public.approve_contract_mapping(p_project_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_item jsonb;
  v_contact uuid;
  v_roles text[];
  v_template public.contract_templates%rowtype;
  v_type text;
  v_fee bigint;
  v_reason text;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then
    raise exception 'mapping_invalid';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_contact := (v_item ->> 'contact_id')::uuid;
    if not exists (select 1 from public.network_contacts
                    where id = v_contact and organization_id = v_org) then
      raise exception 'mapping_contact_invalid';
    end if;
    -- Generated already: left untouched.
    continue when exists (select 1 from public.legal_agreement_needs
                           where project_id = p_project_id and contact_id = v_contact
                             and contract_id is not null);

    if coalesce((v_item ->> 'needed')::boolean, false) is false then
      -- « Pas d'accord nécessaire » is said with its reason (proto, rule 11), never « déjà
      -- payé » alone (JUR-12).
      v_reason := nullif(btrim(coalesce(v_item ->> 'reason', '')), '');
      if v_reason is null then
        raise exception 'mapping_reason_required';
      end if;
      if public.reason_only_paid(v_reason) then
        raise exception 'mapping_reason_only_paid';
      end if;
      delete from public.legal_agreement_needs
       where project_id = p_project_id and contact_id = v_contact;
      insert into public.legal_no_agreement_reasons
        (organization_id, project_id, contact_id, reason, decided_by)
      values (v_org, p_project_id, v_contact, left(v_reason, 1000), v_me)
      on conflict (project_id, contact_id) do update
        set reason = excluded.reason, decided_by = excluded.decided_by,
            decided_at = now();
      continue;
    end if;
    delete from public.legal_no_agreement_reasons
     where project_id = p_project_id and contact_id = v_contact;

    v_roles := array(select jsonb_array_elements_text(coalesce(v_item -> 'roles', '[]')));
    v_fee := nullif(v_item ->> 'fee_cents', '')::bigint;
    v_template := null;
    if nullif(v_item ->> 'template_id', '') is not null then
      select * into v_template from public.contract_templates
       where id = (v_item ->> 'template_id')::uuid and organization_id = v_org;
      if not found or v_template.status <> 'validated' then
        raise exception 'mapping_template_not_validated';
      end if;
      if not (v_template.roles && v_roles) then
        raise exception 'mapping_template_incompatible';
      end if;
      v_type := v_template.type;
    else
      v_type := coalesce(nullif(v_item ->> 'contract_type', ''), 'other');
    end if;

    insert into public.legal_agreement_needs
      (organization_id, project_id, contact_id, roles, contract_type, template_id,
       fee_cents, approved_by, approved_at)
    values (v_org, p_project_id, v_contact, v_roles, v_type, v_template.id, v_fee,
            v_me, now())
    on conflict (project_id, contact_id) do update
      set roles = excluded.roles, contract_type = excluded.contract_type,
          template_id = excluded.template_id, fee_cents = excluded.fee_cents,
          approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  end loop;

  perform public.log_contract_event(v_org, null, p_project_id, 'contract_mapping.approved');
end;
$$;
