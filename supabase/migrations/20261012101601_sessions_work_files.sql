-- Retours Catalogue du 11/10/2026, retours 17, 21, 27 à 38 (docs/ARCHITECTURE.md
-- § 2 sexies, « Sessions et fichiers de travail »).
--
-- Sessions: one session, several titles. A session keeps the title it was
-- created on (master_id, its origin) and is linked to every title it worked
-- on (master_session_titles): no copy, the same row seen from each title. It
-- has a state (planned, done, cancelled), optional times, and keeps the
-- engineer picked in the Réseau (engineer_contact_id) beside the name, so a
-- name kept alone can be linked later without retyping. Detaching a title
-- and deleting the session are two acts: a session still linked to another
-- title is never deleted, only detached.
--
-- Working files: the « Pistes » typed one by one give way to the title's
-- working files, the existing « stems » category of master_files (session
-- folders, ZIP, Pro Tools or Logic projects, multitracks, stems), each with
-- its session (optional) and its state (provisional, final), versioned like
-- every file; stored once, read from the Audio tab, the Files tab and the
-- session. A file above the storage limit (50 Mo per file, the plan's) is
-- kept as a link to where it is shared (master_work_links), never copied.

-- ---------------------------------------------------------------------------
-- 1. Sessions shared between titles
-- ---------------------------------------------------------------------------

alter table public.master_sessions
  add column status text not null default 'done',
  add column starts_at time,
  add column ends_at time,
  add column engineer_contact_id uuid;
alter table public.master_sessions add constraint master_sessions_status_check
  check (status in ('planned', 'done', 'cancelled'));
alter table public.master_sessions add constraint master_sessions_times_check
  check (ends_at is null or starts_at is null or ends_at > starts_at);
alter table public.master_sessions add constraint master_sessions_engineer_contact_same_org
  foreign key (engineer_contact_id, organization_id)
  references public.network_contacts (id, organization_id) on delete set null (engineer_contact_id);
grant insert (status, starts_at, ends_at, engineer_contact_id),
      update (status, starts_at, ends_at, engineer_contact_id)
  on public.master_sessions to authenticated;

create table public.master_session_titles (
  session_id uuid not null,
  master_id uuid not null,
  organization_id uuid not null,
  created_by uuid references public.people (id),
  linked_at timestamptz not null default now(),
  primary key (session_id, master_id),
  constraint master_session_titles_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete cascade,
  constraint master_session_titles_master_same_org foreign key (master_id, organization_id)
    references public.masters (id, organization_id) on delete cascade
);
create index master_session_titles_master_idx on public.master_session_titles (master_id);

-- Every session is linked to its origin title, now and later.
insert into public.master_session_titles (session_id, master_id, organization_id, created_by, linked_at)
select id, master_id, organization_id, created_by, created_at from public.master_sessions
on conflict do nothing;

create or replace function public.master_sessions_link_origin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.master_session_titles (session_id, master_id, organization_id, created_by)
  values (new.id, new.master_id, new.organization_id, public.auth_person_id())
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.master_sessions_link_origin() from public, anon, authenticated;
create trigger y_link_origin after insert on public.master_sessions
  for each row execute function public.master_sessions_link_origin();

alter table public.master_session_titles enable row level security;
alter table public.master_session_titles force row level security;
revoke all on table public.master_session_titles from anon, authenticated;
grant select, delete on public.master_session_titles to authenticated;
grant insert (session_id, master_id, organization_id) on public.master_session_titles to authenticated;
create policy master_session_titles_select on public.master_session_titles
  for select to authenticated using (public.is_active_member(organization_id));
-- « Rattacher une session existante » to a live title.
create policy master_session_titles_insert on public.master_session_titles
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog')
              and public.master_is_live(master_id));
create policy master_session_titles_delete on public.master_session_titles
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog')
         and public.master_is_live(master_id));
create trigger a_set_created_by before insert on public.master_session_titles
  for each row execute function public.set_created_by();

-- Writing a session from any title it is linked to (not only its origin).
create or replace function public.master_session_writable(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.master_session_titles l
      join public.master_sessions s on s.id = l.session_id
     where l.session_id = p_session_id
       and public.has_permission(s.organization_id, 'manage_catalog')
       and public.master_is_live(l.master_id));
