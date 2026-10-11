-- Marketing › Activations, the cross-cutting core (ticket « Marketing /
-- Activations — Vue d'ensemble et pilotage », docs/ARCHITECTURE.md § 8 duodecies).
--
-- « Une activation est l'unité de pilotage Marketing » : a content, an
-- influence operation, a press action, a session… One row per activation of a
-- project, with three axes kept apart (ticket, « Décisions structurantes ») :
--   - the operational status, set by a person (Brouillon → À préparer →
--     Prête → En cours → Réalisée déclarée → Clôturée, plus Annulée,
--     Suspendue, Bloquée) : « Réalisée déclarée » proves nothing ;
--   - the proof : evidences (a link, a file, a declaration) and their checks,
--     separate rows, append-only ; the state is computed by code ;
--   - the measure : metric snapshots with source, period and verification ;
--     never summed nor defaulted to zero by the database.
-- Plus blockers, dependencies (links to existing objects, never copies), next
-- actions (a task only when a person asks for it) and an append-only journal
-- written by triggers and functions.
--
-- Who writes : the project's owner, and the activation's owner when they see
-- the project (« Responsable d'activation »). Who verifies or validates : a
-- holder of `validate` (the director) or a creative director of the project
-- (« Validateur PDS ») — the writers verify too. Everything is read by whoever
-- sees the project, except restricted files (payment proofs : the budget
-- readers). Nothing here contacts anyone, publishes, pays or closes a project.

-- 1. Access helpers -------------------------------------------------------------------------

create or replace function public.marketing_can_validate(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects p
                  where p.id = p_project_id
                    and public.has_permission(p.organization_id, 'validate'))
      or public.is_project_creative(p_project_id);
$$;
revoke execute on function public.marketing_can_validate(uuid) from public, anon;
grant execute on function public.marketing_can_validate(uuid) to authenticated;

-- 2. Activations ----------------------------------------------------------------------------

create table public.marketing_activations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- content, influence, press = RP, event = événement / session, other.
  kind text not null,
  -- Influence and RP run either in house or through an agency (no account).
  mode text,
  title text not null,
  description text,
  objective text,
  -- Where it comes from : created by hand, or from the Stratégie (a selected
  -- lever, a committed deliverable) or a Production hand-off. A link, never a
  -- copy : the source's values are read where they live.
  source_kind text not null default 'manual',
  lever_id uuid references public.levers (id) on delete set null,
  deliverable_id uuid references public.strategy_deliverables (id) on delete set null,
  handoff_id uuid references public.production_activation_handoffs (id) on delete set null,
  owner_person_id uuid references public.people (id),
  priority text not null default 'normal',
  starts_on date,
  due_on date,
  -- draft, to_prepare, ready, in_progress, done_declared, closed,
  -- cancelled, suspended, blocked.
  status text not null default 'draft',
  -- Why it is cancelled, suspended or blocked.
  status_reason text,
  -- Whether a proof or statistics are expected at all (« Non attendue »).
  evidence_expected boolean not null default true,
  metrics_expected boolean not null default true,
  -- Closure : definitive, or with reserves (the open points listed by code,
  -- kept as they were at closure).
  closure_kind text,
  closure_reserves jsonb,
  closure_note text,
  closed_by uuid references public.people (id),
  closed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_activations_kind_check
    check (kind in ('content', 'influence', 'press', 'event', 'other')),
  constraint marketing_activations_mode_check check (
    (kind in ('influence', 'press') and mode is not null and mode in ('internal', 'agency'))
    or (kind not in ('influence', 'press') and mode is null)),
  constraint marketing_activations_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint marketing_activations_description_check
    check (description is null or char_length(description) <= 4000),
  constraint marketing_activations_objective_check
    check (objective is null or char_length(objective) <= 2000),
  constraint marketing_activations_source_check check (
    source_kind in ('manual', 'lever', 'deliverable', 'handoff')),
  constraint marketing_activations_priority_check check (priority in ('high', 'normal', 'low')),
  constraint marketing_activations_dates_check
    check (starts_on is null or due_on is null or starts_on <= due_on),
  constraint marketing_activations_status_check check (status in (
    'draft', 'to_prepare', 'ready', 'in_progress', 'done_declared', 'closed', 'cancelled',
    'suspended', 'blocked')),
  constraint marketing_activations_reason_check check (
    (status in ('cancelled', 'suspended', 'blocked'))
      = (status_reason is not null and btrim(status_reason) <> '')
    and (status_reason is null or char_length(status_reason) <= 1000)),
  constraint marketing_activations_closure_check check (
    (status = 'closed') = (closure_kind is not null)
    and (closure_kind is null or closure_kind in ('definitive', 'with_reserves'))
    and (closure_kind is distinct from 'with_reserves' or closure_reserves is not null)),
  constraint marketing_activations_closure_note_check
    check (closure_note is null or char_length(closure_note) <= 2000),
  constraint marketing_activations_id_org_key unique (id, organization_id),
  constraint marketing_activations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index marketing_activations_project_idx
  on public.marketing_activations (project_id, created_at);
-- « Même activation rattachée deux fois : proposer l'objet existant ».
create unique index marketing_activations_deliverable_key
  on public.marketing_activations (deliverable_id) where deliverable_id is not null;
create unique index marketing_activations_handoff_key
  on public.marketing_activations (handoff_id) where handoff_id is not null;

create trigger a_set_created_by before insert on public.marketing_activations
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.marketing_activations
  for each row execute function public.set_updated_at();

-- Who may write one activation.
create or replace function public.activation_can_write(p_activation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.marketing_activations a
     where a.id = p_activation_id
       and (public.is_project_owner(a.project_id)
            or (a.owner_person_id = public.auth_person_id()
                and public.can_see_project(a.project_id))));
$$;
revoke execute on function public.activation_can_write(uuid) from public, anon;
grant execute on function public.activation_can_write(uuid) to authenticated;

-- A source belongs to the same project; the owner is a member of the
-- organization; the closure columns only change through close/reopen.
create or replace function public.marketing_activations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.lever_id is not null and not exists (
       select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id)
     or new.deliverable_id is not null and not exists (
       select 1 from public.strategy_deliverables d
        where d.id = new.deliverable_id and d.project_id = new.project_id)
     or new.handoff_id is not null and not exists (
       select 1 from public.production_activation_handoffs h
        where h.id = new.handoff_id and h.project_id = new.project_id) then
    raise exception 'source_not_in_project' using errcode = '23514';
  end if;
  if new.owner_person_id is not null
     and not public.production_person_is_member(new.owner_person_id, new.organization_id) then
    raise exception 'owner_not_member' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.closure_kind is not null then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
  elsif current_setting('pds.activation_closure', true) is distinct from 'on'
        and (new.closure_kind is distinct from old.closure_kind
             or new.closed_at is distinct from old.closed_at
             or new.closure_reserves is distinct from old.closure_reserves
             or (new.status = 'closed') <> (old.status = 'closed')) then
    raise exception 'use_close_activation' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_activations_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.marketing_activations
  for each row execute function public.marketing_activations_check();

alter table public.marketing_activations enable row level security;
alter table public.marketing_activations force row level security;
revoke all on table public.marketing_activations from anon, authenticated;
grant select on public.marketing_activations to authenticated;
grant insert (organization_id, project_id, kind, mode, title, description, objective,
              source_kind, lever_id, deliverable_id, handoff_id, owner_person_id, priority,
              starts_on, due_on, evidence_expected, metrics_expected)
  on public.marketing_activations to authenticated;
grant update (mode, title, description, objective, owner_person_id, priority, starts_on,
              due_on, status, status_reason, evidence_expected, metrics_expected)
  on public.marketing_activations to authenticated;
create policy marketing_activations_select on public.marketing_activations
  for select to authenticated using (public.can_see_project(project_id));
-- Created by the project's owner; never deleted (cancelled instead).
create policy marketing_activations_insert on public.marketing_activations
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy marketing_activations_update on public.marketing_activations
  for update to authenticated
  using (public.activation_can_write(id) and status <> 'closed')
  with check (public.activation_can_write(id));

-- 3. Journal (append-only) ----------------------------------------------------------------

create table public.activation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- « activation.created », « activation.status », « evidence.declared »…
  kind text not null,
  -- A target, an evidence, a metric… the event is about, when there is one.
  subject_id uuid,
  old_value jsonb,
  new_value jsonb,
  note text,
  actor uuid references public.people (id),
  at timestamptz not null default now(),
  constraint activation_events_kind_check check (kind ~ '^[a-z_]+\.[a-z_]+$'),
  constraint activation_events_note_check check (note is null or char_length(note) <= 2000),
  constraint activation_events_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create index activation_events_activation_idx on public.activation_events (activation_id, at desc);
alter table public.activation_events enable row level security;
alter table public.activation_events force row level security;
revoke all on table public.activation_events from anon, authenticated;
grant select on public.activation_events to authenticated;
create policy activation_events_select on public.activation_events
  for select to authenticated using (public.can_see_project(project_id));

create or replace function public.log_activation_event(
  p_activation_id uuid, p_kind text, p_subject uuid, p_old jsonb, p_new jsonb, p_note text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activation_events
    (organization_id, project_id, activation_id, kind, subject_id, old_value, new_value,
     note, actor)
  select a.organization_id, a.project_id, a.id, p_kind, p_subject, p_old, p_new,
         nullif(btrim(coalesce(p_note, '')), ''), public.auth_person_id()
    from public.marketing_activations a where a.id = p_activation_id;
$$;
revoke execute on function public.log_activation_event(uuid, text, uuid, jsonb, jsonb, text)
  from public, anon, authenticated;

create or replace function public.marketing_activations_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activation_event(new.id, 'activation.created', null, null,
      jsonb_build_object('kind', new.kind, 'mode', new.mode, 'source', new.source_kind), null);
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activation_event(new.id, 'activation.status', null,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status),
      new.status_reason);
  end if;
  if new.mode is distinct from old.mode then
    perform public.log_activation_event(new.id, 'activation.mode', null,
      jsonb_build_object('mode', old.mode), jsonb_build_object('mode', new.mode), null);
  end if;
  if new.owner_person_id is distinct from old.owner_person_id then
    perform public.log_activation_event(new.id, 'activation.owner', null,
      jsonb_build_object('person', old.owner_person_id),
      jsonb_build_object('person', new.owner_person_id), null);
  end if;
  if new.due_on is distinct from old.due_on or new.starts_on is distinct from old.starts_on then
    perform public.log_activation_event(new.id, 'activation.dates', null,
      jsonb_build_object('starts_on', old.starts_on, 'due_on', old.due_on),
      jsonb_build_object('starts_on', new.starts_on, 'due_on', new.due_on), null);
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_activations_journal() from public, anon, authenticated;
create trigger z_journal after insert or update on public.marketing_activations
  for each row execute function public.marketing_activations_journal();

-- Children carry the activation's project and organization, filled here from
-- the activation (never trusted from the client).
create or replace function public.activation_child_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select a.organization_id, a.project_id into new.organization_id, new.project_id
    from public.marketing_activations a where a.id = new.activation_id;
  if new.project_id is null then
    raise exception 'activation_not_found';
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_child_fill() from public, anon, authenticated;

-- 4. Targets : an influencer or a media of the Réseau, per activation -------------------------

create table public.activation_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- The influencer, or the media (Réseau › Influenceurs, › Médias & journalistes).
  contact_id uuid not null,
  -- RP : the journalist, when one is known.
  journalist_contact_id uuid,
  priority text not null default 'normal',
  angle text,
  justification text,
  owner_person_id uuid references public.people (id),
  -- How it ended, set by a person : closed, refused, no_response, abandoned,
  -- cancelled, dispute (litige), declined (média qui décline).
  outcome text,
  outcome_reason text,
  outcome_by uuid references public.people (id),
  outcome_at timestamptz,
  -- « Une alerte n'interdit pas la sélection ; elle doit être comprise et
  -- confirmée » : the warnings shown at selection, as confirmed.
  confirmed_warnings text[] not null default '{}',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activation_targets_priority_check check (priority in ('high', 'normal', 'low')),
  constraint activation_targets_angle_check check (angle is null or char_length(angle) <= 2000),
  constraint activation_targets_justification_check
    check (justification is null or char_length(justification) <= 2000),
  constraint activation_targets_outcome_check check (outcome is null or outcome in (
    'closed', 'refused', 'no_response', 'abandoned', 'cancelled', 'dispute', 'declined')),
  constraint activation_targets_outcome_reason_check
    check (outcome_reason is null or char_length(outcome_reason) <= 1000),
  constraint activation_targets_warnings_check check (cardinality(confirmed_warnings) <= 20),
  -- « Une seule Collaboration par campagne et influenceur » ; « Même média
  -- ajouté deux fois : ouvrir la cible existante ».
  constraint activation_targets_unique unique (activation_id, contact_id),
  constraint activation_targets_id_org_key unique (id, organization_id),
  constraint activation_targets_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint activation_targets_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint activation_targets_journalist_same_org foreign key (journalist_contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index activation_targets_contact_idx on public.activation_targets (contact_id);
create trigger a_fill before insert on public.activation_targets
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.activation_targets
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.activation_targets
  for each row execute function public.set_updated_at();

create or replace function public.activation_targets_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activation_event(new.activation_id, 'target.added', new.id, null,
      jsonb_build_object('contact', new.contact_id, 'warnings', new.confirmed_warnings), null);
  elsif new.outcome is distinct from old.outcome then
    -- Who and when are stamped here, never by the client.
    new.outcome_by := case when new.outcome is null then null else public.auth_person_id() end;
    new.outcome_at := case when new.outcome is null then null else now() end;
    perform public.log_activation_event(new.activation_id, 'target.outcome', new.id,
      jsonb_build_object('outcome', old.outcome), jsonb_build_object('outcome', new.outcome),
      new.outcome_reason);
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_targets_journal() from public, anon, authenticated;
create trigger b_journal before insert or update on public.activation_targets
  for each row execute function public.activation_targets_journal();

alter table public.activation_targets enable row level security;
alter table public.activation_targets force row level security;
revoke all on table public.activation_targets from anon, authenticated;
grant select on public.activation_targets to authenticated;
grant insert (organization_id, project_id, activation_id, contact_id, journalist_contact_id, priority, angle, justification,
              owner_person_id, confirmed_warnings)
  on public.activation_targets to authenticated;
grant update (journalist_contact_id, priority, angle, justification, owner_person_id, outcome,
              outcome_reason)
  on public.activation_targets to authenticated;
create policy activation_targets_select on public.activation_targets
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_targets_insert on public.activation_targets
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_targets_update on public.activation_targets
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- 5. Files (captures, agency spreadsheets, invoices…) -------------------------------------

create table public.activation_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- evidence = preuve; agency_source = tableau ou plan d'agence; agency_report
  -- = bilan d'agence; invoice = facture ou note; payment_proof = preuve de
  -- paiement; content = contenu d'un créateur; other.
  kind text not null,
  -- "<organization_id>/<project_id>/<uuid>[.<ext>]" in activation-files.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  -- Read only by the budget readers (payment proofs, invoices).
  restricted boolean not null default false,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_files_id_org_key unique (id, organization_id),
  constraint activation_files_path_key unique (path),
  constraint activation_files_kind_check check (kind in (
    'evidence', 'agency_source', 'agency_report', 'invoice', 'payment_proof', 'content',
    'other')),
  constraint activation_files_path_check check (
    path ~ ('^' || organization_id::text || '/' || project_id::text
            || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint activation_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint activation_files_mime_check check (char_length(mime) between 1 and 255),
  constraint activation_files_bytes_check check (bytes > 0 and bytes <= 209715200),
  -- Payment proofs and invoices are always restricted.
  constraint activation_files_restricted_check
    check (kind not in ('invoice', 'payment_proof') or restricted),
  constraint activation_files_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create index activation_files_activation_idx on public.activation_files (activation_id, kind);
-- The path names the project : the row must agree with its activation.
create or replace function public.activation_files_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.marketing_activations a
                  where a.id = new.activation_id and a.project_id = new.project_id
                    and a.organization_id = new.organization_id) then
    raise exception 'activation_not_found';
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_files_check() from public, anon, authenticated;
create trigger a_check before insert on public.activation_files
  for each row execute function public.activation_files_check();
create trigger a_set_created_by before insert on public.activation_files
  for each row execute function public.set_created_by();
alter table public.activation_files enable row level security;
alter table public.activation_files force row level security;
revoke all on table public.activation_files from anon, authenticated;
grant select on public.activation_files to authenticated;
grant insert (organization_id, project_id, activation_id, kind, path, file_name, mime, bytes,
              restricted)
  on public.activation_files to authenticated;
create policy activation_files_select on public.activation_files
  for select to authenticated
  using (public.can_see_project(project_id)
         and (not restricted or public.can_read_project_budget(project_id)));
create policy activation_files_insert on public.activation_files
  for insert to authenticated with check (public.activation_can_write(activation_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activation-files', 'activation-files', false, 209715200, null)
on conflict (id) do nothing;

create policy activation_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'activation-files'
    and exists (select 1 from public.activation_files f
                 where f.path = objects.name and public.can_see_project(f.project_id)
                   and (not f.restricted or public.can_read_project_budget(f.project_id)))
  );
-- Uploaded before its row exists : the writer of an activation of that project.
create policy activation_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'activation-files'
    and exists (
      select 1 from public.marketing_activations a
       where a.project_id = public.try_uuid((storage.foldername(objects.name))[2])
         and a.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and public.activation_can_write(a.id))
  );
-- Only an object never recorded (a failed upload) is removed.
create policy activation_files_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'activation-files'
    and not exists (select 1 from public.activation_files f where f.path = objects.name)
    and exists (
      select 1 from public.marketing_activations a
       where a.project_id = public.try_uuid((storage.foldername(objects.name))[2])
         and public.activation_can_write(a.id))
  );

-- 6. Evidences and their checks ----------------------------------------------------------

create table public.activation_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid,
  -- publication, coverage = retombée, broadcast = diffusion, interview, other.
  kind text not null,
  platform text,
  url text,
  file_id uuid,
  -- When it happened, as declared (published on, aired on…).
  declared_on date,
  -- Who says so : internal, creator, agency, media, other.
  declared_source text not null default 'internal',
  declaration_note text,
  -- « Une preuve retirée ou inaccessible reste historisée » : withdrawn, kept.
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.people (id),
  withdrawn_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_evidence_kind_check
    check (kind in ('publication', 'coverage', 'broadcast', 'interview', 'other')),
  constraint activation_evidence_platform_check
    check (platform is null or (btrim(platform) <> '' and char_length(platform) <= 60)),
  constraint activation_evidence_url_check
    check (url is null or (char_length(url) <= 2000 and url ~ '^https?://\S+$')),
  constraint activation_evidence_source_check
    check (declared_source in ('internal', 'creator', 'agency', 'media', 'other')),
  constraint activation_evidence_note_check
    check (declaration_note is null or char_length(declaration_note) <= 2000),
  -- A declaration names its link, its file or at least its source note.
  constraint activation_evidence_something_check
    check (url is not null or file_id is not null
           or (declaration_note is not null and btrim(declaration_note) <> '')),
  constraint activation_evidence_withdrawn_check check (
    (withdrawn_at is null) = (withdrawn_reason is null)
    and (withdrawn_reason is null or (btrim(withdrawn_reason) <> ''
                                      and char_length(withdrawn_reason) <= 1000))),
  constraint activation_evidence_id_org_key unique (id, organization_id),
  constraint activation_evidence_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint activation_evidence_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade,
  constraint activation_evidence_file_same_org foreign key (file_id, organization_id)
    references public.activation_files (id, organization_id)
);
create index activation_evidence_activation_idx
  on public.activation_evidence (activation_id, created_at);

create table public.activation_evidence_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  evidence_id uuid not null,
  -- verified, contested, unavailable (link removed, private, broken).
  result text not null,
  -- link_opened, file_reviewed, screenshot, platform_stats, other.
  method text not null,
  note text,
  checked_by uuid references public.people (id),
  checked_at timestamptz not null default now(),
  constraint activation_evidence_checks_result_check
    check (result in ('verified', 'contested', 'unavailable')),
  constraint activation_evidence_checks_method_check check (method in (
    'link_opened', 'file_reviewed', 'screenshot', 'platform_stats', 'other')),
  constraint activation_evidence_checks_note_check check (note is null or char_length(note) <= 2000),
  -- « Méthode alternative documentée » : other says how.
  constraint activation_evidence_checks_other_check
    check (method <> 'other' or (note is not null and btrim(note) <> '')),
  constraint activation_evidence_checks_evidence_same_org foreign key (evidence_id, organization_id)
    references public.activation_evidence (id, organization_id) on delete cascade
);
create index activation_evidence_checks_evidence_idx
  on public.activation_evidence_checks (evidence_id, checked_at desc);

-- The evidence row fills itself from its activation; a target is one of the
-- same activation; withdrawing is the only change, stamped here.
create or replace function public.activation_evidence_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select a.organization_id, a.project_id into new.organization_id, new.project_id
      from public.marketing_activations a where a.id = new.activation_id;
    if new.project_id is null then raise exception 'activation_not_found'; end if;
    if new.target_id is not null and not exists (
      select 1 from public.activation_targets t
       where t.id = new.target_id and t.activation_id = new.activation_id) then
      raise exception 'target_not_in_activation' using errcode = '23514';
    end if;
    if new.file_id is not null and not exists (
      select 1 from public.activation_files f
       where f.id = new.file_id and f.activation_id = new.activation_id) then
      raise exception 'file_not_in_activation' using errcode = '23514';
    end if;
    new.withdrawn_at := null;
    new.withdrawn_by := null;
    new.withdrawn_reason := null;
    perform public.log_activation_event(new.activation_id, 'evidence.declared', new.id, null,
      jsonb_build_object('kind', new.kind, 'url', new.url, 'source', new.declared_source,
                         'declared_on', new.declared_on), new.declaration_note);
    return new;
  end if;
  if old.withdrawn_at is not null then
    raise exception 'evidence_withdrawn' using errcode = '23514';
  end if;
  new.withdrawn_at := now();
  new.withdrawn_by := public.auth_person_id();
  perform public.log_activation_event(new.activation_id, 'evidence.withdrawn', new.id, null,
                                      null, new.withdrawn_reason);
  return new;
end;
$$;
revoke execute on function public.activation_evidence_guard() from public, anon, authenticated;
create trigger a_guard before insert or update on public.activation_evidence
  for each row execute function public.activation_evidence_guard();
create trigger b_set_created_by before insert on public.activation_evidence
  for each row execute function public.set_created_by();

create or replace function public.activation_evidence_checks_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.activation_evidence%rowtype;
begin
  select * into v from public.activation_evidence where id = new.evidence_id;
  if not found then raise exception 'evidence_not_found'; end if;
  if v.withdrawn_at is not null then
    raise exception 'evidence_withdrawn' using errcode = '23514';
  end if;
  -- « Jamais comme vérifiée sans méthode alternative documentée » : a
  -- declaration without link nor file is verified only by « other ».
  if new.result = 'verified' and v.url is null and v.file_id is null and new.method <> 'other' then
    raise exception 'verification_needs_method' using errcode = '23514';
  end if;
  new.organization_id := v.organization_id;
  new.project_id := v.project_id;
  new.checked_by := public.auth_person_id();
  new.checked_at := now();
  perform public.log_activation_event(v.activation_id, 'evidence.checked', v.id, null,
    jsonb_build_object('result', new.result, 'method', new.method), new.note);
  return new;
end;
$$;
revoke execute on function public.activation_evidence_checks_fill() from public, anon, authenticated;
create trigger a_fill before insert on public.activation_evidence_checks
  for each row execute function public.activation_evidence_checks_fill();

alter table public.activation_evidence enable row level security;
alter table public.activation_evidence force row level security;
revoke all on table public.activation_evidence from anon, authenticated;
grant select on public.activation_evidence to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, kind, platform, url, file_id, declared_on,
              declared_source, declaration_note)
  on public.activation_evidence to authenticated;
