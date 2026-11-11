-- Business module, lot BIZ 8: private contacts.
--
-- The IDENTITY of a contact (name, kind, roles, organization, artist,
-- picture, public accounts, website) stays shared in the Réseau: every
-- member still reads it, PersonPickerField keeps working for all. Its
-- COORDINATES — e-mail, phone, city (the address), notes — can be made
-- private by its owner (whoever marks it private: its creator, or the
-- direction), who shares them deal by deal (a contact linked to a deal is
-- read by the deal's readers). The direction reads everything.
--
-- The model, the safest one: a private contact's coordinates LEAVE
-- network_contacts for network_contact_private_details, a table of its own
-- under RLS (can_read_contact_details). Row-level security cannot hide some
-- columns of a row from some readers, and some forty SECURITY DEFINER
-- functions (legal forms, contracts, link pages, clearances…) read
-- network_contacts' coordinates: once moved, they find nothing to leak, by
-- construction, whoever calls them. Only the functions of this file touch
-- the private table (a test checks it). A path of the app that needs an
-- address reads it with the user's session (lib/network/private-details.ts):
-- it works for whoever has the right, and fails cleanly (« coordonnées
-- privées ») for the others.
--
-- Every coordinate written later on a private contact (the Réseau's form, a
-- legal form filled from its public page, a clearance) is moved by a trigger
-- into the private table: it overwrites only for whoever reads the details,
-- otherwise it only fills what is empty.
--
-- Sharing, taking back and refusals are written to
-- network_contact_privacy_events (read by the owner and the direction).

-- 1. Who owns a private contact ----------------------------------------------------------

alter table public.network_contacts
  add column private_owner_person_id uuid references public.people (id),
  add column private_since timestamptz;
alter table public.network_contacts
  add constraint network_contacts_private_check
    check ((private_owner_person_id is null) = (private_since is null));
grant select (private_owner_person_id, private_since) on public.network_contacts to authenticated;

comment on column public.network_contacts.private_owner_person_id is
  'Business module (BIZ 8): the owner of a private contact; its coordinates are in network_contact_private_details. Set by make_contact_private / make_contact_shared only.';

-- 2. The private coordinates ----------------------------------------------------------------

create table public.network_contact_private_details (
  contact_id uuid primary key,
  organization_id uuid not null,
  email text,
  phone text,
  city text,
  notes text,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint network_contact_private_details_email_check
    check (email is null or (char_length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint network_contact_private_details_phone_check
    check (phone is null or (btrim(phone) <> '' and char_length(phone) <= 40)),
  constraint network_contact_private_details_city_check
    check (city is null or (btrim(city) <> '' and char_length(city) <= 120)),
  constraint network_contact_private_details_notes_check
    check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 2000)),
  constraint network_contact_private_details_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
    on delete cascade
);

comment on table public.network_contact_private_details is
  'Business module (BIZ 8): the coordinates of a private contact, read by its owner, the direction and the readers of a deal it is linked to (can_read_contact_details). Written by the functions of 20261112030101 only.';

-- 3. A contact linked to a deal (and so shared with its readers) -----------------------

create table public.deal_contacts (
  deal_id uuid not null,
  contact_id uuid not null,
  organization_id uuid not null,
  linked_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  primary key (deal_id, contact_id),
  constraint deal_contacts_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade,
  constraint deal_contacts_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
    on delete cascade
);
create index deal_contacts_contact_idx on public.deal_contacts (contact_id);

comment on table public.deal_contacts is
  'Business module (BIZ 8): the people of a deal (an artist''s manager, a lawyer…). A private contact linked to a deal shares its coordinates with the deal''s readers. Written by link_deal_contact / unlink_deal_contact only.';

-- 4. The journal of privacy --------------------------------------------------------------

create table public.network_contact_privacy_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contact_id uuid not null,
  kind text not null,
  deal_id uuid,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint network_contact_privacy_events_kind_check
    check (kind in ('made_private', 'made_shared', 'deal_shared', 'deal_unshared',
                    'share_refused', 'details_changed')),
  constraint network_contact_privacy_events_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
    on delete cascade
);
create index network_contact_privacy_events_contact_idx
  on public.network_contact_privacy_events (contact_id, created_at desc);

-- 5. Who reads the coordinates ----------------------------------------------------------

-- A shared contact: every active member. A private one: its owner, the
-- direction, the readers of a deal it is linked to.
create or replace function public.can_read_contact_details(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id
       and public.is_active_member(c.organization_id)
       and (c.private_owner_person_id is null
            or c.private_owner_person_id = public.auth_person_id()
            or public.has_permission(c.organization_id, 'validate')
            or exists (select 1 from public.deal_contacts dc
                         join public.deals d on d.id = dc.deal_id
                        where dc.contact_id = c.id
                          and public.can_read_deal(d.organization_id, d.assignee_person_id,
                                                   d.project_id))));
$$;
revoke execute on function public.can_read_contact_details(uuid) from public, anon;
grant execute on function public.can_read_contact_details(uuid) to authenticated;

