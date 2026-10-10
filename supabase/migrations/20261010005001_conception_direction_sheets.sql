-- Conception, étapes 4 à 13 (ticket « Conception », docs/ARCHITECTURE.md § 8 decies):
--   1. consolidation of the intentions: merge or split PO's proposals, then
--      an authorized person (the owner) confirms the consolidated set of a
--      target (design_intent_confirmations, a snapshot);
--   2. responsibles and validators, designated by the owner only
--      (design_assignments, design_validators); PO never assigns;
--   3. references: files (private bucket design-references) or links, one
--      resource linked to any number of targets (design_reference_links),
--      none = « à rattacher »; the same file or link is never stored twice;
--   4. submissions of the artistic direction and of the Fiches Livrables,
--      versioned, snapshot written by the database; decisions per section
--      or global (design_workspaces.validation_mode), kept separately;
--   5. the Brief créatif global, versioned (content written by the server);
--   6. the Fiches Livrables, one per deliverable, series with numbered items;
--   7. the handoff of a validated version to Production, by a person;
--   8. design_events: the history, written by triggers only.
-- Nothing here creates a call, task, notification, assignment or handoff on
-- its own: every row is the result of a person's action.

-- 1. Workspace settings --------------------------------------------------------

-- global = one decision for the whole submission; per_section = one decision
-- per section (the direction, each deliverable, each item of a series).
alter table public.design_workspaces
  add column validation_mode text not null default 'per_section',
  add constraint design_workspaces_mode_check check (validation_mode in ('global', 'per_section'));

-- 2. Intentions: merge, split, consolidation -------------------------------------

alter table public.design_intentions drop constraint design_intentions_status_check;
alter table public.design_intentions add constraint design_intentions_status_check
  check (status in ('proposed', 'confirmed', 'rejected', 'replaced', 'merged', 'split'));
alter table public.design_intentions
  add column merged_into uuid references public.design_intentions (id) on delete set null,
  add column split_from uuid references public.design_intentions (id) on delete set null;
alter table public.design_intentions drop constraint design_intentions_unassigned_check;
alter table public.design_intentions add constraint design_intentions_unassigned_check
  check (target <> 'unassigned' or status in ('proposed', 'rejected', 'merged', 'split'));

