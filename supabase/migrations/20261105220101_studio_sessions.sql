-- Sessions studio and Maquettes (retours d'Ibé du 01/11/2026, « Sessions studio
-- accessibles depuis la barre de menu, jusqu'au master » and « Importer et
-- stocker des fichiers rattachés aux sessions, artistes et projets »; his
-- answers of 05/11/2026). docs/ARCHITECTURE.md § 2 sexies bis.
--
-- 1. A session no longer needs a title: master_sessions.master_id (its origin
--    title) becomes optional, and a session is linked to as many artists
--    (master_session_artists) and projects (master_session_projects) as it
--    concerns, beside its titles (master_session_titles). One row, seen from
--    each of them, never copied.
-- 2. Its participants (members and Réseau contacts), its links (rushes kept on
--    Google Drive, never copied into the storage) and its report (« compte
--    rendu »: what was important, written after the session).
-- 3. Writing sessions takes its own permission, manage_sessions (the DG and
--    the project managers), so who may create one is a matter of position.
-- 4. A title can be a maquette (masters.demo_status: draft, developing,
--    validated, abandoned; null = an official master). The artistic validation
--    is not the release decision: « Passer au catalogue des masters »
--    (promote_demo) is a gesture of its own, on a validated maquette, by the
--    DG, on the same row, so its history stays.

-- ---------------------------------------------------------------------------
-- 0. The permission
-- ---------------------------------------------------------------------------

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
            'manage_contracts', 'manage_legal', 'manage_sessions']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions']
    when 'creative_director' then array['creative_work', 'manage_network']
    else array[]::text[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- 1. A session without a title
-- ---------------------------------------------------------------------------

alter table public.master_sessions alter column master_id drop not null;

alter table public.master_sessions
  add column report_notes text,
  add column reported_at timestamptz,
  add column reported_by uuid references public.people (id);
alter table public.master_sessions add constraint master_sessions_report_check
  check (report_notes is null or (btrim(report_notes) <> '' and char_length(report_notes) <= 5000));
grant update (report_notes) on public.master_sessions to authenticated;

-- Who wrote the report and when: set here, never by the client.
create or replace function public.master_sessions_stamp_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.report_notes is distinct from old.report_notes then
    if new.report_notes is null then
      new.reported_at := null;
      new.reported_by := null;
    else
      new.reported_at := now();
      new.reported_by := public.auth_person_id();
    end if;
  else
    new.reported_at := old.reported_at;
    new.reported_by := old.reported_by;
  end if;
  return new;
end;
$$;
create trigger b_stamp_report before update on public.master_sessions
  for each row execute function public.master_sessions_stamp_report();

-- The origin title is linked only when there is one.
create or replace function public.master_sessions_link_origin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.master_id is not null then
    insert into public.master_session_titles (session_id, master_id, organization_id, created_by)
    values (new.id, new.master_id, new.organization_id, public.auth_person_id())
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Written with manage_sessions; a title it is created on must be live.
drop policy master_sessions_insert_catalog on public.master_sessions;
drop policy master_sessions_update_catalog on public.master_sessions;
drop policy master_sessions_delete_catalog on public.master_sessions;
create policy master_sessions_insert on public.master_sessions
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_sessions')
              and (master_id is null or public.master_is_live(master_id)));
create policy master_sessions_update on public.master_sessions
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_sessions'))
  with check (public.has_permission(organization_id, 'manage_sessions'));
create policy master_sessions_delete on public.master_sessions
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_sessions'));

drop policy master_session_titles_insert on public.master_session_titles;
drop policy master_session_titles_delete on public.master_session_titles;
create policy master_session_titles_insert on public.master_session_titles
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_sessions')
              and public.master_is_live(master_id));
create policy master_session_titles_delete on public.master_session_titles
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_sessions'));


-- ---------------------------------------------------------------------------
-- 2. Artists, projects, participants and links of a session
-- ---------------------------------------------------------------------------

create table public.master_session_artists (
  session_id uuid not null,
  artist_id uuid not null,
  organization_id uuid not null,
  created_by uuid references public.people (id),
  linked_at timestamptz not null default now(),
  primary key (session_id, artist_id),
  constraint master_session_artists_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete cascade,
  constraint master_session_artists_artist_same_org foreign key (artist_id, organization_id)
    references public.artists (id, organization_id) on delete cascade
);
create index master_session_artists_artist_idx on public.master_session_artists (artist_id);

create table public.master_session_projects (
  session_id uuid not null,
  project_id uuid not null,
  organization_id uuid not null,
  created_by uuid references public.people (id),
  linked_at timestamptz not null default now(),
  primary key (session_id, project_id),
  constraint master_session_projects_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete cascade,
  constraint master_session_projects_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index master_session_projects_project_idx on public.master_session_projects (project_id);

-- Who takes part: a member (person_id) or a Réseau contact (contact_id).
create table public.master_session_attendees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  organization_id uuid not null,
  person_id uuid references public.people (id) on delete cascade,
  contact_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_session_attendees_one_check
    check ((person_id is null) <> (contact_id is null)),
  constraint master_session_attendees_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete cascade,
  constraint master_session_attendees_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade
);
create unique index master_session_attendees_person_key
  on public.master_session_attendees (session_id, person_id) where person_id is not null;
