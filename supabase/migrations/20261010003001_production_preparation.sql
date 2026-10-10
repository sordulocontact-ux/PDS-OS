-- Production, lot 1 (ticket « Workflow Production complet », parcours 1 à 3;
-- docs/ARCHITECTURE.md § 8 nonies): the preparation of a deliverable, before
-- the shooting.
--   1. production_sheets: one per committed deliverable, opened from its
--      validated Conception version (the « version source », kept), with the
--      organisation mode chosen (« Préparer directement avec PO », « Préparer
--      un call de production », « Importer une organisation existante »). The
--      choice triggers nothing outside PDS OS. Opening the first sheet starts
--      the « production » stage, as « Commencer directement » does for the
--      Conception;
--   2. the director's brief, on the sheet: staging intent, coverage, camera
--      set-up, sound, run of show, constraints, references, needs to confirm.
--      Three closed choices (coverage, camera, sound) feed the needs PO
--      suggests (code, lib/production/roles.ts). Written by the owner or by the
--      designated director when the director is a member;
--   3. production_needs: one need = a position in a family (Réalisation, Équipe
--      image, Équipe son, Musiciens / artistes, Production et régie — never
--      image and sound together), a count of people, a speciality for a
--      performer (« Guitare » is a speciality of Musicien, not a category).
--      Only a person adds one: PO's suggestions are computed and never stored;
--   4. production_assignments: who holds a position (a member or a contact of
--      the Réseau) and their availability, confirmed by a person. One person
--      may hold several positions; a position never holds more people than its
--      count;
--   5. production_calls: « Préparer un call de production », a normal call plus
--      what it is for, who takes part and how it is held (as design_calls).
-- The needs, the assignments and the calls are the owner's (« le chef de
-- projet confirme »). Everything is written while the « production » stage is
-- in progress, and read by whoever sees the project.

-- 0. Helpers -----------------------------------------------------------------