grant update (withdrawn_reason) on public.activation_evidence to authenticated;
create policy activation_evidence_select on public.activation_evidence
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_evidence_insert on public.activation_evidence
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_evidence_update on public.activation_evidence
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

alter table public.activation_evidence_checks enable row level security;
alter table public.activation_evidence_checks force row level security;
revoke all on table public.activation_evidence_checks from anon, authenticated;
grant select on public.activation_evidence_checks to authenticated;
grant insert (organization_id, project_id, evidence_id, result, method, note)
  on public.activation_evidence_checks to authenticated;
create policy activation_evidence_checks_select on public.activation_evidence_checks
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_evidence_checks_insert on public.activation_evidence_checks
  for insert to authenticated
  with check (exists (
    select 1 from public.activation_evidence e
     where e.id = evidence_id
       and (public.activation_can_write(e.activation_id)
            or public.marketing_can_validate(e.project_id))));

-- 7. Metric snapshots ----------------------------------------------------------------------

create table public.activation_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid,
  -- views, likes, comments, saves, shares, engagement_rate, reach,
  -- followers, clicks, streams, other (with a label).
  metric text not null,
  label text,
  value numeric(16, 4) not null,
  -- count, percent, eur.
  unit text not null default 'count',
  platform text,
  period_start date,
  period_end date,
  -- agency, creator, internal, platform, media, independent.
  source text not null,
  method text,
  collected_on date not null,
  -- declared, verified, contested : a snapshot's own trust.
  verification text not null default 'declared',
  -- « Une correction crée une nouvelle version ou invalide la précédente
  -- sans effacement ».
  invalidated_at timestamptz,
  invalidated_by uuid references public.people (id),
  invalidation_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_metrics_metric_check check (metric in (
    'views', 'likes', 'comments', 'saves', 'shares', 'engagement_rate', 'reach', 'followers',
    'clicks', 'streams', 'other')),
  constraint activation_metrics_label_check check (
    (metric = 'other') = (label is not null)
    and (label is null or (btrim(label) <> '' and char_length(label) <= 80))),
  constraint activation_metrics_value_check check (value >= 0),
  constraint activation_metrics_unit_check check (unit in ('count', 'percent', 'eur')),
  constraint activation_metrics_platform_check
    check (platform is null or (btrim(platform) <> '' and char_length(platform) <= 60)),
  constraint activation_metrics_period_check
    check (period_start is null or period_end is null or period_start <= period_end),
  constraint activation_metrics_source_check check (source in (
    'agency', 'creator', 'internal', 'platform', 'media', 'independent')),
  constraint activation_metrics_method_check
    check (method is null or char_length(method) <= 300),
  constraint activation_metrics_verification_check
    check (verification in ('declared', 'verified', 'contested')),
  constraint activation_metrics_invalidated_check check (
    (invalidated_at is null) = (invalidation_reason is null)
    and (invalidation_reason is null or (btrim(invalidation_reason) <> ''
                                         and char_length(invalidation_reason) <= 1000))),
  constraint activation_metrics_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint activation_metrics_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create index activation_metrics_activation_idx
  on public.activation_metrics (activation_id, collected_on desc);

