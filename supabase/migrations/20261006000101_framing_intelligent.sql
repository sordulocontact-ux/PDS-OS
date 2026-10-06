-- Cadrage intelligent (ticket « Cadrage intelligent d'un projet », 30/09/2026 ;
-- docs/ARCHITECTURE.md § 6). Four parts:
--   1. the six dimensions: where a value already recorded elsewhere comes
--      from (source_label), a « humaine » constraint, an engineer of the
--      Réseau on a team role, imposed deadlines, call facts for the new
--      questions;
--   2. the Brief as a versioned object (framing_briefs), validated through
--      the existing circuit (validations), a correction reopening only the
--      dimensions the validator names;
--   3. editability per dimension, enforced in RLS (an état figé se garde en
--      RLS, docs/ARCHITECTURE.md § 12);
--   4. framing calls: purpose, participants, documents.

-- 1. Dimensions ---------------------------------------------------------------

-- A value taken from a record (project sheet, Budget, credits…) or from the
-- initial context says where it comes from, in words.
alter table public.field_values add column source_label text;
alter table public.field_values add constraint field_values_source_label_length
  check (source_label is null or char_length(source_label) <= 120);
grant select (source_label), insert (source_label) on public.field_values to authenticated;

alter table public.needs add column source_label text;
alter table public.needs add constraint needs_source_label_length
  check (source_label is null or char_length(source_label) <= 120);
grant select (source_label), insert (source_label) on public.needs to authenticated;

alter table public.framing_constraints add column source_label text;
alter table public.framing_constraints add constraint framing_constraints_source_label_length
  check (source_label is null or char_length(source_label) <= 120);
grant select (source_label), insert (source_label) on public.framing_constraints to authenticated;

alter table public.project_team_members add column source_label text;
alter table public.project_team_members add constraint team_source_label_length
  check (source_label is null or char_length(source_label) <= 120);
grant select (source_label), insert (source_label) on public.project_team_members to authenticated;

-- The view is a frozen column list: recreated with the new column.
create or replace view public.current_field_values
  with (security_invoker = true) as
select distinct on (project_id, deliverable, field_key)
  id, organization_id, project_id, deliverable, field_key, value, status,
  source_type, source_report_item_id, source_quote, source_start_seconds,
  created_by, created_at, source_label
from public.field_values
order by project_id, deliverable, field_key, created_at desc;

-- « Budget & contraintes » names financial, creative, human and operational
-- constraints (stored budget / artistic / human / production); rights
-- constraints belong to « Cadre juridique ».
alter table public.framing_constraints drop constraint framing_constraints_type_check;
alter table public.framing_constraints add constraint framing_constraints_type_check
  check (type in ('budget', 'production', 'artistic', 'human', 'rights', 'other'));

-- Who mixes, who masters: a contact of the Réseau on the team role, the
-- link the Master's Brief starts from (docs/ARCHITECTURE.md § 8 septies).
alter table public.project_team_members add column contact_id uuid;
alter table public.project_team_members add constraint team_contact_same_org
  foreign key (contact_id, organization_id)
  references public.network_contacts (id, organization_id);
create index team_contact_idx on public.project_team_members (contact_id)
  where contact_id is not null;
grant select (contact_id), insert (contact_id), update (contact_id)
  on public.project_team_members to authenticated;

-- Imposed deadlines of « Temporalité », one line each, reviewed like the
-- constraints. A confirmed one always has its date; a proposed one may wait
-- for a person to pick it (a phrase is never turned into a date by PO).
create table public.framing_deadlines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  kind text not null,
  label text,
  due_date date,
  review_status text not null default 'confirmed',
  source_type text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  source_label text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint framing_deadlines_kind_check
    check (kind in ('master_final', 'delivery', 'release', 'promotion', 'other')),
  constraint framing_deadlines_label_check
    check (label is null or (btrim(label) <> '' and char_length(label) <= 200)),
  constraint framing_deadlines_other_labelled check (kind <> 'other' or label is not null),
  constraint framing_deadlines_review_check
    check (review_status in ('proposed', 'confirmed', 'rejected')),
  constraint framing_deadlines_confirmed_dated
    check (review_status <> 'confirmed' or due_date is not null),
  constraint framing_deadlines_source_check
    check (source_type in ('call', 'manual', 'import', 'voice')),
  constraint framing_deadlines_call_source
    check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint framing_deadlines_source_label_length
    check (source_label is null or char_length(source_label) <= 120),
  constraint framing_deadlines_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id),
  constraint framing_deadlines_item_same_org foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);
create index framing_deadlines_project_idx on public.framing_deadlines (project_id, due_date);
create trigger a_set_created_by before insert on public.framing_deadlines
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.framing_deadlines
  for each row execute function public.set_updated_at();
