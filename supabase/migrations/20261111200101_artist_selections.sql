-- Projet collectif, lot 4 (docs/pds-mic-plan.md § 3.1, « Les sélections
-- d'artistes »; § 8, lot 4): selections of artists in the Catalogue, before
-- a project exists.
--
--   1. artist_selections: a named selection, held by a member (its holder,
--      « Mes sélections »: its creator, then whoever it is handed to), with
--      who handed it and when. Read by every active member, like the artists
--      (décision du lot 0 bis); written by who manages the Catalogue
--      (manage_catalog: the direction and the project managers), through the
--      functions below only.
--   2. artist_selection_items: its artists, in order, each once. An artist
--      deleted from the Catalogue leaves the selections with it (a working
--      list, not a record to keep); an archived one stays in the table but
--      is no longer shown or offered.
--   3. transmit_artist_selection: hands it to a member who manages the
--      Catalogue (« Transmettre à Alizé »); she finds it in her selections
--      and is notified (selection_transmitted).
--
-- A selection creates no project: the conversion is lot 5 (a copy of its
-- artists, no live link). No project table is touched.

-- 1. The selections -----------------------------------------------------------------

create table public.artist_selections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  note text,
  -- « Mes sélections »: its creator, then whoever it was last handed to.
  owner_person_id uuid not null references public.people (id),
  transmitted_by uuid references public.people (id),
  transmitted_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint artist_selections_id_org_key unique (id, organization_id),
  constraint artist_selections_name_check
    check (btrim(name) <> '' and char_length(name) <= 120),
  constraint artist_selections_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 2000)),
  constraint artist_selections_transmitted_check
    check ((transmitted_by is null) = (transmitted_at is null))
);

create index artist_selections_org_idx on public.artist_selections (organization_id, updated_at desc);
create index artist_selections_owner_idx on public.artist_selections (owner_person_id);

comment on table public.artist_selections is
  'Selections of artists in the Catalogue (docs/pds-mic-plan.md § 3.1, lot 4): read by every active member, written by manage_catalog through the functions only; a selection creates no project (lot 5 copies its artists).';

create trigger a_set_updated_at before update on public.artist_selections
  for each row execute function public.set_updated_at();

-- 2. Its artists ----------------------------------------------------------------------

create table public.artist_selection_items (
  organization_id uuid not null,
  selection_id uuid not null,
  artist_id uuid not null,
  -- Display order, from 1 (the order they were added).
  position integer not null,
  note text,
  added_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint artist_selection_items_pkey primary key (selection_id, artist_id),
  constraint artist_selection_items_position_positive check (position >= 1),
  constraint artist_selection_items_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 2000)),
  constraint artist_selection_items_selection_same_org
    foreign key (selection_id, organization_id)
    references public.artist_selections (id, organization_id) on delete cascade,
  constraint artist_selection_items_artist_same_org
    foreign key (artist_id, organization_id)
    references public.artists (id, organization_id) on delete cascade
);

create index artist_selection_items_artist_idx on public.artist_selection_items (artist_id);

-- Read by every active member (like the artists), written by the functions.
alter table public.artist_selections enable row level security;
alter table public.artist_selections force row level security;
revoke all on table public.artist_selections from anon, authenticated;
grant select on table public.artist_selections to authenticated;
create policy artist_selections_select_member on public.artist_selections
  for select to authenticated
  using (public.is_active_member(organization_id));

alter table public.artist_selection_items enable row level security;
alter table public.artist_selection_items force row level security;
revoke all on table public.artist_selection_items from anon, authenticated;
grant select on table public.artist_selection_items to authenticated;
create policy artist_selection_items_select_member on public.artist_selection_items
  for select to authenticated
  using (public.is_active_member(organization_id));

-- 3. The notification of a selection handed over ----------------------------------

select public.add_notification_kinds(array['selection_transmitted']);

-- 4. Gestures -------------------------------------------------------------------------

create or replace function public.clean_selection_name(p_name text)
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
revoke execute on function public.clean_selection_name(text) from public, anon, authenticated;

-- The selection, locked, for who manages the Catalogue of its organization.
create or replace function public.lock_artist_selection(p_selection_id uuid)
returns public.artist_selections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_selection public.artist_selections%rowtype;
begin
  select * into v_selection from public.artist_selections
   where id = p_selection_id for update;
  if not found or not public.is_active_member(v_selection.organization_id)
     or v_selection.archived_at is not null then
    raise exception 'selection_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v_selection.organization_id, 'manage_catalog') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_selection;
end;
$$;
revoke execute on function public.lock_artist_selection(uuid) from public, anon, authenticated;

