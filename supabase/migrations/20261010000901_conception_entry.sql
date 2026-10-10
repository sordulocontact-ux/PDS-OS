-- Conception, étape 1 (ticket « Conception », docs/ARCHITECTURE.md § 8 decies):
-- the entry of the Conception, its creative exchanges and the direct work.
--   1. design_workspaces + start_design: « Commencer directement » starts the
--      stage once the Stratégie is validated, and opens the work;
--   2. design_deliverables: the Conception's own list — every deliverable the
--      Stratégie committed to (confirmed, kept in step by a trigger), and the
--      ones added late with their provenance (manual, a decision of the
--      Stratégie, a decision of a call), always « à qualifier »: an addition
--      is never validated nor planned on its own;
--   3. design_calls + create_design_call: a creative exchange, with the
--      deliverables it is about;
--   4. design_sources: a processed creative call or an imported brief, kept
--      once however many deliverables it feeds;
--   5. design_intentions: what a deliverable (or the overall direction) must
--      tell and look like, one answer per topic. PO proposes from a source, a
--      person confirms; the previous answer stays as history (« replaced »);
--   6. design_references: links gathered while working.
-- Who writes: the project owner and its creative team, while the Conception
-- is in progress (design_can_write); the owner alone starts it, prepares its
-- calls and adds deliverables.

-- 0. Who writes ---------------------------------------------------------------

