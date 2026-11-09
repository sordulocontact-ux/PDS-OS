-- The authorisation contract signed and sent back by e-mail (Sacha, 09/11/2026: « quand la
-- réponse porte un PDF, PDS OS le range dans le contrat comme Signé »). The contract left
-- from « Signer » with PO's address of the borrowing as reply-to; the cron that files the
-- replies (/api/cron/inbox, lib/legal/clearance/inbox-replies.ts) uploads the PDFs joined
-- and the e-mail itself (.eml) to the contract's files, then calls this function: the PDFs
-- become the contract's « Signé », the e-mail its « Preuve de signature ». Nothing more is
-- decided: a person opens the signed copy, then « Marquer comme sécurisé » as before.
--
-- Only when the borrowing is open, the contract is one of its contracts, sent and without
-- a signed copy yet. The signed file names the holder whose Réseau address sent it
-- (via_contact_id, as a copy deposited by their private link). Service role only.

do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'contract_events_kind_check' and conrelid = 'public.contract_events'::regclass;
  select array_agg(distinct replace(k, '"', '')) into v_kinds
    from regexp_matches(v_def, '''([^'']+)''', 'g') m,
         unnest(case when m[1] like '{%' then string_to_array(btrim(m[1], '{}'), ',')
                     else array[m[1]] end) k;
  v_kinds := array(select distinct k from unnest(v_kinds || array['signature.emailed']) k);
  alter table public.contract_events drop constraint contract_events_kind_check;
  execute format('alter table public.contract_events add constraint contract_events_kind_check '
                 'check (kind = any (%L::text[]))', v_kinds);
end $$;

create or replace function public.receive_clearance_signed_copy(
  p_clearance_id uuid,
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
  v public.legal_clearances%rowtype;
  v_contract public.contracts%rowtype;
  v_contact uuid;
  v_name text;
  v_from text := lower(btrim(coalesce(p_from, '')));
  v_file jsonb;
  v_bytes bigint;
  v_signed int := 0;
begin
  select * into v from public.legal_clearances where id = p_clearance_id;
  if not found or v.status in ('cleared', 'abandoned') then
    return false;
  end if;
  select c.* into v_contract
    from public.contracts c
   where c.id = p_contract_id
     and exists (select 1 from public.legal_clearance_contracts l
                  where l.clearance_id = v.id and l.contract_id = c.id);
  if not found or v_contract.status <> 'sent'
     or exists (select 1 from public.contract_files
                 where contract_id = v_contract.id and category = 'signed') then
    return false;
  end if;
  if jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) = 0 then
    return false;
  end if;

  -- The holder whose address in the Réseau sent it.
  select n.id, n.name into v_contact, v_name
    from public.legal_clearance_rightsholders h
    join public.network_contacts n on n.id = h.contact_id
   where h.clearance_id = v.id and v_from <> '' and lower(btrim(n.email)) = v_from
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
    values (v_contract.organization_id, v_contract.id, v_file->>'category',
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

  perform public.log_contract_event(v_contract.organization_id, v_contract.id,
                                    v_contract.project_id, 'signature.emailed',
                                    coalesce(v_name, nullif(v_from, '')));
  return true;
end;
$$;

revoke execute on function public.receive_clearance_signed_copy(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.receive_clearance_signed_copy(uuid, uuid, text, jsonb)
  to service_role;
