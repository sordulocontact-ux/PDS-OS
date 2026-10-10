-- Stratégie, étapes 9 à 11 (docs/ARCHITECTURE.md § 6 bis):
--   1. versioned documents of the strategy: the Brief de sortie (internal,
--      the reference) and the external Plan de sortie / Dossier de presse;
--      each version is a snapshot written by the server, never rewritten;
--   2. the validation of a version by several people: the director (sole
--      validator) always, plus the project's creative directors the owner
--      names; each says validé / modification demandée with a comment; the
--      owner can remind; the Brief goes through the stage's circuit and,
--      once every review approves, the stage is validated: « Brief de sortie
--      — V1 » is frozen;
--   3. a revision after V1: a significant change opens a revision (the stage
--      stays validated, a validated stage is never reopened) and makes a new
--      version, approved by the same circuit; V1 is never overwritten;
--   4. the generators' drafts (choices kept between visits) and the sharing
--      of an external document by link; the visuals it shows.
-- Written with "if not exists" / "or replace": a local database that once
-- applied the reverted 20261009000101 already holds some of these objects.

-- 1. Workspace: the revision flag ---------------------------------------------------

alter table public.strategy_workspaces add column if not exists revision_opened_at timestamptz;
alter table public.strategy_workspaces
  add column if not exists revision_opened_by uuid references public.people (id);

-- 2. Documents and reviews ------------------------------------------------------------

create table if not exists public.strategy_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  kind text not null,
  version integer not null,
  content jsonb not null,
  state text not null default 'pending',
  -- The stage's validation (the Brief, outside a revision).
  validation_id uuid references public.validations (id),
  request_note text,
  change_comment text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.people (id),
  constraint strategy_documents_kind_check check (kind in ('brief', 'release_plan', 'press_kit')),
  constraint strategy_documents_version_key unique (project_id, kind, version),
  constraint strategy_documents_id_org_key unique (id, organization_id),
  constraint strategy_documents_version_positive check (version > 0),
  constraint strategy_documents_content_object
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 600000),
  constraint strategy_documents_state_check
    check (state in ('pending', 'sent', 'approved', 'changes_requested', 'superseded')),
  constraint strategy_documents_note_length
    check (request_note is null or char_length(request_note) <= 1000),
  constraint strategy_documents_validation_brief check (validation_id is null or kind = 'brief'),
  constraint strategy_documents_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create index if not exists strategy_documents_project_idx
  on public.strategy_documents (project_id, kind, version desc);
create index if not exists strategy_documents_validation_idx
  on public.strategy_documents (validation_id) where validation_id is not null;

-- Who must approve a sent version, and what each said.
create table if not exists public.strategy_document_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  person_id uuid not null references public.people (id),
  state text not null default 'pending',
  comment text,
  decided_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint strategy_reviews_person_key unique (document_id, person_id),
  constraint strategy_reviews_state_check
    check (state in ('pending', 'approved', 'changes_requested', 'cancelled')),
  constraint strategy_reviews_decided
    check ((state in ('approved', 'changes_requested')) = (decided_at is not null)),
  constraint strategy_reviews_comment_length check (comment is null or char_length(comment) <= 2000),
  constraint strategy_reviews_document_same_org foreign key (document_id, organization_id)
    references public.strategy_documents (id, organization_id) on delete cascade
);
create index if not exists strategy_reviews_person_idx
  on public.strategy_document_reviews (person_id) where state = 'pending';

alter table public.strategy_documents enable row level security;
alter table public.strategy_documents force row level security;
alter table public.strategy_document_reviews enable row level security;
alter table public.strategy_document_reviews force row level security;
revoke all on table public.strategy_documents from anon, authenticated;
revoke all on table public.strategy_document_reviews from anon, authenticated;
-- Written only through the functions below (security definer).
grant select on public.strategy_documents to authenticated;
grant select on public.strategy_document_reviews to authenticated;

-- The two policies read each other's table: through security definer
-- helpers, or each policy would trigger the other's forever.
create or replace function public.is_strategy_reviewer(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.strategy_document_reviews r
                 where r.document_id = p_document_id
                   and r.person_id = public.auth_person_id());
$$;
create or replace function public.strategy_document_visible(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.strategy_documents d
                 where d.id = p_document_id and public.can_see_project(d.project_id));
$$;
revoke execute on function public.is_strategy_reviewer(uuid) from public, anon;
revoke execute on function public.strategy_document_visible(uuid) from public, anon;
grant execute on function public.is_strategy_reviewer(uuid) to authenticated;
grant execute on function public.strategy_document_visible(uuid) to authenticated;