create unique index master_session_attendees_contact_key
  on public.master_session_attendees (session_id, contact_id) where contact_id is not null;

-- Where the rushes and big files are kept (Google Drive…): a link, never a copy.
create table public.master_session_links (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  organization_id uuid not null,
  label text not null,
  url text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_session_links_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint master_session_links_url_check
    check (url ~ '^https://' and char_length(url) <= 2000),
  constraint master_session_links_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete cascade
);
create index master_session_links_session_idx on public.master_session_links (session_id);

do $$
declare
  t text;
begin
  foreach t in array array['master_session_artists', 'master_session_projects',
                           'master_session_attendees', 'master_session_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, delete on public.%I to authenticated', t);
    execute format('create trigger a_set_created_by before insert on public.%I
                      for each row execute function public.set_created_by()', t);
    execute format('create policy %I on public.%I for insert to authenticated
                      with check (public.has_permission(organization_id, ''manage_sessions''))',
                   t || '_insert', t);
    execute format('create policy %I on public.%I for delete to authenticated
                      using (public.has_permission(organization_id, ''manage_sessions''))',
                   t || '_delete', t);
    if t <> 'master_session_projects' then
      execute format('create policy %I on public.%I for select to authenticated
                        using (public.is_active_member(organization_id))', t || '_select', t);
    end if;
  end loop;
end;
$$;

-- A project's link is seen, and made, by those who see the project.
create policy master_session_projects_select on public.master_session_projects
  for select to authenticated
  using (public.is_active_member(organization_id) and public.can_see_project(project_id));
drop policy master_session_projects_insert on public.master_session_projects;
create policy master_session_projects_insert on public.master_session_projects
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_sessions')
              and public.can_see_project(project_id));

grant insert (session_id, artist_id, organization_id) on public.master_session_artists to authenticated;
grant insert (session_id, project_id, organization_id) on public.master_session_projects to authenticated;
grant insert (session_id, organization_id, person_id, contact_id)
  on public.master_session_attendees to authenticated;
grant insert (session_id, organization_id, label, url) on public.master_session_links to authenticated;
grant update (label, url) on public.master_session_links to authenticated;
create policy master_session_links_update on public.master_session_links
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_sessions'))
  with check (public.has_permission(organization_id, 'manage_sessions'));

-- A session still anchored somewhere (an artist, a project).
create or replace function public.master_session_anchored(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_session_artists where session_id = p_session_id)
      or exists (select 1 from public.master_session_projects where session_id = p_session_id);
$$;
revoke execute on function public.master_session_anchored(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Detaching, deleting a title: a session anchored elsewhere stays
-- ---------------------------------------------------------------------------

create or replace function public.master_session_titles_detach()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other uuid;
begin
  -- The session or the title itself is going (cascade): nothing to keep.
  if not exists (select 1 from public.master_sessions where id = old.session_id)
     or not exists (select 1 from public.masters where id = old.master_id) then
    return old;
  end if;
  select master_id into v_other from public.master_session_titles
   where session_id = old.session_id and master_id <> old.master_id
   order by linked_at limit 1;
  -- The last title of a session tied to nothing else: delete it instead.
  if v_other is null and not public.master_session_anchored(old.session_id) then
    raise exception 'session_last_title' using errcode = 'P0001';
  end if;
  update public.master_sessions set master_id = v_other
   where id = old.session_id and master_id = old.master_id;
  -- Its working files on that title lose the link, never the file.
  update public.master_files set session_id = null
   where session_id = old.session_id and master_id = old.master_id;
  return old;
end;
$$;

create or replace function public.masters_hand_over_sessions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.master_sessions s
     set master_id = (select l.master_id from public.master_session_titles l
                       where l.session_id = s.id and l.master_id <> old.id
                       order by l.linked_at limit 1)
   where s.master_id = old.id
     and (exists (select 1 from public.master_session_titles l
                   where l.session_id = s.id and l.master_id <> old.id)
          or public.master_session_anchored(s.id));
  return old;
end;
$$;

-- The title's journal: a session without a title has no title to log on.
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
  if v_row ->> 'master_id' is null then
    return null;
  end if;
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

-- ---------------------------------------------------------------------------
-- 4. Maquettes
-- ---------------------------------------------------------------------------

alter table public.masters
  add column demo_status text,
  add column promoted_at timestamptz,
  add column promoted_by uuid references public.people (id);
alter table public.masters add constraint masters_demo_status_check
  check (demo_status is null or demo_status in ('draft', 'developing', 'validated', 'abandoned'));
create index masters_demo_idx on public.masters (organization_id) where demo_status is not null;

-- Created as a maquette (create_master), never validated at once; the status
-- then moves only through set_demo_status and promote_demo (no update grant).
grant insert (demo_status) on public.masters to authenticated;
create or replace function public.masters_check_demo_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.demo_status is not null and new.demo_status not in ('draft', 'developing') then
    raise exception 'demo_status_at_creation' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger a_check_demo before insert on public.masters
  for each row execute function public.masters_check_demo_insert();

-- The status of a maquette. Validating (and un-validating) is an artistic
-- decision: the DG or the creative director. The other statuses: also
-- whoever manages the catalogue.
create or replace function public.set_demo_status(p_master_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.masters%rowtype;
  v_artistic boolean;
begin
  select * into v_master from public.masters where id = p_master_id for update;
  if v_master.id is null or not public.is_active_member(v_master.organization_id) then
    raise exception 'master_not_found' using errcode = '42501';
  end if;
  if v_master.demo_status is null or v_master.archived_at is not null then
    raise exception 'not_a_demo' using errcode = 'P0001';
  end if;
  if p_status is null or p_status not in ('draft', 'developing', 'validated', 'abandoned') then
    raise exception 'demo_status_invalid' using errcode = '22023';
  end if;
  v_artistic := public.has_permission(v_master.organization_id, 'validate')
             or public.has_permission(v_master.organization_id, 'creative_work');
  if not v_artistic
     and (p_status = 'validated' or v_master.demo_status = 'validated'
          or not public.has_permission(v_master.organization_id, 'manage_catalog')) then
    raise exception 'demo_status_forbidden' using errcode = '42501';
  end if;
  update public.masters set demo_status = p_status where id = p_master_id;
end;
$$;
revoke execute on function public.set_demo_status(uuid, text) from public, anon;
grant execute on function public.set_demo_status(uuid, text) to authenticated;

-- « Passer au catalogue des masters »: the release decision, by the DG, on a
-- validated maquette. Same row: its sessions, files, credits and journal stay.
create or replace function public.promote_demo(p_master_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.masters%rowtype;
begin
  select * into v_master from public.masters where id = p_master_id for update;
  if v_master.id is null or not public.is_active_member(v_master.organization_id) then
    raise exception 'master_not_found' using errcode = '42501';
  end if;
  if not public.has_permission(v_master.organization_id, 'validate') then
    raise exception 'promote_forbidden' using errcode = '42501';
  end if;
  if v_master.demo_status is distinct from 'validated' or v_master.archived_at is not null then
    raise exception 'demo_not_validated' using errcode = 'P0001';
  end if;
  if p_title is null or btrim(p_title) = '' or char_length(btrim(p_title)) > 200 then
    raise exception 'title_invalid' using errcode = '22023';
  end if;
  update public.masters
     set title = btrim(p_title),
         demo_status = null,
         promoted_at = now(),
         promoted_by = public.auth_person_id()
   where id = p_master_id;
end;
$$;
revoke execute on function public.promote_demo(uuid, text) from public, anon;
grant execute on function public.promote_demo(uuid, text) to authenticated;

-- create_master: one more argument, the maquette status (null = a master).
drop function public.create_master(uuid, text, jsonb, text, text, integer, text, text, jsonb);

create function public.create_master(
  p_organization_id uuid,
  p_title text,
  p_credits jsonb,
  p_variant text default 'original',
  p_isrc text default null,
  p_duration_seconds integer default null,
  p_variant_label text default null,
  p_audio_state text default null,
  p_contributors jsonb default '[]'::jsonb,
  p_demo_status text default null
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
  if jsonb_typeof(coalesce(p_contributors, '[]'::jsonb)) <> 'array'
     or exists (select 1 from jsonb_array_elements(coalesce(p_contributors, '[]'::jsonb)) c
                where jsonb_typeof(c -> 'roles') is distinct from 'array'
                   or jsonb_array_length(c -> 'roles') = 0) then
    raise exception 'contributor_requires_role' using errcode = '23514';
  end if;

  insert into public.masters (organization_id, title, variant, variant_label, audio_state,
                              isrc, duration_seconds, demo_status)
  values (
    p_organization_id,
    btrim(p_title),
    coalesce(p_variant, 'original'),
    case when p_variant = 'other' then nullif(btrim(p_variant_label), '') end,
    p_audio_state,
    nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
    p_duration_seconds,
    p_demo_status
  )
  returning id into v_id;

  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select p_organization_id, v_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
  from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);

  -- Each role a row, in the order given; the table's checks and RLS decide.
  insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
  select p_organization_id, v_id, btrim(c.value ->> 'name'), r.value,
         nullif(c.value ->> 'contact_id', '')::uuid
    from jsonb_array_elements(coalesce(p_contributors, '[]'::jsonb))
         with ordinality as c (value, ordinality)
   cross join lateral (select distinct x.value
                         from jsonb_array_elements_text(c.value -> 'roles') as x (value)) r
   order by c.ordinality, r.value;

  return v_id;
end;
$$;
revoke execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text, jsonb, text)
  from public, anon;
grant execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text, jsonb, text)
  to authenticated;

-- A project's pages follow its sessions (docs/ARCHITECTURE.md § 3 bis).
select public.attach_project_live();