alter table public.network_contact_private_details enable row level security;
alter table public.network_contact_private_details force row level security;
revoke all on table public.network_contact_private_details from anon, authenticated;
grant select on table public.network_contact_private_details to authenticated;
create policy network_contact_private_details_select on public.network_contact_private_details
  for select to authenticated
  using (public.can_read_contact_details(contact_id));

alter table public.deal_contacts enable row level security;
alter table public.deal_contacts force row level security;
revoke all on table public.deal_contacts from anon, authenticated;
grant select on table public.deal_contacts to authenticated;
-- Whoever reads the deal reads who is in it (identity only: the
-- coordinates follow can_read_contact_details).
create policy deal_contacts_select on public.deal_contacts
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

alter table public.network_contact_privacy_events enable row level security;
alter table public.network_contact_privacy_events force row level security;
revoke all on table public.network_contact_privacy_events from anon, authenticated;
grant select on table public.network_contact_privacy_events to authenticated;
create policy network_contact_privacy_events_select on public.network_contact_privacy_events
  for select to authenticated
  using (public.has_permission(organization_id, 'validate')
         or exists (select 1 from public.network_contacts c
                     where c.id = contact_id
                       and c.private_owner_person_id = public.auth_person_id()));

create or replace function public.log_contact_privacy(
  p_org uuid, p_contact_id uuid, p_kind text, p_deal_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.network_contact_privacy_events
    (organization_id, contact_id, kind, deal_id, actor_person_id)
  values (p_org, p_contact_id, p_kind, p_deal_id, public.auth_person_id());
$$;
revoke execute on function public.log_contact_privacy(uuid, uuid, text, uuid)
  from public, anon, authenticated;

-- 6. Coordinates written on a private contact go to the private table ---------------------

create or replace function public.network_contacts_keep_private()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reader boolean;
begin
  if new.private_owner_person_id is null then
    return new;
  end if;
  if new.email is null and new.phone is null and new.city is null and new.notes is null then
    return new;
  end if;
  -- Whoever reads the details sets them; anyone else (a public form, a
  -- member without the right) only fills what is empty, never overwrites
  -- what he cannot read.
  v_reader := public.can_read_contact_details(new.id);
  insert into public.network_contact_private_details as d
    (contact_id, organization_id, email, phone, city, notes, updated_by, updated_at)
  values (new.id, new.organization_id, new.email, new.phone, new.city, new.notes,
          public.auth_person_id(), now())
  on conflict (contact_id) do update
    set email = case when v_reader then coalesce(excluded.email, d.email)
                     else coalesce(d.email, excluded.email) end,
        phone = case when v_reader then coalesce(excluded.phone, d.phone)
                     else coalesce(d.phone, excluded.phone) end,
        city = case when v_reader then coalesce(excluded.city, d.city)
                    else coalesce(d.city, excluded.city) end,
        notes = case when v_reader then coalesce(excluded.notes, d.notes)
                     else coalesce(d.notes, excluded.notes) end,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
  new.email := null;
  new.phone := null;
  new.city := null;
  new.notes := null;
  return new;
end;
$$;
revoke execute on function public.network_contacts_keep_private() from public, anon, authenticated;

create trigger c_keep_private before insert or update on public.network_contacts
  for each row execute function public.network_contacts_keep_private();

-- 7. Gestures --------------------------------------------------------------------------------

-- « Rendre privé »: the contact's creator (who manages the Réseau) or the
-- direction becomes its owner; its coordinates move to the private table.
create or replace function public.make_contact_private(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.network_contacts%rowtype;
begin
  select * into c from public.network_contacts where id = p_contact_id for update;
  if not found or not public.is_active_member(c.organization_id) then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if not (public.has_permission(c.organization_id, 'validate')
          or (c.created_by = public.auth_person_id()
              and public.has_permission(c.organization_id, 'manage_network'))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if c.private_owner_person_id is not null then
    raise exception 'contact_already_private' using errcode = 'P0001';
  end if;
  insert into public.network_contact_private_details
    (contact_id, organization_id, email, phone, city, notes, updated_by)
  values (c.id, c.organization_id, c.email, c.phone, c.city, c.notes, public.auth_person_id())
  on conflict (contact_id) do update
    set email = excluded.email, phone = excluded.phone, city = excluded.city,
        notes = excluded.notes, updated_by = excluded.updated_by, updated_at = now();
  update public.network_contacts
     set email = null, phone = null, city = null, notes = null,
         private_owner_person_id = public.auth_person_id(), private_since = now()
   where id = c.id;
  perform public.log_contact_privacy(c.organization_id, c.id, 'made_private');
end;
$$;
revoke execute on function public.make_contact_private(uuid) from public, anon;
grant execute on function public.make_contact_private(uuid) to authenticated;

-- « Rendre partagé »: its owner or the direction; the coordinates come back
-- to the Réseau, for every member.
create or replace function public.make_contact_shared(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.network_contacts%rowtype;
  d public.network_contact_private_details%rowtype;
begin
  select * into c from public.network_contacts where id = p_contact_id for update;
  if not found or not public.is_active_member(c.organization_id) then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if c.private_owner_person_id is null then
    raise exception 'contact_not_private' using errcode = 'P0001';
  end if;
  if not (public.has_permission(c.organization_id, 'validate')
          or c.private_owner_person_id = public.auth_person_id()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into d from public.network_contact_private_details where contact_id = c.id;
  -- Owner cleared first: the trigger then leaves the coordinates in place.
  update public.network_contacts
     set private_owner_person_id = null, private_since = null,
         email = d.email, phone = d.phone, city = d.city, notes = d.notes
   where id = c.id;
  delete from public.network_contact_private_details where contact_id = c.id;
  perform public.log_contact_privacy(c.organization_id, c.id, 'made_shared');
end;
$$;
revoke execute on function public.make_contact_shared(uuid) from public, anon;
grant execute on function public.make_contact_shared(uuid) to authenticated;

-- The coordinates of a private contact, changed (or cleared) by whoever
-- reads them and manages the Réseau.
create or replace function public.set_private_contact_details(
  p_contact_id uuid,
  p_email text,
  p_phone text,
  p_city text,
  p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.network_contacts%rowtype;
begin
  select * into c from public.network_contacts where id = p_contact_id for update;
  if not found or not public.is_active_member(c.organization_id) then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if c.private_owner_person_id is null then
    raise exception 'contact_not_private' using errcode = 'P0001';
  end if;
  if not (public.can_read_contact_details(c.id)
          and public.has_permission(c.organization_id, 'manage_network')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.network_contact_private_details
     set email = nullif(btrim(p_email), ''), phone = nullif(btrim(p_phone), ''),
         city = nullif(btrim(p_city), ''), notes = nullif(btrim(p_notes), ''),
         updated_by = public.auth_person_id(), updated_at = now()
   where contact_id = c.id;
  perform public.log_contact_privacy(c.organization_id, c.id, 'details_changed');
end;
$$;
revoke execute on function public.set_private_contact_details(uuid, text, text, text, text) from public, anon;
grant execute on function public.set_private_contact_details(uuid, text, text, text, text) to authenticated;

-- « Ajouter au deal »: whoever writes an open deal links a contact. A
-- private one is shared with the deal's readers, by its owner or the
-- direction only: anyone else is refused, and the refusal is written
-- (hence a result, not an exception that would undo the journal).
-- Returns 'linked', 'refused' or 'unchanged'.
create or replace function public.link_deal_contact(p_deal_id uuid, p_contact_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  c public.network_contacts%rowtype;
begin
  v := public.lock_deal_for_write(p_deal_id);
  select * into c from public.network_contacts
   where id = p_contact_id and organization_id = v.organization_id and archived_at is null;
  if not found then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.deal_contacts
              where deal_id = v.id and contact_id = c.id) then
    return 'unchanged';
  end if;
  if c.private_owner_person_id is not null
     and c.private_owner_person_id is distinct from public.auth_person_id()
     and not public.has_permission(v.organization_id, 'validate') then
    perform public.log_contact_privacy(v.organization_id, c.id, 'share_refused', v.id);
    return 'refused';
  end if;
  insert into public.deal_contacts (deal_id, contact_id, organization_id, linked_by)
  values (v.id, c.id, v.organization_id, public.auth_person_id());
  if c.private_owner_person_id is not null then
    perform public.log_contact_privacy(v.organization_id, c.id, 'deal_shared', v.id);
  end if;
  return 'linked';
end;
$$;
revoke execute on function public.link_deal_contact(uuid, uuid) from public, anon;
grant execute on function public.link_deal_contact(uuid, uuid) to authenticated;

-- « Retirer du deal »: whoever writes the deal, or the contact's owner
-- (who takes back his share even on a deal he does not write), or the
-- direction.
create or replace function public.unlink_deal_contact(p_deal_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  c public.network_contacts%rowtype;
begin
  select * into v from public.deals where id = p_deal_id for update;
  select * into c from public.network_contacts where id = p_contact_id;
  if v.id is null or c.id is null
     or not exists (select 1 from public.deal_contacts
                     where deal_id = p_deal_id and contact_id = p_contact_id) then
    raise exception 'deal_contact_not_found' using errcode = 'P0002';
  end if;
  if not (public.can_write_deal(v.organization_id, v.assignee_person_id)
          or (c.private_owner_person_id is not null
              and c.private_owner_person_id = public.auth_person_id())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.deal_contacts where deal_id = p_deal_id and contact_id = p_contact_id;
  if c.private_owner_person_id is not null then
    perform public.log_contact_privacy(v.organization_id, c.id, 'deal_unshared', v.id);
  end if;
end;
$$;
revoke execute on function public.unlink_deal_contact(uuid, uuid) from public, anon;
grant execute on function public.unlink_deal_contact(uuid, uuid) to authenticated;
