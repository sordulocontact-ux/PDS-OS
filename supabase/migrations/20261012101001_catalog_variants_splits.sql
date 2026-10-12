-- Retours Catalogue du 11/10/2026, retours 08, 15, 40, 41, 43 à 53
-- (docs/ARCHITECTURE.md § 2 sexies, « Répartitions » et § 2 septies,
-- « Variantes »).
--
-- Variants: Acoustique and Live join the list, and a variant names its
-- original explicitly (source_master_id) instead of being guessed from the
-- same title and artist. The family is the original and every title that
-- names it; a variant never names another variant.
--
-- Splits: the roles offered depend on the kind (the recording's owners for
-- the master, the work's right holders for the publishing); every change
-- is kept (who, when, before, after); a complete split is not a validated
-- one: validating takes a snapshot of the lines, and a later change leaves
-- that snapshot as the validated version while the new lines wait for a
-- new control. « Complet » stays the arithmetic only.

-- ---------------------------------------------------------------------------
-- 1. Variants
-- ---------------------------------------------------------------------------

alter table public.masters drop constraint masters_variant_check;
alter table public.masters add constraint masters_variant_check
  check (variant in ('original', 'acoustic', 'instrumental', 'remix', 'radio_edit', 'live',
                     'acapella', 'other'));

alter table public.masters
  add column source_master_id uuid references public.masters (id) on delete set null;
create index masters_source_idx on public.masters (source_master_id)
  where source_master_id is not null;

grant update (source_master_id) on public.masters to authenticated;

-- The source is another title of the same organization, an original
-- itself (no chain), and only a variant has one: a title turned back into
-- an original drops it.
create or replace function public.masters_source_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.variant = 'original' then
    new.source_master_id := null;
  end if;
  if new.source_master_id is null then
    return new;
  end if;
  if new.source_master_id = new.id or not exists (
       select 1 from public.masters s
        where s.id = new.source_master_id
          and s.organization_id = new.organization_id
          and s.source_master_id is null
          and s.variant = 'original') then
    raise exception 'invalid_variant_source' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.masters_source_check() from public, anon, authenticated;
create trigger a_source_check before insert or update of source_master_id, variant
  on public.masters
  for each row execute function public.masters_source_check();

-- Existing variants: linked to the original of the same title that shares
-- a main artist, when there is exactly one (never guessed between two).
with candidates as (
  select v.id as variant_id, o.id as original_id
    from public.masters v
    join public.masters o
      on o.organization_id = v.organization_id
     and o.id <> v.id
     and o.variant = 'original'
     and lower(btrim(o.title)) = lower(btrim(v.title))
     and exists (
       select 1 from public.master_artists va
         join public.master_artists oa
           on oa.artist_id = va.artist_id and oa.master_id = o.id and oa.role = 'main'
        where va.master_id = v.id and va.role = 'main')
   where v.variant <> 'original'
), single as (
  select variant_id, min(original_id::text)::uuid as original_id
    from candidates group by variant_id having count(*) = 1
)
update public.masters m
   set source_master_id = s.original_id
  from single s
 where m.id = s.variant_id and m.source_master_id is null;

-- ---------------------------------------------------------------------------
-- 2. Split roles by kind
-- ---------------------------------------------------------------------------

alter table public.master_splits drop constraint master_splits_role_check;
alter table public.master_splits add constraint master_splits_role_check
  check (role in ('label', 'artist', 'producer', 'coproducer', 'author', 'composer',
                  'publisher', 'other'));
-- A composer is not an owner of the recording (retour 43). Not validated
-- against existing rows: a line written before keeps working until it is
-- edited, and the form only offers the roles of its kind.
alter table public.master_splits add constraint master_splits_role_kind_check
  check ((kind = 'master' and role in ('label', 'artist', 'producer', 'coproducer', 'other'))
      or (kind = 'publishing' and role in ('author', 'composer', 'publisher', 'other')))
  not valid;

-- ---------------------------------------------------------------------------
-- 3. History of every change (retour 47)
-- ---------------------------------------------------------------------------

create table public.master_split_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  master_id uuid not null,
  kind text not null,
  split_id uuid,
  -- added / updated / removed / validated
  action text not null,
  -- {party, role, share} before and after (null when added or removed).
  before jsonb,
  after jsonb,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default clock_timestamp(),
  constraint master_split_events_action_check
    check (action in ('added', 'updated', 'removed', 'validated')),
  constraint master_split_events_master_same_org foreign key (master_id, organization_id)
    references public.masters (id, organization_id) on delete cascade
);
create index master_split_events_master_idx
  on public.master_split_events (master_id, kind, created_at);

alter table public.master_split_events enable row level security;
alter table public.master_split_events force row level security;
revoke all on table public.master_split_events from anon, authenticated;
grant select on table public.master_split_events to authenticated;
-- As the splits themselves: manage_catalog.
create policy master_split_events_select_catalog on public.master_split_events
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

