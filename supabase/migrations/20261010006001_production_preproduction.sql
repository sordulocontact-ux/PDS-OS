-- Production, lot 2 (ticket « Workflow Production complet », parcours 4 à 10;
-- docs/ARCHITECTURE.md § 8 nonies): the preproduction of a deliverable.
--   1. the sheet's own schedule, envelope and location (prefilled from the
--      Fiche Livrable by the code, a divergence is shown, never hidden);
--   2. production_team_briefs: what each team receives, an extract computed by
--      the code plus the team's own fields; « Transmettre » keeps a snapshot
--      and the source version it was built on;
--   3. production_call_items: what the technical call produced, point by point
--      — décision, hypothèse, action proposée, point à arbitrer — written by a
--      person, or proposed by PO from the call's report (to confirm);
--   4. production_plan_actions: the preproduction plan; an approved action
--      becomes a task of Travail only through create_production_task, an
--      explicit confirmation;
--   5. production_files (private bucket production-files): quotes, captures,
--      references, versions — the document is kept as the source;
--   6. production_equipment: the manual list (MVP), from need to returned; a
--      line entered from a quote stays « À vérifier » until a person verifies
--      it; nothing here is a booking;
--   7. production_budget_lines: estimates per position, states Prévu → Engagé
--      (not the project's Finance: budget_lines stay the commitments);
--   8. production_call_sheets: the call sheet (team, equipment and contacts are
--      read from their own tables, never copied);
--   9. production_readiness_checks + mark_production_ready: « Prête pour
--      tournage » only once every required check is confirmed by a person.
-- Everything is the owner's, while the « production » stage runs
-- (production_can_organize); whoever sees the project reads it.

-- 0. Helpers -----------------------------------------------------------------

-- Every child row belongs to its sheet's project.
create function public.production_child_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.production_sheets s
                  where s.id = new.sheet_id and s.project_id = new.project_id) then
    raise exception 'sheet_not_in_project' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.sheet_id <> old.sheet_id or new.project_id <> old.project_id) then
    raise exception 'row_moved' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A holder (who is pressenti, responsible…): a member of the organization or
-- a live contact of its Réseau, at most one of the two.
create function public.production_holder_check(
  p_org uuid, p_person_id uuid, p_contact_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_person_id is not null and p_contact_id is not null then
    raise exception 'one_holder' using errcode = '23514';
  end if;
  if p_person_id is not null and not public.production_person_is_member(p_person_id, p_org) then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = p_org and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.production_holder_check(uuid, uuid, uuid)
  from public, anon, authenticated;

-- 1. The sheet: schedule, envelope, location, readiness ---------------------------

alter table public.production_sheets
  add column shoot_date date,
  add column post_start date,
  add column post_end date,
  add column delivery_date date,
  add column budget_envelope_cents bigint,
  -- to_find = à trouver; to_verify = à vérifier; confirmed = confirmé.
  add column location_status text not null default 'to_find',
  add column location_name text,
  add column location_address text,
  add column location_access text,
  add column location_notes text,
  -- Written by mark_production_ready only, cleared when a check is withdrawn.
  add column ready_at timestamptz,
  add column ready_by uuid references public.people (id),
  add constraint production_sheets_schedule_check check (
    (post_start is null or post_end is null or post_start <= post_end)),
  add constraint production_sheets_envelope_check
    check (budget_envelope_cents is null or budget_envelope_cents >= 0),
  add constraint production_sheets_location_check check (
    location_status in ('to_find', 'to_verify', 'confirmed')
    and coalesce(char_length(location_name), 0) <= 200
    and coalesce(char_length(location_address), 0) <= 500
    and coalesce(char_length(location_access), 0) <= 2000
    and coalesce(char_length(location_notes), 0) <= 2000);

grant update (shoot_date, post_start, post_end, delivery_date, budget_envelope_cents,
              location_status, location_name, location_address, location_access,
              location_notes)
  on public.production_sheets to authenticated;
create policy production_sheets_update_owner on public.production_sheets
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));

-- 2. Team briefs -------------------------------------------------------------

