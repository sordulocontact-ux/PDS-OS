-- A rights holder kept by name only (« Garder seulement le nom ») lost the address the
-- request was e-mailed to: nothing kept it (Sacha, 09/11/2026: « pourquoi y'a pas
-- d'email ? »). Now:
-- 1. the holder keeps the address PDS OS sent to (keep_clearance_holder_email), shown on
--    the borrowing, put back in the contract's e-mail and known to the cron that files the
--    replies;
-- 2. « Ajouter au Réseau » on that holder creates the fiche (the usual contact form, the
--    name and address filled in) and links it (link_clearance_holder_contact); a fiche
--    without an address takes the holder's.

alter table public.legal_clearance_rightsholders
  add column email text,
  add constraint legal_clearance_rightsholders_email_check
    check (email is null or (char_length(email) <= 320 and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'));

-- The address a name-only holder was e-mailed to, by whoever may write the borrowing.
create or replace function public.keep_clearance_holder_email(
  p_holder_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holder public.legal_clearance_rightsholders%rowtype;
  v public.legal_clearances%rowtype;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into v_holder from public.legal_clearance_rightsholders where id = p_holder_id;
  if not found then
    raise exception 'clearance_holder_missing' using errcode = 'P0001';
  end if;
  v := public.clearance_for_write(v_holder.clearance_id);
  if v_email = '' then
    return;
  end if;
  update public.legal_clearance_rightsholders
     set email = v_email
   where id = p_holder_id and contact_id is null;
end;
$$;

-- The holder linked to its new fiche of the Réseau; its address goes to the fiche when the
-- fiche has none (never overwritten).
create or replace function public.link_clearance_holder_contact(
  p_holder_id uuid,
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holder public.legal_clearance_rightsholders%rowtype;
  v public.legal_clearances%rowtype;
  v_name text;
begin
  select * into v_holder from public.legal_clearance_rightsholders where id = p_holder_id;
  if not found then
    raise exception 'clearance_holder_missing' using errcode = 'P0001';
  end if;
  v := public.clearance_for_write(v_holder.clearance_id);
  if v_holder.contact_id is not null then
    raise exception 'clearance_holder_linked' using errcode = 'P0001';
  end if;
  select name into v_name from public.network_contacts
   where id = p_contact_id and organization_id = v.organization_id;
  if not found then
    raise exception 'clearance_contact_invalid' using errcode = 'P0001';
  end if;
  update public.legal_clearance_rightsholders
     set contact_id = p_contact_id
   where id = p_holder_id;
  if v_holder.email is not null then
    update public.network_contacts
       set email = v_holder.email
     where id = p_contact_id and email is null;
  end if;
  perform public.log_clearance_event(v, 'clearance.updated', null, null,
                                     v_holder.name || ' · ajouté au Réseau (' || v_name || ')');
end;
$$;

revoke execute on function public.keep_clearance_holder_email(uuid, text) from public, anon;
revoke execute on function public.link_clearance_holder_contact(uuid, uuid) from public, anon;
grant execute on function public.keep_clearance_holder_email(uuid, text) to authenticated;
grant execute on function public.link_clearance_holder_contact(uuid, uuid) to authenticated;
