-- Catalog (artists, masters and their credits) and project creation around
-- masters (docs/PARCOURS-01-ARTISTE-MASTER-PROJET.md).
--
-- What changes for projects:
--   * a project has a type (music_release, partnership, content) instead of
--     single / EP / album, and links to 0..n masters;
--   * a music release needs at least one master (checked at commit);
--   * creating a project no longer instantiates its stages: launching comes
--     after a project manager accepts it (next step), never at creation;
--   * nobody owns a project at creation.
-- The artist of a project is now read through its masters; artist_id stays
-- for projects created before this migration.
--
-- Permissions (role_permissions, the single mapping):
--   manage_catalog   create artists and masters     DG, project manager
--   create_projects  create a project               DG

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects']
    when 'project_manager' then array['pilot_projects', 'manage_catalog']
    when 'creative_director' then array['creative_work']
    else array[]::text[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- Artists
-- ---------------------------------------------------------------------------

alter table public.artists add column notes text;
alter table public.artists
  add constraint artists_notes_length check (notes is null or char_length(notes) <= 5000);

-- One active artist per stage name, whatever the case or surrounding spaces.
create unique index artists_org_name_key
  on public.artists (organization_id, lower(btrim(name)))
  where archived_at is null;

drop policy artists_insert_members on public.artists;
drop policy artists_update_members on public.artists;
create policy artists_insert_catalog on public.artists
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy artists_update_catalog on public.artists
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog'));

grant insert (notes) on public.artists to authenticated;
grant update (notes) on public.artists to authenticated;

-- ---------------------------------------------------------------------------
-- Masters and credits
-- ---------------------------------------------------------------------------

create table public.masters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null,
  -- "radio edit", "instrumental"… null = main version.
  version text,
  -- Stored normalized: 12 characters, no hyphens.
  isrc text,
  duration_seconds integer,
  created_by uuid references public.people (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint masters_title_not_blank check (btrim(title) <> ''),
  constraint masters_version_not_blank check (version is null or btrim(version) <> ''),
  constraint masters_isrc_format check (isrc is null or isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  constraint masters_duration_range check (duration_seconds is null or duration_seconds between 1 and 86399),
  constraint masters_id_org_key unique (id, organization_id)
);

create unique index masters_org_isrc_key on public.masters (organization_id, isrc)
  where isrc is not null;
create index masters_org_idx on public.masters (organization_id, created_at desc);
create index masters_title_trgm on public.masters using gin (title extensions.gin_trgm_ops);

create table public.master_artists (
  organization_id uuid not null,
  master_id uuid not null,
  artist_id uuid not null,
  role text not null default 'main',
  -- Display order of the credits, from 1.
  position integer not null,
  created_at timestamptz not null default now(),
  constraint master_artists_pkey primary key (master_id, artist_id),
  constraint master_artists_position_key unique (master_id, position),
  constraint master_artists_role_check check (role in ('main', 'featuring')),
  constraint master_artists_position_positive check (position >= 1),
  constraint master_artists_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade,
  constraint master_artists_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index master_artists_artist_idx on public.master_artists (artist_id);

-- A master always has at least one artist. Deferred: the master and its
-- credits are written in the same transaction (create_master).
create or replace function public.masters_check_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master_id uuid;
begin
  -- Separate statements: a CASE would resolve new.master_id on a masters row.
  if tg_table_name = 'masters' then
    v_master_id := new.id;
  elsif tg_op = 'DELETE' then
    v_master_id := old.master_id;
  else
    v_master_id := new.master_id;
  end if;
  if exists (select 1 from public.masters m where m.id = v_master_id)
     and not exists (select 1 from public.master_artists ma where ma.master_id = v_master_id) then
    raise exception 'master_requires_artist';
  end if;
  return null;
end;
$$;

revoke execute on function public.masters_check_credits() from public, anon, authenticated;

create constraint trigger z_check_credits
  after insert on public.masters
  deferrable initially deferred
  for each row execute function public.masters_check_credits();
create constraint trigger z_check_credits
  after delete or update of master_id on public.master_artists
  deferrable initially deferred
  for each row execute function public.masters_check_credits();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

-- Stages are instantiated at launch (after acceptance), not at creation.
-- The function stays: launching will reuse it.
drop trigger create_stages on public.projects;

drop policy projects_insert_members on public.projects;
create policy projects_insert_creators on public.projects
  for insert to authenticated
  with check (public.has_permission(organization_id, 'create_projects'));

revoke insert on public.projects from authenticated;
revoke update on public.projects from authenticated;

alter table public.projects alter column artist_id drop not null;
alter table public.projects drop constraint projects_release_type_check;
alter table public.projects drop column release_type;

alter table public.projects
  add column type text not null default 'music_release',
  add column due_date date,
  add column budget_cents bigint,
  add column priority text,
  add column framing_notes text,
  add constraint projects_type_check check (type in ('music_release', 'partnership', 'content')),
  add constraint projects_budget_positive check (budget_cents is null or budget_cents >= 0),
  add constraint projects_priority_check check (priority is null or priority in ('low', 'normal', 'high')),
  add constraint projects_framing_notes_length
    check (framing_notes is null or char_length(framing_notes) <= 20000);
alter table public.projects alter column type drop default;

grant insert (organization_id, title, type, due_date, budget_cents, priority, framing_notes)
  on public.projects to authenticated;
grant update (title, type, due_date, budget_cents, priority, framing_notes, owner_person_id, archived_at)
  on public.projects to authenticated;

create table public.project_masters (
  organization_id uuid not null,
  project_id uuid not null,
  master_id uuid not null,
  position integer not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint project_masters_pkey primary key (project_id, master_id),
  constraint project_masters_position_positive check (position >= 1),
  constraint project_masters_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  -- Linking never locks nor changes the master: it may join other projects.
  constraint project_masters_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index project_masters_master_idx on public.project_masters (master_id);

-- A music release has at least one master; partnership and content may have
-- none. Checked at commit, so changing the type and the masters together works.
create or replace function public.projects_check_masters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  if tg_table_name = 'projects' then
    v_project_id := new.id;
  elsif tg_op = 'DELETE' then
    v_project_id := old.project_id;
  else
    v_project_id := new.project_id;
  end if;
  if exists (
       select 1 from public.projects p
       where p.id = v_project_id and p.type = 'music_release' and p.archived_at is null)
     and not exists (select 1 from public.project_masters pm where pm.project_id = v_project_id) then
    raise exception 'music_release_requires_master';
  end if;
  return null;
end;
$$;

revoke execute on function public.projects_check_masters() from public, anon, authenticated;

create constraint trigger z_check_masters
  after insert or update of type, archived_at on public.projects
  deferrable initially deferred
  for each row execute function public.projects_check_masters();
create constraint trigger z_check_masters
  after delete or update of project_id on public.project_masters
  deferrable initially deferred
  for each row execute function public.projects_check_masters();

-- Display artist of a project: main credit of its first master, else the
-- artist of a project created before masters existed.
create or replace function public.project_artist_name(p_project_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select a.name
       from public.project_masters pm
       join public.master_artists ma on ma.master_id = pm.master_id
       join public.artists a on a.id = ma.artist_id
      where pm.project_id = p_project_id
      order by pm.position, ma.position
      limit 1),
    (select a.name
       from public.projects p
       join public.artists a on a.id = p.artist_id
      where p.id = p_project_id)
  );
$$;

revoke execute on function public.project_artist_name(uuid) from public, anon;
grant execute on function public.project_artist_name(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS on the new tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['masters', 'master_artists', 'project_masters']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (public.is_active_member(organization_id))', t || '_select_members', t);
  end loop;
end;
$$;

create trigger a_set_updated_at before update on public.masters
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.masters
  for each row execute function public.set_created_by();
create trigger a_set_created_by before insert on public.project_masters
  for each row execute function public.set_created_by();

create policy masters_insert_catalog on public.masters
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy masters_update_catalog on public.masters
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog'));
grant insert (organization_id, title, version, isrc, duration_seconds) on public.masters to authenticated;
grant update (title, version, isrc, duration_seconds, archived_at) on public.masters to authenticated;

create policy master_artists_insert_catalog on public.master_artists
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy master_artists_delete_catalog on public.master_artists
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));
grant insert (organization_id, master_id, artist_id, role, position) on public.master_artists to authenticated;
grant delete on public.master_artists to authenticated;

create policy project_masters_insert_creators on public.project_masters
  for insert to authenticated
  with check (public.has_permission(organization_id, 'create_projects'));
create policy project_masters_delete_creators on public.project_masters
  for delete to authenticated
  using (public.has_permission(organization_id, 'create_projects'));
grant insert (organization_id, project_id, master_id, position) on public.project_masters to authenticated;
grant delete on public.project_masters to authenticated;

-- ---------------------------------------------------------------------------
-- Creation functions — SECURITY INVOKER: RLS and column grants apply, they
-- only make each creation a single transaction.
-- ---------------------------------------------------------------------------

-- p_credits: [{"artist_id": uuid, "role": "main"|"featuring"}, …] in display order.
create or replace function public.create_master(
  p_organization_id uuid,
  p_title text,
  p_credits jsonb,
  p_version text default null,
  p_isrc text default null,
  p_duration_seconds integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) = 0 then
    raise exception 'master_requires_artist';
  end if;

  insert into public.masters (organization_id, title, version, isrc, duration_seconds)
  values (
    p_organization_id,
    btrim(p_title),
    nullif(btrim(p_version), ''),
    nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
    p_duration_seconds
  )
  returning id into v_id;

  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select p_organization_id, v_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
  from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);

  return v_id;
end;
$$;

revoke execute on function public.create_master(uuid, text, jsonb, text, text, integer) from public, anon;
grant execute on function public.create_master(uuid, text, jsonb, text, text, integer) to authenticated;

create or replace function public.create_project(
  p_organization_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_framing_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_type = 'music_release' and coalesce(cardinality(p_master_ids), 0) = 0 then
    raise exception 'music_release_requires_master';
  end if;

  insert into public.projects (organization_id, title, type, due_date, budget_cents, priority, framing_notes)
  values (p_organization_id, btrim(p_title), p_type, p_due_date, p_budget_cents, p_priority,
          nullif(btrim(p_framing_notes), ''))
  returning id into v_id;

  insert into public.project_masters (organization_id, project_id, master_id, position)
  select p_organization_id, v_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(coalesce(p_master_ids, array[]::uuid[])) with ordinality as u (id, ordinality)
    group by u.id
  ) m;

  return v_id;
end;
$$;

revoke execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text) from public, anon;
grant execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Artist of a project, read through its masters
-- ---------------------------------------------------------------------------

create or replace function public.search_projects(p_query text)
returns table (id uuid, title text, artist text, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, pa.name,
         greatest(extensions.word_similarity(lower(p_query), lower(p.title)),
                  extensions.word_similarity(lower(p_query), lower(coalesce(pa.name, '')))) as score
  from public.projects p
  cross join lateral (select public.project_artist_name(p.id) as name) pa
  where p.archived_at is null
    and (btrim(coalesce(p_query, '')) = ''
         or extensions.word_similarity(lower(p_query), lower(p.title)) > 0.3
         or extensions.word_similarity(lower(p_query), lower(coalesce(pa.name, ''))) > 0.3)
  order by score desc, p.created_at desc
  limit 10;
$$;

create or replace function public.get_smartlink(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', r.title,
    'artist', coalesce(public.project_artist_name(r.project_id), ''),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object('platform', l.platform, 'url', l.url) order by l.platform)
      from public.release_links l
      where l.release_id = r.id
    ), '[]'::jsonb)
  )
  from public.releases r
  where r.smartlink_token = p_token
    and r.smartlink_enabled;
$$;
