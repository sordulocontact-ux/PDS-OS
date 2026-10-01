-- Network: the people and organizations PDS works with (MVP "Réseau
-- simple"): artists, beatmakers, musicians, engineers, providers,
-- partners… One row per person or organization, with the roles it plays;
-- a person may belong to an organization of the network. They have no
-- account: members of PDS live in `people`/`memberships`.
--
-- Reading: every active member (it is the team's shared directory).
-- Writing: holders of `manage_network` (every poste today, revocable in
-- role_permissions). Archiving: `archive_records` (the director), never a
-- delete, refused while a live contract names the contact as a party
-- (contracts, next migration) — like artists, masters and projects.
--
-- Also introduces `manage_contracts` (used by the contracts migration):
-- the director and project managers create and follow contracts.

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts']
    when 'creative_director' then array['creative_work', 'manage_network']
    else array[]::text[]
  end;
$$;

create table public.network_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  kind text not null,
  name text not null,
  -- What this contact does for PDS; at least one.
  roles text[] not null,
  -- A person's company, label, studio… (an organization of the network).
  parent_id uuid,
  -- The catalog artist this contact stands for, when there is one.
  artist_id uuid,
  email text,
  phone text,
  website text,
  city text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_contacts_kind_check check (kind in ('person', 'organization')),
  constraint network_contacts_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint network_contacts_roles_check
    check (cardinality(roles) between 1 and 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'videographer', 'photographer', 'designer',
                              'provider', 'partner', 'label', 'distributor', 'media',
                              'manager', 'other']::text[]),
  constraint network_contacts_email_check
    check (email is null or (char_length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint network_contacts_phone_check
    check (phone is null or (btrim(phone) <> '' and char_length(phone) <= 40)),
  constraint network_contacts_website_check
    check (website is null or (char_length(website) <= 500 and website ~ '^https?://')),
  constraint network_contacts_city_check
    check (city is null or (btrim(city) <> '' and char_length(city) <= 120)),
  constraint network_contacts_notes_check
    check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 2000)),
  -- Only a person belongs to an organization, never to itself.
  constraint network_contacts_parent_check
    check (parent_id is null or (kind = 'person' and parent_id <> id)),
  constraint network_contacts_id_org_key unique (id, organization_id),
  constraint network_contacts_parent_same_org
    foreign key (parent_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint network_contacts_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index network_contacts_org_name_idx
  on public.network_contacts (organization_id, lower(name));
create index network_contacts_parent_idx on public.network_contacts (parent_id)
  where parent_id is not null;
create index network_contacts_artist_idx on public.network_contacts (artist_id)
  where artist_id is not null;

create trigger a_set_created_by before insert on public.network_contacts
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.network_contacts
  for each row execute function public.set_updated_at();

-- A person's organization must be an organization of the network.
create or replace function public.network_contacts_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = new.parent_id and c.kind = 'organization'
  ) then
    raise exception 'network_parent_not_organization' using errcode = '23514';
  end if;
  -- An organization with members cannot become a person.
  if tg_op = 'UPDATE' and new.kind = 'person' and old.kind = 'organization'
     and exists (select 1 from public.network_contacts c where c.parent_id = new.id) then
    raise exception 'network_organization_has_members' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger b_check_parent before insert or update of parent_id, kind
  on public.network_contacts
  for each row execute function public.network_contacts_check_parent();

alter table public.network_contacts enable row level security;
alter table public.network_contacts force row level security;
revoke all on public.network_contacts from anon, authenticated;

create policy network_contacts_select_member on public.network_contacts
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy network_contacts_insert_writer on public.network_contacts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_network')
              and archived_at is null);

-- An archived contact is read-only until restored.
create policy network_contacts_update_writer on public.network_contacts
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_network') and archived_at is null)
  with check (public.has_permission(organization_id, 'manage_network'));

grant select on public.network_contacts to authenticated;
grant insert (organization_id, kind, name, roles, parent_id, artist_id, email, phone,
              website, city, notes)
  on public.network_contacts to authenticated;
grant update (kind, name, roles, parent_id, artist_id, email, phone, website, city, notes)
  on public.network_contacts to authenticated;