-- Merges several proposals into one new proposal (reworded by the person),
-- the originals stay as « merged » pointing at it: their sources are kept.
create function public.merge_design_intentions(
  p_ids uuid[],
  p_value text,
  p_target text,
  p_deliverable_id uuid,
  p_topic text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first public.design_intentions%rowtype;
  v_id uuid;
begin
  if cardinality(p_ids) < 2 then
    raise exception 'invalid_input';
  end if;
  select * into v_first from public.design_intentions where id = p_ids[1];
  if not found or not public.can_see_project(v_first.project_id) then
    raise exception 'intention_not_found';
  end if;
  if not public.design_can_write(v_first.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.design_intentions
       where id = any (p_ids) and project_id = v_first.project_id and status = 'proposed')
     <> cardinality(p_ids) then
    raise exception 'invalid_transition';
  end if;
  insert into public.design_intentions
    (organization_id, project_id, target, design_deliverable_id, topic, value, status,
     source_type, source_id, source_report_item_id, source_quote)
  values (v_first.organization_id, v_first.project_id,
          case when p_deliverable_id is null and p_target = 'deliverable' then 'unassigned'
               else coalesce(p_target, 'unassigned') end,
          case when p_target = 'deliverable' then p_deliverable_id end,
          p_topic, btrim(p_value), 'proposed',
          v_first.source_type, v_first.source_id, v_first.source_report_item_id,
          v_first.source_quote)
  returning id into v_id;
  update public.design_intentions set status = 'merged', merged_into = v_id
   where id = any (p_ids);
  return v_id;
end;
$$;
revoke execute on function public.merge_design_intentions(uuid[], text, text, uuid, text) from public, anon;
grant execute on function public.merge_design_intentions(uuid[], text, text, uuid, text) to authenticated;

-- Splits one proposal into several (each with its target, topic and words),
-- all keeping the original's source; the original stays as « split ».
-- p_parts: [{"target": "direction|deliverable|unassigned", "deliverable_id": …,
--            "topic": "story|look|tone|musts", "value": "…"}]
create function public.split_design_intention(p_id uuid, p_parts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_intentions%rowtype;
  v_part jsonb;
begin
  select * into v from public.design_intentions where id = p_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'intention_not_found';
  end if;
  if not public.design_can_write(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'proposed' or jsonb_typeof(p_parts) <> 'array'
     or jsonb_array_length(p_parts) < 2 or jsonb_array_length(p_parts) > 10 then
    raise exception 'invalid_transition';
  end if;
  for v_part in select * from jsonb_array_elements(p_parts) loop
    insert into public.design_intentions
      (organization_id, project_id, target, design_deliverable_id, topic, value, status,
       source_type, source_id, source_report_item_id, source_quote, split_from)
    values (v.organization_id, v.project_id,
            case when v_part ->> 'target' = 'deliverable' and nullif(v_part ->> 'deliverable_id', '') is null
                 then 'unassigned' else coalesce(v_part ->> 'target', 'unassigned') end,
            case when v_part ->> 'target' = 'deliverable'
                 then nullif(v_part ->> 'deliverable_id', '')::uuid end,
            v_part ->> 'topic', btrim(v_part ->> 'value'), 'proposed',
            v.source_type, v.source_id, v.source_report_item_id, v.source_quote, v.id);
  end loop;
  update public.design_intentions set status = 'split' where id = v.id;
end;
$$;
revoke execute on function public.split_design_intention(uuid, jsonb) from public, anon;
grant execute on function public.split_design_intention(uuid, jsonb) to authenticated;

-- The consolidated intentions of a target, confirmed by the owner: a
-- snapshot of the retained answers. Later changes make it « à réviser »
-- (computed by code, lib/design/states.ts).
create table public.design_intent_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  target text not null,
  design_deliverable_id uuid,
  -- [{"intention_id": …, "topic": …, "value": …}]
  snapshot jsonb not null,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz not null default now(),
  constraint design_intent_confirmations_target_check
    check (target in ('direction', 'deliverable')
           and (target = 'deliverable') = (design_deliverable_id is not null)),
  constraint design_intent_confirmations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_intent_confirmations_deliverable_same_org
    foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade
);
create index design_intent_confirmations_idx
  on public.design_intent_confirmations (project_id, confirmed_at);
alter table public.design_intent_confirmations enable row level security;
alter table public.design_intent_confirmations force row level security;
revoke all on table public.design_intent_confirmations from anon, authenticated;
grant select on public.design_intent_confirmations to authenticated;
create policy design_intent_confirmations_select on public.design_intent_confirmations
  for select to authenticated using (public.can_see_project(project_id));

create function public.confirm_design_intentions(p_project_id uuid, p_deliverable_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_target text := case when p_deliverable_id is null then 'direction' else 'deliverable' end;
  v_snapshot jsonb;
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if exists (select 1 from public.design_intentions i
             where i.project_id = p_project_id and i.status = 'proposed'
               and i.target = v_target
               and i.design_deliverable_id is not distinct from p_deliverable_id) then
    raise exception 'proposals_pending';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('intention_id', i.id, 'topic', i.topic,
                                               'value', i.value) order by i.topic), '[]'::jsonb)
    into v_snapshot
    from public.design_intentions i
   where i.project_id = p_project_id and i.status = 'confirmed' and i.target = v_target
     and i.design_deliverable_id is not distinct from p_deliverable_id;
  if jsonb_array_length(v_snapshot) = 0 then
    raise exception 'nothing_to_confirm';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.design_intent_confirmations
    (organization_id, project_id, target, design_deliverable_id, snapshot, confirmed_by)
  values (v_org, p_project_id, v_target, p_deliverable_id, v_snapshot, public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.confirm_design_intentions(uuid, uuid) from public, anon;
grant execute on function public.confirm_design_intentions(uuid, uuid) to authenticated;

-- 3. Fiches Livrables (before assignments: a responsible may hold a sheet) ----

create table public.design_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  design_deliverable_id uuid not null unique,
  -- single = one deliverable; series = numbered items (design_sheet_items).
  kind text not null default 'single',
  title text not null,
  concept text,
  intention text,
  -- Target duration, a value or a range, in seconds.
  duration_min_seconds integer,
  duration_max_seconds integer,
  -- Expected ratios ('16:9', '9:16', '1:1', '4:5' or written by a person).
  ratios text[] not null default '{}',
  -- null = not decided yet; then which ratios carry them, burned in and/or a file.
  subtitles boolean,
  subtitle_ratios text[] not null default '{}',
  subtitle_mode text,
  variants text,
  notes text,
  constraints text,
  shoot_date date,
  post_start date,
  post_deadline date,
  delivery_date date,
  -- Prévisionnel: never an expense (budget_lines stay the commitments).
  budget_cents bigint,
  budget_state text not null default 'not_committed',
  dependencies text,
  -- Points left to Production (place, people, equipment…).
  production_notes text,
  -- Where each value comes from: {"field": {"source": "strategy|call|manual|suggestion|import",
  -- "detail": "…"}}, written by the server with the value.
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint design_sheets_kind_check check (kind in ('single', 'series')),
  constraint design_sheets_title_check check (btrim(title) <> '' and char_length(title) <= 200),
  constraint design_sheets_texts_check check (
    char_length(coalesce(concept, '')) <= 4000 and char_length(coalesce(intention, '')) <= 4000
    and char_length(coalesce(variants, '')) <= 2000 and char_length(coalesce(notes, '')) <= 4000
    and char_length(coalesce(constraints, '')) <= 2000
    and char_length(coalesce(dependencies, '')) <= 2000
    and char_length(coalesce(production_notes, '')) <= 4000),
  constraint design_sheets_duration_check check (
    (duration_min_seconds is null or duration_min_seconds between 1 and 86400)
    and (duration_max_seconds is null or duration_max_seconds between 1 and 86400)
    and (duration_min_seconds is null or duration_max_seconds is null
         or duration_min_seconds <= duration_max_seconds)),
  constraint design_sheets_ratios_check check (cardinality(ratios) <= 10 and cardinality(subtitle_ratios) <= 10),
  constraint design_sheets_subtitles_check check (
    (subtitle_mode is null or subtitle_mode in ('burned', 'file', 'both'))
    and (subtitles is true or (cardinality(subtitle_ratios) = 0 and subtitle_mode is null))),
  constraint design_sheets_budget_check check (
    (budget_cents is null or budget_cents >= 0)
    and budget_state in ('not_committed', 'committed')),
  constraint design_sheets_provenance_check check (jsonb_typeof(provenance) = 'object'),
  constraint design_sheets_id_org_key unique (id, organization_id),
  constraint design_sheets_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_sheets_deliverable_same_org foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade
);
create index design_sheets_project_idx on public.design_sheets (project_id, created_at);
create trigger a_set_created_by before insert on public.design_sheets
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.design_sheets
  for each row execute function public.set_updated_at();

create table public.design_sheet_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- 1, 2, 3…: the order of the series, never a fixed count.
  number integer not null,
  title text not null,
  objective text,
  delivery_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_sheet_items_number_check check (number between 1 and 200),
  constraint design_sheet_items_title_check check (btrim(title) <> '' and char_length(title) <= 200),
  constraint design_sheet_items_texts_check
    check (char_length(coalesce(objective, '')) <= 2000 and char_length(coalesce(notes, '')) <= 2000),
  constraint design_sheet_items_number_key unique (sheet_id, number),
  constraint design_sheet_items_sheet_same_org foreign key (sheet_id, organization_id)
    references public.design_sheets (id, organization_id) on delete cascade
);
create trigger a_set_updated_at before update on public.design_sheet_items
  for each row execute function public.set_updated_at();

