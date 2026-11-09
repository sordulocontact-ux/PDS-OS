-- The authorisation contract of a borrowing is approved by the direction's
-- « Valider les conditions », never submitted in the responsible's name.
--
-- Decision of 07/10/2026 (docs/ARCHITECTURE.md § 8 sexies): validating the
-- conditions validates the agreement, and prepares its contract « prêt à
-- envoyer » — one approval, not two. The flow did it by calling
-- advance_contract('submit') then ('approve') as the direction; since rule 9 of
-- VISION-UX (30/10/2026: only the owner submits his contract) the submit is
-- refused, so the contract stayed « En préparation » and the borrowing page
-- said it waited for the direction, which had already decided.
--
-- approve_clearance_contract: a draft contract linked to a borrowing whose
-- conditions the direction validated goes straight to « approved », by a
-- validator, logged and notified as an approval. Any other contract still
-- follows submit → approve.

create or replace function public.approve_clearance_contract(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;
  if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
  if not public.has_permission(v_contract.organization_id, 'validate') then
    raise exception 'contract_not_allowed' using errcode = '42501';
  end if;
  -- Only the contract of a borrowing whose conditions were validated.
  if not exists (
    select 1 from public.legal_clearance_contracts l
      join public.legal_clearance_terms t on t.clearance_id = l.clearance_id
     where l.contract_id = p_contract_id and t.status = 'validated'
  ) then
    raise exception 'contract_not_allowed' using errcode = '42501';
  end if;

  update public.contracts
     set status = 'approved',
         review_comment = null,
         reviewed_by = public.auth_person_id(),
         reviewed_at = now()
   where id = p_contract_id;
  perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                        'contract_approved', v_contract.project_id, p_contract_id);
  perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                    v_contract.project_id, 'contract.approved',
                                    'Conditions de l''autorisation validées');
end;
$$;
revoke execute on function public.approve_clearance_contract(uuid) from public, anon;
grant execute on function public.approve_clearance_contract(uuid) to authenticated;

-- The contracts left « En préparation » by the refused submit: drafts of a
-- borrowing whose conditions were validated, never reviewed (a draft sent
-- back by « Demander des modifications » has a review and stays a draft).
-- Approved by whoever validated the conditions.
update public.contracts c
   set status = 'approved',
       reviewed_by = (
         select e.actor_person_id from public.legal_clearance_events e
           join public.legal_clearance_contracts l on l.clearance_id = e.clearance_id
          where l.contract_id = c.id and e.kind = 'clearance.conditions_validated'
          order by e.created_at desc limit 1),
       reviewed_at = now()
 where c.status = 'draft'
   and c.reviewed_at is null
   and exists (
     select 1 from public.legal_clearance_contracts l
       join public.legal_clearance_terms t on t.clearance_id = l.clearance_id
      where l.contract_id = c.id and t.status = 'validated');