create table public.production_team_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- director = Réalisation; camera = image; sound = son; performers =
  -- musiciens / artistes; production = production et régie.
  team text not null,
  -- The team's own fields (keys listed in lib/production/team-briefs.ts).
  fields jsonb not null default '{}'::jsonb,
  -- « Transmettre »: what was transmitted, built by the server from the
  -- sheet, and the source version it rests on.
  snapshot jsonb,
  source_version_id uuid,
  transmitted_at timestamptz,
  transmitted_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint production_team_briefs_team_key unique (sheet_id, team),
  constraint production_team_briefs_team_check
    check (team in ('director', 'camera', 'sound', 'performers', 'production')),
  constraint production_team_briefs_fields_check
    check (jsonb_typeof(fields) = 'object' and char_length(fields::text) <= 20000),
  constraint production_team_briefs_snapshot_check
    check (snapshot is null or (jsonb_typeof(snapshot) = 'object'
                                and char_length(snapshot::text) <= 100000)),
  constraint production_team_briefs_transmitted_check
    check ((snapshot is null) = (transmitted_at is null)),
  constraint production_team_briefs_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_team_briefs_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create trigger a_child before insert or update on public.production_team_briefs
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_team_briefs
  for each row execute function public.set_updated_at();
alter table public.production_team_briefs enable row level security;
alter table public.production_team_briefs force row level security;
revoke all on table public.production_team_briefs from anon, authenticated;
grant select on public.production_team_briefs to authenticated;
grant insert (organization_id, project_id, sheet_id, team, fields)
  on public.production_team_briefs to authenticated;
grant update (fields) on public.production_team_briefs to authenticated;
create policy production_team_briefs_select on public.production_team_briefs
  for select to authenticated using (public.can_see_project(project_id));
create policy production_team_briefs_insert on public.production_team_briefs
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_team_briefs_update on public.production_team_briefs
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));

-- « Transmettre » a team's brief: keeps what was sent and its source version.
create function public.transmit_production_team_brief(
  p_sheet_id uuid, p_team text, p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.production_team_briefs
    (organization_id, project_id, sheet_id, team, snapshot, source_version_id,
     transmitted_at, transmitted_by)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_team, p_snapshot,
          v_sheet.source_version_id, now(), public.auth_person_id())
  on conflict (sheet_id, team) do update
    set snapshot = excluded.snapshot, source_version_id = excluded.source_version_id,
        transmitted_at = excluded.transmitted_at, transmitted_by = excluded.transmitted_by;
end;
$$;
revoke execute on function public.transmit_production_team_brief(uuid, text, jsonb) from public, anon;
grant execute on function public.transmit_production_team_brief(uuid, text, jsonb) to authenticated;

-- 3. Technical call: what it produced -------------------------------------------

create table public.production_call_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- The call it comes from; null = written outside a call.
  call_id uuid,
  topic text not null,
  -- decision = Décision; hypothesis = Hypothèse; action = Action proposée;
  -- to_decide = Point à arbitrer.
  kind text not null,
  body text not null,
  -- A person's entry is confirmed; PO's are proposed until a person decides.
  status text not null default 'confirmed',
  -- manual = saisie; call_report = proposé par PO depuis le compte rendu.
  source text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  reviewed_by uuid references public.people (id),
  reviewed_at timestamptz,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_call_items_id_org_key unique (id, organization_id),
  constraint production_call_items_topic_check
    check (btrim(topic) <> '' and char_length(topic) <= 200),
  constraint production_call_items_kind_check
    check (kind in ('decision', 'hypothesis', 'action', 'to_decide')),
  constraint production_call_items_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint production_call_items_status_check
    check (status in ('proposed', 'confirmed', 'rejected')),
  constraint production_call_items_source_check check (
    source in ('manual', 'call_report')
    and (source = 'manual' or (call_id is not null and source_quote is not null))),
  constraint production_call_items_quote_check
    check (source_quote is null or char_length(source_quote) <= 1000),
  constraint production_call_items_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_call_items_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_call_items_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete set null (call_id),
  constraint production_call_items_report_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id) on delete set null (source_report_item_id)
);
create index production_call_items_sheet_idx on public.production_call_items (sheet_id, position);
create trigger a_set_created_by before insert on public.production_call_items
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_call_items
  for each row execute function public.production_child_check();

