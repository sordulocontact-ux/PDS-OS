-- Conception (stage 3): the Dossier de conception.
--
-- The Dossier holds:
-- - the creative direction, as text fields (field_values, deliverable =
--   'design_doc'), written by the project owner;
-- - versions deposited for each committed deliverable of the Strategy (cover,
--   capsules, clip…), or for the creative direction itself (moodboard, board:
--   deliverable_id null). A version is a file (private bucket `design-files`)
--   or a link (https, for heavy files kept elsewhere);
-- - the owner's review of each version: approved, or changes requested with a
--   comment. PO never judges a creative version (docs/CONTEXTE-PROJET.md § 7).
--
-- Rules held by the database (rule 6):
-- - the Conception starts only once the Strategy is validated;
-- - it is written only while in progress: submitted or validated, it is frozen;
-- - who deposits: the owner, a creative director of the project's creative
--   team, or the person the deliverable is assigned to
--   (docs/CONTEXTE-PROJET.md § 12: "dépose et propose des versions");
-- - who reviews: the owner only, and only the latest version of a deliverable;
-- - version numbers are counted by the database.

-- ---------------------------------------------------------------------------
-- Editability
-- ---------------------------------------------------------------------------

create or replace function public.design_is_in_progress(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'design' and s.state = 'in_progress'
  );
$$;

revoke execute on function public.design_is_in_progress(uuid) from public, anon;
grant execute on function public.design_is_in_progress(uuid) to authenticated;

-- The owner writes the Dossier's text while the Conception is in progress.
create or replace function public.design_is_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id) and public.design_is_in_progress(p_project_id);
$$;

revoke execute on function public.design_is_editable(uuid) from public, anon;
grant execute on function public.design_is_editable(uuid) to authenticated;