drop policy if exists strategy_documents_select_visible on public.strategy_documents;
create policy strategy_documents_select_visible on public.strategy_documents
  for select to authenticated
  using (public.can_see_project(project_id) or public.is_strategy_reviewer(id));
drop policy if exists strategy_reviews_select_visible on public.strategy_document_reviews;
create policy strategy_reviews_select_visible on public.strategy_document_reviews
  for select to authenticated
  using (person_id = public.auth_person_id()
         or public.strategy_document_visible(document_id));

-- The owner writes the strategy while its stage is in progress, or while a
-- revision of the validated strategy is open; never while a Brief version
-- waits for its reviewers.
create or replace function public.strategy_is_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
     and exists (
       select 1 from public.project_stages s
       join public.stage_definitions d on d.id = s.stage_definition_id
       where s.project_id = p_project_id
         and d.key = 'launch_strategy'
         and (s.state = 'in_progress'
              or (s.state = 'validated'
                  and exists (select 1 from public.strategy_workspaces w
                              where w.project_id = p_project_id
                                and w.revision_opened_at is not null)))
     )
     and not exists (
       select 1 from public.strategy_documents b
       where b.project_id = p_project_id and b.kind = 'brief' and b.state = 'sent'
     );
$$;

-- The strategy's stage is validated through its Brief de sortie only: a
-- validation of launch_strategy needs a Brief version about to be sent.
create or replace function public.validations_strategy_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_key text;
begin
  select s.project_id, d.key into v_project, v_key
    from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.id = new.project_stage_id;
  if v_key = 'launch_strategy' and not exists (
       select 1 from public.strategy_documents b
       where b.project_id = v_project and b.kind = 'brief' and b.state = 'pending') then
    raise exception 'brief_required';
  end if;
  return new;
end;
$$;
revoke execute on function public.validations_strategy_request() from public, anon, authenticated;
drop trigger if exists a_strategy_request on public.validations;
create trigger a_strategy_request before insert on public.validations
  for each row execute function public.validations_strategy_request();

