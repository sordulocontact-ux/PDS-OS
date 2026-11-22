-- « Je voudrais pouvoir modifier l'adresse dans les paramètres » (Sacha 22/11/2026): the structure's
-- coordinates, set by the administration in Réglages (organization_billing, already its legal name and
-- address for the providers' invoices), gain a phone, an e-mail and a website; together they head the
-- first page of every contract printed by PDS OS, as in Ibé's model contract (the sender's address in
-- small, at the top).

alter table public.organization_billing
  add column phone text,
  add column email text,
  add column website text,
  add constraint organization_billing_phone_check
    check (phone is null or (btrim(phone) <> '' and char_length(phone) <= 40)),
  add constraint organization_billing_email_check
    check (email is null or (btrim(email) <> '' and char_length(email) <= 200)),
  add constraint organization_billing_website_check
    check (website is null or (btrim(website) <> '' and char_length(website) <= 200));
grant insert (phone, email, website) on public.organization_billing to authenticated;
grant update (phone, email, website) on public.organization_billing to authenticated;

-- The letterhead of a contract: its structure's legal name, address and coordinates, for whoever may
-- read the contract — a member who sees it, or the person who signs it by their private link (the same
-- check as their document). Null when unknown or not readable.
create or replace function public.contract_letterhead(p_contract_id uuid, p_contact_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_contact_token is not null then
    if public.get_contact_contract_document(p_contact_token, p_contract_id) is null then
      return null;
    end if;
  elsif not public.can_see_contract(p_contract_id) then
    return null;
  end if;
  select organization_id into v_org from public.contracts where id = p_contract_id;
  return (select jsonb_build_object('name', b.legal_name, 'address', b.address, 'phone', b.phone,
                                    'email', b.email, 'website', b.website)
            from public.organization_billing b where b.organization_id = v_org);
end;
$$;
revoke execute on function public.contract_letterhead(uuid, text) from public;
grant execute on function public.contract_letterhead(uuid, text) to anon, authenticated;
