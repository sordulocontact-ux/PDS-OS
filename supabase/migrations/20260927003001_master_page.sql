-- Master page (docs/ARCHITECTURE.md § 2 sexies): what a label keeps about a
-- recording, beyond its title, ISRC and performing artists.
--
--   * rights on the master itself: ISWC of the work, holder and year of the
--     phonographic right (℗);
--   * sessions (recording, production, mix, mastering) and tracks of the
--     multitrack (lead vocal, drums…), a track optionally tied to a session;
--   * contributors: every credit that is not a performing artist (composer,
--     producer, engineers, musicians…);
--   * splits: shares of the master and of the publishing, in percent. The
--     total of a kind never exceeds 100 (checked at commit); what remains is
--     computed by the code. Read and written with manage_catalog only, as
--     contracts;
--   * declarations to the collecting societies (SACEM, SCPP, SPPF, ADAMI,
--     SPEDIDAM): one row per organism once filed, none = still to file;
--   * files (`master_files` + private bucket `master-files`), as artist files;
--   * activity: activity_events now also carries master events (master_id,
--     artist_id null), written by triggers only.
--
-- Everyone in the organization reads (splits excepted); manage_catalog
-- writes, on a live master only (an archived master is frozen).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- A live (not archived) master of the organization.
create or replace function public.master_is_live(p_master_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.masters m where m.id = p_master_id and m.archived_at is null);
$$;

revoke execute on function public.master_is_live(uuid) from public, anon;
grant execute on function public.master_is_live(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rights on the master
-- ---------------------------------------------------------------------------

alter table public.masters
  -- Stored normalized: "T" and 10 digits, no dots or hyphens.
  add column iswc text
    constraint masters_iswc_format check (iswc is null or iswc ~ '^T[0-9]{10}$'),
  -- Holder of the ℗ (the phonographic producer), and its year.
  add column rights_holder text
    constraint masters_rights_holder_not_blank
      check (rights_holder is null or (btrim(rights_holder) <> '' and char_length(rights_holder) <= 200)),
  add column rights_year smallint
    constraint masters_rights_year_range check (rights_year is null or rights_year between 1900 and 2100);

grant update (iswc, rights_holder, rights_year) on public.masters to authenticated;

-- ---------------------------------------------------------------------------
-- Sessions and tracks
-- ---------------------------------------------------------------------------

create table public.master_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  kind text not null,
  session_date date,
  studio text,
  engineer text,
  notes text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_sessions_kind_check
    check (kind in ('recording', 'production', 'mixing', 'mastering', 'other')),
  constraint master_sessions_studio_check
    check (studio is null or (btrim(studio) <> '' and char_length(studio) <= 200)),
  constraint master_sessions_engineer_check
    check (engineer is null or (btrim(engineer) <> '' and char_length(engineer) <= 200)),
  constraint master_sessions_notes_check
    check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 2000)),
  constraint master_sessions_id_org_key unique (id, organization_id),
  constraint master_sessions_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade
);

create index master_sessions_master_idx on public.master_sessions (master_id, session_date);

create table public.master_tracks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  -- The session it was recorded in, when known.
  session_id uuid,
  name text not null,
  performer text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_tracks_name_check check (btrim(name) <> '' and char_length(name) <= 200),
  constraint master_tracks_performer_check
    check (performer is null or (btrim(performer) <> '' and char_length(performer) <= 200)),
  constraint master_tracks_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade,
  constraint master_tracks_session_same_org
    foreign key (session_id, organization_id) references public.master_sessions (id, organization_id)
    on delete set null (session_id)
);

create index master_tracks_master_idx on public.master_tracks (master_id, created_at);
create index master_tracks_session_idx on public.master_tracks (session_id);

-- A track's session belongs to the same master.
create or replace function public.master_tracks_check_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.session_id is not null and not exists (
    select 1 from public.master_sessions s where s.id = new.session_id and s.master_id = new.master_id
  ) then
    raise exception 'track_session_other_master';
  end if;
  return new;
end;
$$;

revoke execute on function public.master_tracks_check_session() from public, anon, authenticated;

create trigger b_check_session before insert or update of session_id, master_id on public.master_tracks
  for each row execute function public.master_tracks_check_session();

-- ---------------------------------------------------------------------------
-- Contributors
-- ---------------------------------------------------------------------------

