-- A deal's stage follows its contract, wherever the contract comes from
-- (Sacha 23/11/2026: Ysolde Marnay's deal stayed « Accord de principe » while
-- her guest contract, made by the Juridique, was sent and came back signed).
-- Until now only sending the validated memo moved a deal to « Contractualisation »
-- (deal_memo_moves, 20261122110101), and only a contract signed moved a deal
-- already in contractualisation to « Signé » (20261120110101).
--
-- Now, on the contract of the deal (deal_contract_id: the participation's
-- contract, else deals.contract_id):
--   - sent for signature: a deal whose accord is validated (« agreement »)
--     moves to « contracting »;
--   - signed: a deal in « agreement » (validated) or « contracting » moves to
--     « signed ».
-- Each move is journaled as a stage with `detail.contract` = the contract's
-- status. Deals already behind their contract are brought level once.

create or replace function public.deal_follows_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_from text;
  v_to text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('sent', 'signed') then
    return new;
  end if;
  v_to := case new.status when 'sent' then 'contracting' else 'signed' end;
  for v in
    select d.* from public.deals d
     where d.organization_id = new.organization_id
       and d.agreement_status = 'validated'
       and (d.stage = 'agreement'
            or (v_to = 'signed' and d.stage = 'contracting'))
       and public.deal_contract_id(d) = new.id
     for update
  loop
    v_from := v.stage;
    update public.deals
       set stage = v_to, stage_changed_at = now(),
           stage_changed_by = public.auth_person_id()
     where id = v.id
    returning * into v;
    perform public.log_deal_event(v, 'stage', v_from, v_to, null,
      jsonb_build_object('contract', new.status));
  end loop;
  return new;
end;
$$;
revoke execute on function public.deal_follows_contract() from public, anon, authenticated;

-- The deals already behind their contract (demo data, contracts made in the
-- Juridique before this migration).
do $$
declare
  v public.deals%rowtype;
  v_status text;
  v_to text;
  v_from text;
begin
  for v in
    select d.* from public.deals d
     where d.agreement_status = 'validated'
       and d.stage in ('agreement', 'contracting')
     for update
  loop
    select c.status into v_status from public.contracts c
     where c.id = public.deal_contract_id(v);
    v_to := case
      when v_status = 'signed' then 'signed'
      when v_status = 'sent' and v.stage = 'agreement' then 'contracting'
    end;
    continue when v_to is null;
    v_from := v.stage;
    update public.deals
       set stage = v_to, stage_changed_at = now()
     where id = v.id
    returning * into v;
    perform public.log_deal_event(v, 'stage', v_from, v_to, null,
      jsonb_build_object('contract', v_status));
  end loop;
end;
$$;