alter table public.framing_deadlines enable row level security;
alter table public.framing_deadlines force row level security;
grant select on public.framing_deadlines to authenticated;
grant insert (organization_id, project_id, kind, label, due_date, review_status, source_type,
              source_report_item_id, source_quote, source_start_seconds, source_label)
  on public.framing_deadlines to authenticated;
grant update (kind, label, due_date, review_status) on public.framing_deadlines to authenticated;
create policy framing_deadlines_select_visible on public.framing_deadlines
  for select to authenticated using (public.can_see_project(project_id));
create policy framing_deadlines_insert_owner on public.framing_deadlines
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy framing_deadlines_update_owner on public.framing_deadlines
  for update to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));

-- A fact of the new questions heard in a call: an item of the call's report,
-- so its quote is located in the transcript like any other (provenance), and
-- the Brief proposal points to it. `brief_key` names the question.
alter table public.report_items add column brief_key text;
alter table public.report_items drop constraint report_items_kind_check;
alter table public.report_items add constraint report_items_kind_check
  check (kind in ('decided', 'open', 'next_action', 'objective', 'timing', 'frame', 'need',
                  'team', 'positioning', 'audiences', 'narrative', 'lever', 'brief_fact'));
alter table public.report_items add constraint report_items_brief_key_check
  check ((kind = 'brief_fact') = (brief_key is not null)
         and (brief_key is null or brief_key ~ '^[a-z][a-z_]*$'));
grant select (brief_key), insert (brief_key) on public.report_items to authenticated;

-- 2. The Brief, versioned ------------------------------------------------------

-- One row per version, never rewritten except its state. `content` is the
-- snapshot of the six dimensions the server wrote with the owner's session
-- (lib/framing/brief-snapshot.ts): what the validator reads is what was sent.
-- `reopened_dimensions`: the dimensions a change request reopened, carried to
-- the version that corrects them (null = every dimension).
create table public.framing_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  version integer not null,
  content jsonb not null,
  state text not null default 'pending',
  validation_id uuid references public.validations (id),
  reopened_dimensions text[],
  change_comment text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.people (id),
  constraint framing_briefs_version_key unique (project_id, version),
  constraint framing_briefs_id_org_key unique (id, organization_id),
  constraint framing_briefs_version_positive check (version > 0),
  constraint framing_briefs_content_object
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 300000),
  constraint framing_briefs_state_check
    check (state in ('pending', 'sent', 'approved', 'changes_requested', 'superseded')),
  constraint framing_briefs_sent check ((state in ('pending', 'superseded')) or validation_id is not null),
  constraint framing_briefs_dimensions_check
    check (reopened_dimensions is null
           or (cardinality(reopened_dimensions) > 0
               and reopened_dimensions <@ array['objective', 'timing', 'budget', 'team', 'start', 'legal'])),
  constraint framing_briefs_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
create index framing_briefs_validation_idx on public.framing_briefs (validation_id)
  where validation_id is not null;
alter table public.framing_briefs enable row level security;
alter table public.framing_briefs force row level security;
grant select on public.framing_briefs to authenticated;
create policy framing_briefs_select_visible on public.framing_briefs
  for select to authenticated
  using (public.can_see_project(project_id)
         or exists (select 1 from public.validations v
                    where v.id = framing_briefs.validation_id
                      and v.validator_person_id = public.auth_person_id()));

-- The Brief follows its validation, whichever function decided it.
create function public.framing_brief_follow_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = old.state or new.state = 'pending' then
    return new;
  end if;
  update public.framing_briefs
     set state = case when new.state = 'approved' then 'approved' else 'changes_requested' end,
         change_comment = new.decision_comment,
         decided_at = new.decided_at,
         decided_by = new.validator_person_id
   where validation_id = new.id and state = 'sent';
  return new;
end;
$$;
create trigger z_framing_brief after update of state on public.validations
  for each row execute function public.framing_brief_follow_validation();