-- Filled from the activation; only the verification and the invalidation
-- change afterwards, both journaled and stamped here.
create or replace function public.activation_metrics_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select a.organization_id, a.project_id into new.organization_id, new.project_id
      from public.marketing_activations a where a.id = new.activation_id;
    if new.project_id is null then raise exception 'activation_not_found'; end if;
    if new.target_id is not null and not exists (
      select 1 from public.activation_targets t
       where t.id = new.target_id and t.activation_id = new.activation_id) then
      raise exception 'target_not_in_activation' using errcode = '23514';
    end if;
    new.invalidated_at := null;
    new.invalidated_by := null;
    new.invalidation_reason := null;
    -- A snapshot is declared when recorded ; verifying is a separate act.
    new.verification := 'declared';
    perform public.log_activation_event(new.activation_id, 'metric.recorded', new.id, null,
      jsonb_build_object('metric', new.metric, 'value', new.value, 'source', new.source), null);
    return new;
  end if;
  if old.invalidated_at is not null then
    raise exception 'metric_invalidated' using errcode = '23514';
  end if;
  if new.invalidation_reason is not null then
    if not public.activation_can_write(new.activation_id) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    new.invalidated_at := now();
    new.invalidated_by := public.auth_person_id();
    perform public.log_activation_event(new.activation_id, 'metric.invalidated', new.id, null,
                                        null, new.invalidation_reason);
  elsif new.verification is distinct from old.verification then
    if not (public.activation_can_write(new.activation_id)
            or public.marketing_can_validate(new.project_id)) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    perform public.log_activation_event(new.activation_id, 'metric.verification', new.id,
      jsonb_build_object('verification', old.verification),
      jsonb_build_object('verification', new.verification), null);
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_metrics_guard() from public, anon, authenticated;
create trigger a_guard before insert or update on public.activation_metrics
  for each row execute function public.activation_metrics_guard();
