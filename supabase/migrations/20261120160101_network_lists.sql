-- Réseau : listes de personnes (réunion avec Ibé du 18/11/2026, 5:15 à 9:03 et
-- 24:31). « Quand je vais dans Réseau et que j'ai 3 artistes, que je clique sur
-- les 3 et que je puisse créer une nouvelle liste […] que je pourrais soit
-- partager à mon équipe, soit conserver. » Also for influencers (« campagne
-- d'influence ») or the media fit for an artist (« liste des médias qui
-- correspondent à Jay »), kept up over time; no files in a list. Ibé keeps
-- them in his notes today, an hourglass for « pas encore répondu », a green
-- tick for « a répondu »: each person of a list carries that reply.
--
--   1. network_lists: a named list of contacts of the Réseau, its author's
--      (owner_person_id). Private (« Pour moi »): read and written by its
--      author alone, the direction included in « alone ». Shared with the
--      team: read by every active member, its people added, removed and
--      their reply changed by every member who manages the Réseau (a team
--      list, kept up by the team). A shared list is « À valider » until the
--      direction validates it (« tu partages la liste, elle est validée ou
--      non »); one shared by the direction is validated at once.
--   2. network_list_contacts: its people, each once, with their reply
--      (waiting / replied, who changed it and when). Only the contact's id:
--      its coordinates stay under their own rules (a private contact's
--      coordinates are read through can_read_contact_details, never through
--      a list). A contact deleted from the Réseau leaves the lists with it
--      (a working list, not a record to keep): a list never protects a
--      contact from deletion.
--   3. Every write goes through the functions below; the tables are only
--      read (RLS).
--
-- A list creates no project: the app opens the project form pre-filled with
-- the artists of the Catalogue its contacts are linked to (no live link).

-- 1. The lists ---------------------------------------------------------------------------

create table public.network_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  owner_person_id uuid not null references public.people (id),
  shared boolean not null default false,
  shared_at timestamptz,
  validated_by uuid references public.people (id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_lists_id_org_key unique (id, organization_id),
  constraint network_lists_name_check
    check (btrim(name) <> '' and char_length(name) <= 120),
  constraint network_lists_shared_check
    check (shared = (shared_at is not null)),
  constraint network_lists_validated_check
    check ((validated_by is null) = (validated_at is null)),
  -- Only a shared list is validated.
  constraint network_lists_validated_shared_check
    check (validated_at is null or shared)
);

create index network_lists_org_idx on public.network_lists (organization_id, updated_at desc);
create index network_lists_owner_idx on public.network_lists (owner_person_id);

comment on table public.network_lists is
  'Lists of contacts of the Réseau (Ibé, 18/11/2026): private to their author, or shared with the team and validated or not by the direction. Written through the functions of 20261120160101 only.';

create trigger a_set_updated_at before update on public.network_lists
  for each row execute function public.set_updated_at();

-- 2. Its people -------------------------------------------------------------------------

create table public.network_list_contacts (
  organization_id uuid not null,
  list_id uuid not null,
  contact_id uuid not null,
  reply text not null default 'waiting',
  reply_changed_by uuid references public.people (id),
  reply_changed_at timestamptz,
  added_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint network_list_contacts_pkey primary key (list_id, contact_id),
  constraint network_list_contacts_reply_check check (reply in ('waiting', 'replied')),
  constraint network_list_contacts_list_same_org
    foreign key (list_id, organization_id)
    references public.network_lists (id, organization_id) on delete cascade,
  constraint network_list_contacts_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade
);

create index network_list_contacts_contact_idx on public.network_list_contacts (contact_id);

comment on table public.network_list_contacts is
  'The people of a list of the Réseau and their reply (waiting: hourglass, replied: green tick). Only the contact''s id: its coordinates keep their own rules.';

-- Who reads a list: its author, or every active member once it is shared.
create or replace function public.can_read_network_list(
  p_org uuid, p_owner uuid, p_shared boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_member(p_org)
     and (p_shared or p_owner = public.auth_person_id());
$$;
revoke execute on function public.can_read_network_list(uuid, uuid, boolean) from public, anon;
grant execute on function public.can_read_network_list(uuid, uuid, boolean) to authenticated;

alter table public.network_lists enable row level security;
alter table public.network_lists force row level security;
revoke all on table public.network_lists from anon, authenticated;
grant select on table public.network_lists to authenticated;
create policy network_lists_select on public.network_lists
  for select to authenticated
  using (public.can_read_network_list(organization_id, owner_person_id, shared));

alter table public.network_list_contacts enable row level security;
alter table public.network_list_contacts force row level security;
revoke all on table public.network_list_contacts from anon, authenticated;
grant select on table public.network_list_contacts to authenticated;
-- Whoever reads the list reads who is in it (identity only).
create policy network_list_contacts_select on public.network_list_contacts
  for select to authenticated
  using (exists (select 1 from public.network_lists l
                  where l.id = list_id
                    and public.can_read_network_list(l.organization_id, l.owner_person_id,
                                                     l.shared)));

-- 3. Gestures ---------------------------------------------------------------------------

create or replace function public.clean_network_list_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(p_name), '');
begin
  if v_name is null then
    raise exception 'name_required' using errcode = '23514';
  end if;
  if char_length(v_name) > 120 then
    raise exception 'name_too_long' using errcode = '22023';
  end if;
  return v_name;
