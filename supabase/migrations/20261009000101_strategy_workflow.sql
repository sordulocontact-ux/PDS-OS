-- Stratégie : workflow complet (ticket « Stratégie · Finalisation du workflow
-- après cadrage », 06/10/2026 ; docs/ARCHITECTURE.md § 6 bis). Parts:
--   1. the workspace: « Commencer la stratégie », and a revision after V1
--      (a validated stage is never reopened: a revision is its own flag);
--   2. the eight dimensions: narrative parts and objective reuse
--      field_values; milestones get a channel and a note, deliverables a
--      quantity; the strategy budget (by lever) and the KPIs are new tables;
--   3. documents: Brief de sortie, Plan de sortie, Dossier de presse, as
--      versioned snapshots written by the server, reviewed by several people
--      (the director, sole validator, plus the creatives the owner names);
--      the Brief goes through the stage's validation circuit;
--   4. shared links for the external documents, read by anon through one
--      function; a public bucket for the visuals a generated version shows;
--   5. strategy calls (purpose, participants, documents) and the follow-up
--      recommendations applied or ignored.

-- 1. Workspace -----------------------------------------------------------------

create table public.strategy_workspaces (
  project_id uuid primary key,
  organization_id uuid not null,
  started_at timestamptz,
  started_by uuid references public.people (id),
  -- A revision of a validated strategy is open: the owner writes again, V1
  -- stays the reference until the next version is approved.
  revision_opened_at timestamptz,
  revision_opened_by uuid references public.people (id),
  constraint strategy_workspaces_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.strategy_workspaces enable row level security;
alter table public.strategy_workspaces force row level security;
revoke all on table public.strategy_workspaces from anon, authenticated;
grant select on public.strategy_workspaces to authenticated;
create policy strategy_workspaces_select_visible on public.strategy_workspaces
  for select to authenticated using (public.can_see_project(project_id));

-- 3 (declared early: editability reads it). Documents ---------------------------

-- One row per version and kind, never rewritten except its state. `content`
-- is the snapshot the server wrote with the owner's session: what the
-- reviewers read is what was generated. The budget only ever exists in the
-- Brief (lib/strategy/documents/*: the external documents never carry it).
create table public.strategy_documents (
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
create index strategy_documents_project_idx on public.strategy_documents (project_id, kind, version desc);
create index strategy_documents_validation_idx on public.strategy_documents (validation_id)
  where validation_id is not null;

-- Who must approve a sent version, and what each said.
create table public.strategy_document_reviews (
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
create index strategy_reviews_person_idx on public.strategy_document_reviews (person_id)
  where state = 'pending';

alter table public.strategy_documents enable row level security;
alter table public.strategy_documents force row level security;
alter table public.strategy_document_reviews enable row level security;
alter table public.strategy_document_reviews force row level security;
revoke all on table public.strategy_documents from anon, authenticated;
revoke all on table public.strategy_document_reviews from anon, authenticated;
grant select on public.strategy_documents to authenticated;
grant select on public.strategy_document_reviews to authenticated;
-- The two policies read each other's table: through security definer
-- helpers, or each policy would trigger the other's forever.
create function public.is_strategy_reviewer(p_document_id uuid)
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
create function public.strategy_document_visible(p_document_id uuid)
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

create policy strategy_documents_select_visible on public.strategy_documents
  for select to authenticated
  using (public.can_see_project(project_id) or public.is_strategy_reviewer(id));
create policy strategy_reviews_select_visible on public.strategy_document_reviews
  for select to authenticated
  using (person_id = public.auth_person_id()
         or public.strategy_document_visible(document_id));

-- Editability --------------------------------------------------------------------

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

-- « Commencer la stratégie »: the stage was started by the Plan du Projet;
-- this marks that the owner opened the work (the entry gives way to it).
create function public.start_strategy(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state = 'in_progress') then
    raise exception 'plan_required';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.strategy_workspaces (project_id, organization_id, started_at, started_by)
  values (p_project_id, v_org, now(), public.auth_person_id())
  on conflict (project_id) do update
    set started_at = coalesce(public.strategy_workspaces.started_at, excluded.started_at),
        started_by = coalesce(public.strategy_workspaces.started_by, excluded.started_by);
end;
$$;

-- « Réviser la stratégie »: after validation, a significant change makes a
-- new version; V1 is never overwritten.
create function public.open_strategy_revision(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
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
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.strategy_workspaces
    (project_id, organization_id, started_at, started_by, revision_opened_at, revision_opened_by)
  values (p_project_id, v_org, now(), public.auth_person_id(), now(), public.auth_person_id())
  on conflict (project_id) do update
    set revision_opened_at = coalesce(public.strategy_workspaces.revision_opened_at, now()),
        revision_opened_by = coalesce(public.strategy_workspaces.revision_opened_by,
                                      public.auth_person_id());
end;
$$;

-- 2. Dimensions --------------------------------------------------------------------

-- Calendar by channel; each milestone can be opened and annotated.
alter table public.milestones add column channel text not null default 'organic';
alter table public.milestones add column notes text;
update public.milestones set channel = case kind
  when 'release' then 'release' when 'press' then 'press' when 'live' then 'live'
  else 'organic' end;
alter table public.milestones add constraint milestones_channel_check
  check (channel in ('organic', 'influence', 'press', 'release', 'live', 'other'));
alter table public.milestones add constraint milestones_notes_length
  check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 1000));
grant insert (channel, notes), update (channel, notes) on public.milestones to authenticated;

-- « Cinq capsules »: how many of a committed deliverable.
alter table public.strategy_deliverables add column quantity integer;
alter table public.strategy_deliverables add constraint strategy_deliverables_quantity_check
  check (quantity is null or quantity between 1 and 99);
grant insert (quantity), update (quantity, lever_id) on public.strategy_deliverables to authenticated;

-- The strategy budget, by lever: an amount validated or to arbitrate.
-- Internal only: read by members who see the project, never by PO, never
-- in the external documents.
create table public.strategy_budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  lever_id uuid,
  label text not null,
  amount_cents bigint not null,
  state text not null default 'to_decide',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_budget_label_check check (btrim(label) <> '' and char_length(label) <= 200),
  constraint strategy_budget_amount_check check (amount_cents > 0 and amount_cents <= 100000000000),
  constraint strategy_budget_state_check check (state in ('validated', 'to_decide')),
  constraint strategy_budget_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id),
  constraint strategy_budget_lever_same_org foreign key (lever_id, organization_id)
    references public.levers (id, organization_id)
);
create index strategy_budget_project_idx on public.strategy_budget_lines (project_id, created_at);

-- Objectives & KPIs: a few signals; their real value is entered by a person
-- or read from a source (Deezer fans), never invented.
create table public.strategy_kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  label text not null,
  kind text not null default 'quantitative',
  target_value numeric,
  target_text text,
  unit text,
  metric text not null default 'manual',
  actual_value numeric,
  actual_text text,
  actual_noted_at timestamptz,
  actual_noted_by uuid references public.people (id),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_kpis_label_check check (btrim(label) <> '' and char_length(label) <= 200),
  constraint strategy_kpis_kind_check check (kind in ('quantitative', 'qualitative')),
  constraint strategy_kpis_metric_check check (metric in ('manual', 'deezer_fans')),
  constraint strategy_kpis_metric_quantitative check (metric = 'manual' or kind = 'quantitative'),
  constraint strategy_kpis_target_check
    check (target_value is null or (target_value >= 0 and target_value <= 1e12)),
  constraint strategy_kpis_actual_check
    check (actual_value is null or (actual_value >= 0 and actual_value <= 1e12)),
  constraint strategy_kpis_texts_check
    check ((target_text is null or char_length(target_text) <= 300)
           and (actual_text is null or char_length(actual_text) <= 300)
           and (unit is null or (btrim(unit) <> '' and char_length(unit) <= 40))),
  constraint strategy_kpis_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create index strategy_kpis_project_idx on public.strategy_kpis (project_id, created_at);

create function public.check_strategy_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'strategy_budget_lines' then
    if new.lever_id is not null and not exists (
      select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id) then
      raise exception 'lever_not_in_project';
    end if;
  elsif tg_table_name = 'strategy_kpis' and tg_op = 'UPDATE' then
    -- The definition follows the strategy's editability; the real value is
    -- noted by the owner at any time (follow-up after launch).
    if (new.label, new.kind, new.target_value, new.target_text, new.unit, new.metric)
       is distinct from
       (old.label, old.kind, old.target_value, old.target_text, old.unit, old.metric)
       and not public.strategy_is_editable(new.project_id) then
      raise exception 'stage_locked';
    end if;
    if (new.actual_value, new.actual_text) is distinct from (old.actual_value, old.actual_text) then
      new.actual_noted_at := now();
      new.actual_noted_by := public.auth_person_id();
    end if;
  end if;
  return new;
end;
$$;
create trigger strategy_budget_check before insert or update on public.strategy_budget_lines
  for each row execute function public.check_strategy_rows();
create trigger strategy_kpis_check before insert or update on public.strategy_kpis
  for each row execute function public.check_strategy_rows();

do $$
declare
  t text;
begin
  foreach t in array array['strategy_budget_lines', 'strategy_kpis']
  loop
    execute format('create trigger a_set_created_by before insert on public.%I
                    for each row execute function public.set_created_by()', t);
    execute format('create trigger a_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, delete on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (public.can_see_project(project_id))', t || '_select_visible', t);
    execute format('create policy %I on public.%I for insert to authenticated
                    with check (public.strategy_is_editable(project_id))', t || '_insert_editable', t);
    execute format('create policy %I on public.%I for delete to authenticated
                    using (public.strategy_is_editable(project_id))', t || '_delete_editable', t);
  end loop;
end;
$$;
grant insert (organization_id, project_id, lever_id, label, amount_cents, state)
  on public.strategy_budget_lines to authenticated;
grant update (lever_id, label, amount_cents, state) on public.strategy_budget_lines to authenticated;
create policy strategy_budget_lines_update_editable on public.strategy_budget_lines
  for update to authenticated
  using (public.strategy_is_editable(project_id))
  with check (public.strategy_is_editable(project_id));
grant insert (organization_id, project_id, label, kind, target_value, target_text, unit, metric)
  on public.strategy_kpis to authenticated;
grant update (label, kind, target_value, target_text, unit, metric, actual_value, actual_text)
  on public.strategy_kpis to authenticated;
create policy strategy_kpis_update_owner on public.strategy_kpis
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- 3. Documents: writing, sending, deciding -------------------------------------------

-- A strategy validation is the validation of a Brief de sortie version: the
-- generic « Demander la validation » would validate nothing readable.
create or replace function public.request_validation(p_stage_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
  v_validator_person_id uuid;
  v_id uuid;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'in_progress' then
    raise exception 'invalid_transition';
  end if;
  select d.key into v_key from public.stage_definitions d where d.id = v_stage.stage_definition_id;
  if v_key = 'framing' and not exists (
    select 1 from public.framing_briefs b
    where b.project_id = v_stage.project_id and b.state = 'pending') then
    raise exception 'brief_required';
  end if;
  if v_key = 'launch_strategy' and not exists (
    select 1 from public.strategy_documents b
    where b.project_id = v_stage.project_id and b.kind = 'brief' and b.state = 'pending') then
    raise exception 'brief_required';
  end if;

  v_validator_person_id := public.sole_validator(v_stage.organization_id);

  insert into public.validations
    (organization_id, project_stage_id, requested_by, validator_person_id, request_note)
  values
    (v_stage.organization_id, p_stage_id, public.auth_person_id(), v_validator_person_id,
     nullif(btrim(p_note), ''))
  returning id into v_id;

  update public.project_stages
     set state = 'awaiting_validation', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = p_stage_id;
  return v_id;
end;
$$;

-- « Générer » a version: the previous unsent or corrected one is replaced
-- (superseded), never rewritten. The Brief while the strategy is editable;
-- the external documents only from a validated Brief, and never while a
-- Brief version waits for its reviewers.
create function public.create_strategy_document(p_project_id uuid, p_kind text, p_content jsonb)
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
  -- One writer at a time per project and kind.
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
-- stage's circuit (notification, Mon Travail, Validations du projet) except
-- during a revision, when the stage stays validated.
create function public.send_strategy_document(
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
  if exists (select 1 from unnest(coalesce(p_reviewers, '{}')) r
             where r = public.auth_person_id()
                or not exists (select 1 from public.project_creatives c
                               where c.project_id = v_doc.project_id and c.person_id = r)) then
    raise exception 'invalid_reviewer' using errcode = '23514';
  end if;
  if cardinality(coalesce(p_reviewers, '{}')) > 10 then
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
create function public.decide_strategy_document(
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
create function public.remind_strategy_review(p_review_id uuid)
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
create function public.validations_strategy_guard()
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
create trigger a_strategy_guard before update of state on public.validations
  for each row execute function public.validations_strategy_guard();

-- Notifications ------------------------------------------------------------------------

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
create function public.strategy_reviews_notify()
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
create trigger z_notify after insert or update of state, reminded_at
  on public.strategy_document_reviews
  for each row execute function public.strategy_reviews_notify();

-- Generator drafts (Plan de sortie, Dossier de presse) -----------------------------

-- The choices made in a generator (phases, formats, visuals, direction,
-- pages), kept between visits until a version is generated.
create table public.strategy_document_drafts (
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
create policy strategy_drafts_select_visible on public.strategy_document_drafts
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_drafts_insert_owner on public.strategy_document_drafts
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy strategy_drafts_update_owner on public.strategy_document_drafts
  for update to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));
create function public.strategy_drafts_stamp()
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
create trigger a_stamp before insert or update on public.strategy_document_drafts
  for each row execute function public.strategy_drafts_stamp();

-- 4. Sharing -------------------------------------------------------------------------

-- A shared link to one version of an external document (Plan de sortie for
-- the artist's team, Dossier de presse for the media). The Brief is internal:
-- it is never shared outside.
alter table public.share_links add column document_id uuid;
alter table public.share_links drop constraint share_links_scope_check;
alter table public.share_links add constraint share_links_scope_check
  check (scope in ('brief', 'strategy', 'design_doc', 'release_plan', 'press_kit'));
alter table public.share_links add constraint share_links_document_scope
  check ((scope in ('release_plan', 'press_kit')) = (document_id is not null));
alter table public.share_links add constraint share_links_document_same_org
  foreign key (document_id, organization_id)
  references public.strategy_documents (id, organization_id);
grant select (document_id) on public.share_links to authenticated;

create function public.share_strategy_document(p_document_id uuid)
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
create function public.get_shared_strategy_document(p_token uuid)
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
create policy document_visuals_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'document-visuals'
         and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2])));

-- 5. Strategy calls and follow-up ------------------------------------------------------

create table public.strategy_calls (
  call_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  purpose text not null,
  participants jsonb not null default '[]'::jsonb,
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint strategy_calls_purpose_check
    check (btrim(purpose) <> '' and char_length(purpose) <= 500),
  constraint strategy_calls_participants_check
    check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 30),
  constraint strategy_calls_documents_check check (cardinality(document_ids) <= 30),
  constraint strategy_calls_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade,
  constraint strategy_calls_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
alter table public.strategy_calls enable row level security;
alter table public.strategy_calls force row level security;
revoke all on table public.strategy_calls from anon, authenticated;
grant select on public.strategy_calls to authenticated;
grant insert (call_id, organization_id, project_id, purpose, participants, document_ids)
  on public.strategy_calls to authenticated;
create policy strategy_calls_select_visible on public.strategy_calls
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_calls_insert_owner on public.strategy_calls
  for insert to authenticated
  with check (public.is_project_owner(project_id)
              and exists (select 1 from public.calls c
                          where c.id = strategy_calls.call_id and c.project_id = strategy_calls.project_id));
-- Same checks as a framing call: names, and the project's own files.
create trigger a_check before insert on public.strategy_calls
  for each row execute function public.framing_calls_check();

create function public.create_strategy_call(
  p_project_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb,
  p_purpose text,
  p_participants jsonb,
  p_document_ids uuid[])
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid;
  v_call uuid;
  v_minutes integer;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null then
    raise exception 'project_not_found';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;
  insert into public.calls (organization_id, project_id, title, occurred_at, meeting_url,
                            consent, agenda, duration_minutes)
  values (v_org, p_project_id, p_title, p_occurred_at, nullif(btrim(p_meeting_url), ''),
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;
  insert into public.strategy_calls
    (call_id, organization_id, project_id, purpose, participants, document_ids)
  values (v_call, v_org, p_project_id, p_purpose, coalesce(p_participants, '[]'::jsonb),
          coalesce(p_document_ids, '{}'));
  return v_call;
end;
$$;

-- A follow-up recommendation (computed by code from real data) applied or
-- ignored: it is not offered again.
create table public.strategy_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  rule_key text not null,
  state text not null,
  task_id uuid references public.tasks (id) on delete set null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint strategy_recommendations_key unique (project_id, rule_key),
  constraint strategy_recommendations_rule_check
    check (rule_key ~ '^[a-z0-9_:-]{1,120}$'),
  constraint strategy_recommendations_state_check check (state in ('applied', 'ignored')),
  constraint strategy_recommendations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create trigger a_set_created_by before insert on public.strategy_recommendations
  for each row execute function public.set_created_by();
alter table public.strategy_recommendations enable row level security;
alter table public.strategy_recommendations force row level security;
revoke all on table public.strategy_recommendations from anon, authenticated;
grant select on public.strategy_recommendations to authenticated;
grant insert (organization_id, project_id, rule_key, state, task_id)
  on public.strategy_recommendations to authenticated;
create policy strategy_recommendations_select_visible on public.strategy_recommendations
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_recommendations_insert_owner on public.strategy_recommendations
  for insert to authenticated with check (public.is_project_owner(project_id));

-- Grants -------------------------------------------------------------------------------

revoke execute on function public.start_strategy(uuid) from public, anon;
revoke execute on function public.open_strategy_revision(uuid) from public, anon;
revoke execute on function public.create_strategy_document(uuid, text, jsonb) from public, anon;
revoke execute on function public.send_strategy_document(uuid, uuid[], text) from public, anon;
revoke execute on function public.decide_strategy_document(uuid, boolean, text) from public, anon;
revoke execute on function public.remind_strategy_review(uuid) from public, anon;
revoke execute on function public.share_strategy_document(uuid) from public, anon;
revoke execute on function public.get_shared_strategy_document(uuid) from public;
revoke execute on function public.create_strategy_call(uuid, text, timestamptz, text, jsonb, text, jsonb, uuid[]) from public, anon;
revoke execute on function public.validations_strategy_guard() from public, anon, authenticated;
revoke execute on function public.check_strategy_rows() from public, anon, authenticated;
revoke execute on function public.strategy_drafts_stamp() from public, anon, authenticated;
grant execute on function public.start_strategy(uuid) to authenticated;
grant execute on function public.open_strategy_revision(uuid) to authenticated;
grant execute on function public.create_strategy_document(uuid, text, jsonb) to authenticated;
grant execute on function public.send_strategy_document(uuid, uuid[], text) to authenticated;
grant execute on function public.decide_strategy_document(uuid, boolean, text) to authenticated;
grant execute on function public.remind_strategy_review(uuid) to authenticated;
grant execute on function public.share_strategy_document(uuid) to authenticated;
grant execute on function public.get_shared_strategy_document(uuid) to anon, authenticated;
grant execute on function public.create_strategy_call(uuid, text, timestamptz, text, jsonb, text, jsonb, uuid[]) to authenticated;