-- Adds live artists of the organization at the end, in the given order, each
-- once (one already there is left where it is). Returns how many were added.
create or replace function public.add_selection_items(
  p_selection public.artist_selections,
  p_artist_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
begin
  if exists (select 1 from unnest(coalesce(p_artist_ids, '{}'::uuid[])) as u (id)
              where u.id is null
                 or not exists (select 1 from public.artists a
                                 where a.id = u.id
                                   and a.organization_id = p_selection.organization_id
                                   and a.archived_at is null)) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;
  insert into public.artist_selection_items
    (organization_id, selection_id, artist_id, position, added_by)
  select p_selection.organization_id, p_selection.id, u.id,
         (select coalesce(max(i.position), 0) from public.artist_selection_items i
           where i.selection_id = p_selection.id)
           + row_number() over (order by u.first_seen)::integer,
         public.auth_person_id()
    from (select id, min(ordinality) as first_seen
            from unnest(coalesce(p_artist_ids, '{}'::uuid[])) with ordinality as x (id, ordinality)
           group by id) u
   where not exists (select 1 from public.artist_selection_items i
                      where i.selection_id = p_selection.id and i.artist_id = u.id);
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;
revoke execute on function public.add_selection_items(public.artist_selections, uuid[]) from public, anon, authenticated;

-- « Nouvelle sélection »: a name and its first artists (none is fine: they
-- come later). Held by its creator.
create or replace function public.create_artist_selection(
  p_organization_id uuid,
  p_name text,
  p_artist_ids uuid[] default '{}'::uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.clean_selection_name(p_name);
  v_selection public.artist_selections%rowtype;
begin
  if not public.is_active_member(p_organization_id)
     or not public.has_permission(p_organization_id, 'manage_catalog') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.artist_selections (organization_id, name, owner_person_id, created_by)
  values (p_organization_id, v_name, public.auth_person_id(), public.auth_person_id())
  returning * into v_selection;
  perform public.add_selection_items(v_selection, p_artist_ids);
  return v_selection.id;
end;
$$;
revoke execute on function public.create_artist_selection(uuid, text, uuid[]) from public, anon;
grant execute on function public.create_artist_selection(uuid, text, uuid[]) to authenticated;

-- « Renommer ».
create or replace function public.rename_artist_selection(
  p_selection_id uuid,
  p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.clean_selection_name(p_name);
  v_selection public.artist_selections%rowtype;
begin
  v_selection := public.lock_artist_selection(p_selection_id);
  if v_name = v_selection.name then
    return;
  end if;
  update public.artist_selections set name = v_name where id = p_selection_id;
end;
$$;
revoke execute on function public.rename_artist_selection(uuid, text) from public, anon;
grant execute on function public.rename_artist_selection(uuid, text) to authenticated;

-- « Ajouter des artistes »: at the end, each once. Returns how many were
-- added (those already in it are skipped).
create or replace function public.add_artists_to_selection(
  p_selection_id uuid,
  p_artist_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_selection public.artist_selections%rowtype;
  v_added integer;
begin
  v_selection := public.lock_artist_selection(p_selection_id);
  v_added := public.add_selection_items(v_selection, p_artist_ids);
  if v_added > 0 then
    update public.artist_selections set updated_at = now() where id = p_selection_id;
  end if;
  return v_added;
end;
$$;
revoke execute on function public.add_artists_to_selection(uuid, uuid[]) from public, anon;
grant execute on function public.add_artists_to_selection(uuid, uuid[]) to authenticated;

-- « Retirer de la sélection »: the artist leaves this list only (its fiche
-- and every other selection are untouched); it can be added again.
create or replace function public.remove_artist_from_selection(
  p_selection_id uuid,
  p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_artist_selection(p_selection_id);
  delete from public.artist_selection_items
   where selection_id = p_selection_id and artist_id = p_artist_id;
  if not found then
    raise exception 'artist_not_in_selection' using errcode = 'P0002';
  end if;
  update public.artist_selections set updated_at = now() where id = p_selection_id;
end;
$$;
revoke execute on function public.remove_artist_from_selection(uuid, uuid) from public, anon;
grant execute on function public.remove_artist_from_selection(uuid, uuid) to authenticated;

-- Who a selection can be handed to: the active members who manage the
-- Catalogue (they can then work on it), for who manages it.
create or replace function public.list_selection_recipients(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
    from public.people p
   where public.has_permission(p_organization_id, 'manage_catalog')
     and public.person_has_permission(p_organization_id, p.id, 'manage_catalog')
   order by p.first_name, p.last_name;
$$;
revoke execute on function public.list_selection_recipients(uuid) from public, anon;
grant execute on function public.list_selection_recipients(uuid) to authenticated;

-- « Transmettre »: the selection changes hands; the recipient finds it in
-- her selections and is notified. Only to an active member who manages the
-- Catalogue, never to its current holder.
create or replace function public.transmit_artist_selection(
  p_selection_id uuid,
  p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_selection public.artist_selections%rowtype;
begin
  v_selection := public.lock_artist_selection(p_selection_id);
  if p_person_id is null
     or not public.person_has_permission(v_selection.organization_id, p_person_id, 'manage_catalog') then
    raise exception 'recipient_not_allowed' using errcode = '23514';
  end if;
  if p_person_id = v_selection.owner_person_id then
    raise exception 'already_holder' using errcode = 'P0001';
  end if;
  update public.artist_selections
     set owner_person_id = p_person_id,
         transmitted_by = public.auth_person_id(),
         transmitted_at = now()
   where id = p_selection_id;
  -- Not to oneself (the director handing back to herself is not news).
  if p_person_id is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_selection.organization_id, p_person_id, public.auth_person_id(),
            'selection_transmitted', null, p_selection_id);
  end if;
end;
$$;
revoke execute on function public.transmit_artist_selection(uuid, uuid) from public, anon;
grant execute on function public.transmit_artist_selection(uuid, uuid) to authenticated;
