-- Artist files and the artist activity log.
--
-- Files (`artist_files` + private bucket `artist-files`): press kit, photos,
-- contracts… attached to an artist. Every member reads them, except
-- contracts, read only with manage_catalog (DG, project manager); only
-- manage_catalog uploads or deletes.
--
-- Activity (`activity_events`): what happened around an artist, written by
-- triggers only (never by the application): artist created or updated,
-- contacts, pictures, files, masters crediting the artist, projects carrying
-- those masters and their transmissions. One row per concerned artist. A
-- viewer reads an event when they may read its subject: contact and
-- contract events need manage_catalog, project events need the project.
-- Past history is backfilled from each table's own dates.

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------

create table public.artist_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  category text not null default 'other',
  -- "<organization_id>/<artist_id>/<uuid>[.<ext>]" in the artist-files bucket.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint artist_files_category_check
    check (category in ('press', 'photo', 'contract', 'audio', 'other')),
  constraint artist_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint artist_files_mime_check check (char_length(mime) between 1 and 255),
  constraint artist_files_bytes_check check (bytes > 0 and bytes <= 52428800),
  constraint artist_files_path_format
    check (path ~ ('^' || organization_id::text || '/' || artist_id::text
                   || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint artist_files_path_key unique (path),
  constraint artist_files_id_org_key unique (id, organization_id),
  constraint artist_files_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index artist_files_artist_idx on public.artist_files (artist_id, created_at desc);

create trigger a_set_created_by before insert on public.artist_files
  for each row execute function public.set_created_by();

alter table public.artist_files enable row level security;

alter table public.artist_files force row level security;

revoke all on public.artist_files from anon, authenticated;

create policy artist_files_select_members on public.artist_files
  for select to authenticated
  using (public.is_active_member(organization_id)
         and (category <> 'contract' or public.has_permission(organization_id, 'manage_catalog')));

create policy artist_files_insert_catalog on public.artist_files
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog'));

create policy artist_files_delete_catalog on public.artist_files
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

grant select, delete on public.artist_files to authenticated;

grant insert (organization_id, artist_id, category, path, file_name, mime, bytes)
  on public.artist_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artist-files', 'artist-files', false, 52428800, null)
on conflict (id) do nothing;

-- Reading an object follows its row: a contract needs manage_catalog. An
-- object without a row yet (being uploaded) is readable by members.
create policy artist_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artist-files'
    and public.is_active_member(public.try_uuid((storage.foldername(objects.name))[1]))
    and (
      public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
      or not exists (
        select 1 from public.artist_files f
         where f.path = objects.name and f.category = 'contract'
      )
    )
  );

-- objects.name spelled out: inside the subquery a bare `name` would not be
-- the object's.
create policy artist_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artist-files'
    and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
    and exists (
      select 1 from public.artists a
       where a.id = public.try_uuid((storage.foldername(objects.name))[2])
         and a.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy artist_files_objects_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'artist-files'
         and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog'));

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  -- Set for project events: read only by those who see the project.
  project_id uuid,
  kind text not null,
  actor_person_id uuid references public.people (id),
  -- The row the event is about (master, contact, file, assignment…).
  subject_id uuid,
  -- What to display, copied at the time: names change, rows get deleted.
  detail jsonb not null default '{}'::jsonb,
  -- Contact and contract events: manage_catalog only.
  catalog_only boolean not null default false,
  created_at timestamptz not null default now(),
  -- Insertion order: events of one transaction share created_at (now()).
  seq bigint generated always as identity,
  constraint activity_events_kind_check check (kind in (
    'artist_created', 'artist_updated',
    'contact_added', 'contact_updated', 'contact_removed',
    'file_added', 'file_removed',
    'master_created', 'master_credited',
    'project_created', 'project_linked',
    'project_transmitted', 'project_accepted', 'project_refused',
    'project_clarification_requested')),
  constraint activity_events_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index activity_events_artist_idx on public.activity_events (artist_id, created_at desc, seq desc);

alter table public.activity_events enable row level security;

alter table public.activity_events force row level security;

revoke all on public.activity_events from anon, authenticated;

create policy activity_events_select_visible on public.activity_events
  for select to authenticated
  using (
    public.is_active_member(organization_id)
    and (not catalog_only or public.has_permission(organization_id, 'manage_catalog'))
    and (project_id is null or public.can_see_project(project_id))
  );

-- Read only: rows come from the triggers below (security definer).
grant select on public.activity_events to authenticated;

create or replace function public.log_artist_event(
  p_organization_id uuid,
  p_artist_id uuid,
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
  insert into public.activity_events (organization_id, artist_id, project_id, kind,
                                      actor_person_id, subject_id, detail, catalog_only)
  values (p_organization_id, p_artist_id, p_project_id, p_kind,
          public.auth_person_id(), p_subject_id, coalesce(p_detail, '{}'::jsonb), p_catalog_only);
$$;

revoke execute on function public.log_artist_event(uuid, uuid, text, uuid, jsonb, uuid, boolean)
  from public, anon, authenticated;

-- Artists: creation, and which parts of the profile changed.
create or replace function public.artists_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    perform public.log_artist_event(new.organization_id, new.id, 'artist_created', new.id,
                                    jsonb_build_object('name', new.name));
    return null;
  end if;
  if (new.name, new.legal_name, new.country_code)
     is distinct from (old.name, old.legal_name, old.country_code) then
    v_fields := v_fields || 'identity';
  end if;
  if new.bio is distinct from old.bio then v_fields := v_fields || 'bio'; end if;
  if new.notes is distinct from old.notes then v_fields := v_fields || 'notes'; end if;
  if (new.picture_path, new.picture_url) is distinct from (old.picture_path, old.picture_url) then
    v_fields := v_fields || 'picture';
  end if;
  if new.deezer_id is distinct from old.deezer_id then v_fields := v_fields || 'deezer'; end if;
  if cardinality(v_fields) > 0 then
    perform public.log_artist_event(new.organization_id, new.id, 'artist_updated', new.id,
                                    jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

revoke execute on function public.artists_log() from public, anon, authenticated;

create trigger z_log after insert or update on public.artists
  for each row execute function public.artists_log();

-- Contacts (manage_catalog only, as the contacts themselves).
create or replace function public.artist_contacts_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_contacts := coalesce(new, old);
begin
  -- The primary flag moved by the keep/promote triggers is not news.
  if tg_op = 'UPDATE' and (new.role, new.name, new.email, new.phone)
     is not distinct from (old.role, old.name, old.email, old.phone) then
    return null;
  end if;
  perform public.log_artist_event(
    v_row.organization_id, v_row.artist_id,
    case tg_op when 'INSERT' then 'contact_added' when 'UPDATE' then 'contact_updated'
               else 'contact_removed' end,
    v_row.id, jsonb_build_object('name', v_row.name, 'role', v_row.role), null, true);
  return null;
end;
$$;

revoke execute on function public.artist_contacts_log() from public, anon, authenticated;

create trigger z_log after insert or update or delete on public.artist_contacts
  for each row execute function public.artist_contacts_log();

-- Files (a contract's event is as private as the contract).
create or replace function public.artist_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_files := coalesce(new, old);
begin
  perform public.log_artist_event(
    v_row.organization_id, v_row.artist_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category),
    null, v_row.category = 'contract');
  return null;
end;
$$;

revoke execute on function public.artist_files_log() from public, anon, authenticated;

create trigger z_log after insert or delete on public.artist_files
  for each row execute function public.artist_files_log();

-- Credits: "master created" when the master is born in the same
-- transaction (create_master), "credited" when added to an existing one.
-- update_master rewrites every credit: an artist already credited on the
-- master is not news.
create or replace function public.master_artists_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.masters;
begin
  if exists (
    select 1 from public.activity_events e
     where e.artist_id = new.artist_id and e.subject_id = new.master_id
       and e.kind in ('master_created', 'master_credited')
  ) then
    return null;
  end if;
  select * into v_master from public.masters where id = new.master_id;
  perform public.log_artist_event(
    new.organization_id, new.artist_id,
    case when v_master.created_at = now() then 'master_created' else 'master_credited' end,
    new.master_id,
    jsonb_build_object('title', v_master.title, 'version', v_master.version, 'role', new.role));
  return null;
end;
$$;

revoke execute on function public.master_artists_log() from public, anon, authenticated;

create trigger z_log after insert on public.master_artists
  for each row execute function public.master_artists_log();

-- Projects carrying one of the artist's masters: created with it, or linked
-- later. One event per artist, even when the project holds two of their
-- masters.
create or replace function public.project_masters_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects;
begin
  select * into v_project from public.projects where id = new.project_id;
  insert into public.activity_events (organization_id, artist_id, project_id, kind,
                                      actor_person_id, subject_id, detail)
  select new.organization_id, ma.artist_id, new.project_id,
         case when v_project.created_at = now() then 'project_created' else 'project_linked' end,
         public.auth_person_id(), new.project_id,
         jsonb_build_object('title', v_project.title)
    from public.master_artists ma
   where ma.master_id = new.master_id
     and not exists (
       select 1 from public.activity_events e
        where e.project_id = new.project_id and e.artist_id = ma.artist_id
          and e.kind in ('project_created', 'project_linked')
     );
  return null;
end;
$$;

revoke execute on function public.project_masters_log() from public, anon, authenticated;

create trigger z_log after insert on public.project_masters
  for each row execute function public.project_masters_log();

-- Transmissions of a project, for each artist of its masters.
create or replace function public.project_assignments_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
begin
  if tg_op = 'INSERT' then
    v_kind := 'project_transmitted';
  elsif old.status = 'pending' and new.status <> 'pending' then
    v_kind := 'project_' || new.status;
  else
    return null;
  end if;
  insert into public.activity_events (organization_id, artist_id, project_id, kind,
                                      actor_person_id, subject_id, detail)
  select distinct on (ma.artist_id)
         new.organization_id, ma.artist_id, new.project_id, v_kind,
         public.auth_person_id(), new.id,
         jsonb_build_object(
           'title', p.title,
           'assignee', btrim(pe.first_name || ' ' || coalesce(pe.last_name, '')))
    from public.project_masters pm
    join public.master_artists ma on ma.master_id = pm.master_id
    join public.projects p on p.id = pm.project_id
    left join public.people pe on pe.id = new.assignee_person_id
   where pm.project_id = new.project_id;
  return null;
end;
$$;

revoke execute on function public.project_assignments_log() from public, anon, authenticated;

create trigger z_log after insert or update of status on public.project_assignments
  for each row execute function public.project_assignments_log();

-- ---------------------------------------------------------------------------
-- Backfill: the history before this migration, from each table's dates.
-- ---------------------------------------------------------------------------

insert into public.activity_events (organization_id, artist_id, kind, actor_person_id,
                                    subject_id, detail, created_at)
select a.organization_id, a.id, 'artist_created', a.created_by, a.id,
       jsonb_build_object('name', a.name), a.created_at
  from public.artists a;

insert into public.activity_events (organization_id, artist_id, kind, actor_person_id,
                                    subject_id, detail, created_at)
select ma.organization_id, ma.artist_id, 'master_created', m.created_by, m.id,
       jsonb_build_object('title', m.title, 'version', m.version, 'role', ma.role), m.created_at
  from public.master_artists ma
  join public.masters m on m.id = ma.master_id;

insert into public.activity_events (organization_id, artist_id, project_id, kind,
                                    actor_person_id, subject_id, detail, created_at)
select distinct on (p.id, ma.artist_id)
       p.organization_id, ma.artist_id, p.id, 'project_created', p.created_by, p.id,
       jsonb_build_object('title', p.title), p.created_at
  from public.projects p
  join public.project_masters pm on pm.project_id = p.id
  join public.master_artists ma on ma.master_id = pm.master_id;

insert into public.activity_events (organization_id, artist_id, project_id, kind,
                                    actor_person_id, subject_id, detail, created_at)
select distinct on (x.id, x.kind, ma.artist_id)
       x.organization_id, ma.artist_id, x.project_id, x.kind, x.actor, x.id,
       jsonb_build_object('title', p.title,
                          'assignee', btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))),
       x.at
  from (
    select pa.id, pa.organization_id, pa.project_id, pa.assignee_person_id,
           'project_transmitted' as kind, pa.assigned_by as actor, pa.created_at as at
      from public.project_assignments pa
    union all
    select pa.id, pa.organization_id, pa.project_id, pa.assignee_person_id,
           'project_' || pa.status, pa.assignee_person_id, pa.responded_at
      from public.project_assignments pa
     where pa.status <> 'pending' and pa.responded_at is not null
  ) x
  join public.projects p on p.id = x.project_id
  join public.project_masters pm on pm.project_id = x.project_id
  join public.master_artists ma on ma.master_id = pm.master_id
  left join public.people pe on pe.id = x.assignee_person_id;