create function public.design_can_write(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.design_is_in_progress(p_project_id)
     and (public.is_project_owner(p_project_id)
          or exists (select 1 from public.project_creatives pc
                     where pc.project_id = p_project_id
                       and pc.person_id = public.auth_person_id()));
$$;
revoke execute on function public.design_can_write(uuid) from public, anon;
grant execute on function public.design_can_write(uuid) to authenticated;

-- The Conception can still take a deliverable or a call: the Stratégie is
-- validated and the Conception is neither submitted nor validated.
create function public.design_is_open(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.project_stages s
           join public.stage_definitions d on d.id = s.stage_definition_id
           where s.project_id = p_project_id and d.key = 'launch_strategy'
             and s.state = 'validated')
     and exists (
           select 1 from public.project_stages s
           join public.stage_definitions d on d.id = s.stage_definition_id
           where s.project_id = p_project_id and d.key = 'design'
             and s.state in ('not_started', 'in_progress'));
$$;
revoke execute on function public.design_is_open(uuid) from public, anon;
grant execute on function public.design_is_open(uuid) to authenticated;

-- 1. Workspace ---------------------------------------------------------------

create table public.design_workspaces (
  project_id uuid primary key,
  organization_id uuid not null,
  started_at timestamptz not null default now(),
  started_by uuid references public.people (id),
  constraint design_workspaces_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.design_workspaces enable row level security;
alter table public.design_workspaces force row level security;
revoke all on table public.design_workspaces from anon, authenticated;
-- Written by start_design only.
grant select on public.design_workspaces to authenticated;
create policy design_workspaces_select_visible on public.design_workspaces
  for select to authenticated using (public.can_see_project(project_id));

-- A Conception already worked on before this migration is started.
insert into public.design_workspaces (project_id, organization_id, started_at)
select s.project_id, s.organization_id, coalesce(s.state_changed_at, now())
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where d.key = 'design' and s.state <> 'not_started'
on conflict (project_id) do nothing;

-- « Commencer directement »: owner only, once the Stratégie is validated.
-- Starts the stage when it has not started yet; starting twice is harmless
-- (a creative call processed first may already have).
create function public.start_design(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_stage public.project_stages%rowtype;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = 'launch_strategy'
      and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;
  select s.* into v_stage from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.project_id = p_project_id and d.key = 'design'
   for update of s;
  if not found then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state = 'not_started' then
    update public.project_stages
       set state = 'in_progress', state_changed_at = now(),
           state_changed_by = public.auth_person_id()
     where id = v_stage.id;
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  insert into public.design_workspaces (project_id, organization_id, started_at, started_by)
  values (p_project_id, v_org, now(), public.auth_person_id())
  on conflict (project_id) do nothing;
end;
$$;
revoke execute on function public.start_design(uuid) from public, anon;
grant execute on function public.start_design(uuid) to authenticated;

-- 2. Deliverables of the Conception ------------------------------------------

create table public.design_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- origin = 'strategy': the committed deliverable it mirrors (its title,
  -- lever, quantity and due date are read there, never copied).
  strategy_deliverable_id uuid unique,
  title text,
  -- strategy = engagé par la Stratégie; manual = ajout manuel;
  -- strategy_decision = décision de Stratégie (a retained lever);
  -- call = décision de call.
  origin text not null,
  -- confirmed = engagé; to_qualify = à qualifier. Not writable by a person:
  -- an addition is never confirmed on its own.
  status text not null default 'to_qualify',
  lever_id uuid,
  call_id uuid,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_deliverables_origin_check
    check (origin in ('strategy', 'manual', 'strategy_decision', 'call')),
  constraint design_deliverables_status_check check (status in ('confirmed', 'to_qualify')),
  constraint design_deliverables_strategy_link
    check ((origin = 'strategy') = (strategy_deliverable_id is not null)),
  constraint design_deliverables_strategy_confirmed
    check (origin <> 'strategy' or status = 'confirmed'),
  constraint design_deliverables_title_check
    check (origin = 'strategy'
           or (btrim(coalesce(title, '')) <> '' and char_length(title) <= 200)),
  constraint design_deliverables_lever_check
    check ((origin = 'strategy_decision') = (lever_id is not null)),
  constraint design_deliverables_call_check check ((origin = 'call') = (call_id is not null)),
  constraint design_deliverables_note_check check (note is null or char_length(note) <= 1000),
  constraint design_deliverables_id_org_key unique (id, organization_id),
  constraint design_deliverables_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_deliverables_strategy_same_org
    foreign key (strategy_deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete cascade,
  constraint design_deliverables_lever_same_org foreign key (lever_id, organization_id)
    references public.levers (id, organization_id) on delete cascade,
  constraint design_deliverables_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade
);
create index design_deliverables_project_idx on public.design_deliverables (project_id, created_at);

create trigger a_set_created_by before insert on public.design_deliverables
  for each row execute function public.set_created_by();

-- An addition's lever is a retained lever of the project, its call one of
-- the project's calls.
create function public.design_deliverables_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lever_id is not null and not exists (
    select 1 from public.levers l
    where l.id = new.lever_id and l.project_id = new.project_id
      and l.state = 'selected' and l.review_status = 'confirmed') then
    raise exception 'lever_not_selected' using errcode = '23514';
  end if;
  if new.call_id is not null and not exists (
    select 1 from public.calls c where c.id = new.call_id and c.project_id = new.project_id) then
    raise exception 'call_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert on public.design_deliverables
  for each row execute function public.design_deliverables_check();

-- Every committed deliverable of the Stratégie has its line, now and later.
create function public.design_deliverables_mirror()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.design_deliverables
    (organization_id, project_id, strategy_deliverable_id, origin, status, created_by)
  values (new.organization_id, new.project_id, new.id, 'strategy', 'confirmed', new.created_by)
  on conflict (strategy_deliverable_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.design_deliverables_mirror() from public, anon, authenticated;
create trigger z_design_mirror after insert on public.strategy_deliverables
  for each row execute function public.design_deliverables_mirror();

insert into public.design_deliverables
  (organization_id, project_id, strategy_deliverable_id, origin, status, created_by, created_at)
select d.organization_id, d.project_id, d.id, 'strategy', 'confirmed', d.created_by, d.created_at
  from public.strategy_deliverables d
on conflict (strategy_deliverable_id) do nothing;

alter table public.design_deliverables enable row level security;
alter table public.design_deliverables force row level security;
revoke all on table public.design_deliverables from anon, authenticated;
grant select, delete on public.design_deliverables to authenticated;
grant insert (organization_id, project_id, title, origin, lever_id, call_id, note)
  on public.design_deliverables to authenticated;
create policy design_deliverables_select_visible on public.design_deliverables
  for select to authenticated using (public.can_see_project(project_id));
-- An addition, by the owner, while the Conception is open.
create policy design_deliverables_insert_owner on public.design_deliverables
  for insert to authenticated
  with check (origin <> 'strategy'
              and public.is_active_member(organization_id)
              and public.is_project_owner(project_id)
              and public.design_is_open(project_id));
-- An addition still to qualify can be taken back by the owner.
create policy design_deliverables_delete_owner on public.design_deliverables
  for delete to authenticated
  using (origin <> 'strategy' and status = 'to_qualify'
         and public.is_project_owner(project_id)
         and public.design_is_open(project_id));

-- 3. Creative calls ----------------------------------------------------------

create table public.design_calls (
  call_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  purpose text not null,
  participants jsonb not null default '[]'::jsonb,
  -- video = visio, in_person = sur place, phone = téléphone.
  format text not null,
  -- The Conception's deliverables the exchange is about.
  deliverable_ids uuid[] not null default '{}',
  -- Read by framing_calls_check(): a creative call takes no document.
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint design_calls_purpose_check
    check (btrim(purpose) <> '' and char_length(purpose) <= 500),
  constraint design_calls_participants_check
    check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 30),
  constraint design_calls_format_check check (format in ('video', 'in_person', 'phone')),
  constraint design_calls_deliverables_check check (cardinality(deliverable_ids) <= 50),
  constraint design_calls_documents_check check (cardinality(document_ids) = 0),
  constraint design_calls_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade,
  constraint design_calls_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index design_calls_project_idx on public.design_calls (project_id);
alter table public.design_calls enable row level security;
alter table public.design_calls force row level security;
revoke all on table public.design_calls from anon, authenticated;
grant select on public.design_calls to authenticated;
grant insert (call_id, organization_id, project_id, purpose, participants, format, deliverable_ids)
  on public.design_calls to authenticated;
create policy design_calls_select_visible on public.design_calls
  for select to authenticated using (public.can_see_project(project_id));
create policy design_calls_insert_owner on public.design_calls
  for insert to authenticated
  with check (public.is_project_owner(project_id)
              and exists (select 1 from public.calls c
                          where c.id = design_calls.call_id
                            and c.project_id = design_calls.project_id));

create trigger a_check before insert on public.design_calls
  for each row execute function public.framing_calls_check();

create function public.design_calls_deliverables_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.deliverable_ids) d
             where not exists (select 1 from public.design_deliverables x
                               where x.id = d and x.project_id = new.project_id)) then
    raise exception 'deliverable_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_deliverables before insert on public.design_calls
  for each row execute function public.design_calls_deliverables_check();

-- « Créer l'échange »: the call and its creative details in one transaction,
-- with the caller's rights (the owner writes the project's calls). Only
-- while the Conception is open.
create function public.create_design_call(
  p_project_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb,
  p_purpose text,
  p_participants jsonb,
  p_format text,
  p_deliverable_ids uuid[])
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
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not public.design_is_open(p_project_id) then
    raise exception 'stage_locked';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;

  insert into public.calls (organization_id, project_id, title, occurred_at, meeting_url,
                            consent, agenda, duration_minutes)
  values (v_org, p_project_id, p_title, p_occurred_at,
          case when p_format = 'video' then nullif(btrim(p_meeting_url), '') end,
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;

  insert into public.design_calls
    (call_id, organization_id, project_id, purpose, participants, format, deliverable_ids)
  values (v_call, v_org, p_project_id, p_purpose, coalesce(p_participants, '[]'::jsonb),
          p_format, coalesce(p_deliverable_ids, '{}'));
  return v_call;
end;
$$;
revoke execute on function public.create_design_call(uuid, text, timestamptz, text, jsonb, text, jsonb, text, uuid[])
  from public, anon;
grant execute on function public.create_design_call(uuid, text, timestamptz, text, jsonb, text, jsonb, text, uuid[])
  to authenticated;

-- 4. Sources -----------------------------------------------------------------

create table public.design_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- call = a processed creative call (transcript, report, decisions,
  -- actions); import = a brief that existed elsewhere, pasted as text.
  kind text not null,
  call_id uuid unique,
  title text not null,
  -- import: the brief's text, data only (never an instruction to PO).
  body text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_sources_kind_check check (kind in ('call', 'import')),
  constraint design_sources_call_check check ((kind = 'call') = (call_id is not null)),
  constraint design_sources_body_check
    check ((kind = 'import') = (body is not null)
           and (body is null or (btrim(body) <> '' and char_length(body) <= 30000))),
  constraint design_sources_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint design_sources_id_org_key unique (id, organization_id),
  constraint design_sources_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_sources_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade
);
create index design_sources_project_idx on public.design_sources (project_id, created_at);
create trigger a_set_created_by before insert on public.design_sources
  for each row execute function public.set_created_by();

create function public.design_sources_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.call_id is not null and not exists (
    select 1 from public.calls c where c.id = new.call_id and c.project_id = new.project_id) then
    raise exception 'call_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert on public.design_sources
  for each row execute function public.design_sources_check();

alter table public.design_sources enable row level security;
alter table public.design_sources force row level security;
revoke all on table public.design_sources from anon, authenticated;
grant select on public.design_sources to authenticated;
grant insert (organization_id, project_id, kind, call_id, title, body)
  on public.design_sources to authenticated;
create policy design_sources_select_visible on public.design_sources
  for select to authenticated using (public.can_see_project(project_id));
create policy design_sources_insert_writer on public.design_sources
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and public.design_can_write(project_id));

