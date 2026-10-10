-- Production, lot 4 (ticket « Workflow Production complet », parcours 14 à
-- 21; docs/ARCHITECTURE.md § 8 nonies): postproduction, versions, feedback,
-- final validation, technical check, delivery and hand-off to Activations.
--   0. the source: a sheet now opens from the Fiche Livrable handed over by
--      the Conception (design_handoffs) when there is one, else from the
--      approved Conception version as before;
--   1. production_post_references and production_post_steps: references of
--      the edit, the steps (modular), who does them — confirmed by a person;
--   2. production_versions: V1, V2, V3… never limited, never deleted; a
--      version without a file or a link stays a draft; « Soumettre pour
--      retours » and « Soumettre à validation finale » are two actions;
--   3. production_version_comments: feedback on one version, with or without
--      a timecode; a correction declared fixed must be verified;
--   4. decide_production_version: the creative validator (owner or creative
--      director of the project) validates, asks for corrections or refuses;
--      no feedback is never a validation. Validating records the creative
--      decision on the delivery (deliverable_deliveries.version_id);
--   5. production_export_checks: the technical check, one line per expected
--      file; the delivery's « check » now requires every line conforming;
--   6. production_activation_handoffs: « Transmettre à Activations » after the
--      delivery, a reference to the delivered version — nothing is published.

-- 0. Source: the handed-over Fiche Livrable ------------------------------------------

alter table public.production_sheets
  add column handoff_id uuid references public.design_handoffs (id) on delete set null;

