-- JUR-27 (retours Juridique du 11/10/2026, docs/ARCHITECTURE.md § 8 sexies,
-- « Répartitions »): when a split changes, a person already sent a link
-- keeps the same link, which opens the new version (their answers stay
-- tied to each version and its fingerprint). Only newcomers get a link.

create or replace function public.propose_split_version(p_version_id uuid)
returns table (entry_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.legal_split_versions%rowtype;
  v_total numeric;
  v_entry uuid;
  v_prev public.legal_split_confirmations%rowtype;
  v_hash text;
begin
  select * into v_version from public.legal_split_versions where id = p_version_id for update;
  if not found or public.auth_person_id() is null
     or not public.can_manage_split_sheet(v_version.sheet_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_version.status <> 'draft' then
    raise exception 'split_version_not_draft' using errcode = 'P0001';
  end if;
  select coalesce(sum(share), 0) into v_total
    from public.legal_split_entries where version_id = p_version_id;
  if v_total <> 100 then
    raise exception 'split_total_not_100' using errcode = 'P0001', detail = v_total::text;
  end if;

  -- The versions before it no longer count, nor do their links.
  update public.legal_split_confirmations c
     set status = 'revoked', revoked_at = now()
    from public.legal_split_versions v
   where c.version_id = v.id and v.sheet_id = v_version.sheet_id
     and v.id <> p_version_id and c.status = 'pending';
  update public.legal_split_versions
     set status = 'superseded', superseded_at = now()
   where sheet_id = v_version.sheet_id and id <> p_version_id and status <> 'superseded';

  update public.legal_split_versions
     set status = 'proposed', proposed_by = public.auth_person_id(), proposed_at = now()
   where id = p_version_id;
  perform public.log_split_event(v_version.organization_id, p_version_id, 'split.proposed');

  -- JUR-27: a person already sent a link keeps it. Their previous link
  -- (same contact, else same name, still valid) now opens this version;
  -- only a newcomer gets a new link, returned once. A carried link returns
  -- a null token: nothing to send again.
  for v_entry in
    select e.id from public.legal_split_entries e
     where e.version_id = p_version_id order by e.position
  loop
    entry_id := v_entry;
    select c.* into v_prev
      from public.legal_split_confirmations c
      join public.legal_split_entries pe on pe.id = c.entry_id
      join public.legal_split_entries ne on ne.id = v_entry
      join public.legal_split_versions pv on pv.id = c.version_id
     where pv.sheet_id = v_version.sheet_id and pv.id <> p_version_id
       and c.expires_at > now()
       and (c.status <> 'revoked' or c.revoked_at >= now() - interval '1 minute')
       and ((ne.contact_id is not null and pe.contact_id = ne.contact_id)
            or (ne.contact_id is null and lower(btrim(pe.name)) = lower(btrim(ne.name))))
     order by c.created_at desc
     limit 1;
    if found then
      v_hash := v_prev.token_hash;
      -- The old row keeps its evidence; its key moves to the new version.
      update public.legal_split_confirmations
         set token_hash = encode(sha256(convert_to(v_prev.token_hash || v_prev.id::text, 'UTF8')), 'hex')
       where id = v_prev.id;
      insert into public.legal_split_confirmations
        (organization_id, version_id, entry_id, token_hash, expires_at, created_by)
      values (v_version.organization_id, p_version_id, v_entry, v_hash,
              greatest(v_prev.expires_at, now() + interval '30 days'), public.auth_person_id());
      perform public.consolidate_split_version(p_version_id);
      token := null;
    else
      token := public.new_split_confirmation(v_entry);
    end if;
    return next;
  end loop;
end;
$$;