end;
$$;
revoke execute on function public.clean_network_list_name(text) from public, anon, authenticated;

-- The list, locked. `p_people`: to change its people and their replies (its
-- author; on a shared list, every member who manages the Réseau);
-- otherwise: to change the list itself (its author alone). A list the
-- caller does not read is not found.
create or replace function public.lock_network_list(p_list_id uuid, p_people boolean)
returns public.network_lists
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list public.network_lists%rowtype;
  v_me uuid := public.auth_person_id();
begin
  select * into v_list from public.network_lists where id = p_list_id for update;
  if not found
     or not public.can_read_network_list(v_list.organization_id, v_list.owner_person_id,
                                         v_list.shared) then
    raise exception 'list_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v_list.organization_id, 'manage_network') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_list.owner_person_id <> v_me and not (p_people and v_list.shared) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_list;
end;
$$;
revoke execute on function public.lock_network_list(uuid, boolean) from public, anon, authenticated;

-- Adds contacts of the organization, each once (one already there keeps its
-- reply). Archived contacts are not added. Returns how many were added.
create or replace function public.add_network_list_items(
  p_list public.network_lists,
  p_contact_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
begin
  if exists (select 1 from unnest(coalesce(p_contact_ids, '{}'::uuid[])) as u (id)
              where u.id is null
                 or not exists (select 1 from public.network_contacts c
                                 where c.id = u.id
                                   and c.organization_id = p_list.organization_id
                                   and c.archived_at is null)) then
    raise exception 'contact_not_found' using errcode = '23503';
  end if;
  insert into public.network_list_contacts (organization_id, list_id, contact_id, added_by)
  select distinct p_list.organization_id, p_list.id, u.id, public.auth_person_id()
    from unnest(coalesce(p_contact_ids, '{}'::uuid[])) as u (id)
  on conflict (list_id, contact_id) do nothing;
  get diagnostics v_added = row_count;
  if v_added > 0 then
    update public.network_lists set updated_at = now() where id = p_list.id;
  end if;
  return v_added;
end;
$$;
revoke execute on function public.add_network_list_items(public.network_lists, uuid[])
  from public, anon, authenticated;

-- « Nouvelle liste »: a name, for oneself or shared with the team, and its
-- first people (none is fine). A list shared by the direction is validated
-- at once.
create or replace function public.create_network_list(
  p_organization_id uuid,
  p_name text,
  p_shared boolean default false,
  p_contact_ids uuid[] default '{}'::uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.clean_network_list_name(p_name);
  v_me uuid := public.auth_person_id();
  v_shared boolean := coalesce(p_shared, false);
  v_validated boolean;
  v_list public.network_lists%rowtype;
begin
  if not public.is_active_member(p_organization_id)
     or not public.has_permission(p_organization_id, 'manage_network') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_validated := v_shared and public.has_permission(p_organization_id, 'validate');
  insert into public.network_lists
    (organization_id, name, owner_person_id, shared, shared_at, validated_by, validated_at)
  values (p_organization_id, v_name, v_me, v_shared,
          case when v_shared then now() end,
          case when v_validated then v_me end,
          case when v_validated then now() end)
  returning * into v_list;
  perform public.add_network_list_items(v_list, p_contact_ids);
  return v_list.id;
end;
$$;
revoke execute on function public.create_network_list(uuid, text, boolean, uuid[]) from public, anon;
grant execute on function public.create_network_list(uuid, text, boolean, uuid[]) to authenticated;

-- « Renommer »: its author.
create or replace function public.rename_network_list(p_list_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.clean_network_list_name(p_name);
  v_list public.network_lists%rowtype;
begin
  v_list := public.lock_network_list(p_list_id, false);
  if v_name = v_list.name then
    return;
  end if;
  update public.network_lists set name = v_name where id = p_list_id;
end;
$$;
revoke execute on function public.rename_network_list(uuid, text) from public, anon;
grant execute on function public.rename_network_list(uuid, text) to authenticated;

-- « Partager avec l'équipe » / « Garder pour moi »: its author. Shared by the
-- direction: validated at once; kept private again: its validation goes.
create or replace function public.set_network_list_shared(p_list_id uuid, p_shared boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list public.network_lists%rowtype;
  v_me uuid := public.auth_person_id();
  v_validated boolean;
begin
  if p_shared is null then
    raise exception 'shared_required' using errcode = '22023';
  end if;
  v_list := public.lock_network_list(p_list_id, false);
  if v_list.shared = p_shared then
    return;
  end if;
  v_validated := p_shared and public.has_permission(v_list.organization_id, 'validate');
  update public.network_lists
     set shared = p_shared,
         shared_at = case when p_shared then now() end,
         validated_by = case when v_validated then v_me end,
         validated_at = case when v_validated then now() end
   where id = p_list_id;
end;
$$;
revoke execute on function public.set_network_list_shared(uuid, boolean) from public, anon;
grant execute on function public.set_network_list_shared(uuid, boolean) to authenticated;

-- « Valider la liste » / « Retirer la validation »: the direction, on a list
-- shared with the team.
create or replace function public.set_network_list_validated(
  p_list_id uuid, p_validated boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list public.network_lists%rowtype;
begin
  if p_validated is null then
    raise exception 'validated_required' using errcode = '22023';
  end if;
  select * into v_list from public.network_lists where id = p_list_id for update;
  if not found
     or not public.can_read_network_list(v_list.organization_id, v_list.owner_person_id,
                                         v_list.shared) then
    raise exception 'list_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v_list.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_list.shared then
    raise exception 'list_not_shared' using errcode = 'P0001';
  end if;
  if (v_list.validated_at is not null) = p_validated then
    return;
  end if;
  update public.network_lists
     set validated_by = case when p_validated then public.auth_person_id() end,
         validated_at = case when p_validated then now() end
   where id = p_list_id;
end;
$$;
revoke execute on function public.set_network_list_validated(uuid, boolean) from public, anon;
grant execute on function public.set_network_list_validated(uuid, boolean) to authenticated;

-- « Supprimer la liste »: its author. Its people stay in the Réseau.
create or replace function public.delete_network_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_network_list(p_list_id, false);
  delete from public.network_lists where id = p_list_id;
end;
$$;
revoke execute on function public.delete_network_list(uuid) from public, anon;
grant execute on function public.delete_network_list(uuid) to authenticated;

-- « Ajouter à une liste » (the Réseau's selection) and « Ajouter des
-- personnes » (the list's page). Returns how many were added.
create or replace function public.add_contacts_to_network_list(
  p_list_id uuid, p_contact_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.add_network_list_items(public.lock_network_list(p_list_id, true), p_contact_ids);
end;
$$;
revoke execute on function public.add_contacts_to_network_list(uuid, uuid[]) from public, anon;
grant execute on function public.add_contacts_to_network_list(uuid, uuid[]) to authenticated;

-- « Retirer de la liste »: the contact leaves this list only.
create or replace function public.remove_contact_from_network_list(
  p_list_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_network_list(p_list_id, true);
  delete from public.network_list_contacts
   where list_id = p_list_id and contact_id = p_contact_id;
  if not found then
    raise exception 'contact_not_in_list' using errcode = 'P0002';
  end if;
  update public.network_lists set updated_at = now() where id = p_list_id;
end;
$$;
revoke execute on function public.remove_contact_from_network_list(uuid, uuid) from public, anon;
grant execute on function public.remove_contact_from_network_list(uuid, uuid) to authenticated;

-- The hourglass or the green tick, in one gesture.
create or replace function public.set_network_list_reply(
  p_list_id uuid, p_contact_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reply is null or p_reply not in ('waiting', 'replied') then
    raise exception 'invalid_reply' using errcode = '22023';
  end if;
  perform public.lock_network_list(p_list_id, true);
  update public.network_list_contacts
     set reply = p_reply,
         reply_changed_by = public.auth_person_id(),
         reply_changed_at = now()
   where list_id = p_list_id and contact_id = p_contact_id
     and reply is distinct from p_reply;
  if not found and not exists (select 1 from public.network_list_contacts
                                where list_id = p_list_id and contact_id = p_contact_id) then
    raise exception 'contact_not_in_list' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.set_network_list_reply(uuid, uuid, text) from public, anon;
grant execute on function public.set_network_list_reply(uuid, uuid, text) to authenticated;