-- 4. Responsibles and validators ----------------------------------------------

-- scope direction = the artistic direction; sheet = one Fiche Livrable.
create table public.design_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  scope text not null,
  sheet_id uuid,
  person_id uuid not null references public.people (id),
  assigned_by uuid references public.people (id),
  assigned_at timestamptz not null default now(),
  -- Replaced by another designation: kept as history.
  ended_at timestamptz,
  constraint design_assignments_scope_check
    check (scope in ('direction', 'sheet') and (scope = 'sheet') = (sheet_id is not null)),
  constraint design_assignments_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_assignments_sheet_same_org foreign key (sheet_id, organization_id)
    references public.design_sheets (id, organization_id) on delete cascade
);
create unique index design_assignments_active_key on public.design_assignments
  (project_id, scope, coalesce(sheet_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where ended_at is null;
alter table public.design_assignments enable row level security;
alter table public.design_assignments force row level security;
revoke all on table public.design_assignments from anon, authenticated;
grant select on public.design_assignments to authenticated;
create policy design_assignments_select on public.design_assignments
  for select to authenticated using (public.can_see_project(project_id));

create table public.design_validators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  scope text not null,
  sheet_id uuid,
  person_id uuid not null references public.people (id),
  added_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_validators_scope_check
    check (scope in ('direction', 'sheet') and (scope = 'sheet') = (sheet_id is not null)),
  constraint design_validators_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_validators_sheet_same_org foreign key (sheet_id, organization_id)
    references public.design_sheets (id, organization_id) on delete cascade
);
create unique index design_validators_key on public.design_validators
  (project_id, scope, coalesce(sheet_id, '00000000-0000-0000-0000-000000000000'::uuid), person_id);
alter table public.design_validators enable row level security;
alter table public.design_validators force row level security;
revoke all on table public.design_validators from anon, authenticated;
grant select on public.design_validators to authenticated;
create policy design_validators_select on public.design_validators
  for select to authenticated using (public.can_see_project(project_id));

-- The designated person is an active member who sees the project: the
-- owner, someone who sees every project, or the creative team. A member with
-- creative work not in the team yet joins it with the designation (the
-- designation is the owner’s decision); anyone else is refused. The Réseau
-- has no account: someone outside cannot submit nor decide.
create function public.design_person_check(p_project_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_owner uuid;
begin
  select p.organization_id, p.owner_person_id into v_org, v_owner
    from public.projects p where p.id = p_project_id;
  if not exists (select 1 from public.memberships m
                 where m.organization_id = v_org and m.person_id = p_person_id
                   and m.status = 'approved') then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  if p_person_id = v_owner
     or public.person_has_permission(v_org, p_person_id, 'view_all_projects')
     or exists (select 1 from public.project_creatives pc
                where pc.project_id = p_project_id and pc.person_id = p_person_id) then
    return;
  end if;
  if not public.person_has_permission(v_org, p_person_id, 'creative_work') then
    raise exception 'person_cannot_see_project' using errcode = '23514';
  end if;
  insert into public.project_creatives (organization_id, project_id, person_id, added_by)
  values (v_org, p_project_id, p_person_id, public.auth_person_id())
  on conflict (project_id, person_id) do nothing;
end;
$$;
revoke execute on function public.design_person_check(uuid, uuid) from public, anon, authenticated;

-- « Désigner »: the owner, and only the owner. The previous designation ends.
create function public.assign_design_responsible(
  p_project_id uuid, p_scope text, p_sheet_id uuid, p_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if p_scope = 'sheet' and not exists (
    select 1 from public.design_sheets s where s.id = p_sheet_id and s.project_id = p_project_id) then
    raise exception 'sheet_not_found';
  end if;
  perform public.design_person_check(p_project_id, p_person_id);
  select organization_id into v_org from public.projects where id = p_project_id;
  update public.design_assignments set ended_at = now()
   where project_id = p_project_id and scope = p_scope
     and sheet_id is not distinct from p_sheet_id and ended_at is null;
  insert into public.design_assignments
    (organization_id, project_id, scope, sheet_id, person_id, assigned_by)
  values (v_org, p_project_id, p_scope, case when p_scope = 'sheet' then p_sheet_id end,
          p_person_id, public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.assign_design_responsible(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.assign_design_responsible(uuid, text, uuid, uuid) to authenticated;

-- The validators of a scope, replaced as a whole by the owner. A
-- responsible may also validate when the owner names them (rule of the
-- project), never by default.
create function public.set_design_validators(
  p_project_id uuid, p_scope text, p_sheet_id uuid, p_people uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if cardinality(coalesce(p_people, '{}')) > 10 then
    raise exception 'invalid_input';
  end if;
  if p_scope = 'sheet' and not exists (
    select 1 from public.design_sheets s where s.id = p_sheet_id and s.project_id = p_project_id) then
    raise exception 'sheet_not_found';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  delete from public.design_validators
   where project_id = p_project_id and scope = p_scope
     and sheet_id is not distinct from p_sheet_id;
  foreach v_person in array coalesce(p_people, '{}') loop
    perform public.design_person_check(p_project_id, v_person);
    insert into public.design_validators (organization_id, project_id, scope, sheet_id, person_id, added_by)
    values (v_org, p_project_id, p_scope, case when p_scope = 'sheet' then p_sheet_id end,
            v_person, public.auth_person_id())
    on conflict do nothing;
  end loop;
end;
$$;
revoke execute on function public.set_design_validators(uuid, text, uuid, uuid[]) from public, anon;
grant execute on function public.set_design_validators(uuid, text, uuid, uuid[]) to authenticated;

create function public.set_design_validation_mode(p_project_id uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  update public.design_workspaces set validation_mode = p_mode where project_id = p_project_id;
  if not found then
    raise exception 'stage_locked';
  end if;
end;
$$;
revoke execute on function public.set_design_validation_mode(uuid, text) from public, anon;
grant execute on function public.set_design_validation_mode(uuid, text) to authenticated;

-- The caller holds a designation (direction or a sheet) in the project.
create function public.design_is_responsible(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.design_assignments a
                 where a.project_id = p_project_id and a.ended_at is null
                   and a.person_id = public.auth_person_id());
$$;
revoke execute on function public.design_is_responsible(uuid) from public, anon;
grant execute on function public.design_is_responsible(uuid) to authenticated;

-- Writers of the Conception: also the designated responsibles.
create or replace function public.design_can_write(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.design_is_in_progress(p_project_id)
     and (public.is_project_owner(p_project_id)
          or public.design_is_responsible(p_project_id)
          or exists (select 1 from public.project_creatives pc
                     where pc.project_id = p_project_id
                       and pc.person_id = public.auth_person_id()));
$$;

-- 5. References: files and links, linked to any number of targets ------------

alter table public.design_references
  add column kind text not null default 'link',
  add column title text,
  add column path text,
  add column file_name text,
  add column mime text,
  add column bytes bigint,
  add column sha256 text,
  alter column url drop not null;
alter table public.design_references drop constraint design_references_url_check;
alter table public.design_references
  add constraint design_references_kind_check check (kind in ('link', 'file')),
  add constraint design_references_url_check check (
    (kind = 'link') = (url is not null)
    and (url is null or (url ~ '^https://[^\s]+$' and char_length(url) <= 2000))),
  add constraint design_references_file_check check (
    (kind = 'file') = (path is not null)
    and (kind <> 'file' or (
      btrim(coalesce(file_name, '')) <> '' and char_length(file_name) <= 255
      and char_length(coalesce(mime, '')) between 1 and 255
      and bytes > 0 and bytes <= 52428800
      and sha256 ~ '^[0-9a-f]{64}$'
      and path ~ ('^' || organization_id::text || '/' || project_id::text
                  || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')))),
  add constraint design_references_title_check check (title is null or char_length(title) <= 200),
  add constraint design_references_id_org_key unique (id, organization_id);
create unique index design_references_file_key on public.design_references (project_id, sha256)
  where sha256 is not null;
create unique index design_references_url_key on public.design_references (project_id, url)
  where url is not null;

create table public.design_reference_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  reference_id uuid not null,
  -- direction = the overall direction; deliverable = one deliverable.
  target text not null,
  design_deliverable_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_reference_links_target_check
    check (target in ('direction', 'deliverable')
           and (target = 'deliverable') = (design_deliverable_id is not null)),
  constraint design_reference_links_reference_same_org foreign key (reference_id, organization_id)
    references public.design_references (id, organization_id) on delete cascade,
  constraint design_reference_links_deliverable_same_org
    foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade
);
create unique index design_reference_links_key on public.design_reference_links
  (reference_id, coalesce(design_deliverable_id, '00000000-0000-0000-0000-000000000000'::uuid));
create trigger a_set_created_by before insert on public.design_reference_links
  for each row execute function public.set_created_by();

-- The links the references had move to the link table.
insert into public.design_reference_links
  (organization_id, project_id, reference_id, target, design_deliverable_id, created_by, created_at)
select organization_id, project_id, id,
       case when design_deliverable_id is null then 'direction' else 'deliverable' end,
       design_deliverable_id, created_by, created_at
  from public.design_references;
alter table public.design_references drop column design_deliverable_id;

drop trigger b_check on public.design_references;
drop function public.design_references_check();

create function public.design_reference_links_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.design_references r
                 where r.id = new.reference_id and r.project_id = new.project_id) then
    raise exception 'reference_not_in_project' using errcode = '23514';
  end if;
  if new.design_deliverable_id is not null and not exists (
    select 1 from public.design_deliverables d
    where d.id = new.design_deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert on public.design_reference_links
  for each row execute function public.design_reference_links_check();

alter table public.design_reference_links enable row level security;
alter table public.design_reference_links force row level security;
revoke all on table public.design_reference_links from anon, authenticated;
grant select, delete on public.design_reference_links to authenticated;
grant insert (organization_id, project_id, reference_id, target, design_deliverable_id)
  on public.design_reference_links to authenticated;
create policy design_reference_links_select on public.design_reference_links
  for select to authenticated using (public.can_see_project(project_id));
create policy design_reference_links_insert on public.design_reference_links
  for insert to authenticated
  with check (public.is_active_member(organization_id) and public.design_can_write(project_id));
create policy design_reference_links_delete on public.design_reference_links
  for delete to authenticated using (public.design_can_write(project_id));

grant insert (organization_id, project_id, url, note, kind, title, path, file_name, mime, bytes, sha256)
  on public.design_references to authenticated;
grant update (note, title) on public.design_references to authenticated;
create policy design_references_update_writer on public.design_references
  for update to authenticated
  using (public.design_can_write(project_id))
  with check (public.design_can_write(project_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-references', 'design-references', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
              'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy design_references_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'design-references'
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
  );
create policy design_references_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'design-references'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and public.design_can_write(p.id))
  );
create policy design_references_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'design-references'
    and not exists (select 1 from public.design_references r where r.path = objects.name)
    and public.design_can_write(public.try_uuid((storage.foldername(objects.name))[2]))
  );

-- 6. Submissions and decisions -------------------------------------------------

create table public.design_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- direction = the artistic direction; sheet = one Fiche Livrable.
  kind text not null,
  sheet_id uuid,
  -- Counted by the database per kind and sheet (1, 2, 3…).
  number integer not null default 0,
  -- The sections submitted ('direction', a deliverable id; for a sheet:
  -- 'sheet' then one per item of a series).
  sections text[] not null,
  -- What the validators read, written by the database at submission.
  snapshot jsonb not null,
  mode text not null,
  status text not null default 'pending',
  submitted_by uuid references public.people (id),
  submitted_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint design_submissions_kind_check
    check (kind in ('direction', 'sheet') and (kind = 'sheet') = (sheet_id is not null)),
  constraint design_submissions_mode_check check (mode in ('global', 'per_section')),
  constraint design_submissions_status_check
    check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  constraint design_submissions_sections_check
    check (cardinality(sections) between 1 and 201),
  constraint design_submissions_closed_check check ((status = 'pending') = (closed_at is null)),
  constraint design_submissions_id_org_key unique (id, organization_id),
  constraint design_submissions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_submissions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.design_sheets (id, organization_id) on delete cascade
);
create unique index design_submissions_number_key on public.design_submissions
  (project_id, kind, coalesce(sheet_id, '00000000-0000-0000-0000-000000000000'::uuid), number);
create unique index design_submissions_pending_key on public.design_submissions
  (project_id, kind, coalesce(sheet_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'pending';
alter table public.design_submissions enable row level security;
alter table public.design_submissions force row level security;
revoke all on table public.design_submissions from anon, authenticated;
grant select on public.design_submissions to authenticated;
create policy design_submissions_select on public.design_submissions
  for select to authenticated using (public.can_see_project(project_id));

create table public.design_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  submission_id uuid not null,
  -- '' = the whole submission (global); otherwise one of its sections.
  section text not null default '',
  decision text not null,
  comment text,
  decided_by uuid references public.people (id),
  decided_at timestamptz not null default now(),
  constraint design_decisions_decision_check
    check (decision in ('approved', 'changes_requested', 'rejected')),
  constraint design_decisions_comment_check check (
    (decision = 'approved' or btrim(coalesce(comment, '')) <> '')
    and char_length(coalesce(comment, '')) <= 2000),
  -- One decision per section: a concurrent second one is refused.
  constraint design_decisions_section_key unique (submission_id, section),
  constraint design_decisions_submission_same_org foreign key (submission_id, organization_id)
    references public.design_submissions (id, organization_id) on delete cascade
);
alter table public.design_decisions enable row level security;
alter table public.design_decisions force row level security;
revoke all on table public.design_decisions from anon, authenticated;
grant select on public.design_decisions to authenticated;
create policy design_decisions_select on public.design_decisions
  for select to authenticated using (public.can_see_project(project_id));

-- What a submission of the direction carries: per section, the confirmed
-- intentions and the linked references. Written by the database, never sent.
create function public.design_direction_snapshot(p_project_id uuid, p_sections text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'section', s.section,
    'title', case when s.section = 'direction' then null
                  else coalesce(dd.title, sd.title) end,
    'intentions', coalesce((
      select jsonb_agg(jsonb_build_object('topic', i.topic, 'value', i.value) order by i.topic)
        from public.design_intentions i
       where i.project_id = p_project_id and i.status = 'confirmed'
         and ((s.section = 'direction' and i.target = 'direction')
              or i.design_deliverable_id::text = s.section)), '[]'::jsonb),
    'references', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'title', r.title,
                                          'url', r.url, 'file_name', r.file_name, 'note', r.note)
                       order by r.created_at)
        from public.design_references r
        join public.design_reference_links l on l.reference_id = r.id
       where r.project_id = p_project_id
         and ((s.section = 'direction' and l.target = 'direction')
              or l.design_deliverable_id::text = s.section)), '[]'::jsonb)
  ) order by s.ord), '[]'::jsonb)
  from unnest(p_sections) with ordinality as s (section, ord)
  left join public.design_deliverables dd on dd.id::text = s.section
  left join public.strategy_deliverables sd on sd.id = dd.strategy_deliverable_id;
$$;
revoke execute on function public.design_direction_snapshot(uuid, text[]) from public, anon, authenticated;

-- « Soumettre la direction artistique »: its responsible (or the owner)
-- chooses the sections; validators must be named; one pending at a time.
create function public.submit_design_direction(p_project_id uuid, p_sections text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_mode text;
  v_id uuid;
begin
  if not (public.is_project_owner(p_project_id) or exists (
            select 1 from public.design_assignments a
            where a.project_id = p_project_id and a.scope = 'direction' and a.ended_at is null
              and a.person_id = public.auth_person_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if cardinality(coalesce(p_sections, '{}')) = 0 or exists (
       select 1 from unnest(p_sections) s
       where s <> 'direction' and not exists (
         select 1 from public.design_deliverables d
         where d.id::text = s and d.project_id = p_project_id)) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if not exists (select 1 from public.design_validators v
                 where v.project_id = p_project_id and v.scope = 'direction') then
    raise exception 'validator_required';
  end if;
  select w.validation_mode, w.organization_id into v_mode, v_org
    from public.design_workspaces w where w.project_id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || 'direction'));
  if exists (select 1 from public.design_submissions s
             where s.project_id = p_project_id and s.kind = 'direction' and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  insert into public.design_submissions
    (organization_id, project_id, kind, number, sections, snapshot, mode, submitted_by)
  values (v_org, p_project_id, 'direction',
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where project_id = p_project_id and kind = 'direction'),
          p_sections, public.design_direction_snapshot(p_project_id, p_sections),
          coalesce(v_mode, 'per_section'), public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_design_direction(uuid, text[]) from public, anon;
grant execute on function public.submit_design_direction(uuid, text[]) to authenticated;

-- What a submission of a Fiche Livrable carries: the sheet, its items, its
-- deliverable's confirmed intentions and linked references.
create function public.design_sheet_snapshot(p_sheet_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sheet', to_jsonb(s) - 'organization_id' - 'created_by' - 'updated_by',
    'items', coalesce((select jsonb_agg(to_jsonb(i) - 'organization_id' order by i.number)
                         from public.design_sheet_items i where i.sheet_id = s.id), '[]'::jsonb),
    'intentions', coalesce((
      select jsonb_agg(jsonb_build_object('topic', x.topic, 'value', x.value) order by x.topic)
        from public.design_intentions x
       where x.design_deliverable_id = s.design_deliverable_id and x.status = 'confirmed'),
      '[]'::jsonb),
    'references', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'title', r.title,
                                          'url', r.url, 'file_name', r.file_name, 'note', r.note)
                       order by r.created_at)
        from public.design_references r
        join public.design_reference_links l on l.reference_id = r.id
       where l.design_deliverable_id = s.design_deliverable_id), '[]'::jsonb),
    'responsible', (select a.person_id from public.design_assignments a
                     where a.sheet_id = s.id and a.ended_at is null),
    'validators', coalesce((select jsonb_agg(v.person_id) from public.design_validators v
                             where v.sheet_id = s.id), '[]'::jsonb))
  from public.design_sheets s where s.id = p_sheet_id;
$$;
revoke execute on function public.design_sheet_snapshot(uuid) from public, anon, authenticated;

-- « Soumettre » a Fiche Livrable: its responsible (or the owner), once a
-- responsible and validators are named. The sheet is frozen while pending.
create function public.submit_design_sheet(p_sheet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_sheets%rowtype;
  v_mode text;
  v_sections text[];
  v_id uuid;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not (public.is_project_owner(v.project_id) or exists (
            select 1 from public.design_assignments a
            where a.sheet_id = v.id and a.ended_at is null
              and a.person_id = public.auth_person_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked';
  end if;
  if not exists (select 1 from public.design_assignments a
                 where a.sheet_id = v.id and a.ended_at is null) then
    raise exception 'responsible_required';
  end if;
  if not exists (select 1 from public.design_validators x where x.sheet_id = v.id) then
    raise exception 'validator_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v.id::text));
  if exists (select 1 from public.design_submissions s
             where s.sheet_id = v.id and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  select w.validation_mode into v_mode from public.design_workspaces w
   where w.project_id = v.project_id;
  select array['sheet'] || coalesce(array_agg(i.id::text order by i.number), '{}')
    into v_sections from public.design_sheet_items i where i.sheet_id = v.id;
  insert into public.design_submissions
    (organization_id, project_id, kind, sheet_id, number, sections, snapshot, mode, submitted_by)
  values (v.organization_id, v.project_id, 'sheet', v.id,
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where sheet_id = v.id),
          v_sections, public.design_sheet_snapshot(v.id),
          coalesce(v_mode, 'per_section'), public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_design_sheet(uuid) from public, anon;
grant execute on function public.submit_design_sheet(uuid) to authenticated;

-- A validator's decision on a section (or on the whole submission in global
-- mode). Once every section is decided, the submission closes: refused if
-- one is refused, changes requested if one asks for changes, else validated.
-- Never validated by silence: only decisions count.
create function public.decide_design_submission(
  p_submission_id uuid, p_section text, p_decision text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_submissions%rowtype;
  v_section text := coalesce(p_section, '');
  v_decided integer;
  v_status text;
begin
  select * into v from public.design_submissions where id = p_submission_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'submission_not_found';
  end if;
  if not exists (select 1 from public.design_validators x
                 where x.project_id = v.project_id and x.scope = v.kind
                   and x.sheet_id is not distinct from v.sheet_id
                   and x.person_id = public.auth_person_id()) then
    raise exception 'not_a_validator' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  if (v.mode = 'global' and v_section <> '')
     or (v.mode = 'per_section' and not (v_section = any (v.sections))) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if p_decision <> 'approved' and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;
  insert into public.design_decisions
    (organization_id, project_id, submission_id, section, decision, comment, decided_by)
  values (v.organization_id, v.project_id, v.id, v_section, p_decision,
          nullif(btrim(coalesce(p_comment, '')), ''), public.auth_person_id());

  select count(*) into v_decided from public.design_decisions d where d.submission_id = v.id;
  if v.mode = 'per_section' and v_decided < cardinality(v.sections) then
    return;
  end if;
  select case when bool_or(d.decision = 'rejected') then 'rejected'
              when bool_or(d.decision = 'changes_requested') then 'changes_requested'
              else 'approved' end
    into v_status from public.design_decisions d where d.submission_id = v.id;
  update public.design_submissions set status = v_status, closed_at = now() where id = v.id;
end;
$$;
revoke execute on function public.decide_design_submission(uuid, text, text, text) from public, anon;
grant execute on function public.decide_design_submission(uuid, text, text, text) to authenticated;

-- 7. Sheets: who writes ----------------------------------------------------------

-- The owner or the sheet's responsible, while the Conception is in progress
-- and no version of the sheet waits for a decision.
create function public.design_sheet_can_edit(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.design_sheets s
    where s.id = p_sheet_id
      and public.design_is_in_progress(s.project_id)
      and (public.is_project_owner(s.project_id)
           or exists (select 1 from public.design_assignments a
                      where a.sheet_id = s.id and a.ended_at is null
                        and a.person_id = public.auth_person_id()))
      and not exists (select 1 from public.design_submissions x
                      where x.sheet_id = s.id and x.status = 'pending'));
$$;
revoke execute on function public.design_sheet_can_edit(uuid) from public, anon;
grant execute on function public.design_sheet_can_edit(uuid) to authenticated;

alter table public.design_sheets enable row level security;
alter table public.design_sheets force row level security;
revoke all on table public.design_sheets from anon, authenticated;
grant select, delete on public.design_sheets to authenticated;
grant insert (organization_id, project_id, design_deliverable_id, kind, title, intention,
              delivery_date, provenance)
  on public.design_sheets to authenticated;
grant update (kind, title, concept, intention, duration_min_seconds, duration_max_seconds, ratios,
              subtitles, subtitle_ratios, subtitle_mode, variants, notes, constraints, shoot_date,
              post_start, post_deadline, delivery_date, budget_cents, budget_state, dependencies,
              production_notes, provenance, updated_by)
  on public.design_sheets to authenticated;
create policy design_sheets_select on public.design_sheets
  for select to authenticated using (public.can_see_project(project_id));
-- « Créer les fiches »: the owner, while the Conception is in progress.
create policy design_sheets_insert_owner on public.design_sheets
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and public.is_project_owner(project_id)
              and public.design_is_in_progress(project_id));
create policy design_sheets_update_editor on public.design_sheets
  for update to authenticated
  using (public.design_sheet_can_edit(id))
  with check (public.design_sheet_can_edit(id));
-- A sheet never submitted can be taken back by the owner.
create policy design_sheets_delete_owner on public.design_sheets
  for delete to authenticated
  using (public.is_project_owner(project_id) and public.design_is_in_progress(project_id)
         and not exists (select 1 from public.design_submissions x
                         where x.sheet_id = design_sheets.id));

create function public.design_sheets_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.design_deliverables d
                 where d.id = new.design_deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert on public.design_sheets
  for each row execute function public.design_sheets_check();

alter table public.design_sheet_items enable row level security;
alter table public.design_sheet_items force row level security;
revoke all on table public.design_sheet_items from anon, authenticated;
grant select, delete on public.design_sheet_items to authenticated;
grant insert (organization_id, project_id, sheet_id, number, title, objective, delivery_date, notes)
  on public.design_sheet_items to authenticated;
grant update (title, objective, delivery_date, notes) on public.design_sheet_items to authenticated;
create policy design_sheet_items_select on public.design_sheet_items
  for select to authenticated using (public.can_see_project(project_id));
create policy design_sheet_items_insert on public.design_sheet_items
  for insert to authenticated
  with check (public.is_active_member(organization_id) and public.design_sheet_can_edit(sheet_id)
              and exists (select 1 from public.design_sheets s
                          where s.id = design_sheet_items.sheet_id and s.project_id = design_sheet_items.project_id
                            and s.kind = 'series'));
create policy design_sheet_items_update on public.design_sheet_items
  for update to authenticated
  using (public.design_sheet_can_edit(sheet_id)) with check (public.design_sheet_can_edit(sheet_id));
create policy design_sheet_items_delete on public.design_sheet_items
  for delete to authenticated using (public.design_sheet_can_edit(sheet_id));

-- 8. Brief créatif global ------------------------------------------------------------

create table public.design_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  number integer not null,
  -- Sections built by the server from what the project holds (lib/design/brief.ts).
  content jsonb not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_briefs_content_check check (jsonb_typeof(content) = 'object'),
  constraint design_briefs_number_key unique (project_id, number),
  constraint design_briefs_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.design_briefs enable row level security;
alter table public.design_briefs force row level security;
revoke all on table public.design_briefs from anon, authenticated;
grant select on public.design_briefs to authenticated;
create policy design_briefs_select on public.design_briefs
  for select to authenticated using (public.can_see_project(project_id));

-- A new version of the Brief créatif: the owner or the direction's responsible.
create function public.create_design_brief(p_project_id uuid, p_content jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_number integer;
begin
  if not (public.is_project_owner(p_project_id) or exists (
            select 1 from public.design_assignments a
            where a.project_id = p_project_id and a.scope = 'direction' and a.ended_at is null
              and a.person_id = public.auth_person_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 500000 then
    raise exception 'invalid_input';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || 'brief'));
  select coalesce(max(number), 0) + 1 into v_number
    from public.design_briefs where project_id = p_project_id;
  insert into public.design_briefs (organization_id, project_id, number, content, created_by)
  values (v_org, p_project_id, v_number, p_content, public.auth_person_id());
  return v_number;
end;
$$;
revoke execute on function public.create_design_brief(uuid, jsonb) from public, anon;
grant execute on function public.create_design_brief(uuid, jsonb) to authenticated;

-- 9. Handoff to Production ------------------------------------------------------------

create table public.design_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- The validated version handed over; Production reads its snapshot.
  submission_id uuid not null,
  -- The Brief créatif in force at the handoff, if any.
  brief_id uuid references public.design_briefs (id) on delete set null,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz not null default now(),
  constraint design_handoffs_version_key unique (sheet_id, submission_id),
  constraint design_handoffs_sheet_same_org foreign key (sheet_id, organization_id)
    references public.design_sheets (id, organization_id) on delete cascade,
  constraint design_handoffs_submission_same_org foreign key (submission_id, organization_id)
    references public.design_submissions (id, organization_id) on delete cascade
);
alter table public.design_handoffs enable row level security;
alter table public.design_handoffs force row level security;
revoke all on table public.design_handoffs from anon, authenticated;
grant select on public.design_handoffs to authenticated;
create policy design_handoffs_select on public.design_handoffs
  for select to authenticated using (public.can_see_project(project_id));

-- « Transférer à Production »: the owner, the latest validated version.
-- Reserves nothing, creates no team nor task.
create function public.handoff_design_sheet(p_sheet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_sheets%rowtype;
  v_submission uuid;
  v_id uuid;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  select s.id into v_submission from public.design_submissions s
   where s.sheet_id = v.id and s.status = 'approved'
   order by s.number desc limit 1;
  if v_submission is null then
    raise exception 'not_validated';
  end if;
  if exists (select 1 from public.design_handoffs h
             where h.sheet_id = v.id and h.submission_id = v_submission) then
    raise exception 'already_transferred';
  end if;
  insert into public.design_handoffs
    (organization_id, project_id, sheet_id, submission_id, brief_id, confirmed_by)
  values (v.organization_id, v.project_id, v.id, v_submission,
          (select b.id from public.design_briefs b where b.project_id = v.project_id
            order by b.number desc limit 1),
          public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.handoff_design_sheet(uuid) from public, anon;
grant execute on function public.handoff_design_sheet(uuid) to authenticated;

-- 10. History ------------------------------------------------------------------------

create table public.design_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- conception.started, creative_call.confirmed, intent.confirmed,
  -- assignment.confirmed, validators.set, reference.added, reference.linked,
  -- creative_direction.submitted / validated / changes_requested / rejected,
  -- creative_brief.version_created, deliverable_sheet.created / updated /
  -- submitted / validated / changes_requested / rejected,
  -- production_handoff.confirmed.
  kind text not null,
  sheet_id uuid,
  subject_id uuid,
  data jsonb not null default '{}'::jsonb,
  actor uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_events_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index design_events_project_idx on public.design_events (project_id, created_at desc);
create index design_events_sheet_idx on public.design_events (sheet_id, created_at desc);
alter table public.design_events enable row level security;
alter table public.design_events force row level security;
revoke all on table public.design_events from anon, authenticated;
grant select on public.design_events to authenticated;
create policy design_events_select on public.design_events
  for select to authenticated using (public.can_see_project(project_id));

create function public.design_log(
  p_org uuid, p_project uuid, p_kind text, p_sheet uuid, p_subject uuid, p_data jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.design_events (organization_id, project_id, kind, sheet_id, subject_id, data, actor)
  values (p_org, p_project, p_kind, p_sheet, p_subject, coalesce(p_data, '{}'::jsonb),
          public.auth_person_id());
$$;
revoke execute on function public.design_log(uuid, uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;

create function public.design_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed text[];
begin
  case tg_table_name
  when 'design_workspaces' then
    perform public.design_log(new.organization_id, new.project_id, 'conception.started', null, null, null);
  when 'design_calls' then
    perform public.design_log(new.organization_id, new.project_id, 'creative_call.confirmed', null,
                              new.call_id, null);
  when 'design_intent_confirmations' then
    perform public.design_log(new.organization_id, new.project_id, 'intent.confirmed', null,
                              new.design_deliverable_id, jsonb_build_object('target', new.target));
  when 'design_assignments' then
    perform public.design_log(new.organization_id, new.project_id, 'assignment.confirmed', new.sheet_id,
                              new.person_id, jsonb_build_object('scope', new.scope));
  when 'design_references' then
    perform public.design_log(new.organization_id, new.project_id, 'reference.added', null, new.id,
                              jsonb_build_object('kind', new.kind,
                                                 'name', coalesce(new.title, new.file_name, new.url)));
  when 'design_reference_links' then
    perform public.design_log(new.organization_id, new.project_id, 'reference.linked', null,
                              new.reference_id,
                              jsonb_build_object('target', new.target,
                                                 'deliverable_id', new.design_deliverable_id));
  when 'design_submissions' then
    if tg_op = 'INSERT' then
      perform public.design_log(new.organization_id, new.project_id,
                                case new.kind when 'direction' then 'creative_direction.submitted'
                                              else 'deliverable_sheet.submitted' end,
                                new.sheet_id, new.id, jsonb_build_object('number', new.number));
    elsif old.status = 'pending' and new.status <> 'pending' then
      perform public.design_log(new.organization_id, new.project_id,
                                case new.kind when 'direction' then 'creative_direction.'
                                              else 'deliverable_sheet.' end || new.status,
                                new.sheet_id, new.id, jsonb_build_object('number', new.number));
    end if;
  when 'design_decisions' then
    perform public.design_log(new.organization_id, new.project_id, 'decision.' || new.decision,
                              (select s.sheet_id from public.design_submissions s
                                where s.id = new.submission_id),
                              new.submission_id,
                              jsonb_build_object('section', new.section, 'comment', new.comment));
  when 'design_briefs' then
    perform public.design_log(new.organization_id, new.project_id, 'creative_brief.version_created',
                              null, new.id, jsonb_build_object('number', new.number));
  when 'design_sheets' then
    if tg_op = 'INSERT' then
      perform public.design_log(new.organization_id, new.project_id, 'deliverable_sheet.created',
                                new.id, new.id, jsonb_build_object('title', new.title));
    else
      select coalesce(array_agg(n.key order by n.key), '{}') into v_changed
        from jsonb_each(to_jsonb(new)) n
        join jsonb_each(to_jsonb(old)) o on o.key = n.key
       where n.value is distinct from o.value
         and n.key not in ('updated_at', 'updated_by', 'provenance');
      if cardinality(v_changed) > 0 then
        perform public.design_log(new.organization_id, new.project_id, 'deliverable_sheet.updated',
                                  new.id, new.id, jsonb_build_object('fields', to_jsonb(v_changed)));
      end if;
    end if;
  when 'design_handoffs' then
    perform public.design_log(new.organization_id, new.project_id, 'production_handoff.confirmed',
                              new.sheet_id, new.submission_id, null);
  end case;
  return null;
end;
$$;
revoke execute on function public.design_events_write() from public, anon, authenticated;

create trigger z_events after insert on public.design_workspaces
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_calls
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_intent_confirmations
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_assignments
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_references
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_reference_links
  for each row execute function public.design_events_write();
create trigger z_events after insert or update of status on public.design_submissions
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_decisions
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_briefs
  for each row execute function public.design_events_write();
create trigger z_events after insert or update on public.design_sheets
  for each row execute function public.design_events_write();
create trigger z_events after insert on public.design_handoffs
  for each row execute function public.design_events_write();