-- Who decided on a proposal of PO, written here.
create function public.production_call_items_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.call_id is not null and not exists (
    select 1 from public.production_calls c
     where c.call_id = new.call_id and c.sheet_id = new.sheet_id) then
    raise exception 'call_not_of_sheet' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'proposed' then
      new.reviewed_by := public.auth_person_id();
      new.reviewed_at := now();
    end if;
  elsif new.status is distinct from old.status then
    new.reviewed_by := public.auth_person_id();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
create trigger b_review before insert or update on public.production_call_items
  for each row execute function public.production_call_items_review();

alter table public.production_call_items enable row level security;
alter table public.production_call_items force row level security;
revoke all on table public.production_call_items from anon, authenticated;
grant select, delete on public.production_call_items to authenticated;
grant insert (organization_id, project_id, sheet_id, call_id, topic, kind, body, status, source,
              source_report_item_id, source_quote, position)
  on public.production_call_items to authenticated;
grant update (topic, kind, body, status, position) on public.production_call_items to authenticated;
create policy production_call_items_select on public.production_call_items
  for select to authenticated using (public.can_see_project(project_id));
create policy production_call_items_insert on public.production_call_items
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_call_items_update on public.production_call_items
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_call_items_delete on public.production_call_items
  for delete to authenticated using (public.production_can_organize(project_id));

-- 4. Preproduction plan --------------------------------------------------------

create table public.production_plan_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- The call item it comes from, if any.
  item_id uuid,
  title text not null,
  -- Pressenti: a member or a Réseau contact; neither = to designate.
  person_id uuid references public.people (id),
  contact_id uuid,
  due_date date,
  -- Other actions of the same sheet it waits for.
  depends_on uuid[] not null default '{}',
  blocking boolean not null default false,
  -- draft = brouillon; approved = approuvée; removed = retirée.
  status text not null default 'draft',
  approved_by uuid references public.people (id),
  approved_at timestamptz,
  -- The task of Travail created from it, after an explicit confirmation.
  task_id uuid references public.tasks (id) on delete set null,
  note text,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_plan_actions_title_check
    check (btrim(title) <> '' and char_length(title) <= 300),
  constraint production_plan_actions_status_check
    check (status in ('draft', 'approved', 'removed')),
  constraint production_plan_actions_task_check check (task_id is null or status = 'approved'),
  constraint production_plan_actions_depends_check check (cardinality(depends_on) <= 50),
  constraint production_plan_actions_note_check check (note is null or char_length(note) <= 1000),
  constraint production_plan_actions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_plan_actions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_plan_actions_item_same_org foreign key (item_id, organization_id)
    references public.production_call_items (id, organization_id) on delete set null (item_id),
  constraint production_plan_actions_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_plan_actions_sheet_idx on public.production_plan_actions (sheet_id, position);
create trigger a_set_created_by before insert on public.production_plan_actions
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_plan_actions
  for each row execute function public.production_child_check();

create function public.production_plan_actions_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.person_id, new.contact_id);
  if exists (select 1 from unnest(new.depends_on) d
             where d = new.id or not exists (
               select 1 from public.production_plan_actions x
                where x.id = d and x.sheet_id = new.sheet_id)) then
    raise exception 'dependency_not_in_plan' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.task_id is not null and new.status <> 'approved' then
    raise exception 'task_already_created' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'approved' then
      new.approved_by := public.auth_person_id();
      new.approved_at := now();
    else
      new.approved_by := null;
      new.approved_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_plan_actions_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_plan_actions
  for each row execute function public.production_plan_actions_check();

alter table public.production_plan_actions enable row level security;
alter table public.production_plan_actions force row level security;
revoke all on table public.production_plan_actions from anon, authenticated;
grant select, delete on public.production_plan_actions to authenticated;
grant insert (organization_id, project_id, sheet_id, item_id, title, person_id, contact_id,
              due_date, depends_on, blocking, status, note, position)
  on public.production_plan_actions to authenticated;
grant update (title, person_id, contact_id, due_date, depends_on, blocking, status, note, position)
  on public.production_plan_actions to authenticated;
