-- A deal's contract names who signs it (Sacha 23/11/2026: « pourquoi le mail
-- n'est pas pré-rempli » — « Envoyer pour signature » found nobody to write to).
-- A contract made from a deal (imported, generated, or linked) had no party:
-- the e-mail's « À » and the signer read the contract's parties. Once a
-- contract becomes a deal's (deals.contract_id) and still has no party, the
-- deal's counterpart is put in — the label or the brand —, else the artist's
-- person of the Réseau (network_contacts.artist_id). Its role says which.
-- The contracts already linked without a party are completed once.

create or replace function public.deal_contract_party(p_deal public.deals)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact uuid;
begin
  if p_deal.contract_id is null
     or exists (select 1 from public.contract_parties where contract_id = p_deal.contract_id) then
    return;
  end if;
  v_contact := coalesce(
    p_deal.counterpart_contact_id,
    (select n.id from public.network_contacts n
      where n.artist_id = p_deal.artist_id and n.organization_id = p_deal.organization_id
        and n.archived_at is null
      order by n.created_at limit 1));
  if v_contact is null then
    return;
  end if;
  insert into public.contract_parties (contract_id, organization_id, contact_id, role)
  values (p_deal.contract_id, p_deal.organization_id, v_contact,
          case when p_deal.counterpart_contact_id is null then 'Artiste'
               when p_deal.kind = 'brand_partnership' then 'Marque'
               else 'Label' end)
  on conflict do nothing;
end;
$$;
revoke execute on function public.deal_contract_party(public.deals) from public, anon, authenticated;

create or replace function public.deals_contract_party()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.contract_id is not null
     and (tg_op = 'INSERT' or new.contract_id is distinct from old.contract_id) then
    perform public.deal_contract_party(new);
  end if;
  return new;
end;
$$;
revoke execute on function public.deals_contract_party() from public, anon, authenticated;

create trigger z_contract_party after insert or update of contract_id on public.deals
  for each row execute function public.deals_contract_party();

do $$
declare
  v public.deals%rowtype;
begin
  for v in select * from public.deals where contract_id is not null loop
    perform public.deal_contract_party(v);
  end loop;
end;
$$;