-- The latest hand-off of the deliverable's Fiche Livrable to Production.
create function public.production_source_handoff(p_deliverable_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select h.id from public.design_handoffs h
    join public.design_sheets s on s.id = h.sheet_id
    join public.design_deliverables dd on dd.id = s.design_deliverable_id
   where dd.strategy_deliverable_id = p_deliverable_id
   order by h.confirmed_at desc
   limit 1;
$$;
revoke execute on function public.production_source_handoff(uuid) from public, anon;
grant execute on function public.production_source_handoff(uuid) to authenticated;

-- open_production_sheet (lot 1) with the hand-off as the first source. The
-- version source stays the one the sheet was opened from.
create or replace function public.open_production_sheet(p_deliverable_id uuid, p_mode text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deliverable public.strategy_deliverables%rowtype;
  v_stage public.project_stages%rowtype;
  v_version uuid;
  v_handoff uuid;
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
  v_handoff := public.production_source_handoff(p_deliverable_id);
  v_version := public.production_source_version(p_deliverable_id);
  if v_handoff is null and v_version is null then
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
    (organization_id, project_id, deliverable_id, source_version_id, handoff_id, mode, opened_by)
  values (v_deliverable.organization_id, v_deliverable.project_id, p_deliverable_id,
          v_version, v_handoff, p_mode, public.auth_person_id())
  on conflict (deliverable_id) do update set mode = excluded.mode
  returning id into v_id;
  return v_id;
end;
$$;

-- Who reviews a version: the owner or a creative director of the project,
-- while the Production runs.
create function public.production_can_review(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.project_stage_in_progress(p_project_id, 'production')
     and (public.is_project_owner(p_project_id)
          or exists (select 1 from public.project_creatives pc
                     where pc.project_id = p_project_id
                       and pc.person_id = public.auth_person_id()));
$$;
revoke execute on function public.production_can_review(uuid) from public, anon;
grant execute on function public.production_can_review(uuid) to authenticated;

-- 1. Postproduction references and steps ------------------------------------------

create table public.production_post_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- link = lien (vidéo, image en ligne); file = fichier déposé; note = note de montage.
  kind text not null,
  title text,
  url text,
  file_id uuid,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_post_references_kind_check check (
    (kind = 'link' and url is not null and file_id is null)
    or (kind = 'file' and file_id is not null and url is null)
    or (kind = 'note' and url is null and file_id is null
        and btrim(coalesce(note, '')) <> '')),
  constraint production_post_references_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_post_references_texts_check check (
    coalesce(char_length(title), 0) <= 200 and coalesce(char_length(note), 0) <= 2000),
  constraint production_post_references_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_post_references_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_post_references_file_same_org foreign key (file_id, organization_id)
    references public.production_files (id, organization_id) on delete cascade
);
create index production_post_references_sheet_idx on public.production_post_references (sheet_id, created_at);
create trigger a_set_created_by before insert on public.production_post_references
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_post_references
  for each row execute function public.production_child_check();
alter table public.production_post_references enable row level security;
alter table public.production_post_references force row level security;
revoke all on table public.production_post_references from anon, authenticated;
grant select, delete on public.production_post_references to authenticated;
grant insert (organization_id, project_id, sheet_id, kind, title, url, file_id, note)
  on public.production_post_references to authenticated;
grant update (title, note) on public.production_post_references to authenticated;
create policy production_post_references_select on public.production_post_references
  for select to authenticated using (public.can_see_project(project_id));
create policy production_post_references_insert on public.production_post_references
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_post_references_update on public.production_post_references
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_post_references_delete on public.production_post_references
  for delete to authenticated using (public.production_can_organize(project_id));

create table public.production_post_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- files_prep, edit, live_mix, grading, subtitles, exports_qc or other.
  step_key text not null,
  label text,
  -- Who does it: a member or a Réseau contact (a provider), confirmed by a person.
  person_id uuid references public.people (id),
  contact_id uuid,
  responsibilities text,
  access_note text,
  starts_on date,
  ends_on date,
  -- todo = à faire; in_progress = en cours; done = fait.
  status text not null default 'todo',
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_post_steps_key_check check (step_key in (
    'files_prep', 'edit', 'live_mix', 'grading', 'subtitles', 'exports_qc', 'other')),
  constraint production_post_steps_label_check check (
    (step_key <> 'other' or btrim(coalesce(label, '')) <> '')
    and coalesce(char_length(label), 0) <= 120),
  constraint production_post_steps_texts_check check (
    coalesce(char_length(responsibilities), 0) <= 2000
    and coalesce(char_length(access_note), 0) <= 1000),
  constraint production_post_steps_dates_check
    check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint production_post_steps_status_check check (status in ('todo', 'in_progress', 'done')),
  constraint production_post_steps_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_post_steps_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_post_steps_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_post_steps_sheet_idx on public.production_post_steps (sheet_id, position);
create trigger a_set_created_by before insert on public.production_post_steps
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_post_steps
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_post_steps
  for each row execute function public.set_updated_at();

create function public.production_post_steps_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.person_id, new.contact_id);
  return new;
end;
$$;
revoke execute on function public.production_post_steps_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_post_steps
  for each row execute function public.production_post_steps_check();

alter table public.production_post_steps enable row level security;
alter table public.production_post_steps force row level security;
revoke all on table public.production_post_steps from anon, authenticated;
grant select, delete on public.production_post_steps to authenticated;
grant insert (organization_id, project_id, sheet_id, step_key, label, person_id, contact_id,
              responsibilities, access_note, starts_on, ends_on, status, position)
  on public.production_post_steps to authenticated;
grant update (step_key, label, person_id, contact_id, responsibilities, access_note, starts_on,
              ends_on, status, position)
  on public.production_post_steps to authenticated;
create policy production_post_steps_select on public.production_post_steps
  for select to authenticated using (public.can_see_project(project_id));
create policy production_post_steps_insert on public.production_post_steps
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_post_steps_update on public.production_post_steps
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_post_steps_delete on public.production_post_steps
  for delete to authenticated using (public.production_can_organize(project_id));

-- 2. Versions ------------------------------------------------------------------------

create table public.production_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- Counted by the database per sheet (1, 2, 3…), never limited.
  number integer not null default 0,
  label text,
  -- A file deposited (production_files) or a link (Frame.io, Drive…).
  file_id uuid,
  url text,
  notes text,
  -- Who made it (the provider): a member or a Réseau contact.
  person_id uuid references public.people (id),
  contact_id uuid,
  -- draft = brouillon; in_review = en revue; changes_requested = corrections
  -- demandées; final_review = en validation finale; approved = validée;
  -- refused = refusée.
  status text not null default 'draft',
  submitted_by uuid references public.people (id),
  submitted_at timestamptz,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_versions_id_org_key unique (id, organization_id),
  constraint production_versions_number_key unique (sheet_id, number),
  constraint production_versions_status_check check (status in (
    'draft', 'in_review', 'changes_requested', 'final_review', 'approved', 'refused')),
  -- A version without a file or a link is never submitted.
  constraint production_versions_media_check
    check (status = 'draft' or file_id is not null or url is not null),
  constraint production_versions_one_media_check check (file_id is null or url is null),
  constraint production_versions_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_versions_texts_check check (
    coalesce(char_length(label), 0) <= 120 and coalesce(char_length(notes), 0) <= 4000
    and coalesce(char_length(decision_note), 0) <= 2000),
  constraint production_versions_holder_check check (person_id is null or contact_id is null),
  constraint production_versions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_versions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_versions_file_same_org foreign key (file_id, organization_id)
    references public.production_files (id, organization_id),
  constraint production_versions_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_versions_sheet_idx on public.production_versions (sheet_id, number desc);
create trigger a_set_created_by before insert on public.production_versions
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_versions
  for each row execute function public.production_child_check();

-- Numbering, the holder, the file of the same sheet; only a draft is edited
-- in place (a submitted version keeps what was reviewed).
create function public.production_versions_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.person_id, new.contact_id);
  if new.file_id is not null and not exists (
    select 1 from public.production_files f where f.id = new.file_id and f.sheet_id = new.sheet_id) then
    raise exception 'file_not_of_sheet' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('production_versions:' || new.sheet_id::text));
    new.number := coalesce((select max(v.number) from public.production_versions v
                             where v.sheet_id = new.sheet_id), 0) + 1;
    new.status := 'draft';
  elsif old.status <> 'draft'
        and (new.label, new.file_id, new.url, new.notes, new.person_id, new.contact_id)
            is distinct from
            (old.label, old.file_id, old.url, old.notes, old.person_id, old.contact_id) then
    raise exception 'version_submitted' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.production_versions_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_versions
  for each row execute function public.production_versions_check();

