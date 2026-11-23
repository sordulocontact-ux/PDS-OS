-- A contract signed and sent back by e-mail, for every contract (Sacha 23/11/2026: « PDS OS
-- peut récupérer le contrat signé en réponse du mail ? »). The authorisation contracts already
-- did it (20261109160101): their reply-to is PO's address of the borrowing. Every contract now
-- leaves « Envoyer » (emailContractForSignature) with PO's address of the contract as its
-- reply-to, po+ctr-<contract id>@ (lib/email/contract-address.ts). The cron that reads po@
-- (/api/cron/inbox, lib/contracts/signed-by-email.ts) uploads what such a reply carries:
--   - its PDFs → the contract's « Signé »;
--   - the e-mail itself (.eml) → its « Preuve de signature ».
-- Then it calls this function. Nothing more is decided: the contract shows « Revenu signé »,
-- PDS signs it in turn, and a person checks the signature before « Signé », as for a copy
-- deposited by a private link.
--
-- Only for a contract sent for signature, without a signed copy yet. The signed file names the
-- party whose Réseau address sent it (via_contact_id, as a copy deposited by their link). Its
-- owner is told (contract_signed_emailed, which opens the contract). Service role only.

select public.add_notification_kinds(array['contract_signed_emailed']);

create or replace function public.receive_contract_signed_copy(
  p_contract_id uuid,
  p_from text,
  -- [{ "path", "file_name", "mime", "category": "signed" | "evidence" }], already uploaded.
  p_files jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts%rowtype;
  v_contact uuid;
  v_name text;
  v_from text := lower(btrim(coalesce(p_from, '')));
  v_file jsonb;
  v_bytes bigint;
  v_signed int := 0;
begin
  select * into v from public.contracts where id = p_contract_id for update;
  if not found or v.status <> 'sent'
     or exists (select 1 from public.contract_files
                 where contract_id = v.id and category = 'signed') then
    return false;
  end if;
  if jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) = 0 then
    return false;
  end if;

  -- The party whose address in the Réseau sent it.
  select n.id, n.name into v_contact, v_name
    from public.contract_parties p
    join public.network_contacts n on n.id = p.contact_id
   where p.contract_id = v.id and v_from <> '' and lower(btrim(n.email)) = v_from
   limit 1;

  for v_file in select * from jsonb_array_elements(p_files) loop
    if v_file->>'category' not in ('signed', 'evidence') then
      raise exception 'file_category_invalid';
    end if;
    select (o.metadata->>'size')::bigint into v_bytes
      from storage.objects o
     where o.bucket_id = 'contract-files' and o.name = v_file->>'path';
    if v_bytes is null or v_bytes <= 0 then
      raise exception 'file_missing';
    end if;
    insert into public.contract_files
      (organization_id, contract_id, category, description, path, file_name, mime, bytes,
       via_contact_id)
    values (v.organization_id, v.id, v_file->>'category',
            'Reçu par e-mail', v_file->>'path',
            left(btrim(coalesce(nullif(v_file->>'file_name', ''), 'Contrat signé.pdf')), 255),
            left(coalesce(nullif(v_file->>'mime', ''), 'application/octet-stream'), 255),
            least(v_bytes, 52428800),
            case when v_file->>'category' = 'signed' then v_contact end);
    if v_file->>'category' = 'signed' then
      v_signed := v_signed + 1;
    end if;
  end loop;
  if v_signed = 0 then
    raise exception 'signed_copy_missing';
  end if;

  perform public.log_contract_event(v.organization_id, v.id, v.project_id, 'signature.emailed',
                                    coalesce(v_name, nullif(v_from, '')));
  perform public.notify(v.organization_id, v.owner_person_id, 'contract_signed_emailed',
                        v.project_id, v.id);
  return true;
end;
$$;

revoke execute on function public.receive_contract_signed_copy(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.receive_contract_signed_copy(uuid, text, jsonb) to service_role;