-- « Générer » a version: the previous unsent or corrected one is replaced
-- (superseded), never rewritten. The Brief while the strategy is editable;
-- the external documents only from a validated Brief, and never while a
-- Brief version waits for its reviewers.
create or replace function public.create_strategy_document(p_project_id uuid, p_kind text, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_kind not in ('brief', 'release_plan', 'press_kit')
     or p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  -- One writer at a time per project.
  perform 1 from public.projects where id = p_project_id for update;
  if p_kind = 'brief' then
    if not public.strategy_is_editable(p_project_id) then
      raise exception 'stage_locked';
    end if;
  else
    if not exists (select 1 from public.strategy_documents b
                   where b.project_id = p_project_id and b.kind = 'brief' and b.state = 'approved') then
      raise exception 'brief_not_validated';
    end if;
    if exists (select 1 from public.strategy_documents b
               where b.project_id = p_project_id and b.kind = 'brief' and b.state = 'sent') then
      raise exception 'brief_pending';
    end if;
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.strategy_documents
   where project_id = p_project_id and kind = p_kind;
  update public.strategy_documents set state = 'superseded'
   where project_id = p_project_id and kind = p_kind and state in ('pending', 'changes_requested');
  insert into public.strategy_documents (organization_id, project_id, kind, version, content, created_by)
  values (v_org, p_project_id, p_kind, v_version, p_content, public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;

-- « Demander la validation »: the director (sole validator) always, plus the
-- creatives of the project the owner names. The Brief goes through the
-- stage's circuit (notification, Travail, Validations du projet) except
-- during a revision, when the stage stays validated.
create or replace function public.send_strategy_document(
  p_document_id uuid,
  p_reviewers uuid[] default '{}',
  p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_stage public.project_stages%rowtype;
  v_validator uuid;
  v_validation uuid;
  v_person uuid;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id for update;
  if not found or not public.can_see_project(v_doc.project_id) then
    raise exception 'document_not_found';
  end if;
  if not public.is_project_owner(v_doc.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_doc.state <> 'pending' then
    raise exception 'invalid_transition';
  end if;
  if exists (select 1 from public.strategy_documents
             where project_id = v_doc.project_id and kind = v_doc.kind and version > v_doc.version) then
    raise exception 'version_superseded';
  end if;
  if cardinality(coalesce(p_reviewers, '{}')) > 10
     or exists (select 1 from unnest(coalesce(p_reviewers, '{}')) r
                where r = public.auth_person_id()
                   or not exists (select 1 from public.project_creatives c
                                  where c.project_id = v_doc.project_id and c.person_id = r)) then
    raise exception 'invalid_reviewer' using errcode = '23514';
  end if;

  v_validator := public.sole_validator(v_doc.organization_id);
  if v_doc.kind = 'brief' then
    select s.* into v_stage from public.project_stages s
      join public.stage_definitions d on d.id = s.stage_definition_id
     where s.project_id = v_doc.project_id and d.key = 'launch_strategy'
     for update of s;
    if v_stage.state = 'in_progress' then
      v_validation := public.request_validation(v_stage.id, p_note);
    elsif not (v_stage.state = 'validated' and exists (
                 select 1 from public.strategy_workspaces w
                 where w.project_id = v_doc.project_id and w.revision_opened_at is not null)) then
      raise exception 'stage_locked';
    end if;
  elsif exists (select 1 from public.strategy_documents b
                where b.project_id = v_doc.project_id and b.kind = 'brief' and b.state = 'sent') then
    raise exception 'brief_pending';
  end if;

  update public.strategy_documents
     set state = 'sent', validation_id = v_validation, sent_at = now(),
         request_note = nullif(btrim(p_note), '')
   where id = p_document_id;

  insert into public.strategy_document_reviews (organization_id, document_id, person_id)
  values (v_doc.organization_id, p_document_id, v_validator);
  foreach v_person in array coalesce(p_reviewers, '{}') loop
    insert into public.strategy_document_reviews (organization_id, document_id, person_id)
    values (v_doc.organization_id, p_document_id, v_person)
    on conflict (document_id, person_id) do nothing;
  end loop;
end;
$$;

-- A reviewer's decision. A change request (with a comment) ends the round:
-- the version is to correct, the others' reviews are cancelled, the stage
-- goes back in progress. The version is approved once every review is; the
-- Brief then validates the stage (V1 frozen) or closes the revision.
create or replace function public.decide_strategy_document(
  p_document_id uuid,
  p_approve boolean,
  p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_review public.strategy_document_reviews%rowtype;
  v_stage_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v_doc from public.strategy_documents where id = p_document_id for update;
  if not found then
    raise exception 'document_not_found';
  end if;
  select * into v_review from public.strategy_document_reviews
   where document_id = p_document_id and person_id = public.auth_person_id() for update;
  if not found or not public.is_active_member(v_doc.organization_id) then
    raise exception 'not_the_validator';
  end if;
  if v_doc.state <> 'sent' or v_review.state <> 'pending' then
    raise exception 'already_decided';
  end if;
  if not p_approve and v_comment is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;

  update public.strategy_document_reviews
     set state = case when p_approve then 'approved' else 'changes_requested' end,
         comment = v_comment, decided_at = now()
   where id = v_review.id;
  -- The stage's validation follows this function only (validations guard).
  perform set_config('pds.strategy_decision', 'on', true);
  select project_stage_id into v_stage_id from public.validations where id = v_doc.validation_id;

  if not p_approve then
    update public.strategy_document_reviews set state = 'cancelled'
     where document_id = p_document_id and state = 'pending';
    update public.strategy_documents
       set state = 'changes_requested', change_comment = v_comment,
           decided_at = now(), decided_by = public.auth_person_id()
     where id = p_document_id;
    if v_doc.validation_id is not null then
      update public.validations
         set state = 'rejected', decision_comment = v_comment, decided_at = now()
       where id = v_doc.validation_id and state = 'pending';
      update public.project_stages
         set state = 'in_progress', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    return;
  end if;

  if v_doc.validation_id is not null then
    update public.validations
       set state = 'approved', decision_comment = v_comment, decided_at = now()
     where id = v_doc.validation_id and state = 'pending'
       and validator_person_id = public.auth_person_id();
  end if;
  if exists (select 1 from public.strategy_document_reviews
             where document_id = p_document_id and state = 'pending') then
    return;
  end if;

  update public.strategy_documents
     set state = 'approved', decided_at = now(), decided_by = public.auth_person_id()
   where id = p_document_id;
  if v_doc.kind = 'brief' then
    if v_stage_id is not null then
      update public.project_stages
         set state = 'validated', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    update public.strategy_workspaces
       set revision_opened_at = null, revision_opened_by = null
     where project_id = v_doc.project_id;
  end if;
end;
$$;

-- « Relancer » a reviewer who has not answered: at most every 12 hours.
create or replace function public.remind_strategy_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.strategy_document_reviews%rowtype;
  v_doc public.strategy_documents%rowtype;
begin
  select * into v_review from public.strategy_document_reviews where id = p_review_id for update;
  if not found then
    raise exception 'review_not_found';
  end if;
  select * into v_doc from public.strategy_documents where id = v_review.document_id;
  if not public.is_project_owner(v_doc.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_review.state <> 'pending' or v_doc.state <> 'sent' then
    raise exception 'already_decided';
  end if;
  if v_review.reminded_at is not null and v_review.reminded_at > now() - interval '12 hours' then
    raise exception 'reminder_too_soon';
  end if;
  update public.strategy_document_reviews set reminded_at = now() where id = p_review_id;
end;
$$;

-- The generic decision never decides a strategy version behind its reviews.
create or replace function public.validations_strategy_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state is distinct from old.state
     and coalesce(current_setting('pds.strategy_decision', true), '') <> 'on'
     and exists (select 1 from public.strategy_documents d where d.validation_id = new.id) then
    raise exception 'use_strategy_brief';
  end if;
  return new;
end;
$$;
revoke execute on function public.validations_strategy_guard() from public, anon, authenticated;
drop trigger if exists a_strategy_guard on public.validations;
create trigger a_strategy_guard before update of state on public.validations
  for each row execute function public.validations_strategy_guard();

-- 3. Revision ---------------------------------------------------------------------------

-- « Réviser la stratégie »: after V1, a significant change opens a revision:
-- the owner writes again and generates the next version; V1 stays the
-- reference until that version is approved.
create or replace function public.open_strategy_revision(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state = 'validated') then
    raise exception 'invalid_transition';
  end if;
  update public.strategy_workspaces
     set revision_opened_at = coalesce(revision_opened_at, now()),
         revision_opened_by = coalesce(revision_opened_by, public.auth_person_id())
   where project_id = p_project_id;
end;
$$;

-- Notifications -----------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
  'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
  'master_final_approved', 'master_mastering_changes_requested',
  'clearance_terms_proposed', 'clearance_terms_validated', 'clearance_terms_rejected',
  'strategy_review_requested', 'strategy_review_approved',
  'strategy_review_changes_requested', 'strategy_review_reminder')) not valid;

-- The director of a Brief sent through the stage is already told by the
-- validation itself; everyone else hears from their review.
create or replace function public.strategy_reviews_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_through_validation boolean;
begin
  select * into v_doc from public.strategy_documents where id = new.document_id;
  v_through_validation := v_doc.validation_id is not null and exists (
    select 1 from public.validations v
    where v.id = v_doc.validation_id and v.validator_person_id = new.person_id);
  if tg_op = 'INSERT' then
    if not v_through_validation then
      perform public.notify(new.organization_id, new.person_id, 'strategy_review_requested',
                            v_doc.project_id, v_doc.id);
    end if;
  elsif new.reminded_at is distinct from old.reminded_at and new.state = 'pending' then
    perform public.notify(new.organization_id, new.person_id, 'strategy_review_reminder',
                          v_doc.project_id, v_doc.id);
  elsif old.state = 'pending' and new.state in ('approved', 'changes_requested')
        and not v_through_validation
        and not (v_doc.validation_id is not null and new.state = 'changes_requested') then
    perform public.notify(new.organization_id, v_doc.created_by, 'strategy_review_' || new.state,
                          v_doc.project_id, v_doc.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.strategy_reviews_notify() from public, anon, authenticated;
drop trigger if exists z_notify on public.strategy_document_reviews;
create trigger z_notify after insert or update of state, reminded_at
  on public.strategy_document_reviews
  for each row execute function public.strategy_reviews_notify();

-- 4. Generator drafts, sharing, visuals ----------------------------------------------------

-- The choices made in a generator (phases, formats, visuals, direction,
-- pages), kept between visits until a version is generated.
create table if not exists public.strategy_document_drafts (
  project_id uuid not null,
  kind text not null,
  organization_id uuid not null,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint strategy_document_drafts_pkey primary key (project_id, kind),
  constraint strategy_drafts_kind_check check (kind in ('release_plan', 'press_kit')),
  constraint strategy_drafts_config_object
    check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 200000),
  constraint strategy_drafts_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.strategy_document_drafts enable row level security;
alter table public.strategy_document_drafts force row level security;
revoke all on table public.strategy_document_drafts from anon, authenticated;
grant select on public.strategy_document_drafts to authenticated;
grant insert (project_id, kind, organization_id, config), update (config)
  on public.strategy_document_drafts to authenticated;
drop policy if exists strategy_drafts_select_visible on public.strategy_document_drafts;
create policy strategy_drafts_select_visible on public.strategy_document_drafts
  for select to authenticated using (public.can_see_project(project_id));
drop policy if exists strategy_drafts_insert_owner on public.strategy_document_drafts;
create policy strategy_drafts_insert_owner on public.strategy_document_drafts
  for insert to authenticated with check (public.is_project_owner(project_id));
drop policy if exists strategy_drafts_update_owner on public.strategy_document_drafts;
create policy strategy_drafts_update_owner on public.strategy_document_drafts
  for update to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));
create or replace function public.strategy_drafts_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := public.auth_person_id();
  return new;
end;
$$;
revoke execute on function public.strategy_drafts_stamp() from public, anon, authenticated;
drop trigger if exists a_stamp on public.strategy_document_drafts;
create trigger a_stamp before insert or update on public.strategy_document_drafts
  for each row execute function public.strategy_drafts_stamp();

-- A shared link to one version of an external document (Plan de sortie for
-- the artist's team, Dossier de presse for the media). The Brief is internal:
-- it is only ever shared inside the app, never by a public link.
alter table public.share_links add column if not exists document_id uuid;
alter table public.share_links drop constraint if exists share_links_scope_check;
alter table public.share_links add constraint share_links_scope_check
  check (scope in ('brief', 'strategy', 'design_doc', 'release_plan', 'press_kit'));
alter table public.share_links drop constraint if exists share_links_document_scope;
alter table public.share_links add constraint share_links_document_scope
  check ((scope in ('release_plan', 'press_kit')) = (document_id is not null));
alter table public.share_links drop constraint if exists share_links_document_same_org;
alter table public.share_links add constraint share_links_document_same_org
  foreign key (document_id, organization_id)
  references public.strategy_documents (id, organization_id);
grant select (document_id) on public.share_links to authenticated;

create or replace function public.share_strategy_document(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_token uuid;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id;
  if not found or not public.can_see_project(v_doc.project_id) then
    raise exception 'document_not_found';
  end if;
  if not public.is_project_owner(v_doc.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_doc.kind not in ('release_plan', 'press_kit') or v_doc.state = 'superseded' then
    raise exception 'not_shareable';
  end if;
  select token into v_token from public.share_links
   where document_id = p_document_id and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;
  if v_token is null then
    insert into public.share_links (organization_id, project_id, scope, document_id, created_by)
    values (v_doc.organization_id, v_doc.project_id, v_doc.kind, v_doc.id, public.auth_person_id())
    returning token into v_token;
  end if;
  return v_token;
end;
$$;

-- The only way anon reads a document: by its link, while the link lives.
create or replace function public.get_shared_strategy_document(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('kind', d.kind, 'version', d.version, 'content', d.content)
  from public.share_links l
  join public.strategy_documents d on d.id = l.document_id
  where l.token = p_token
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
    and d.kind in ('release_plan', 'press_kit')
    and d.state <> 'superseded';
$$;

-- Visuals shown by a generated external document: copied at generation into
-- a public bucket (the share page and the PDF read them without a session),
-- written by the project's owner only. Paths are "<org>/<project>/<uuid>.<ext>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-visuals', 'document-visuals', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists document_visuals_objects_insert on storage.objects;
create policy document_visuals_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'document-visuals'
    and public.is_project_owner(public.try_uuid((storage.foldername(objects.name))[2]))
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );
drop policy if exists document_visuals_objects_select on storage.objects;
create policy document_visuals_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'document-visuals'
         and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2])));

-- Grants ---------------------------------------------------------------------------------

revoke execute on function public.open_strategy_revision(uuid) from public, anon;
revoke execute on function public.create_strategy_document(uuid, text, jsonb) from public, anon;
revoke execute on function public.send_strategy_document(uuid, uuid[], text) from public, anon;
revoke execute on function public.decide_strategy_document(uuid, boolean, text) from public, anon;
revoke execute on function public.remind_strategy_review(uuid) from public, anon;
revoke execute on function public.share_strategy_document(uuid) from public, anon;
revoke execute on function public.get_shared_strategy_document(uuid) from public;
grant execute on function public.open_strategy_revision(uuid) to authenticated;
grant execute on function public.create_strategy_document(uuid, text, jsonb) to authenticated;
grant execute on function public.send_strategy_document(uuid, uuid[], text) to authenticated;
grant execute on function public.decide_strategy_document(uuid, boolean, text) to authenticated;
grant execute on function public.remind_strategy_review(uuid) to authenticated;
grant execute on function public.share_strategy_document(uuid) to authenticated;
grant execute on function public.get_shared_strategy_document(uuid) to anon, authenticated;