create policy production_plan_actions_select on public.production_plan_actions
  for select to authenticated using (public.can_see_project(project_id));
create policy production_plan_actions_insert on public.production_plan_actions
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_plan_actions_update on public.production_plan_actions
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
-- A removed draft is deleted; an action turned into a task stays.
create policy production_plan_actions_delete on public.production_plan_actions
  for delete to authenticated
  using (public.production_can_organize(project_id) and task_id is null);

-- « Créer dans Travail »: an approved action becomes a task, once, after the
-- owner confirmed it; the task needs a member and a date.
create function public.create_production_task(
  p_action_id uuid, p_assignee_person_id uuid, p_due_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_plan_actions%rowtype;
  v_task uuid;
begin
  select * into v from public.production_plan_actions where id = p_action_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'action_not_found';
  end if;
  if not public.production_can_organize(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'approved' then
    raise exception 'action_not_approved';
  end if;
  if v.task_id is not null then
    raise exception 'task_already_created';
  end if;
  if p_due_date is null or p_assignee_person_id is null
     or not public.production_person_is_member(p_assignee_person_id, v.organization_id) then
    raise exception 'invalid_task' using errcode = '23514';
  end if;
  insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
  values (v.organization_id, v.project_id, v.title, p_assignee_person_id, p_due_date)
  returning id into v_task;
  update public.production_plan_actions set task_id = v_task where id = v.id;
  return v_task;
end;
$$;
revoke execute on function public.create_production_task(uuid, uuid, date) from public, anon;
grant execute on function public.create_production_task(uuid, uuid, date) to authenticated;

-- 5. Files (quotes, captures, references, versions) --------------------------------

create table public.production_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- quote = devis; capture = capture de loueur; reference = référence de
  -- postproduction; version = fichier d'une version; attachment = pièce
  -- jointe d'un retour; other = autre.
  kind text not null,
  -- "<organization_id>/<project_id>/<uuid>[.<ext>]" in production-files.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_files_id_org_key unique (id, organization_id),
  constraint production_files_path_key unique (path),
  constraint production_files_kind_check
    check (kind in ('quote', 'capture', 'reference', 'version', 'attachment', 'other')),
  constraint production_files_path_check check (
    path ~ ('^' || organization_id::text || '/' || project_id::text
            || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint production_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint production_files_mime_check check (char_length(mime) between 1 and 255),
  constraint production_files_bytes_check check (bytes > 0 and bytes <= 524288000),
  constraint production_files_note_check check (note is null or char_length(note) <= 1000),
  constraint production_files_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_files_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_files_sheet_idx on public.production_files (sheet_id, kind, created_at);
create trigger a_set_created_by before insert on public.production_files
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_files
  for each row execute function public.production_child_check();
alter table public.production_files enable row level security;
alter table public.production_files force row level security;
revoke all on table public.production_files from anon, authenticated;
grant select, delete on public.production_files to authenticated;
grant insert (organization_id, project_id, sheet_id, kind, path, file_name, mime, bytes, note)
  on public.production_files to authenticated;
grant update (note) on public.production_files to authenticated;
create policy production_files_select on public.production_files
  for select to authenticated using (public.can_see_project(project_id));
create policy production_files_insert on public.production_files
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_files_update on public.production_files
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_files_delete on public.production_files
  for delete to authenticated using (public.production_can_organize(project_id));

-- Rushes and masters live elsewhere (a link): 500 MB covers quotes, captures
-- and review exports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('production-files', 'production-files', false, 524288000, null)
on conflict (id) do nothing;

create policy production_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'production-files'
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
  );
create policy production_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'production-files'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and public.production_can_organize(p.id))
  );
create policy production_files_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'production-files'
    and not exists (select 1 from public.production_files f where f.path = objects.name)
    and public.production_can_organize(public.try_uuid((storage.foldername(objects.name))[2]))
  );

-- 6. Equipment ------------------------------------------------------------------

