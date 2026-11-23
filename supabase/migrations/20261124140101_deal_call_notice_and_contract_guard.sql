-- Retours d'Ibé du 18/11/2026, lots C and D, what was left (23/11/2026).
--
--   1. deal_call_planned: « notifier le business manager qu'un call lui est calé ». A call of a
--      deal (calls.deal_id) planned by someone else than the deal's negotiator (the project's
--      owner with « Caler le call », the direction with « Préparer un call ») tells the negotiator
--      (deals.assignee_person_id). Never its author (notify() skips the actor, and the row's
--      created_by is checked too); a deal without negotiator tells nobody. The subject is the
--      call (the notification opens its page), the project the deal's. Written by a trigger,
--      whatever the path (plan_deal_negotiation_call, a direct insert under calls_insert_owner).
--      On a participation without deal, « Caler le call » gives the deal and plans the call in
--      one gesture: the negotiator gets both deal_assigned and deal_call_planned (the second
--      says there is already a call on his calendar).
--   2. « Pas de contrat avant l'accord » on a participation's contract: already in SQL since
--      20261121210101 (b_agreement_before_contract on title_participations.contract_id,
--      generate_legal_contract for a collective's guest, link_deal_contract and
--      generate_deal_contract refuse a participation's deal outright) and kept by
--      20261121230101 (the person's contract is copied only once the accord is validated).
--      Nothing to add here; the test of this migration checks it on a deal opened by
--      « Caler le call ».

-- 1 ------------------------------------------------------------------------------------------
select public.add_notification_kinds(array['deal_call_planned']);

create or replace function public.calls_notify_deal_negotiator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  select * into v from public.deals where id = new.deal_id;
  if not found or v.assignee_person_id is null
     or v.assignee_person_id is not distinct from new.created_by then
    return null;
  end if;
  perform public.notify(v.organization_id, v.assignee_person_id, 'deal_call_planned',
                        v.project_id, new.id);
  return null;
end;
$$;
revoke execute on function public.calls_notify_deal_negotiator() from public, anon, authenticated;

create trigger z_notify_deal_negotiator after insert on public.calls
  for each row when (new.deal_id is not null)
  execute function public.calls_notify_deal_negotiator();
