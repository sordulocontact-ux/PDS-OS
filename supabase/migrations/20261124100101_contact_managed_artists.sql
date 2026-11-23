-- The artists a Réseau contact manages, chosen on the contact (Sacha
-- 23/11/2026: « je veux pouvoir rattacher un artiste à un manager, à la
-- création / modification »). The link already exists on the artist's side:
-- Catalogue › Contacts, a contact of role « manager » linked to the Réseau
-- (artist_contacts.contact_id, 20261010002101). This function writes the same
-- rows from the contact's form, so both sides say the same thing:
--   - an artist chosen gets a « manager » row for the contact (its primary
--     contact only when it had none);
--   - an artist no longer chosen loses the contact's « manager » row.
-- Who may: whoever writes the artists' contacts (manage_catalog), as on the
-- artist's page; the contact and the artists of the same organization.

create or replace function public.set_contact_managed_artists(
  p_contact_id uuid,
  p_artist_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.network_contacts%rowtype;
  v_ids uuid[] := coalesce(p_artist_ids, '{}');
begin
  select * into v from public.network_contacts where id = p_contact_id for update;
  if not found then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v.organization_id, 'manage_catalog')
     or not public.has_permission(v.organization_id, 'manage_network') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if cardinality(v_ids) > 50 then
    raise exception 'too_many_artists' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_ids) a(id)
              where not exists (select 1 from public.artists r
                                 where r.id = a.id and r.organization_id = v.organization_id
                                   and r.archived_at is null)) then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;

  delete from public.artist_contacts c
   where c.contact_id = v.id and c.role = 'manager'
     and c.organization_id = v.organization_id
     and not (c.artist_id = any (v_ids));

  insert into public.artist_contacts
    (organization_id, artist_id, role, name, email, phone, is_primary, contact_id)
  select v.organization_id, a.id, 'manager', left(v.name, 200),
         -- A private contact's coordinates stay on its card (BIZ 8).
         case when v.private_owner_person_id is null
                   and v.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then left(v.email, 320) end,
         case when v.private_owner_person_id is null
                   and v.phone ~ '^[0-9+(). -]{3,40}$' then v.phone end,
         -- The artist's primary contact stays (artist_contacts_keep_primary
         -- makes this one primary when the artist had none).
         false,
         v.id
    from (select distinct id from unnest(v_ids) u(id)) a
   where not exists (select 1 from public.artist_contacts c
                      where c.artist_id = a.id and c.contact_id = v.id and c.role = 'manager');
end;
$$;
revoke execute on function public.set_contact_managed_artists(uuid, uuid[]) from public, anon;
grant execute on function public.set_contact_managed_artists(uuid, uuid[]) to authenticated;