create table public.production_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- image, light = lumière, sound = son, other = autre.
  category text not null,
  label text not null,
  quantity integer,
  supplier_contact_id uuid,
  supplier_name text,
  price_cents bigint,
  period_start date,
  period_end date,
  deposit_cents bigint,
  return_terms text,
  -- need = Besoin; quoted = Devis reçu; to_verify = À vérifier; retained =
  -- Retenu; booked = Réservé confirmé; picked_up = Récupéré; to_return = À
  -- rendre; returned = Rendu; incident = Incident de retour.
  status text not null default 'need',
  -- The quote or capture it was read from.
  quote_file_id uuid,
  verified_by uuid references public.people (id),
  verified_at timestamptz,
  -- Who brings it back, and when.
  return_person_id uuid references public.people (id),
  return_contact_id uuid,
  return_due date,
  returned_at timestamptz,
  returned_by uuid references public.people (id),
  incident_note text,
  note text,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_equipment_id_org_key unique (id, organization_id),
  constraint production_equipment_category_check
    check (category in ('image', 'light', 'sound', 'other')),
  constraint production_equipment_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint production_equipment_quantity_check
    check (quantity is null or quantity between 1 and 1000),
  constraint production_equipment_money_check check (
    (price_cents is null or price_cents >= 0) and (deposit_cents is null or deposit_cents >= 0)),
  constraint production_equipment_period_check
    check (period_start is null or period_end is null or period_start <= period_end),
  constraint production_equipment_status_check check (status in (
    'need', 'quoted', 'to_verify', 'retained', 'booked', 'picked_up', 'to_return', 'returned',
    'incident')),
  constraint production_equipment_incident_check
    check (status <> 'incident' or btrim(coalesce(incident_note, '')) <> ''),
  constraint production_equipment_texts_check check (
    coalesce(char_length(supplier_name), 0) <= 200
    and coalesce(char_length(return_terms), 0) <= 1000
    and coalesce(char_length(incident_note), 0) <= 1000
    and coalesce(char_length(note), 0) <= 1000),
  constraint production_equipment_return_holder_check
    check (return_person_id is null or return_contact_id is null),
  constraint production_equipment_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_equipment_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_equipment_supplier_same_org foreign key (supplier_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_equipment_return_contact_same_org foreign key (return_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_equipment_quote_same_org foreign key (quote_file_id, organization_id)
    references public.production_files (id, organization_id) on delete set null (quote_file_id)
);
create index production_equipment_sheet_idx on public.production_equipment (sheet_id, position);
create trigger a_set_created_by before insert on public.production_equipment
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_equipment
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_equipment
  for each row execute function public.set_updated_at();

-- Who verified a line read from a quote, and who confirmed a return: written
-- here when the status moves, never sent.
create function public.production_equipment_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.return_person_id,
                                         new.return_contact_id);
  if new.quote_file_id is not null and not exists (
    select 1 from public.production_files f
     where f.id = new.quote_file_id and f.sheet_id = new.sheet_id) then
    raise exception 'file_not_of_sheet' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.status = 'to_verify' and new.status not in ('to_verify', 'need') then
    new.verified_by := public.auth_person_id();
    new.verified_at := now();
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'returned' then
      new.returned_by := public.auth_person_id();
      new.returned_at := now();
    else
      new.returned_by := null;
      new.returned_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_equipment_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_equipment
  for each row execute function public.production_equipment_check();

alter table public.production_equipment enable row level security;
alter table public.production_equipment force row level security;
revoke all on table public.production_equipment from anon, authenticated;
grant select, delete on public.production_equipment to authenticated;
grant insert (organization_id, project_id, sheet_id, category, label, quantity,
              supplier_contact_id, supplier_name, price_cents, period_start, period_end,
              deposit_cents, return_terms, status, quote_file_id, return_person_id,
              return_contact_id, return_due, incident_note, note, position)
  on public.production_equipment to authenticated;
grant update (category, label, quantity, supplier_contact_id, supplier_name, price_cents,
              period_start, period_end, deposit_cents, return_terms, status, quote_file_id,
              return_person_id, return_contact_id, return_due, incident_note, note, position)
  on public.production_equipment to authenticated;
create policy production_equipment_select on public.production_equipment
  for select to authenticated using (public.can_see_project(project_id));
