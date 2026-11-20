-- Business, réunion avec Ibé du 18/11/2026 (1:21:01 « je n'avais pas capté
-- pourquoi on pouvait cliquer et tout s'enchaîner »): the main button of a
-- deal moved it to its next stage, the next one appeared in the same place,
-- and the direction (whose accord de principe is validated at once) could
-- click a deal from « À contacter » to « Signé » with no call, no term and
-- no contract. A stage now says what happened:
--
--   1. « Accord de principe » needs a term confirmed (the ticket PDSBIZ:
--      « conditions essentielles suffisamment stabilisées »):
--      agreement_needs_terms.
--   2. « Signé » needs the deal's contract signed (its participation's, else
--      its own, deal_contract_id): contract_not_signed. Never declared by
--      hand without it.
--   3. The deal follows its contract: once the contract of a deal in
--      contracting is signed, the deal is signed, with its journal line.

-- 1 and 2 ------------------------------------------------------------------------------------
create or replace function public.set_deal_stage(
  p_deal_id uuid,
  p_stage text,
  p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_from text;
  v_note text := public.clean_deal_text(p_note, 2000);
  v_director boolean;
  v_agreement text;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if p_stage is null
     or p_stage not in ('to_contact', 'call_planned', 'negotiation', 'agreement',
                        'contracting', 'signed') then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  if p_stage = v.stage then
    raise exception 'stage_unchanged' using errcode = 'P0001';
  end if;
  v_from := v.stage;
  v_director := public.has_permission(v.organization_id, 'validate');

  v_agreement := case p_stage
    when 'agreement' then case when v_director then 'validated' else 'pending' end
    when 'contracting' then v.agreement_status
    when 'signed' then v.agreement_status
    else null
  end;
  if p_stage = 'agreement'
     and not exists (select 1 from public.deal_terms t
                      where t.deal_id = v.id and t.state = 'confirmed') then
    raise exception 'agreement_needs_terms' using errcode = 'P0001';
  end if;
  if p_stage = 'contracting' and v.agreement_status is distinct from 'validated' then
    raise exception 'agreement_not_validated' using errcode = 'P0001';
  end if;
  if p_stage = 'signed' and v_from <> 'contracting' then
    raise exception 'not_contracting' using errcode = 'P0001';
  end if;
  if p_stage = 'signed'
     and not exists (select 1 from public.contracts c
                      where c.id = public.deal_contract_id(v) and c.status = 'signed') then
    raise exception 'contract_not_signed' using errcode = 'P0001';
  end if;

  update public.deals
     set stage = p_stage,
         agreement_status = v_agreement,
         agreement_decided_by = case when p_stage = 'agreement' and v_director
                                     then public.auth_person_id()
                                     when v_agreement is null then null
                                     else agreement_decided_by end,
         agreement_decided_at = case when p_stage = 'agreement' and v_director then now()
                                     when v_agreement is null then null
                                     else agreement_decided_at end,
         stage_changed_by = public.auth_person_id(),
         stage_changed_at = now()
   where id = p_deal_id
  returning * into v;
  perform public.log_deal_event(v, 'stage', v_from, p_stage, v_note,
    case when p_stage = 'agreement' then jsonb_build_object('agreement', v_agreement)
         else '{}'::jsonb end);
end;
$$;

-- 3 ------------------------------------------------------------------------------------------
create or replace function public.deal_follows_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  if new.status <> 'signed' or old.status = 'signed' then
    return new;
  end if;
  for v in
    select d.* from public.deals d
     where d.stage = 'contracting'
       and d.organization_id = new.organization_id
       and public.deal_contract_id(d) = new.id
     for update
  loop
    update public.deals
       set stage = 'signed', stage_changed_at = now(),
           stage_changed_by = public.auth_person_id()
     where id = v.id
    returning * into v;
    perform public.log_deal_event(v, 'stage', 'contracting', 'signed', null,
      jsonb_build_object('contract', 'signed'));
  end loop;
  return new;
end;
$$;
revoke execute on function public.deal_follows_contract() from public, anon, authenticated;
create trigger z_deal_follows_contract after update of status on public.contracts
  for each row execute function public.deal_follows_contract();
