-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-11 : un contrat généré ne passe à
-- « signé » qu'avec la signature des deux parties et une vérification.
--
-- - « Signer pour PDS » (advance_contract 'countersign') : la direction, seule habilitée
--   (permission validate), signe dans PDS OS — signature électronique simple, horodatée,
--   liée à son compte (pds_signed_by / pds_signed_at), sur la version validée et envoyée.
-- - « Marquer comme signé » ('sign') d'un contrat généré exige cette signature
--   (contract_countersign_missing) et la vérification de l'équipe : bonne version,
--   signataire de la fiche, chaque page (p_checked, signature_checked_by / _at ;
--   contract_signature_unchecked). Une confirmation dans PDS OS n'est jamais une signature.
-- - Un contrat déposé à la main (hors génération) ne change pas.

alter table public.contracts
  add column pds_signed_by uuid references public.people (id),
  add column pds_signed_at timestamptz,
  add column signature_checked_by uuid references public.people (id),
  add column signature_checked_at timestamptz;

-- contract_events: one more kind, whatever the list holds when this runs.
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'contract_events_kind_check' and conrelid = 'public.contract_events'::regclass;
  -- The list is written either as quoted values or as one array literal ('{a,b}').
  select array_agg(distinct replace(k, '"', '')) into v_kinds
    from regexp_matches(v_def, '''([^'']+)''', 'g') m,
         unnest(case when m[1] like '{%' then string_to_array(btrim(m[1], '{}'), ',')
                     else array[m[1]] end) k;
  v_kinds := array(select distinct k from unnest(v_kinds || array['contract.countersigned']) k);
  alter table public.contract_events drop constraint contract_events_kind_check;
  execute format('alter table public.contract_events add constraint contract_events_kind_check '
                 'check (kind = any (%L::text[]))', v_kinds);
end $$;

drop function public.advance_contract(uuid, text, text, date);

create function public.advance_contract(
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
  v_generated := exists (select 1 from public.contract_documents
                          where contract_id = p_contract_id);

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
    -- PDS signs the version validated and sent, by the direction (JUR-11).
    if v_contract.status not in ('approved', 'sent') or v_contract.pds_signed_at is not null then
      raise exception 'contract_wrong_status';
    end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set pds_signed_by = v_me, pds_signed_at = now()
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          'contract_approved', v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.countersigned');

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
    -- Both parties and a check (JUR-11): never « signed » on one signature.
    if v_generated and v_contract.pds_signed_at is null then
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
revoke execute on function public.advance_contract(uuid, text, text, date, boolean) from public, anon;
grant execute on function public.advance_contract(uuid, text, text, date, boolean) to authenticated;