create trigger b_set_created_by before insert on public.activation_metrics
  for each row execute function public.set_created_by();

alter table public.activation_metrics enable row level security;
alter table public.activation_metrics force row level security;
revoke all on table public.activation_metrics from anon, authenticated;
grant select on public.activation_metrics to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, metric, label, value, unit, platform, period_start,
              period_end, source, method, collected_on)
  on public.activation_metrics to authenticated;
grant update (verification, invalidation_reason) on public.activation_metrics to authenticated;
create policy activation_metrics_select on public.activation_metrics
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_metrics_insert on public.activation_metrics
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_metrics_update on public.activation_metrics
  for update to authenticated
  using (public.activation_can_write(activation_id) or public.marketing_can_validate(project_id))
  with check (public.activation_can_write(activation_id)
              or public.marketing_can_validate(project_id));

-- 8. Blockers ------------------------------------------------------------------------------

create table public.activation_blockers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- internal, external, legal, budget, production, validation, evidence, data.
  category text not null,
  description text not null,
  -- What blocks, in words (« Contrat de Dioo », « Lien de la capsule 3 »).
  blocking_object text,
  owner_person_id uuid references public.people (id),
  severity text not null default 'medium',
  impact text,
  expected_resolution date,
  status text not null default 'open',
  resolution_note text,
  resolved_by uuid references public.people (id),
  resolved_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_blockers_category_check check (category in (
    'internal', 'external', 'legal', 'budget', 'production', 'validation', 'evidence', 'data')),
  constraint activation_blockers_description_check
    check (btrim(description) <> '' and char_length(description) <= 1000),
  constraint activation_blockers_object_check
    check (blocking_object is null or char_length(blocking_object) <= 200),
  constraint activation_blockers_severity_check check (severity in ('low', 'medium', 'high')),
  constraint activation_blockers_impact_check check (impact is null or char_length(impact) <= 1000),
  constraint activation_blockers_status_check check (status in ('open', 'resolved')),
  constraint activation_blockers_resolution_check check (
    (status = 'resolved') = (resolution_note is not null and btrim(resolution_note) <> '')
    and (resolution_note is null or char_length(resolution_note) <= 1000)),
  constraint activation_blockers_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create index activation_blockers_activation_idx on public.activation_blockers (activation_id);