-- 5. Intentions --------------------------------------------------------------

create table public.design_intentions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- direction = the overall creative direction; deliverable = one
  -- deliverable; unassigned = PO could not tell which (a proposal only,
  -- attached by a person when confirmed).
  target text not null,
  design_deliverable_id uuid,
  -- story = ce qu'il raconte; look = à quoi il ressemble; tone = ton et
  -- émotion; musts = incontournables et interdits (lib/design/intentions.ts).
  topic text not null,
  value text not null,
  -- replaced = a confirmed answer since replaced by another (history).
  status text not null default 'proposed',
  source_type text not null default 'manual',
  source_id uuid,
  source_report_item_id uuid,
  source_quote text,
  reviewed_by uuid references public.people (id),
  reviewed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_intentions_target_check
    check (target in ('direction', 'deliverable', 'unassigned')),
  constraint design_intentions_target_link
    check ((target = 'deliverable') = (design_deliverable_id is not null)),
  constraint design_intentions_topic_check check (topic in ('story', 'look', 'tone', 'musts')),
  constraint design_intentions_value_check
    check (btrim(value) <> '' and char_length(value) <= 2000),
  constraint design_intentions_status_check
    check (status in ('proposed', 'confirmed', 'rejected', 'replaced')),
  constraint design_intentions_unassigned_check
    check (target <> 'unassigned' or status in ('proposed', 'rejected')),
  constraint design_intentions_source_type_check
    check (source_type in ('manual', 'call', 'import')),
  constraint design_intentions_source_check
    check ((source_type = 'manual') = (source_id is null)
           and (source_type = 'manual' or btrim(coalesce(source_quote, '')) <> '')),
  constraint design_intentions_quote_check
    check (source_quote is null or char_length(source_quote) <= 1000),
  constraint design_intentions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_intentions_deliverable_same_org
    foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade,
  constraint design_intentions_source_same_org foreign key (source_id, organization_id)
    references public.design_sources (id, organization_id) on delete cascade,
  constraint design_intentions_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
    on delete set null (source_report_item_id)
);
create index design_intentions_project_idx on public.design_intentions (project_id, created_at);
-- One confirmed answer per topic of a target.
create unique index design_intentions_confirmed_key on public.design_intentions
  (project_id, target,
   coalesce(design_deliverable_id, '00000000-0000-0000-0000-000000000000'::uuid), topic)
  where status = 'confirmed';

