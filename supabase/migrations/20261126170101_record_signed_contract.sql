-- « Déposer un contrat » of a contract already signed (Sacha 26/11/2026):
-- it enters PDS OS as signed, with its date, rather than through the
-- submit → validate → send → sign flow, which is for a contract still to
-- sign. Only a contract written outside PDS OS (no generated document), still
-- a draft, by whoever edits it (as advance_contract), with its signed file
-- already filed and a signature day not in the future.

create or replace function public.record_signed_contract(
  p_contract_id uuid,
  p_signed_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_me uuid := public.auth_person_id();
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;
  if not (public.has_permission(v_contract.organization_id, 'manage_contracts')
          and (v_contract.owner_person_id = v_me
               or public.has_permission(v_contract.organization_id, 'view_all_projects'))) then
    raise exception 'contract_not_allowed' using errcode = '42501';
  end if;
  if v_contract.status <> 'draft' then
    raise exception 'contract_wrong_status';
  end if;
  -- A contract made in PDS OS from a template is signed through its flow
  -- (the person's link, PDS's countersignature, the check: JUR-11).
  if exists (select 1 from public.contract_documents where contract_id = p_contract_id) then
    raise exception 'contract_wrong_status';
  end if;
  if p_signed_on is null or p_signed_on > current_date then
    raise exception 'contract_signed_on_invalid';
  end if;
  if not exists (select 1 from public.contract_files
                  where contract_id = p_contract_id and category = 'signed') then
    raise exception 'contract_proof_missing';
  end if;

  update public.contracts
     set status = 'signed', signed_on = p_signed_on
   where id = p_contract_id;
  perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                    v_contract.project_id, 'contract.signed',
                                    'déposé signé');
end;
$$;

revoke all on function public.record_signed_contract(uuid, date) from public, anon;
grant execute on function public.record_signed_contract(uuid, date) to authenticated;