-- Depositing a version: Conception in progress, and the owner, a creative of
-- the project, or the assignee of the deliverable (null = creative direction).
create or replace function public.can_deposit_design_version(p_project_id uuid, p_deliverable_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.design_is_in_progress(p_project_id)
     and public.can_see_project(p_project_id)
     and (
       public.is_project_owner(p_project_id)
       or exists (select 1 from public.project_creatives pc
                  where pc.project_id = p_project_id and pc.person_id = public.auth_person_id())
       or (p_deliverable_id is not null and exists (
             select 1 from public.strategy_deliverables d
             where d.id = p_deliverable_id and d.project_id = p_project_id
               and d.assignee_person_id = public.auth_person_id()))
     );
$$;

revoke execute on function public.can_deposit_design_version(uuid, uuid) from public, anon;
grant execute on function public.can_deposit_design_version(uuid, uuid) to authenticated;

-- Dossier fields follow the rule (restrictive: added to the owner policy).
create policy field_values_design_editable on public.field_values
  as restrictive for insert to authenticated
  with check (deliverable <> 'design_doc' or public.design_is_editable(project_id));

-- ---------------------------------------------------------------------------
-- Versions
-- ---------------------------------------------------------------------------

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The committed deliverable; null = the creative direction itself.
  deliverable_id uuid,
  -- Counted by the database per deliverable (1, 2, 3…).
  number integer not null default 0,
  kind text not null,
  -- File: "<organization_id>/<project_id>/<uuid>[.<ext>]" in design-files.
  path text,
  file_name text,
  mime text,
  bytes bigint,
  -- Link: a heavy file kept elsewhere (Drive, Frame.io, WeTransfer…).
  url text,
  note text,
  status text not null default 'submitted',
  review_comment text,
  reviewed_by uuid references public.people (id),
  reviewed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_versions_kind_check check (kind in ('file', 'link')),
  constraint design_versions_file_check check (
    (kind = 'file') = (path is not null)
    and (kind <> 'file' or (
      btrim(coalesce(file_name, '')) <> '' and char_length(file_name) <= 255
      and char_length(coalesce(mime, '')) between 1 and 255
      and bytes > 0 and bytes <= 52428800
      and path ~ ('^' || organization_id::text || '/' || project_id::text
                  || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')))),
  constraint design_versions_link_check check (
    (kind = 'link') = (url is not null)
    and (url is null or (url ~ '^https://[^\s]+$' and char_length(url) <= 2000))),
  constraint design_versions_note_check check (note is null or char_length(note) <= 1000),
  constraint design_versions_status_check
    check (status in ('submitted', 'approved', 'changes_requested')),
  constraint design_versions_reviewed check ((status = 'submitted') = (reviewed_at is null)),
  constraint design_versions_changes_reason
    check (status <> 'changes_requested' or btrim(coalesce(review_comment, '')) <> ''),
  constraint design_versions_path_key unique (path),
  constraint design_versions_id_org_key unique (id, organization_id),
  constraint design_versions_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint design_versions_deliverable_same_org
    foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id)
);

create unique index design_versions_number_key
  on public.design_versions (project_id, coalesce(deliverable_id, '00000000-0000-0000-0000-000000000000'::uuid), number);
create index design_versions_project_idx on public.design_versions (project_id, created_at);

-- The deliverable belongs to the project; the number follows the last one.
create or replace function public.design_versions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and not exists (
    select 1 from public.strategy_deliverables d
    where d.id = new.deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project';
  end if;
  -- One deposit at a time per deliverable: the number cannot be taken twice.
  perform pg_advisory_xact_lock(hashtext(new.project_id::text || coalesce(new.deliverable_id::text, '')));
  select coalesce(max(v.number), 0) + 1 into new.number
    from public.design_versions v
   where v.project_id = new.project_id
     and v.deliverable_id is not distinct from new.deliverable_id;
  return new;
end;
$$;

revoke execute on function public.design_versions_before_insert() from public, anon, authenticated;

create trigger a_set_created_by before insert on public.design_versions
  for each row execute function public.set_created_by();
create trigger b_number before insert on public.design_versions
  for each row execute function public.design_versions_before_insert();

alter table public.design_versions enable row level security;
alter table public.design_versions force row level security;
revoke all on table public.design_versions from anon, authenticated;
grant select, delete on table public.design_versions to authenticated;
grant insert (organization_id, project_id, deliverable_id, kind, path, file_name, mime, bytes, url, note)
  on public.design_versions to authenticated;

create policy design_versions_select_visible on public.design_versions
  for select to authenticated
  using (public.can_see_project(project_id));

create policy design_versions_insert_depositor on public.design_versions
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and public.can_deposit_design_version(project_id, deliverable_id));

-- Its author withdraws a version not reviewed yet, while in progress.
create policy design_versions_delete_author on public.design_versions
  for delete to authenticated
  using (created_by = public.auth_person_id() and status = 'submitted'
         and public.design_is_in_progress(project_id));

-- The owner reviews the latest version of a deliverable.
create or replace function public.review_design_version(
  p_version_id uuid,
  p_approve boolean,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_versions%rowtype;
begin
  select * into v from public.design_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if v.status <> 'submitted' then
    raise exception 'invalid_transition';
  end if;
  if exists (select 1 from public.design_versions o
             where o.project_id = v.project_id
               and o.deliverable_id is not distinct from v.deliverable_id
               and o.number > v.number) then
    raise exception 'version_superseded';
  end if;
  if not p_approve and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;

  update public.design_versions
     set status = case when p_approve then 'approved' else 'changes_requested' end,
         review_comment = nullif(btrim(coalesce(p_comment, '')), ''),
         reviewed_by = public.auth_person_id(),
         reviewed_at = now()
   where id = p_version_id;
end;
$$;

revoke execute on function public.review_design_version(uuid, boolean, text) from public, anon;
grant execute on function public.review_design_version(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket design-files
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-files', 'design-files', false, 52428800, null)
on conflict (id) do nothing;

-- Whoever sees the project reads its versions.
create policy design_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'design-files'
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
  );

-- Anyone who may deposit something in the project uploads; the row insert
-- then checks the deliverable. objects.name spelled out (subquery).
create policy design_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'design-files'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and (public.can_deposit_design_version(p.id, null)
              or exists (select 1 from public.strategy_deliverables d
                         where d.project_id = p.id
                           and public.can_deposit_design_version(p.id, d.id)))
    )
  );

-- An object whose row is gone (withdrawn, or never recorded) can be removed
-- by someone who may deposit in the project.
create policy design_files_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'design-files'
    and not exists (select 1 from public.design_versions v where v.path = objects.name)
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
  );

-- ---------------------------------------------------------------------------
-- Starting the Conception requires a validated Strategy
-- ---------------------------------------------------------------------------

create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
  v_previous text;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'not_started' then
    raise exception 'invalid_transition';
  end if;

  select d.key into v_key from public.stage_definitions d where d.id = v_stage.stage_definition_id;
  if v_key = 'framing' and not public.framing_is_open(v_stage.project_id) then
    raise exception 'framing_requires_call';
  end if;
  v_previous := case v_key
    when 'launch_strategy' then 'framing'
    when 'design' then 'launch_strategy'
  end;
  if v_previous is not null and not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = v_stage.project_id and d.key = v_previous and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;

  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications: a version waits for the owner, a review goes to its author
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested',
  'validation_approved', 'validation_rejected', 'task_assigned',
  'project_creative_added', 'design_version_submitted',
  'design_version_approved', 'design_version_changes_requested'));

create or replace function public.design_versions_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select p.owner_person_id into v_owner from public.projects p where p.id = new.project_id;
    perform public.notify(new.organization_id, v_owner, 'design_version_submitted',
                          new.project_id, new.id);
  elsif old.status = 'submitted' and new.status <> 'submitted' then
    perform public.notify(new.organization_id, new.created_by, 'design_version_' || new.status,
                          new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.design_versions_notify() from public, anon, authenticated;

create trigger z_notify after insert or update of status on public.design_versions
  for each row execute function public.design_versions_notify();