create trigger a_set_created_by before insert on public.design_intentions
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.design_intentions
  for each row execute function public.set_updated_at();

create function public.design_intentions_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.design_deliverable_id is not null and not exists (
    select 1 from public.design_deliverables d
    where d.id = new.design_deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = '23514';
  end if;
  if new.source_id is not null and not exists (
    select 1 from public.design_sources s
    where s.id = new.source_id and s.project_id = new.project_id
      and s.kind = new.source_type) then
    raise exception 'source_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert or update on public.design_intentions
  for each row execute function public.design_intentions_check();

alter table public.design_intentions enable row level security;
alter table public.design_intentions force row level security;
revoke all on table public.design_intentions from anon, authenticated;
grant select on public.design_intentions to authenticated;
-- PO's proposals, written with the session of the person who asked (an
-- import, a processed call): always « proposed », always sourced. Answers
-- and decisions go through the functions below.
grant insert (organization_id, project_id, target, design_deliverable_id, topic, value,
              source_type, source_id, source_report_item_id, source_quote)
  on public.design_intentions to authenticated;
create policy design_intentions_select_visible on public.design_intentions
  for select to authenticated using (public.can_see_project(project_id));
create policy design_intentions_insert_proposal on public.design_intentions
  for insert to authenticated
  with check (status = 'proposed' and source_type <> 'manual'
              and public.is_active_member(organization_id)
              and public.design_can_write(project_id));