alter table public.production_versions enable row level security;
alter table public.production_versions force row level security;
revoke all on table public.production_versions from anon, authenticated;
-- Status and decisions: through the functions below only.
grant select on public.production_versions to authenticated;
grant insert (organization_id, project_id, sheet_id, label, file_id, url, notes, person_id,
              contact_id)
  on public.production_versions to authenticated;
grant update (label, file_id, url, notes, person_id, contact_id)
  on public.production_versions to authenticated;
grant delete on public.production_versions to authenticated;
create policy production_versions_select on public.production_versions
  for select to authenticated using (public.can_see_project(project_id));
create policy production_versions_insert on public.production_versions
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_versions_update on public.production_versions
  for update to authenticated
  using (public.production_can_organize(project_id) and status = 'draft')
  with check (public.production_can_organize(project_id));
-- Only a draft is removed: a submitted version, its comments and decisions stay.
create policy production_versions_delete on public.production_versions
  for delete to authenticated
  using (public.production_can_organize(project_id) and status = 'draft');

-- « Soumettre pour retours » (review) or « Soumettre à validation finale »
-- (final): the owner, for a version with a file or a link. A version under
-- review may go to the final validation; a V1 may go there directly.
create function public.submit_production_version(p_version_id uuid, p_target text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_organize(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_target not in ('review', 'final') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v.file_id is null and v.url is null then
    raise exception 'version_without_media';
  end if;
  if not (v.status = 'draft' or (v.status = 'in_review' and p_target = 'final')) then
    raise exception 'invalid_transition';
  end if;
  update public.production_versions
     set status = case p_target when 'review' then 'in_review' else 'final_review' end,
         submitted_by = public.auth_person_id(), submitted_at = now()
   where id = v.id;
end;
$$;
revoke execute on function public.submit_production_version(uuid, text) from public, anon;
grant execute on function public.submit_production_version(uuid, text) to authenticated;

-- 3. Feedback ----------------------------------------------------------------------

create table public.production_version_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  version_id uuid not null,
  -- Milliseconds from the start; null = a general comment.
  timecode_ms integer,
  -- edit = montage; audio; grading = étalonnage; subtitles = sous-titres; other.
  category text not null default 'other',
  body text not null,
  file_id uuid,
  -- open = ouvert; acknowledged = pris en compte; declared_fixed = corrigé
  -- déclaré; to_verify = à vérifier; resolved = résolu; rejected = rejeté.
  status text not null default 'open',
  status_by uuid references public.people (id),
  status_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_version_comments_timecode_check
    check (timecode_ms is null or timecode_ms between 0 and 86400000),
  constraint production_version_comments_category_check
    check (category in ('edit', 'audio', 'grading', 'subtitles', 'other')),
  constraint production_version_comments_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint production_version_comments_status_check check (status in (
    'open', 'acknowledged', 'declared_fixed', 'to_verify', 'resolved', 'rejected')),
  constraint production_version_comments_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_version_comments_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_version_comments_version_same_org foreign key (version_id, organization_id)
    references public.production_versions (id, organization_id) on delete cascade,
  constraint production_version_comments_file_same_org foreign key (file_id, organization_id)
    references public.production_files (id, organization_id) on delete set null (file_id)
);
create index production_version_comments_version_idx
  on public.production_version_comments (version_id, timecode_ms nulls first, created_at);
create trigger a_set_created_by before insert on public.production_version_comments
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_version_comments
  for each row execute function public.production_child_check();

-- A comment stays on its version; a submitted version only; a correction
-- declared fixed goes through « À vérifier » before it is resolved.
create function public.production_version_comments_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select v.status into v_status from public.production_versions v
   where v.id = new.version_id and v.sheet_id = new.sheet_id;
  if v_status is null then
    raise exception 'version_not_of_sheet' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if v_status = 'draft' then
      raise exception 'version_not_submitted' using errcode = '23514';
    end if;
  else
    if new.version_id <> old.version_id or new.timecode_ms is distinct from old.timecode_ms then
      raise exception 'comment_moved' using errcode = '23514';
    end if;
    if old.status = 'declared_fixed' and new.status not in ('declared_fixed', 'to_verify', 'open') then
      raise exception 'verify_first' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_by := public.auth_person_id();
    new.status_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.production_version_comments_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_version_comments
  for each row execute function public.production_version_comments_check();

alter table public.production_version_comments enable row level security;
alter table public.production_version_comments force row level security;
revoke all on table public.production_version_comments from anon, authenticated;
grant select on public.production_version_comments to authenticated;
grant insert (organization_id, project_id, sheet_id, version_id, timecode_ms, category, body,
              file_id, status)
  on public.production_version_comments to authenticated;
grant update (category, body, status) on public.production_version_comments to authenticated;
create policy production_version_comments_select on public.production_version_comments
  for select to authenticated using (public.can_see_project(project_id));
create policy production_version_comments_insert on public.production_version_comments
  for insert to authenticated with check (public.production_can_review(project_id));
create policy production_version_comments_update on public.production_version_comments
  for update to authenticated
  using (public.production_can_review(project_id))
  with check (public.production_can_review(project_id));

-- « Demander des corrections » on a version under review.
create function public.request_production_version_changes(p_version_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'in_review' then
    raise exception 'invalid_transition';
  end if;
  update public.production_versions
     set status = 'changes_requested', decided_by = public.auth_person_id(), decided_at = now(),
         decision_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = v.id;
end;
$$;
revoke execute on function public.request_production_version_changes(uuid, text) from public, anon;
grant execute on function public.request_production_version_changes(uuid, text) to authenticated;

-- 4. Final validation -------------------------------------------------------------------

-- The delivery may now rest on a validated version instead of a link.
alter table public.deliverable_deliveries
  alter column final_url drop not null,
  add column version_id uuid,
  add constraint deliverable_deliveries_version_same_org foreign key (version_id, organization_id)
    references public.production_versions (id, organization_id),
  add constraint deliverable_deliveries_source_check check (final_url is not null or version_id is not null);
alter table public.deliverable_deliveries drop constraint deliverable_deliveries_url_check;
alter table public.deliverable_deliveries add constraint deliverable_deliveries_url_check
  check (final_url is null or (char_length(final_url) <= 2048 and final_url ~ '^https://\S+$'));

-- « Valider », « Demander des corrections » or « Refuser » a version in final
-- validation. Validating records the creative decision on the delivery and
-- reopens its check and delivery if another version was there.
create function public.decide_production_version(
  p_version_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_deliverable uuid;
  v_me uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'final_review' then
    raise exception 'invalid_transition';
  end if;
  if p_decision not in ('approve', 'changes', 'refuse') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_decision in ('changes', 'refuse') and v_note is null then
    raise exception 'reason_required';
  end if;
  update public.production_versions
     set status = case p_decision when 'approve' then 'approved'
                                  when 'changes' then 'changes_requested' else 'refused' end,
         decided_by = v_me, decided_at = now(), decision_note = v_note
   where id = v.id;
  if p_decision = 'approve' then
    select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
    insert into public.deliverable_deliveries
      (organization_id, project_id, deliverable_id, version_id, final_set_by, approved_by, approved_at)
    values (v.organization_id, v.project_id, v_deliverable, v.id, v_me, v_me, now())
    on conflict (deliverable_id) do update
      set version_id = excluded.version_id, approved_by = excluded.approved_by,
          approved_at = excluded.approved_at, checked_by = null, checked_at = null,
          delivered_by = null, delivered_at = null;
  end if;
end;
$$;
revoke execute on function public.decide_production_version(uuid, text, text) from public, anon;
grant execute on function public.decide_production_version(uuid, text, text) to authenticated;

-- 5. Technical check of the exports --------------------------------------------------------

create table public.production_export_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  label text not null,
  -- export = un fichier attendu (16:9, 9:16…); subtitles; qc = contrôle
  -- qualité; other.
  kind text not null default 'export',
  -- Where the checked file is (a link), when known.
  url text,
  -- null = not checked; ok = conforme; not_ok = non conforme.
  result text,
  checked_by uuid references public.people (id),
  checked_at timestamptz,
  note text,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_export_checks_label_check
    check (btrim(label) <> '' and char_length(label) <= 120),
  constraint production_export_checks_kind_check
    check (kind in ('export', 'subtitles', 'qc', 'other')),
  constraint production_export_checks_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_export_checks_result_check
    check (result is null or result in ('ok', 'not_ok')),
  constraint production_export_checks_note_check
    check (note is null or char_length(note) <= 1000),
  constraint production_export_checks_not_ok_check
    check (result is distinct from 'not_ok' or btrim(coalesce(note, '')) <> ''),
  constraint production_export_checks_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_export_checks_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_export_checks_sheet_idx on public.production_export_checks (sheet_id, position);
create trigger a_set_created_by before insert on public.production_export_checks
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_export_checks
  for each row execute function public.production_child_check();

-- Who checked, written here; a check changed after the delivery's check
-- reopens it.
create function public.production_export_checks_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.result is distinct from old.result then
    new.checked_by := case when new.result is not null then public.auth_person_id() end;
    new.checked_at := case when new.result is not null then now() end;
  end if;
  if tg_op = 'INSERT' or new.result is distinct from old.result then
    update public.deliverable_deliveries x
       set checked_by = null, checked_at = null, delivered_by = null, delivered_at = null
      from public.production_sheets s
     where s.id = new.sheet_id and x.deliverable_id = s.deliverable_id
       and x.checked_at is not null and new.result is distinct from 'ok';
  end if;
  return new;
end;
$$;
revoke execute on function public.production_export_checks_stamp() from public, anon, authenticated;
create trigger b_stamp before insert or update on public.production_export_checks
  for each row execute function public.production_export_checks_stamp();

alter table public.production_export_checks enable row level security;
alter table public.production_export_checks force row level security;
revoke all on table public.production_export_checks from anon, authenticated;
grant select, delete on public.production_export_checks to authenticated;
grant insert (organization_id, project_id, sheet_id, label, kind, url, result, note, position)
  on public.production_export_checks to authenticated;
grant update (label, kind, url, result, note, position)
  on public.production_export_checks to authenticated;
create policy production_export_checks_select on public.production_export_checks
  for select to authenticated using (public.can_see_project(project_id));
create policy production_export_checks_insert on public.production_export_checks
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_export_checks_update on public.production_export_checks
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_export_checks_delete on public.production_export_checks
  for delete to authenticated using (public.production_can_organize(project_id));

-- set_deliverable_final (20261010000301): with a production sheet, the
-- creative decision rests on the validated version — a new export link only
-- reopens the check and the delivery.
create or replace function public.set_deliverable_final(
  p_deliverable_id uuid,
  p_url text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deliverable public.strategy_deliverables%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
  v_sheet boolean;
begin
  select * into v_deliverable from public.strategy_deliverables where id = p_deliverable_id;
  if not found or not public.is_project_owner(v_deliverable.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(v_deliverable.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if v_url !~ '^https://\S+$' or char_length(v_url) > 2048 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_sheet := exists (select 1 from public.production_sheets s where s.deliverable_id = p_deliverable_id);
  insert into public.deliverable_deliveries
    (organization_id, project_id, deliverable_id, final_url, final_note, final_set_by)
  values (v_deliverable.organization_id, v_deliverable.project_id, p_deliverable_id, v_url,
          nullif(btrim(coalesce(p_note, '')), ''), public.auth_person_id())
  on conflict (deliverable_id) do update
    set final_url = excluded.final_url, final_note = excluded.final_note,
        final_set_by = excluded.final_set_by, final_set_at = now(),
        approved_by = case when v_sheet then deliverable_deliveries.approved_by end,
        approved_at = case when v_sheet then deliverable_deliveries.approved_at end,
        checked_by = null, checked_at = null, delivered_by = null, delivered_at = null;
end;
$$;

-- advance_deliverable_delivery (20261010000301) with a production sheet: the
-- creative validation is given on a version (decide_production_version), and
-- « Exports contrôlés » requires every expected export checked conforming.
create or replace function public.advance_deliverable_delivery(p_deliverable_id uuid, p_step text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.deliverable_deliveries%rowtype;
  v_me uuid := public.auth_person_id();
  v_owner boolean;
  v_sheet uuid;
begin
  select * into v_row from public.deliverable_deliveries
   where deliverable_id = p_deliverable_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'not_found';
  end if;
  v_owner := public.is_project_owner(v_row.project_id);
  if not (v_owner or (p_step = 'approve' and exists (
            select 1 from public.project_creatives pc
             where pc.project_id = v_row.project_id and pc.person_id = v_me))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(v_row.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  select s.id into v_sheet from public.production_sheets s where s.deliverable_id = p_deliverable_id;
  case p_step
    when 'approve' then
      if v_sheet is not null then raise exception 'approve_on_version'; end if;
      if v_row.approved_at is not null then raise exception 'invalid_transition'; end if;
      update public.deliverable_deliveries set approved_by = v_me, approved_at = now()
       where id = v_row.id;
    when 'check' then
      if v_row.approved_at is null or v_row.checked_at is not null then
        raise exception 'invalid_transition';
      end if;
      if v_sheet is not null and (
           not exists (select 1 from public.production_export_checks c where c.sheet_id = v_sheet)
           or exists (select 1 from public.production_export_checks c
                       where c.sheet_id = v_sheet and c.result is distinct from 'ok')) then
        raise exception 'exports_not_checked';
      end if;
      update public.deliverable_deliveries set checked_by = v_me, checked_at = now()
       where id = v_row.id;
    when 'deliver' then
      if v_row.checked_at is null or v_row.delivered_at is not null then
        raise exception 'invalid_transition';
      end if;
      update public.deliverable_deliveries set delivered_by = v_me, delivered_at = now()
       where id = v_row.id;
    when 'reopen' then
      -- With a sheet, the creative decision stays on its version.
      update public.deliverable_deliveries
         set approved_by = case when v_sheet is not null then approved_by end,
             approved_at = case when v_sheet is not null then approved_at end,
             checked_by = null, checked_at = null, delivered_by = null, delivered_at = null
       where id = v_row.id;
    else
      raise exception 'invalid_input' using errcode = '23514';
  end case;
end;
$$;

-- 6. Hand-off to Activations --------------------------------------------------------------

create table public.production_activation_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  deliverable_id uuid not null,
  -- The delivered version referenced (never copied), and the delivery date.
  version_id uuid,
  final_url text,
  delivered_at timestamptz not null,
  formats text[] not null default '{}',
  -- Rights and constraints known, written by the person who transmits.
  constraints_note text,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz not null default now(),
  constraint production_activation_handoffs_formats_check check (cardinality(formats) <= 20),
  constraint production_activation_handoffs_note_check
    check (constraints_note is null or char_length(constraints_note) <= 2000),
  constraint production_activation_handoffs_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_activation_handoffs_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_activation_handoffs_version_same_org foreign key (version_id, organization_id)
    references public.production_versions (id, organization_id)
);
create index production_activation_handoffs_project_idx
  on public.production_activation_handoffs (project_id, confirmed_at desc);
alter table public.production_activation_handoffs enable row level security;
alter table public.production_activation_handoffs force row level security;
revoke all on table public.production_activation_handoffs from anon, authenticated;
-- Written by transmit_to_activations only.
grant select on public.production_activation_handoffs to authenticated;
create policy production_activation_handoffs_select on public.production_activation_handoffs
  for select to authenticated using (public.can_see_project(project_id));

-- « Transmettre à Activations »: the owner, once the deliverable is delivered.
-- A reference to the delivered version and its date; nothing is published.
create function public.transmit_to_activations(
  p_sheet_id uuid, p_formats text[], p_constraints text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_delivery public.deliverable_deliveries%rowtype;
  v_id uuid;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_delivery from public.deliverable_deliveries
   where deliverable_id = v_sheet.deliverable_id;
  if not found or v_delivery.delivered_at is null then
    raise exception 'not_delivered';
  end if;
  insert into public.production_activation_handoffs
    (organization_id, project_id, sheet_id, deliverable_id, version_id, final_url, delivered_at,
     formats, constraints_note, confirmed_by)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, v_sheet.deliverable_id,
          v_delivery.version_id, v_delivery.final_url, v_delivery.delivered_at,
          coalesce(p_formats, '{}'), nullif(btrim(coalesce(p_constraints, '')), ''),
          public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.transmit_to_activations(uuid, text[], text) from public, anon;
grant execute on function public.transmit_to_activations(uuid, text[], text) to authenticated;