create table public.master_contributors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  name text not null,
  role text not null,
  -- Instrument, precision ("guitare", "additional production").
  detail text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_contributors_name_check check (btrim(name) <> '' and char_length(name) <= 200),
  constraint master_contributors_role_check check (role in (
    'composer', 'lyricist', 'arranger', 'producer', 'co_producer',
    'recording_engineer', 'mix_engineer', 'mastering_engineer', 'musician', 'other')),
  constraint master_contributors_detail_check
    check (detail is null or (btrim(detail) <> '' and char_length(detail) <= 200)),
  constraint master_contributors_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade
);

create index master_contributors_master_idx on public.master_contributors (master_id, created_at);

-- ---------------------------------------------------------------------------
-- Splits
-- ---------------------------------------------------------------------------

create table public.master_splits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  -- master: ownership of the recording; publishing: the work (authors,
  -- composers, publishers).
  kind text not null,
  party text not null,
  role text not null,
  share numeric(5, 2) not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_splits_kind_check check (kind in ('master', 'publishing')),
  constraint master_splits_party_check check (btrim(party) <> '' and char_length(party) <= 200),
  constraint master_splits_role_check check (role in (
    'label', 'artist', 'producer', 'author', 'composer', 'publisher', 'other')),
  constraint master_splits_share_range check (share > 0 and share <= 100),
  constraint master_splits_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade
);

create index master_splits_master_idx on public.master_splits (master_id, kind, created_at);

-- The shares of a kind never add up to more than 100 %. At commit, so moving
-- a share from one party to another in one transaction works.
create or replace function public.master_splits_check_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_splits := coalesce(new, old);
begin
  if (select coalesce(sum(s.share), 0) from public.master_splits s
       where s.master_id = v_row.master_id and s.kind = v_row.kind) > 100 then
    raise exception 'split_total_over_100';
  end if;
  return null;
end;
$$;

revoke execute on function public.master_splits_check_total() from public, anon, authenticated;

create constraint trigger z_check_total
  after insert or update of share, kind, master_id on public.master_splits
  deferrable initially deferred
  for each row execute function public.master_splits_check_total();

-- ---------------------------------------------------------------------------
-- Declarations
-- ---------------------------------------------------------------------------

create table public.master_declarations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  organism text not null,
  status text not null,
  reference text,
  declared_on date,
  notes text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_declarations_organism_check
    check (organism in ('sacem', 'scpp', 'sppf', 'adami', 'spedidam')),
  constraint master_declarations_status_check check (status in ('submitted', 'confirmed', 'rejected')),
  constraint master_declarations_reference_check
    check (reference is null or (btrim(reference) <> '' and char_length(reference) <= 100)),
  constraint master_declarations_notes_check
    check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 2000)),
  constraint master_declarations_organism_key unique (master_id, organism),
  constraint master_declarations_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade
);

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------