$$;
revoke execute on function public.master_session_writable(uuid) from public, anon;
grant execute on function public.master_session_writable(uuid) to authenticated;

drop policy master_sessions_update_catalog on public.master_sessions;
create policy master_sessions_update_catalog on public.master_sessions
  for update to authenticated
  using (public.master_session_writable(id))
  with check (public.has_permission(organization_id, 'manage_catalog'));

-- Detaching the last title would leave the session nowhere: delete it
-- instead. Detaching its origin hands it to another linked title.
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
  if v_other is null then
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
revoke execute on function public.master_session_titles_detach() from public, anon, authenticated;
create trigger a_detach before delete on public.master_session_titles
  for each row execute function public.master_session_titles_detach();

-- A session still linked to another title is never deleted (retour 35).
create or replace function public.master_sessions_guard_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.master_session_titles where session_id = old.id) > 1 then
    raise exception 'session_shared' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
create trigger a_guard_shared before delete on public.master_sessions
  for each row execute function public.master_sessions_guard_delete();

-- A title deleted for good hands its shared sessions to another title they
-- are linked to, before its own rows go (a session shared is never lost).
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
     and exists (select 1 from public.master_session_titles l
                  where l.session_id = s.id and l.master_id <> old.id);
  return old;
end;
$$;
revoke execute on function public.masters_hand_over_sessions() from public, anon, authenticated;
create trigger a_hand_over_sessions before delete on public.masters
  for each row execute function public.masters_hand_over_sessions();

-- ---------------------------------------------------------------------------
-- 2. Working files
-- ---------------------------------------------------------------------------

alter table public.master_files
  add column session_id uuid,
  add column work_status text;
alter table public.master_files add constraint master_files_session_same_org
  foreign key (session_id, organization_id)
  references public.master_sessions (id, organization_id) on delete set null (session_id);
alter table public.master_files add constraint master_files_work_status_check
  check (work_status is null or work_status in ('provisional', 'final'));
alter table public.master_files add constraint master_files_work_shape_check
  check (category = 'stems' or (session_id is null and work_status is null));
create index master_files_session_idx on public.master_files (session_id)
  where session_id is not null;
grant insert (session_id, work_status), update (session_id, work_status)
  on public.master_files to authenticated;

-- A working file's session is one of its title's sessions.
create or replace function public.master_work_session_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.session_id is not null and not exists (
    select 1 from public.master_session_titles
     where session_id = new.session_id and master_id = new.master_id) then
    raise exception 'session_not_of_title' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.master_work_session_check() from public, anon, authenticated;
create trigger b_work_session before insert or update of session_id on public.master_files
  for each row execute function public.master_work_session_check();

-- Working files too large for the storage: a link to where they are.
create table public.master_work_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  master_id uuid not null,
  session_id uuid,
  label text not null,
  url text not null,
  work_status text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_work_links_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint master_work_links_url_check
    check (url ~ '^https://[^\s]+$' and char_length(url) <= 2000),
  constraint master_work_links_status_check
    check (work_status is null or work_status in ('provisional', 'final')),
  constraint master_work_links_master_same_org foreign key (master_id, organization_id)
    references public.masters (id, organization_id) on delete cascade,
  constraint master_work_links_session_same_org foreign key (session_id, organization_id)
    references public.master_sessions (id, organization_id) on delete set null (session_id)
);
create index master_work_links_master_idx on public.master_work_links (master_id, created_at);

create trigger a_set_created_by before insert on public.master_work_links
  for each row execute function public.set_created_by();
create trigger b_work_session before insert or update of session_id on public.master_work_links
  for each row execute function public.master_work_session_check();

alter table public.master_work_links enable row level security;
alter table public.master_work_links force row level security;
revoke all on table public.master_work_links from anon, authenticated;
grant select, delete on public.master_work_links to authenticated;
grant insert (organization_id, master_id, session_id, label, url, work_status),
      update (session_id, label, url, work_status)
  on public.master_work_links to authenticated;
create policy master_work_links_select on public.master_work_links
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_work_links_insert on public.master_work_links
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog')
              and public.master_is_live(master_id));
create policy master_work_links_update on public.master_work_links
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog')
         and public.master_is_live(master_id))
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy master_work_links_delete on public.master_work_links
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog')
         and public.master_is_live(master_id));