create policy production_equipment_insert on public.production_equipment
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_equipment_update on public.production_equipment
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_equipment_delete on public.production_equipment
  for delete to authenticated using (public.production_can_organize(project_id));

-- 7. Budget lines ------------------------------------------------------------------

create table public.production_budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  label text not null,
  -- A team, equipment, location, postproduction or other.
  category text not null,
  amount_cents bigint,
  -- planned = Prévu; to_estimate = À estimer; estimated = Estimé; to_decide =
  -- À arbitrer; validated = Validé; committed = Engagé.
  status text not null default 'to_estimate',
  equipment_id uuid,
  note text,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_budget_lines_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint production_budget_lines_category_check check (category in (
    'direction', 'camera', 'sound', 'performers', 'production', 'equipment', 'location',
    'post', 'other')),
  constraint production_budget_lines_status_check check (status in (
    'planned', 'to_estimate', 'estimated', 'to_decide', 'validated', 'committed')),
  -- Only « À estimer » goes without an amount.
  constraint production_budget_lines_amount_check check (
    (amount_cents is null or amount_cents >= 0)
    and (status = 'to_estimate' or amount_cents is not null)),
  constraint production_budget_lines_note_check check (note is null or char_length(note) <= 1000),
  constraint production_budget_lines_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_budget_lines_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_budget_lines_equipment_same_org foreign key (equipment_id, organization_id)
    references public.production_equipment (id, organization_id) on delete set null (equipment_id)
);
create index production_budget_lines_sheet_idx on public.production_budget_lines (sheet_id, position);
create trigger a_set_created_by before insert on public.production_budget_lines
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_budget_lines
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_budget_lines
  for each row execute function public.set_updated_at();
alter table public.production_budget_lines enable row level security;
alter table public.production_budget_lines force row level security;
revoke all on table public.production_budget_lines from anon, authenticated;
grant select, delete on public.production_budget_lines to authenticated;
grant insert (organization_id, project_id, sheet_id, label, category, amount_cents, status,
              equipment_id, note, position)
  on public.production_budget_lines to authenticated;
grant update (label, category, amount_cents, status, equipment_id, note, position)
  on public.production_budget_lines to authenticated;
create policy production_budget_lines_select on public.production_budget_lines
  for select to authenticated using (public.can_see_project(project_id));
create policy production_budget_lines_insert on public.production_budget_lines
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_budget_lines_update on public.production_budget_lines
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_budget_lines_delete on public.production_budget_lines
  for delete to authenticated using (public.production_can_organize(project_id));

-- 8. Call sheet ---------------------------------------------------------------------

create table public.production_call_sheets (
  sheet_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  call_time text,
  schedule text,
  contacts_note text,
  sequences text,
  instructions text,
  emergencies text,
  documents_note text,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint production_call_sheets_texts_check check (
    coalesce(char_length(call_time), 0) <= 200
    and coalesce(char_length(schedule), 0) <= 4000
    and coalesce(char_length(contacts_note), 0) <= 2000
    and coalesce(char_length(sequences), 0) <= 4000
    and coalesce(char_length(instructions), 0) <= 4000
    and coalesce(char_length(emergencies), 0) <= 2000
    and coalesce(char_length(documents_note), 0) <= 2000),
  constraint production_call_sheets_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_call_sheets_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create trigger a_child before insert or update on public.production_call_sheets
  for each row execute function public.production_child_check();

create function public.production_call_sheets_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := public.auth_person_id();
  new.updated_at := now();
  return new;
end;
$$;
create trigger b_stamp before insert or update on public.production_call_sheets
  for each row execute function public.production_call_sheets_stamp();
alter table public.production_call_sheets enable row level security;
alter table public.production_call_sheets force row level security;
revoke all on table public.production_call_sheets from anon, authenticated;
grant select on public.production_call_sheets to authenticated;
grant insert (sheet_id, organization_id, project_id, call_time, schedule, contacts_note,
              sequences, instructions, emergencies, documents_note)
  on public.production_call_sheets to authenticated;
grant update (call_time, schedule, contacts_note, sequences, instructions, emergencies,
              documents_note)
  on public.production_call_sheets to authenticated;
create policy production_call_sheets_select on public.production_call_sheets
  for select to authenticated using (public.can_see_project(project_id));
create policy production_call_sheets_insert on public.production_call_sheets
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_call_sheets_update on public.production_call_sheets
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));