create table public.master_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  category text not null default 'other',
  -- "<organization_id>/<master_id>/<uuid>[.<ext>]" in the master-files bucket.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_files_category_check
    check (category in ('master', 'stems', 'mix', 'artwork', 'contract', 'other')),
  constraint master_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint master_files_mime_check check (char_length(mime) between 1 and 255),
  constraint master_files_bytes_check check (bytes > 0 and bytes <= 52428800),
  constraint master_files_path_format
    check (path ~ ('^' || organization_id::text || '/' || master_id::text
                   || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint master_files_path_key unique (path),
  constraint master_files_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index master_files_master_idx on public.master_files (master_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('master-files', 'master-files', false, 52428800, null)
on conflict (id) do nothing;

-- Same rules as artist-files: a contract needs manage_catalog; an object
-- without a row yet (being uploaded) is readable by members.
create policy master_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'master-files'
    and public.is_active_member(public.try_uuid((storage.foldername(objects.name))[1]))
    and (
      public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
      or not exists (
        select 1 from public.master_files f
         where f.path = objects.name and f.category = 'contract'
      )
    )
  );

create policy master_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'master-files'
    and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
    and exists (
      select 1 from public.masters m
       where m.id = public.try_uuid((storage.foldername(objects.name))[2])
         and m.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and m.archived_at is null
    )
  );

create policy master_files_objects_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'master-files'
         and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog'));

-- ---------------------------------------------------------------------------
-- Common triggers, RLS and grants of the master tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['master_sessions', 'master_tracks', 'master_contributors',
                           'master_splits', 'master_declarations', 'master_files']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('create trigger a_set_created_by before insert on public.%I
                      for each row execute function public.set_created_by()', t);
    if t <> 'master_files' then
      execute format('create trigger a_set_updated_at before update on public.%I
                        for each row execute function public.set_updated_at()', t);
    end if;
    -- Written with manage_catalog, on a live master only.
    execute format('create policy %I on public.%I for insert to authenticated
                      with check (public.has_permission(organization_id, ''manage_catalog'')
                                  and public.master_is_live(master_id))', t || '_insert_catalog', t);
    execute format('create policy %I on public.%I for delete to authenticated
                      using (public.has_permission(organization_id, ''manage_catalog'')
                             and public.master_is_live(master_id))', t || '_delete_catalog', t);
    if t <> 'master_files' then
      execute format('create policy %I on public.%I for update to authenticated
                        using (public.has_permission(organization_id, ''manage_catalog'')
                               and public.master_is_live(master_id))
                        with check (public.has_permission(organization_id, ''manage_catalog'')
                                    and public.master_is_live(master_id))', t || '_update_catalog', t);
    end if;
  end loop;
end;
$$;

-- Reads: every member, except splits (manage_catalog, as contracts) and
-- contract files.
create policy master_sessions_select_members on public.master_sessions
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_tracks_select_members on public.master_tracks
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_contributors_select_members on public.master_contributors
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_declarations_select_members on public.master_declarations
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_splits_select_catalog on public.master_splits
  for select to authenticated using (public.has_permission(organization_id, 'manage_catalog'));
create policy master_files_select_members on public.master_files
  for select to authenticated
  using (public.is_active_member(organization_id)
         and (category <> 'contract' or public.has_permission(organization_id, 'manage_catalog')));

grant select, delete on public.master_sessions, public.master_tracks, public.master_contributors,
  public.master_splits, public.master_declarations, public.master_files to authenticated;

grant insert (organization_id, master_id, kind, session_date, studio, engineer, notes)
  on public.master_sessions to authenticated;
grant update (kind, session_date, studio, engineer, notes) on public.master_sessions to authenticated;

grant insert (organization_id, master_id, session_id, name, performer)
  on public.master_tracks to authenticated;
grant update (session_id, name, performer) on public.master_tracks to authenticated;

grant insert (organization_id, master_id, name, role, detail)
  on public.master_contributors to authenticated;
grant update (name, role, detail) on public.master_contributors to authenticated;

grant insert (organization_id, master_id, kind, party, role, share)
  on public.master_splits to authenticated;
grant update (kind, party, role, share) on public.master_splits to authenticated;

grant insert (organization_id, master_id, organism, status, reference, declared_on, notes)
  on public.master_declarations to authenticated;
grant update (status, reference, declared_on, notes) on public.master_declarations to authenticated;

grant insert (organization_id, master_id, category, path, file_name, mime, bytes)
  on public.master_files to authenticated;

-- ---------------------------------------------------------------------------
-- Activity of a master
-- ---------------------------------------------------------------------------

-- An event is about an artist (artist_id), a master (master_id), or both.
alter table public.activity_events
  alter column artist_id drop not null,
  add column master_id uuid,
  add constraint activity_events_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id),
  add constraint activity_events_has_subject check (artist_id is not null or master_id is not null);

create index activity_events_master_idx on public.activity_events (master_id, created_at desc, seq desc)
  where master_id is not null;

alter table public.activity_events drop constraint activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'artist_created', 'artist_updated',
  'contact_added', 'contact_updated', 'contact_removed',
  'file_added', 'file_removed',
  'master_created', 'master_credited', 'master_updated',
  -- A session, track, contributor, split or declaration (detail.section).
  'master_item_added', 'master_item_updated', 'master_item_removed',
  'project_created', 'project_linked',
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested'));

create or replace function public.log_master_event(
  p_organization_id uuid,
  p_master_id uuid,
  p_kind text,
  p_subject_id uuid,
  p_detail jsonb,
  p_project_id uuid default null,
  p_catalog_only boolean default false
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (organization_id, master_id, project_id, kind,
                                      actor_person_id, subject_id, detail, catalog_only)
  values (p_organization_id, p_master_id, p_project_id, p_kind,
          public.auth_person_id(), p_subject_id, coalesce(p_detail, '{}'::jsonb), p_catalog_only);
$$;

revoke execute on function public.log_master_event(uuid, uuid, text, uuid, jsonb, uuid, boolean)
  from public, anon, authenticated;

-- The master: creation, and which part changed (identity, rights).
-- Archiving is not news here: the master page is gone once archived.
create or replace function public.masters_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    perform public.log_master_event(new.organization_id, new.id, 'master_created', new.id,
                                    jsonb_build_object('title', new.title, 'version', new.version));
    return null;
  end if;
  if (new.title, new.version, new.isrc, new.duration_seconds)
     is distinct from (old.title, old.version, old.isrc, old.duration_seconds) then
    v_fields := array_append(v_fields, 'identity');
  end if;
  if (new.iswc, new.rights_holder, new.rights_year)
     is distinct from (old.iswc, old.rights_holder, old.rights_year) then
    v_fields := array_append(v_fields, 'rights');
  end if;
  if cardinality(v_fields) > 0 then
    perform public.log_master_event(new.organization_id, new.id, 'master_updated', new.id,
                                    jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

revoke execute on function public.masters_log() from public, anon, authenticated;

create trigger z_log after insert or update on public.masters
  for each row execute function public.masters_log();

-- Sessions, tracks, contributors, splits, declarations: one generic event,
-- the section and a display name copied at the time. Splits stay as private
-- as the splits.
create or replace function public.master_items_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_section text;
  v_name text;
begin
  v_section := case tg_table_name
    when 'master_sessions' then 'session'
    when 'master_tracks' then 'track'
    when 'master_contributors' then 'contributor'
    when 'master_splits' then 'split'
    else 'declaration' end;
  v_name := case v_section
    when 'session' then coalesce(v_row ->> 'studio', v_row ->> 'kind')
    when 'track' then v_row ->> 'name'
    when 'contributor' then v_row ->> 'name'
    when 'split' then v_row ->> 'party'
    else v_row ->> 'organism' end;
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;
  perform public.log_master_event(
    (v_row ->> 'organization_id')::uuid, (v_row ->> 'master_id')::uuid,
    case tg_op when 'INSERT' then 'master_item_added' when 'UPDATE' then 'master_item_updated'
               else 'master_item_removed' end,
    (v_row ->> 'id')::uuid,
    jsonb_build_object('section', v_section, 'name', v_name, 'kind', v_row ->> 'kind'),
    null, v_section = 'split');
  return null;
end;
$$;

revoke execute on function public.master_items_log() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['master_sessions', 'master_tracks', 'master_contributors',
                           'master_splits', 'master_declarations']
  loop
    execute format('create trigger z_log after insert or update or delete on public.%I
                      for each row execute function public.master_items_log()', t);
  end loop;
end;
$$;

-- Files (a contract's event is as private as the contract).
create or replace function public.master_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_files := coalesce(new, old);
begin
  perform public.log_master_event(
    v_row.organization_id, v_row.master_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category),
    null, v_row.category = 'contract');
  return null;
end;
$$;

revoke execute on function public.master_files_log() from public, anon, authenticated;

create trigger z_log after insert or delete on public.master_files
  for each row execute function public.master_files_log();

-- Projects carrying the master: created with it, or linked later. Beside the
-- per-artist event of project_masters_log.
create or replace function public.project_masters_log_master()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects;
begin
  select * into v_project from public.projects where id = new.project_id;
  perform public.log_master_event(
    new.organization_id, new.master_id,
    case when v_project.created_at = now() then 'project_created' else 'project_linked' end,
    new.project_id, jsonb_build_object('title', v_project.title), new.project_id);
  return null;
end;
$$;

revoke execute on function public.project_masters_log_master() from public, anon, authenticated;

create trigger z_log_master after insert on public.project_masters
  for each row execute function public.project_masters_log_master();

-- Backfill: masters and their project links before this migration.
insert into public.activity_events (organization_id, master_id, kind, actor_person_id,
                                    subject_id, detail, created_at)
select m.organization_id, m.id, 'master_created', m.created_by, m.id,
       jsonb_build_object('title', m.title, 'version', m.version), m.created_at
  from public.masters m;

insert into public.activity_events (organization_id, master_id, project_id, kind,
                                    actor_person_id, subject_id, detail, created_at)
select pm.organization_id, pm.master_id, pm.project_id,
       case when pm.created_at = p.created_at then 'project_created' else 'project_linked' end,
       pm.created_by, pm.project_id, jsonb_build_object('title', p.title), pm.created_at
  from public.project_masters pm
  join public.projects p on p.id = pm.project_id;
