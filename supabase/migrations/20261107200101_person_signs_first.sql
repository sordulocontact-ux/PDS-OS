-- The person signs first, then PDS (Ibé, 07/11/2026: « La personne signe », answering « qui
-- signe en premier ? »; PDS's tool is Yousign). Reverses the order of 20261107150101, which
-- had PDS sign before sending (applied to the pre-prod only):
-- - 'send' no longer waits for PDS's signature: a validated contract leaves as generated;
-- - 'countersign' comes after the person's signed copy of the latest version is back, and
--   asks for the PDF signed in turn by the direction for PDS (« pds_signed », now the copy
--   signed by both parties), dropped after that copy;
-- - 'sign' is unchanged: both signatures on the latest version, and the team's check.
-- The person's page (get_contact_contract_pds_file, unchanged) then serves the copy signed
-- by both parties, and the generated PDF before.

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
    if not (v_editor and v_contract.owner_person_id = v_me) then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
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
    if not (v_editor and v_contract.owner_person_id = v_me) then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and v_comment is null then
      raise exception 'contract_send_proof_required';
    end if;
    update public.contracts set status = 'sent' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'signature.requested',
                                      v_comment);

  elsif p_action = 'countersign' then
    -- The person signs first, then PDS (Ibé, 07/11/2026), by the direction (JUR-11), on the
    -- latest version and that version only. A generated contract is signed on its PDF: the
    -- person's signed copy of the latest version must be back (by their link, or « signé
    -- autrement », sent or not), then the direction drops that PDF signed in turn for PDS —
    -- the copy signed by both parties.
    if v_contract.status not in ('approved', 'sent') or v_contract.pds_signed_at is not null then
      raise exception 'contract_wrong_status';
    end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and not exists (
      select 1 from public.contract_files f
       where f.contract_id = p_contract_id and f.category = 'signed'
         and f.created_at >= (select max(d.created_at) from public.contract_documents d
                               where d.contract_id = p_contract_id)
    ) then
      raise exception 'contract_not_returned';
    end if;
    if v_generated and not exists (
      select 1 from public.contract_files f
       where f.contract_id = p_contract_id and f.category = 'pds_signed'
         and f.created_at >= (select max(s.created_at) from public.contract_files s
                               where s.contract_id = p_contract_id and s.category = 'signed')
    ) then
      raise exception 'contract_pds_file_missing';
    end if;
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
