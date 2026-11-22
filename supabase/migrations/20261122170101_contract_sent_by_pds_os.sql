-- « Pourquoi on ne peut pas envoyer depuis PDS OS ? » (Sacha 22/11/2026): a contract without a private
-- link (a deal's) is now e-mailed by PDS OS itself, its PDF joined (lib/contracts/send-actions.ts,
-- emailContractForSignature); its sending is kept as « Envoyé par PDS OS », the day it left.
-- send_contract unchanged otherwise.

create or replace function public.send_contract(p_contract_id uuid, p_via text, p_how text, p_on date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.contracts%rowtype;
  v_contact uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_how text := nullif(btrim(coalesce(p_how, '')), '');
begin
  select * into v from public.contracts where id = p_contract_id;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;
  if p_via = 'link' then
    v_contact := public.contract_contact(p_contract_id);
    if v_contact is null or not exists (
         select 1 from public.project_contact_links l
          where l.project_id = v.project_id and l.contact_id = v_contact
            and l.revoked_at is null and l.expires_at > now()) then
      raise exception 'contact_link_missing' using errcode = 'P0001';
    end if;
    -- advance_contract checks the status and who may send.
    perform public.advance_contract(p_contract_id, 'send', 'Sur son lien privé');
    update public.contracts set sent_via = 'link', sent_how = null, sent_on = v_today
     where id = p_contract_id;
  elsif p_via = 'other' then
    if v_how not in ('Remis en main propre', 'Envoyé par un outil de signature',
                     'Envoyé depuis ma messagerie', 'Envoyé par PDS OS')
       or p_on is null or p_on > v_today or p_on < v_today - 365 then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    perform public.advance_contract(p_contract_id, 'send',
                                    v_how || ' · le ' || to_char(p_on, 'DD/MM/YYYY'));
    update public.contracts set sent_via = 'other', sent_how = v_how, sent_on = p_on
     where id = p_contract_id;
  else
    raise exception 'invalid_input' using errcode = '23514';
  end if;
end;
$function$;