-- A framing validation is always the validation of a Brief version: asking
-- for one without a version waiting would validate nothing the validator can
-- read (the stage's legacy « Demander la validation »).
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

-- The framing stage of a project, locked for the caller's transaction.
create function public.framing_stage_for_update(p_project_id uuid)
returns public.project_stages
language sql
security definer
set search_path = ''
as $$
  select s.* from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
  where s.project_id = p_project_id and d.key = 'framing'
  for update of s;
$$;
revoke execute on function public.framing_stage_for_update(uuid) from public, anon, authenticated;

-- « Générer le Brief »: a new version, waiting to be sent. An unsent or
-- rejected version is replaced (superseded), never rewritten; a correction
-- keeps the dimensions it was allowed to touch.
create function public.create_framing_brief(p_project_id uuid, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_last public.framing_briefs%rowtype;
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_stage := public.framing_stage_for_update(p_project_id);
  if v_stage.id is null then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state not in ('not_started', 'in_progress') then
    raise exception 'stage_locked';
  end if;
  if v_stage.state = 'not_started' then
    update public.project_stages
       set state = 'in_progress', state_changed_at = now(),
           state_changed_by = public.auth_person_id()
     where id = v_stage.id;
  end if;

  select * into v_last from public.framing_briefs
   where project_id = p_project_id order by version desc limit 1;
  update public.framing_briefs set state = 'superseded'
   where project_id = p_project_id and state in ('pending', 'changes_requested');

  insert into public.framing_briefs
    (organization_id, project_id, version, content, state, reopened_dimensions, created_by)
  values
    (v_stage.organization_id, p_project_id, coalesce(v_last.version, 0) + 1, p_content, 'pending',
     case when v_last.state in ('pending', 'changes_requested') then v_last.reopened_dimensions end,
     public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;

-- « Envoyer en validation »: the latest version, through the stage's
-- validation circuit (notification, Mon Travail, Validations du projet).
create function public.send_framing_brief(p_brief_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brief public.framing_briefs%rowtype;
  v_stage public.project_stages%rowtype;
  v_validation uuid;
begin
  select * into v_brief from public.framing_briefs where id = p_brief_id for update;
  if not found or not public.can_see_project(v_brief.project_id) then
    raise exception 'brief_not_found';
  end if;
  if not public.is_project_owner(v_brief.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_brief.state <> 'pending' then
    raise exception 'invalid_transition';
  end if;
  if exists (select 1 from public.framing_briefs
             where project_id = v_brief.project_id and version > v_brief.version) then
    raise exception 'version_superseded';
  end if;
  v_stage := public.framing_stage_for_update(v_brief.project_id);
  v_validation := public.request_validation(v_stage.id, p_note);
  update public.framing_briefs
     set state = 'sent', validation_id = v_validation, sent_at = now()
   where id = p_brief_id;
  return v_validation;
end;
$$;

-- « Valider le Brief » / « Demander une modification »: the validator's
-- decision (decide_validation checks who and when), and for a change request
-- the dimensions to reopen, at least one.
create function public.decide_framing_brief(
  p_validation_id uuid,
  p_approve boolean,
  p_comment text default null,
  p_dimensions text[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dimensions text[];
begin
  if not p_approve then
    if btrim(coalesce(p_comment, '')) = '' then
      raise exception 'reason_required' using errcode = '23514';
    end if;
    select array_agg(distinct d order by d) into v_dimensions
      from unnest(coalesce(p_dimensions, '{}')) d;
    if v_dimensions is null
       or not v_dimensions <@ array['objective', 'timing', 'budget', 'team', 'start', 'legal'] then
      raise exception 'dimensions_required' using errcode = '23514';
    end if;
  end if;
  perform public.decide_validation(p_validation_id, p_approve, p_comment);
  if not p_approve then
    update public.framing_briefs set reopened_dimensions = v_dimensions
     where validation_id = p_validation_id;
  end if;
end;
$$;

-- 3. Editability per dimension -------------------------------------------------

-- The dimension a Brief key belongs to (lib/framing/dimensions.ts holds the
-- same list). Suggestions and « rien à signaler » markers follow their key.
create function public.framing_key_dimension(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case regexp_replace(p_key, '_(suggestions|none)$', '')
    when 'objective' then 'objective'
    when 'success_criteria' then 'objective'
    when 'main_priority' then 'objective'
    when 'needs' then 'objective'
    when 'timing' then 'timing'
    when 'target_date' then 'timing'
    when 'deadlines' then 'timing'
    when 'calendar_constraints' then 'timing'
    when 'prerequisites' then 'timing'
    when 'budget_envelope' then 'budget'
    when 'commitments' then 'budget'
    when 'constraints' then 'budget'
    when 'contributors' then 'team'
    when 'decision_makers' then 'team'
    when 'missing_skills' then 'team'
    when 'current_state' then 'start'
    when 'existing_elements' then 'start'
    when 'decisions_made' then 'start'
    when 'work_started' then 'start'
    when 'legal_parties' then 'legal'
    when 'legal_agreements' then 'legal'
    when 'legal_needs' then 'legal'
    when 'legal_secured' then 'legal'
    when 'legal_blockers' then 'legal'
  end;
$$;

-- A dimension takes changes while the Cadrage does, and, during a
-- correction, only if the validator reopened it.
create function public.framing_dimension_editable(p_project_id uuid, p_dimension text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.framing_is_editable(p_project_id)
    and coalesce((
      select case
               when b.state in ('pending', 'changes_requested') and b.reopened_dimensions is not null
                 then coalesce(p_dimension = any (b.reopened_dimensions), false)
               else true
             end
      from public.framing_briefs b
      where b.project_id = p_project_id
      order by b.version desc
      limit 1), true);
$$;

create policy field_values_framing_dimension on public.field_values
  as restrictive for insert to authenticated
  with check (deliverable <> 'brief'
              or public.framing_dimension_editable(project_id, public.framing_key_dimension(field_key)));

create policy needs_framing_dimension_insert on public.needs
  as restrictive for insert to authenticated
  with check (public.framing_dimension_editable(project_id, 'objective'));
create policy needs_framing_dimension_update on public.needs
  as restrictive for update to authenticated
  using (public.framing_dimension_editable(project_id, 'objective'))
  with check (public.framing_dimension_editable(project_id, 'objective'));

create policy team_framing_dimension_insert on public.project_team_members
  as restrictive for insert to authenticated
  with check (public.framing_dimension_editable(project_id, 'team'));
create policy team_framing_dimension_update on public.project_team_members
  as restrictive for update to authenticated
  using (public.framing_dimension_editable(project_id, 'team'))
  with check (public.framing_dimension_editable(project_id, 'team'));

create policy constraints_framing_dimension_insert on public.framing_constraints
  as restrictive for insert to authenticated
  with check (public.framing_dimension_editable(project_id,
              case when type = 'rights' then 'legal' else 'budget' end));
create policy constraints_framing_dimension_update on public.framing_constraints
  as restrictive for update to authenticated
  using (public.framing_dimension_editable(project_id,
         case when type = 'rights' then 'legal' else 'budget' end))
  with check (public.framing_dimension_editable(project_id,
              case when type = 'rights' then 'legal' else 'budget' end));

create policy framing_deadlines_dimension_insert on public.framing_deadlines
  as restrictive for insert to authenticated
  with check (public.framing_dimension_editable(project_id, 'timing'));
create policy framing_deadlines_dimension_update on public.framing_deadlines
  as restrictive for update to authenticated
  using (public.framing_dimension_editable(project_id, 'timing'))
  with check (public.framing_dimension_editable(project_id, 'timing'));

-- 4. Framing calls ---------------------------------------------------------------

-- A call prepared from the Cadrage (« Préparer un échange »): a normal call,
-- plus what it is for, who takes part and which documents go with it.
create table public.framing_calls (
  call_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  purpose text not null,
  participants jsonb not null default '[]'::jsonb,
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint framing_calls_purpose_check
    check (btrim(purpose) <> '' and char_length(purpose) <= 500),
  constraint framing_calls_participants_check
    check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 30),
  constraint framing_calls_documents_check check (cardinality(document_ids) <= 30),
  constraint framing_calls_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade,
  constraint framing_calls_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id)
);
alter table public.framing_calls enable row level security;
alter table public.framing_calls force row level security;
grant select on public.framing_calls to authenticated;
grant insert (call_id, organization_id, project_id, purpose, participants, document_ids)
  on public.framing_calls to authenticated;
create policy framing_calls_select_visible on public.framing_calls
  for select to authenticated using (public.can_see_project(project_id));
create policy framing_calls_insert_owner on public.framing_calls
  for insert to authenticated
  with check (public.is_project_owner(project_id)
              and exists (select 1 from public.calls c
                          where c.id = framing_calls.call_id and c.project_id = framing_calls.project_id));

-- Participants are names (a member or someone outside), documents are the
-- project's own files: checked here, whatever the client sends.
create function public.framing_calls_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from jsonb_array_elements(new.participants) p
             where jsonb_typeof(p) <> 'object'
                or btrim(coalesce(p ->> 'name', '')) = ''
                or char_length(p ->> 'name') > 120) then
    raise exception 'invalid_participants' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.document_ids) d
             where not exists (select 1 from public.project_files f
                               where f.id = d and f.project_id = new.project_id)) then
    raise exception 'invalid_documents' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger a_check before insert on public.framing_calls
  for each row execute function public.framing_calls_check();

-- « Lancer »: the call and its framing details in one transaction, with the
-- caller's rights (the owner writes the project's calls).
create function public.create_framing_call(
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

  insert into public.framing_calls
    (call_id, organization_id, project_id, purpose, participants, document_ids)
  values (v_call, v_org, p_project_id, p_purpose, coalesce(p_participants, '[]'::jsonb),
          coalesce(p_document_ids, '{}'));
  return v_call;
end;
$$;