-- 9. Readiness ----------------------------------------------------------------------

create table public.production_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- location, team, equipment, schedule, budget = budget / arbitrage,
  -- call_sheet = feuille de service, permits = autorisations.
  key text not null,
  required boolean not null,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz,
  note text,
  updated_at timestamptz not null default now(),
  constraint production_readiness_checks_key unique (sheet_id, key),
  constraint production_readiness_checks_key_check check (key in (
    'location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet', 'permits')),
  constraint production_readiness_checks_confirmed_check
    check ((confirmed_by is null) = (confirmed_at is null)),
  constraint production_readiness_checks_note_check
    check (note is null or char_length(note) <= 1000),
  constraint production_readiness_checks_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_readiness_checks_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.production_readiness_checks enable row level security;
alter table public.production_readiness_checks force row level security;
revoke all on table public.production_readiness_checks from anon, authenticated;
-- Written by set_production_check only.
grant select on public.production_readiness_checks to authenticated;
create policy production_readiness_checks_select on public.production_readiness_checks
  for select to authenticated using (public.can_see_project(project_id));

-- Every check is required except the permits, unless the owner says otherwise.
create function public.production_check_default_required(p_key text)
returns boolean
language sql
immutable
set search_path = ''
as $$ select p_key <> 'permits' $$;

-- Confirms (or withdraws) a check, and/or changes whether it is required.
-- Withdrawing a required check, or requiring an unconfirmed one, takes the
-- « Prête pour tournage » back.
create function public.set_production_check(
  p_sheet_id uuid, p_key text, p_confirmed boolean, p_required boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_required boolean;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_key not in ('location', 'team', 'equipment', 'schedule', 'budget', 'call_sheet', 'permits') then
    raise exception 'invalid_check' using errcode = '22023';
  end if;
  v_required := coalesce(p_required, (select c.required from public.production_readiness_checks c
                                       where c.sheet_id = p_sheet_id and c.key = p_key),
                         public.production_check_default_required(p_key));
  insert into public.production_readiness_checks
    (organization_id, project_id, sheet_id, key, required, confirmed_by, confirmed_at, note)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_key, v_required,
          case when p_confirmed then public.auth_person_id() end,
          case when p_confirmed then now() end,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (sheet_id, key) do update
    set required = excluded.required,
        confirmed_by = case when p_confirmed is null then production_readiness_checks.confirmed_by
                            else excluded.confirmed_by end,
        confirmed_at = case when p_confirmed is null then production_readiness_checks.confirmed_at
                            else excluded.confirmed_at end,
        note = coalesce(excluded.note, production_readiness_checks.note),
        updated_at = now();
  if v_sheet.ready_at is not null and exists (
    select 1 from public.production_readiness_checks c
     where c.sheet_id = p_sheet_id and c.key = p_key and c.required and c.confirmed_at is null) then
    update public.production_sheets set ready_at = null, ready_by = null where id = p_sheet_id;
  end if;
end;
$$;
revoke execute on function public.set_production_check(uuid, text, boolean, boolean, text)
  from public, anon;
grant execute on function public.set_production_check(uuid, text, boolean, boolean, text)
  to authenticated;

-- « Prête pour tournage »: every required check is confirmed (a check never
-- written counts as required and unconfirmed, except the permits).
create function public.mark_production_ready(p_sheet_id uuid)
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
  if exists (
    select 1 from unnest(array['location', 'team', 'equipment', 'schedule', 'budget',
                               'call_sheet', 'permits']) k(key)
      left join public.production_readiness_checks c
             on c.sheet_id = p_sheet_id and c.key = k.key
     where coalesce(c.required, public.production_check_default_required(k.key))
       and c.confirmed_at is null) then
    raise exception 'checks_open';
  end if;
  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id()
   where id = p_sheet_id;
end;
$$;
revoke execute on function public.mark_production_ready(uuid) from public, anon;
grant execute on function public.mark_production_ready(uuid) to authenticated;