-- A person's answer to one question: it becomes the confirmed answer, the
-- previous one is kept as history.
create function public.save_design_intention(
  p_project_id uuid,
  p_deliverable_id uuid,
  p_topic text,
  p_value text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_target text := case when p_deliverable_id is null then 'direction' else 'deliverable' end;
  v_id uuid;
begin
  if not public.design_can_write(p_project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || coalesce(p_deliverable_id::text, '') || p_topic));
  update public.design_intentions
     set status = 'replaced'
   where project_id = p_project_id and target = v_target
     and design_deliverable_id is not distinct from p_deliverable_id
     and topic = p_topic and status = 'confirmed';
  insert into public.design_intentions
    (organization_id, project_id, target, design_deliverable_id, topic, value, status,
     source_type, reviewed_by, reviewed_at)
  values (v_org, p_project_id, v_target, p_deliverable_id, p_topic, btrim(p_value),
          'confirmed', 'manual', public.auth_person_id(), now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.save_design_intention(uuid, uuid, text, text) from public, anon;
grant execute on function public.save_design_intention(uuid, uuid, text, text) to authenticated;

-- A decision on PO's proposal: confirmed (attached to a deliverable or to the
-- direction when PO could not tell, possibly reworded first) or set aside.
-- p_target: 'direction', 'deliverable' (with p_deliverable_id) or null to
-- keep the proposal's own.
create function public.review_design_intention(
  p_intention_id uuid,
  p_accept boolean,
  p_target text default null,
  p_deliverable_id uuid default null,
  p_value text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_intentions%rowtype;
  v_target text;
  v_deliverable uuid;
begin
  select * into v from public.design_intentions where id = p_intention_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'intention_not_found';
  end if;
  if not public.design_can_write(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'proposed' then
    raise exception 'invalid_transition';
  end if;

  if not p_accept then
    update public.design_intentions
       set status = 'rejected', reviewed_by = public.auth_person_id(), reviewed_at = now()
     where id = v.id;
    return;
  end if;

  v_target := coalesce(p_target, v.target);
  v_deliverable := case when v_target = 'deliverable'
                        then coalesce(p_deliverable_id, v.design_deliverable_id) end;
  if v_target not in ('direction', 'deliverable')
     or (v_target = 'deliverable' and v_deliverable is null) then
    raise exception 'target_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v.project_id::text || coalesce(v_deliverable::text, '') || v.topic));
  update public.design_intentions
     set status = 'replaced'
   where project_id = v.project_id and target = v_target
     and design_deliverable_id is not distinct from v_deliverable
     and topic = v.topic and status = 'confirmed';
  update public.design_intentions
     set status = 'confirmed', target = v_target, design_deliverable_id = v_deliverable,
         value = coalesce(nullif(btrim(coalesce(p_value, '')), ''), v.value),
         reviewed_by = public.auth_person_id(), reviewed_at = now()
   where id = v.id;
end;
$$;
revoke execute on function public.review_design_intention(uuid, boolean, text, uuid, text) from public, anon;
grant execute on function public.review_design_intention(uuid, boolean, text, uuid, text) to authenticated;

-- 6. References ---------------------------------------------------------------

create table public.design_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- Null: a reference of the overall direction.
  design_deliverable_id uuid,
  url text not null,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint design_references_url_check
    check (url ~ '^https://[^\s]+$' and char_length(url) <= 2000),
  constraint design_references_note_check check (note is null or char_length(note) <= 500),
  constraint design_references_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_references_deliverable_same_org
    foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade
);
create index design_references_project_idx on public.design_references (project_id, created_at);
create trigger a_set_created_by before insert on public.design_references
  for each row execute function public.set_created_by();

create function public.design_references_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.design_deliverable_id is not null and not exists (
    select 1 from public.design_deliverables d
    where d.id = new.design_deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check before insert on public.design_references
  for each row execute function public.design_references_check();

alter table public.design_references enable row level security;
alter table public.design_references force row level security;
revoke all on table public.design_references from anon, authenticated;
grant select, delete on public.design_references to authenticated;
grant insert (organization_id, project_id, design_deliverable_id, url, note)
  on public.design_references to authenticated;
create policy design_references_select_visible on public.design_references
  for select to authenticated using (public.can_see_project(project_id));
create policy design_references_insert_writer on public.design_references
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and public.design_can_write(project_id));
create policy design_references_delete_writer on public.design_references
  for delete to authenticated
  using (public.design_can_write(project_id)
         and (created_by = public.auth_person_id() or public.is_project_owner(project_id)));