create or replace function public.master_splits_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_splits := coalesce(new, old);
  v_before jsonb := case when tg_op <> 'INSERT'
    then jsonb_build_object('party', old.party, 'role', old.role, 'share', old.share) end;
  v_after jsonb := case when tg_op <> 'DELETE'
    then jsonb_build_object('party', new.party, 'role', new.role, 'share', new.share) end;
begin
  if tg_op = 'UPDATE' and v_before = v_after and old.kind = new.kind then
    return null;
  end if;
  -- The master is going away (cascade): nothing to keep for it.
  if tg_op = 'DELETE' and not exists (select 1 from public.masters where id = old.master_id) then
    return null;
  end if;
  insert into public.master_split_events
    (organization_id, master_id, kind, split_id, action, before, after, actor_person_id)
  values (v_row.organization_id, v_row.master_id, v_row.kind, v_row.id,
          case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'updated' else 'removed' end,
          v_before, v_after, public.auth_person_id());
  return null;
end;
$$;
revoke execute on function public.master_splits_history() from public, anon, authenticated;
create trigger z_history after insert or update or delete on public.master_splits
  for each row execute function public.master_splits_history();

-- ---------------------------------------------------------------------------
-- 4. Validation: a snapshot, never rewritten (retours 15, 44, 46, 48)
-- ---------------------------------------------------------------------------

create table public.master_split_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  master_id uuid not null,
  kind text not null,
  -- The validated lines, ordered: [{party, role, share, contact_id, artist_id}].
  lines jsonb not null,
  validated_by uuid references public.people (id),
  validated_at timestamptz not null default clock_timestamp(),
  constraint master_split_validations_kind_check check (kind in ('master', 'publishing')),
  constraint master_split_validations_master_same_org foreign key (master_id, organization_id)
    references public.masters (id, organization_id) on delete cascade
);
create index master_split_validations_master_idx
  on public.master_split_validations (master_id, kind, validated_at desc);

alter table public.master_split_validations enable row level security;
alter table public.master_split_validations force row level security;
revoke all on table public.master_split_validations from anon, authenticated;
grant select on table public.master_split_validations to authenticated;
create policy master_split_validations_select_catalog on public.master_split_validations
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

-- « Valider la répartition »: whoever handles the legal side (manage_legal,
-- who also reads the splits), on a live title, a split at exactly 100 %.
-- The lines are copied as they are now; the snapshot stays the validated
-- version whatever changes after.
create or replace function public.validate_master_split(p_master_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_total numeric;
  v_lines jsonb;
  v_id uuid;
begin
  select organization_id into v_org from public.masters
   where id = p_master_id and archived_at is null;
  if v_org is null or not public.has_permission(v_org, 'manage_legal')
     or not public.has_permission(v_org, 'manage_catalog') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind not in ('master', 'publishing') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  select coalesce(sum(share), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'party', party, 'role', role, 'share', share,
           'contact_id', contact_id, 'artist_id', artist_id)
           order by party, role, share), '[]'::jsonb)
    into v_total, v_lines
    from public.master_splits
   where master_id = p_master_id and kind = p_kind;
  if v_total <> 100 then
    raise exception 'split_not_complete' using errcode = 'P0001';
  end if;
  insert into public.master_split_validations
    (organization_id, master_id, kind, lines, validated_by)
  values (v_org, p_master_id, p_kind, v_lines, public.auth_person_id())
  returning id into v_id;
  insert into public.master_split_events
    (organization_id, master_id, kind, action, after, actor_person_id)
  values (v_org, p_master_id, p_kind, 'validated', v_lines, public.auth_person_id());
  return v_id;
end;
$$;
revoke execute on function public.validate_master_split(uuid, text) from public, anon;
grant execute on function public.validate_master_split(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Linking a title to an existing project (retours 16 et 64)
-- ---------------------------------------------------------------------------

-- « Rattacher à un projet existant » from the title: security invoker, so
-- the project_masters policies decide who (create_projects) and when (a
-- live project not launched yet); the project's shape is checked as at its
-- creation (a single keeps one title, a content project takes none).
create or replace function public.link_master_to_project(p_project_id uuid, p_master_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project record;
  v_ids uuid[];
begin
  select id, organization_id, type, music_format into v_project
    from public.projects where id = p_project_id;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;
  if v_project.type <> 'music_release' then
    raise exception 'project_takes_no_title' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(master_id), '{}') into v_ids
    from public.project_masters where project_id = p_project_id;
  if p_master_id = any (v_ids) then
    return;
  end if;
  perform public.check_project_shape(v_project.type, v_ids || p_master_id, v_project.music_format);
  insert into public.project_masters (organization_id, project_id, master_id, position)
  values (v_project.organization_id, p_project_id, p_master_id,
          (select coalesce(max(position), 0) + 1 from public.project_masters
            where project_id = p_project_id));
end;
$$;
revoke execute on function public.link_master_to_project(uuid, uuid) from public, anon;
grant execute on function public.link_master_to_project(uuid, uuid) to authenticated;