-- A committed deliverable's latest approved Conception version: the creative
-- source of its production.
create function public.production_source_version(p_deliverable_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.id from public.design_versions v
   where v.deliverable_id = p_deliverable_id and v.status = 'approved'
   order by v.number desc
   limit 1;
$$;
revoke execute on function public.production_source_version(uuid) from public, anon;
grant execute on function public.production_source_version(uuid) to authenticated;

-- An approved member of the organization (a position held inside PDS).
create function public.production_person_is_member(p_person_id uuid, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.memberships m
                 where m.person_id = p_person_id and m.organization_id = p_org
                   and m.status = 'approved');
$$;
revoke execute on function public.production_person_is_member(uuid, uuid)
  from public, anon, authenticated;

-- 1. Sheets ------------------------------------------------------------------

create table public.production_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  deliverable_id uuid not null,
  -- The approved Conception version it was opened from (« version source »).
  source_version_id uuid,
  -- direct = Préparer directement avec PO; call = Préparer un call de
  -- production; import = Importer une organisation existante.
  mode text not null,
  -- The director: a member (who may then write the brief) or a contact of
  -- the Réseau (the owner writes for them). At most one.
  director_person_id uuid references public.people (id),
  director_contact_id uuid,
  -- The brief. Closed choices: one_take = plan-séquence, cut = découpage,
  -- mixed = mixte; single = une caméra, multi = plusieurs caméras;
  -- playback = playback, live = captation live, mixed = mixte.
  coverage text,
  camera_setup text,
  sound_capture text,
  staging_intent text,
  coverage_note text,
  camera_note text,
  sound_note text,
  run_of_show text,
  constraints_note text,
  references_note text,
  open_needs text,
  brief_updated_at timestamptz,
  brief_updated_by uuid references public.people (id),
  opened_by uuid references public.people (id),
  opened_at timestamptz not null default now(),
  constraint production_sheets_deliverable_key unique (deliverable_id),
  constraint production_sheets_id_org_key unique (id, organization_id),
  constraint production_sheets_mode_check check (mode in ('direct', 'call', 'import')),
  constraint production_sheets_director_check
    check (director_person_id is null or director_contact_id is null),
  constraint production_sheets_coverage_check
    check (coverage is null or coverage in ('one_take', 'cut', 'mixed')),
  constraint production_sheets_camera_check
    check (camera_setup is null or camera_setup in ('single', 'multi')),
  constraint production_sheets_sound_check
    check (sound_capture is null or sound_capture in ('playback', 'live', 'mixed')),
  constraint production_sheets_texts_check check (
    coalesce(char_length(staging_intent), 0) <= 4000
    and coalesce(char_length(coverage_note), 0) <= 4000
    and coalesce(char_length(camera_note), 0) <= 4000
    and coalesce(char_length(sound_note), 0) <= 4000
    and coalesce(char_length(run_of_show), 0) <= 4000
    and coalesce(char_length(constraints_note), 0) <= 4000
    and coalesce(char_length(references_note), 0) <= 4000
    and coalesce(char_length(open_needs), 0) <= 4000),
  constraint production_sheets_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_sheets_deliverable_same_org foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete cascade,
  constraint production_sheets_contact_same_org foreign key (director_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_sheets_version_fk foreign key (source_version_id)
    references public.design_versions (id) on delete set null
);
create index production_sheets_project_idx on public.production_sheets (project_id);

alter table public.production_sheets enable row level security;
alter table public.production_sheets force row level security;
revoke all on table public.production_sheets from anon, authenticated;
-- Written by the functions below only.
grant select on public.production_sheets to authenticated;
create policy production_sheets_select_visible on public.production_sheets
  for select to authenticated using (public.can_see_project(project_id));

-- The brief is written by the owner, or by the director when a member.
create function public.production_brief_can_write(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.production_sheets s
     where s.id = p_sheet_id
       and public.project_stage_in_progress(s.project_id, 'production')
       and (public.is_project_owner(s.project_id)
            or (s.director_person_id is not null
                and s.director_person_id = public.auth_person_id())));
$$;
revoke execute on function public.production_brief_can_write(uuid) from public, anon;
grant execute on function public.production_brief_can_write(uuid) to authenticated;

-- Needs, assignments, director, calls: the owner, while Production runs.
create function public.production_can_organize(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
     and public.project_stage_in_progress(p_project_id, 'production');
$$;
revoke execute on function public.production_can_organize(uuid) from public, anon;
grant execute on function public.production_can_organize(uuid) to authenticated;

-- « Préparer » from a validated Fiche Livrable: owner only. Starts the stage
-- when it has not started yet; opening again only changes the mode (the
-- source version stays the one it was opened from).
create function public.open_production_sheet(p_deliverable_id uuid, p_mode text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deliverable public.strategy_deliverables%rowtype;
  v_stage public.project_stages%rowtype;
  v_version uuid;
  v_id uuid;
begin
  select * into v_deliverable from public.strategy_deliverables where id = p_deliverable_id;
  if not found or not public.can_see_project(v_deliverable.project_id) then
    raise exception 'deliverable_not_found';
  end if;
  if not public.is_project_owner(v_deliverable.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('direct', 'call', 'import') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;
  v_version := public.production_source_version(p_deliverable_id);
  if v_version is null then
    raise exception 'design_not_approved';
  end if;

  select s.* into v_stage from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.project_id = v_deliverable.project_id and d.key = 'production'
   for update of s;
  if not found then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state = 'not_started' then
    update public.project_stages
       set state = 'in_progress', state_changed_at = now(),
           state_changed_by = public.auth_person_id()
     where id = v_stage.id;
  elsif v_stage.state <> 'in_progress' then
    raise exception 'stage_locked';
  end if;

  insert into public.production_sheets
    (organization_id, project_id, deliverable_id, source_version_id, mode, opened_by)
  values (v_deliverable.organization_id, v_deliverable.project_id, p_deliverable_id,
          v_version, p_mode, public.auth_person_id())
  on conflict (deliverable_id) do update set mode = excluded.mode
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.open_production_sheet(uuid, text) from public, anon;
grant execute on function public.open_production_sheet(uuid, text) to authenticated;

-- The owner designates the director (a member or a Réseau contact), or
-- clears it with two nulls.
create function public.set_production_director(
  p_sheet_id uuid, p_person_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_person_id is not null and p_contact_id is not null then
    raise exception 'one_director' using errcode = '22023';
  end if;
  if p_person_id is not null
     and not public.production_person_is_member(p_person_id, v_sheet.organization_id) then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = v_sheet.organization_id
       and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;
  update public.production_sheets
     set director_person_id = p_person_id, director_contact_id = p_contact_id
   where id = p_sheet_id;
end;
$$;
revoke execute on function public.set_production_director(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_production_director(uuid, uuid, uuid) to authenticated;

-- The whole brief at once (a blank text is stored as null).
create function public.save_production_brief(
  p_sheet_id uuid,
  p_coverage text,
  p_camera_setup text,
  p_sound_capture text,
  p_staging_intent text,
  p_coverage_note text,
  p_camera_note text,
  p_sound_note text,
  p_run_of_show text,
  p_constraints_note text,
  p_references_note text,
  p_open_needs text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.production_sheets s
                  where s.id = p_sheet_id and public.can_see_project(s.project_id)) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_brief_can_write(p_sheet_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.production_sheets
     set coverage = nullif(btrim(p_coverage), ''),
         camera_setup = nullif(btrim(p_camera_setup), ''),
         sound_capture = nullif(btrim(p_sound_capture), ''),
         staging_intent = nullif(btrim(p_staging_intent), ''),
         coverage_note = nullif(btrim(p_coverage_note), ''),
         camera_note = nullif(btrim(p_camera_note), ''),
         sound_note = nullif(btrim(p_sound_note), ''),
         run_of_show = nullif(btrim(p_run_of_show), ''),
         constraints_note = nullif(btrim(p_constraints_note), ''),
         references_note = nullif(btrim(p_references_note), ''),
         open_needs = nullif(btrim(p_open_needs), ''),
         brief_updated_at = now(),
         brief_updated_by = public.auth_person_id()
   where id = p_sheet_id;
end;
$$;
revoke execute on function public.save_production_brief(
  uuid, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_production_brief(
  uuid, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

-- 2. Needs -------------------------------------------------------------------

create table public.production_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- direction = Réalisation; camera = Équipe image; sound = Équipe son;
  -- performers = Musiciens / artistes; production = Production et régie.
  family text not null,
  -- A preset position of the family (lib/production/roles.ts), or « other »
  -- with its own label.
  role_key text not null,
  label text,
  -- A performer's instrument or part (« Guitare »), free text.
  speciality text,
  headcount integer not null default 1,
  note text,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_needs_id_org_key unique (id, organization_id),
  constraint production_needs_family_check
    check (family in ('direction', 'camera', 'sound', 'performers', 'production')),
  constraint production_needs_role_check check (
    (family = 'direction' and role_key in ('assistant_director', 'script', 'other'))
    or (family = 'camera' and role_key in ('camera_operator', 'dop', 'gaffer',
                                           'camera_assistant', 'data_wrangler', 'other'))
    or (family = 'sound' and role_key in ('sound_engineer', 'boom_operator',
                                          'sound_assistant', 'live_mix', 'other'))
    or (family = 'performers' and role_key in ('musician', 'singer', 'dancer', 'actor',
                                               'extra', 'other'))
    or (family = 'production' and role_key in ('coordinator', 'logistics', 'call_sheet',
                                               'hospitality', 'other'))),
  constraint production_needs_label_check check (
    (role_key <> 'other' or btrim(coalesce(label, '')) <> '')
    and coalesce(char_length(label), 0) <= 120),
  constraint production_needs_speciality_check check (
    (speciality is null or (btrim(speciality) <> '' and char_length(speciality) <= 120))
    and (speciality is null or family = 'performers')),
  constraint production_needs_headcount_check check (headcount between 1 and 50),
  constraint production_needs_note_check check (note is null or char_length(note) <= 1000),
  constraint production_needs_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_needs_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_needs_sheet_idx on public.production_needs (sheet_id, family, position);

create trigger a_set_created_by before insert on public.production_needs
  for each row execute function public.set_created_by();

-- A need belongs to its sheet's project; it never holds fewer places than
-- the people already assigned.
create function public.production_needs_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.production_sheets s
                  where s.id = new.sheet_id and s.project_id = new.project_id) then
    raise exception 'sheet_not_in_project' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.sheet_id <> old.sheet_id or new.project_id <> old.project_id then
      raise exception 'need_moved' using errcode = '23514';
    end if;
    if new.headcount < (select count(*) from public.production_assignments a
                         where a.need_id = new.id) then
      raise exception 'headcount_below_assigned' using errcode = '23514';
    end if;
    new.updated_at := now();
  end if;
  if new.role_key <> 'other' then
    new.label := nullif(btrim(new.label), '');
  end if;
  return new;
end;
$$;

alter table public.production_needs enable row level security;
alter table public.production_needs force row level security;
revoke all on table public.production_needs from anon, authenticated;
grant select, delete on public.production_needs to authenticated;
grant insert (organization_id, project_id, sheet_id, family, role_key, label, speciality,
              headcount, note, position)
  on public.production_needs to authenticated;
grant update (role_key, label, speciality, headcount, note, position)
  on public.production_needs to authenticated;
create policy production_needs_select_visible on public.production_needs
  for select to authenticated using (public.can_see_project(project_id));
create policy production_needs_insert_owner on public.production_needs
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_needs_update_owner on public.production_needs
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_needs_delete_owner on public.production_needs
  for delete to authenticated using (public.production_can_organize(project_id));

-- 3. Assignments -------------------------------------------------------------

create table public.production_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  need_id uuid not null,
  -- A member, or a contact of the Réseau: exactly one.
  person_id uuid references public.people (id),
  contact_id uuid,
  -- to_confirm = à confirmer; available = disponible; unavailable = indisponible.
  -- Set by a person (PO never confirms an availability).
  availability text not null default 'to_confirm',
  availability_set_by uuid references public.people (id),
  availability_set_at timestamptz,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_assignments_holder_check
    check ((person_id is null) <> (contact_id is null)),
  constraint production_assignments_availability_check
    check (availability in ('to_confirm', 'available', 'unavailable')),
  constraint production_assignments_note_check check (note is null or char_length(note) <= 500),
  constraint production_assignments_person_key unique (need_id, person_id),
  constraint production_assignments_contact_key unique (need_id, contact_id),
  constraint production_assignments_need_same_org foreign key (need_id, organization_id)
    references public.production_needs (id, organization_id) on delete cascade,
  constraint production_assignments_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_assignments_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_assignments_need_idx on public.production_assignments (need_id);
create index production_assignments_project_idx on public.production_assignments (project_id);

create trigger a_set_created_by before insert on public.production_assignments
  for each row execute function public.set_created_by();

-- Same project as the need, a member or a live contact, never more people
-- than the count; who set an availability is written here, never sent.
create function public.production_assignments_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_need public.production_needs%rowtype;
begin
  select * into v_need from public.production_needs where id = new.need_id for update;
  if not found or v_need.project_id <> new.project_id then
    raise exception 'need_not_in_project' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.person_id is not null
       and not public.production_person_is_member(new.person_id, new.organization_id) then
      raise exception 'person_not_member' using errcode = '23514';
    end if;
    if new.contact_id is not null and not exists (
      select 1 from public.network_contacts c
       where c.id = new.contact_id and c.archived_at is null) then
      raise exception 'contact_not_found' using errcode = '23514';
    end if;
    if (select count(*) from public.production_assignments a where a.need_id = new.need_id)
       >= v_need.headcount then
      raise exception 'need_full' using errcode = '23514';
    end if;
  else
    if new.need_id <> old.need_id or new.project_id <> old.project_id
       or new.person_id is distinct from old.person_id
       or new.contact_id is distinct from old.contact_id then
      raise exception 'assignment_moved' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'INSERT' or new.availability is distinct from old.availability then
    if new.availability = 'to_confirm' then
      new.availability_set_by := null;
      new.availability_set_at := null;
    else
      new.availability_set_by := public.auth_person_id();
      new.availability_set_at := now();
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_assignments_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_assignments
  for each row execute function public.production_assignments_check();

-- The needs check reads production_assignments: created after it.
create trigger b_check before insert or update on public.production_needs
  for each row execute function public.production_needs_check();

alter table public.production_assignments enable row level security;
alter table public.production_assignments force row level security;
revoke all on table public.production_assignments from anon, authenticated;
grant select, delete on public.production_assignments to authenticated;
grant insert (organization_id, project_id, need_id, person_id, contact_id, availability, note)
  on public.production_assignments to authenticated;
grant update (availability, note) on public.production_assignments to authenticated;
create policy production_assignments_select_visible on public.production_assignments
  for select to authenticated using (public.can_see_project(project_id));
create policy production_assignments_insert_owner on public.production_assignments
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_assignments_update_owner on public.production_assignments
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_assignments_delete_owner on public.production_assignments
  for delete to authenticated using (public.production_can_organize(project_id));

-- 4. Production calls --------------------------------------------------------

create table public.production_calls (
  call_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  purpose text not null,
  participants jsonb not null default '[]'::jsonb,
  -- video = visio, in_person = sur place, phone = téléphone.
  format text not null,
  created_at timestamptz not null default now(),
  constraint production_calls_purpose_check
    check (btrim(purpose) <> '' and char_length(purpose) <= 500),
  constraint production_calls_participants_check
    check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 30),
  constraint production_calls_format_check check (format in ('video', 'in_person', 'phone')),
  constraint production_calls_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade,
  constraint production_calls_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_calls_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_calls_sheet_idx on public.production_calls (sheet_id);
alter table public.production_calls enable row level security;
alter table public.production_calls force row level security;
revoke all on table public.production_calls from anon, authenticated;
-- Written by create_production_call only.
grant select on public.production_calls to authenticated;
create policy production_calls_select_visible on public.production_calls
  for select to authenticated using (public.can_see_project(project_id));

-- « Créer l'échange »: the call and its production details in one
-- transaction. The call itself is written with the caller's rights checked
-- here (the owner writes the project's calls).
create function public.create_production_call(
  p_sheet_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb,
  p_purpose text,
  p_participants jsonb,
  p_format text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_call uuid;
  v_minutes integer;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;

  insert into public.calls (organization_id, project_id, title, occurred_at, meeting_url,
                            consent, agenda, duration_minutes)
  values (v_sheet.organization_id, v_sheet.project_id, p_title, p_occurred_at,
          case when p_format = 'video' then nullif(btrim(p_meeting_url), '') end,
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;

  insert into public.production_calls
    (call_id, organization_id, project_id, sheet_id, purpose, participants, format)
  values (v_call, v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_purpose,
          coalesce(p_participants, '[]'::jsonb), p_format);
  return v_call;
end;
$$;
revoke execute on function public.create_production_call(
  uuid, text, timestamptz, text, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.create_production_call(
  uuid, text, timestamptz, text, jsonb, text, jsonb, text) to authenticated;