create trigger a_fill before insert on public.activation_blockers
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.activation_blockers
  for each row execute function public.set_created_by();

create or replace function public.activation_blockers_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'open' then raise exception 'invalid_input' using errcode = '23514'; end if;
    perform public.log_activation_event(new.activation_id, 'blocker.opened', new.id, null,
      jsonb_build_object('category', new.category, 'severity', new.severity), new.description);
  elsif new.status is distinct from old.status then
    if old.status = 'resolved' then
      raise exception 'blocker_resolved' using errcode = '23514';
    end if;
    new.resolved_by := public.auth_person_id();
    new.resolved_at := now();
    perform public.log_activation_event(new.activation_id, 'blocker.resolved', new.id, null,
                                        null, new.resolution_note);
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_blockers_journal() from public, anon, authenticated;
create trigger b_journal before insert or update on public.activation_blockers
  for each row execute function public.activation_blockers_journal();

alter table public.activation_blockers enable row level security;
alter table public.activation_blockers force row level security;
revoke all on table public.activation_blockers from anon, authenticated;
grant select on public.activation_blockers to authenticated;
grant insert (organization_id, project_id, activation_id, category, description, blocking_object, owner_person_id, severity,
              impact, expected_resolution)
  on public.activation_blockers to authenticated;
grant update (owner_person_id, severity, impact, expected_resolution, status, resolution_note)
  on public.activation_blockers to authenticated;
create policy activation_blockers_select on public.activation_blockers
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_blockers_insert on public.activation_blockers
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_blockers_update on public.activation_blockers
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- 9. Dependencies : links to existing objects, read where they live ---------------------------

create table public.activation_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- deliverable (Stratégie / Production), contract, clearance (emprunt), task.
  kind text not null,
  deliverable_id uuid references public.strategy_deliverables (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete cascade,
  clearance_id uuid references public.legal_clearances (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  blocking boolean not null default true,
  -- The source's state when linked (« version observée »), written here.
  observed jsonb,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_dependencies_kind_check
    check (kind in ('deliverable', 'contract', 'clearance', 'task')),
  constraint activation_dependencies_one_check check (
    num_nonnulls(deliverable_id, contract_id, clearance_id, task_id) = 1
    and (kind <> 'deliverable' or deliverable_id is not null)
    and (kind <> 'contract' or contract_id is not null)
    and (kind <> 'clearance' or clearance_id is not null)
    and (kind <> 'task' or task_id is not null)),
  constraint activation_dependencies_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create unique index activation_dependencies_unique on public.activation_dependencies
  (activation_id, kind, coalesce(deliverable_id, contract_id, clearance_id, task_id));

create or replace function public.activation_dependencies_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select a.organization_id, a.project_id into new.organization_id, new.project_id
    from public.marketing_activations a where a.id = new.activation_id;
  if new.project_id is null then raise exception 'activation_not_found'; end if;
  -- The object belongs to the project; its state is noted as observed now.
  case new.kind
    when 'deliverable' then
      select d.project_id, jsonb_build_object('delivered_at', dd.delivered_at)
        into v_project, new.observed
        from public.strategy_deliverables d
        left join public.deliverable_deliveries dd on dd.deliverable_id = d.id
       where d.id = new.deliverable_id;
    when 'contract' then
      select k.project_id, jsonb_build_object('status', k.status) into v_project, new.observed
        from public.contracts k where k.id = new.contract_id;
    when 'clearance' then
      select c.project_id, jsonb_build_object('status', c.status) into v_project, new.observed
        from public.legal_clearances c where c.id = new.clearance_id;
    when 'task' then
      select t.project_id, jsonb_build_object('status', t.status) into v_project, new.observed
        from public.tasks t where t.id = new.task_id;
  end case;
  if v_project is distinct from new.project_id then
    raise exception 'source_not_in_project' using errcode = '23514';
  end if;
  perform public.log_activation_event(new.activation_id, 'dependency.linked', new.id, null,
    jsonb_build_object('kind', new.kind, 'blocking', new.blocking), null);
  return new;
end;
$$;
revoke execute on function public.activation_dependencies_fill() from public, anon, authenticated;
create trigger a_fill before insert on public.activation_dependencies
  for each row execute function public.activation_dependencies_fill();
create trigger b_set_created_by before insert on public.activation_dependencies
  for each row execute function public.set_created_by();

create or replace function public.activation_dependencies_unlinked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_activation_event(old.activation_id, 'dependency.unlinked', old.id,
    jsonb_build_object('kind', old.kind), null, null);
  return old;
end;
$$;
revoke execute on function public.activation_dependencies_unlinked() from public, anon, authenticated;
create trigger z_unlinked after delete on public.activation_dependencies
  for each row execute function public.activation_dependencies_unlinked();

alter table public.activation_dependencies enable row level security;
alter table public.activation_dependencies force row level security;
revoke all on table public.activation_dependencies from anon, authenticated;
grant select, delete on public.activation_dependencies to authenticated;
grant insert (organization_id, project_id, activation_id, kind, deliverable_id, contract_id, clearance_id, task_id,
              blocking)
  on public.activation_dependencies to authenticated;
create policy activation_dependencies_select on public.activation_dependencies
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_dependencies_insert on public.activation_dependencies
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_dependencies_delete on public.activation_dependencies
  for delete to authenticated using (public.activation_can_write(activation_id));

-- 10. Next actions -------------------------------------------------------------------------
-- The next action is computed by code from rules ; a row exists only when a
-- person acted : wrote their own (manual), set a rule's aside (not
-- applicable), or turned it into a task (« L'affichage d'une prochaine action
-- ne crée aucune tâche automatiquement »).

alter table public.tasks add column activation_id uuid
  references public.marketing_activations (id) on delete set null;

create table public.activation_next_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- « manual », or the rule's key (« rule:evidence_missing »).
  origin text not null,
  label text not null,
  expected_person_id uuid references public.people (id),
  due_on date,
  -- open, done, not_applicable (« sans objet »).
  status text not null default 'open',
  task_id uuid references public.tasks (id) on delete set null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activation_next_actions_origin_check
    check (origin = 'manual' or origin ~ '^rule:[a-z_]{1,60}$'),
  constraint activation_next_actions_label_check
    check (btrim(label) <> '' and char_length(label) <= 300),
  constraint activation_next_actions_status_check
    check (status in ('open', 'done', 'not_applicable')),
  constraint activation_next_actions_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create index activation_next_actions_activation_idx
  on public.activation_next_actions (activation_id, created_at desc);
create trigger a_fill before insert on public.activation_next_actions
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.activation_next_actions
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.activation_next_actions
  for each row execute function public.set_updated_at();

alter table public.activation_next_actions enable row level security;
alter table public.activation_next_actions force row level security;
revoke all on table public.activation_next_actions from anon, authenticated;
grant select on public.activation_next_actions to authenticated;
grant insert (organization_id, project_id, activation_id, origin, label, expected_person_id, due_on, status)
  on public.activation_next_actions to authenticated;
grant update (label, expected_person_id, due_on, status) on public.activation_next_actions
  to authenticated;
create policy activation_next_actions_select on public.activation_next_actions
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_next_actions_insert on public.activation_next_actions
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_next_actions_update on public.activation_next_actions
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- « Créer la tâche » : asked by a person, with whom and when ; the task points
-- to the activation, the action keeps the task.
create or replace function public.create_activation_task(
  p_activation_id uuid, p_origin text, p_label text, p_assignee_person_id uuid, p_due_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_task uuid;
  v_label text := btrim(coalesce(p_label, ''));
begin
  select * into v from public.marketing_activations where id = p_activation_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_label = '' or char_length(v_label) > 300 or p_due_date is null
     or p_assignee_person_id is null
     or not public.production_person_is_member(p_assignee_person_id, v.organization_id)
     or (p_origin <> 'manual' and p_origin !~ '^rule:[a-z_]{1,60}$') then
    raise exception 'invalid_task' using errcode = '23514';
  end if;
  insert into public.tasks
    (organization_id, project_id, title, assignee_person_id, due_date, activation_id)
  values (v.organization_id, v.project_id, v_label, p_assignee_person_id, p_due_date, v.id)
  returning id into v_task;
  insert into public.activation_next_actions
    (organization_id, project_id, activation_id, origin, label, expected_person_id, due_on, task_id)
  values (v.organization_id, v.project_id, v.id, p_origin, v_label, p_assignee_person_id,
          p_due_date, v_task);
  perform public.log_activation_event(v.id, 'next_action.task', v_task, null,
    jsonb_build_object('label', v_label, 'due', p_due_date), null);
  return v_task;
end;
$$;
revoke execute on function public.create_activation_task(uuid, text, text, uuid, date)
  from public, anon;
grant execute on function public.create_activation_task(uuid, text, text, uuid, date)
  to authenticated;

-- 11. Closure and reopening -----------------------------------------------------------------
-- « Clôturée » only here : definitive, or with reserves (the open points the
-- code listed, kept as given). A definitive closure despite reserves needs a
-- written reason. Reopening is audited with its reason.

create or replace function public.close_activation(
  p_activation_id uuid, p_kind text, p_reserves jsonb, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_has_reserves boolean :=
    p_reserves is not null and jsonb_typeof(p_reserves) = 'array'
    and jsonb_array_length(p_reserves) > 0;
begin
  select * into v from public.marketing_activations where id = p_activation_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status = 'closed' then raise exception 'already_closed'; end if;
  if p_kind not in ('definitive', 'with_reserves')
     or (p_kind = 'with_reserves' and not v_has_reserves)
     or (p_reserves is not null and jsonb_typeof(p_reserves) <> 'array')
     or char_length(coalesce(v_note, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_kind = 'definitive' and v_has_reserves and v_note is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  perform set_config('pds.activation_closure', 'on', true);
  update public.marketing_activations
     set status = 'closed', status_reason = null, closure_kind = p_kind,
         closure_reserves = case when v_has_reserves then p_reserves end,
         closure_note = v_note, closed_by = public.auth_person_id(), closed_at = now()
   where id = v.id;
  perform set_config('pds.activation_closure', 'off', true);
  perform public.log_activation_event(v.id, 'activation.closed', null, null,
    jsonb_build_object('kind', p_kind, 'reserves', p_reserves), v_note);
end;
$$;
revoke execute on function public.close_activation(uuid, text, jsonb, text) from public, anon;
grant execute on function public.close_activation(uuid, text, jsonb, text) to authenticated;

create or replace function public.reopen_activation(p_activation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v from public.marketing_activations where id = p_activation_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'closed' then raise exception 'not_closed'; end if;
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  perform set_config('pds.activation_closure', 'on', true);
  update public.marketing_activations
     set status = 'in_progress', closure_kind = null, closure_reserves = null,
         closure_note = null, closed_by = null, closed_at = null
   where id = v.id;
  perform set_config('pds.activation_closure', 'off', true);
  perform public.log_activation_event(v.id, 'activation.reopened', null,
    jsonb_build_object('kind', v.closure_kind, 'reserves', v.closure_reserves), null, v_reason);
end;
$$;
revoke execute on function public.reopen_activation(uuid, text) from public, anon;
grant execute on function public.reopen_activation(uuid, text) to authenticated;
