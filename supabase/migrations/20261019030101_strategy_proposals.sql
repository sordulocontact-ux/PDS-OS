-- Stratégie as in the proto « Projet complet » (lot 3, 19/10/2026):
-- PO also proposes deliverables, milestones and objectives from a strategy
-- exchange, each decided one by one (Confirmer / Modifier / Écarter,
-- VISION-UX rules 11, 12, 21). docs/ARCHITECTURE.md § 6 bis, « Lot 3 ».
--
-- Why a table of its own rather than a review status on
-- strategy_deliverables / milestones / strategy_objectives: an inserted
-- deliverable is mirrored at once into the Conception (z_design_mirror) and
-- read by a dozen lists of other modules (Activations, Production, Planning,
-- Travail…). A proposal must reach none of them until a person keeps it, and
-- what was set aside must stay visible, struck through. So a proposal lives
-- here, with its quote and who decided; keeping it creates the real row
-- (item_id), setting it aside removes that row and keeps the proposal.
--
-- Also: a deliverable may be « Hors levier » (the proto's Pochette), and the
-- call report gets three kinds (deliverable, milestone, kpi).

-- 1. A deliverable without lever ------------------------------------------
alter table public.strategy_deliverables alter column lever_id drop not null;

create or replace function public.check_strategy_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'levers' then
    if new.need_id is not null and not exists (
      select 1 from public.needs n where n.id = new.need_id and n.project_id = new.project_id) then
      raise exception 'need_not_in_project';
    end if;
    -- Leaving "selected" (or being rejected) is refused while deliverables hang off it.
    if tg_op = 'UPDATE'
       and (new.state <> 'selected' or new.review_status <> 'confirmed')
       and exists (select 1 from public.strategy_deliverables d where d.lever_id = new.id) then
      raise exception 'lever_has_deliverables';
    end if;
  elsif tg_table_name = 'strategy_deliverables' then
    -- « Hors levier » is allowed; a lever named must be retained.
    if new.lever_id is not null and not exists (
      select 1 from public.levers l
      where l.id = new.lever_id and l.project_id = new.project_id
        and l.state = 'selected' and l.review_status = 'confirmed') then
      raise exception 'lever_not_selected';
    end if;
  elsif tg_table_name = 'milestones' then
    if new.deliverable_id is not null and not exists (
      select 1 from public.strategy_deliverables d
      where d.id = new.deliverable_id and d.project_id = new.project_id) then
      raise exception 'deliverable_not_in_project';
    end if;
  end if;
  return new;
end;
$$;

-- 2. Three more kinds in a call report, added to the list in place --------
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.report_items'::regclass
     and conname = 'report_items_kind_check';
  select coalesce(array_agg(distinct m[1]), '{}') into v_kinds
    from regexp_matches(coalesce(v_def, ''), '''([a-z][a-z0-9_]*)''', 'g') as m;
  select array_agg(distinct k order by k) into v_kinds
    from unnest(v_kinds || array['deliverable', 'milestone', 'kpi']) as k;
  alter table public.report_items drop constraint if exists report_items_kind_check;
  execute format(
    'alter table public.report_items add constraint report_items_kind_check
       check (kind = any (%L::text[]))', v_kinds);
end;
$$;

-- 3. PO's proposals of deliverables, milestones and objectives ------------
create table public.strategy_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  kind text not null check (kind in ('deliverable', 'milestone', 'objective')),
  -- The words as they stand (reworded by a person), and as first written.
  text text not null check (btrim(text) <> '' and char_length(text) <= 300),
  proposed_text text not null check (btrim(proposed_text) <> '' and char_length(proposed_text) <= 300),
  format text check (format is null or (btrim(format) <> '' and char_length(format) <= 80)),
  -- A milestone's day relative to the release (J-14 = -14), computed by code
  -- from the sentence said, never by the model (rule 6).
  offset_days integer check (offset_days is null or offset_days between -365 and 365),
  milestone_kind text check (milestone_kind is null or milestone_kind in
    ('release', 'announcement', 'teaser', 'content', 'live', 'press', 'delivery',
     'validation', 'publication', 'other')),
  state text not null default 'proposed' check (state in ('proposed', 'kept', 'discarded')),
  source_type text not null default 'call' check (source_type in ('call', 'manual')),
  source_report_item_id uuid,
  source_quote text check (source_quote is null or char_length(source_quote) <= 2000),
  source_start_seconds numeric,
  -- The row created in its table once kept.
  item_id uuid,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint strategy_proposals_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint strategy_proposals_item_same_org foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id) on delete cascade,
  constraint strategy_proposals_call_source check (
    source_type <> 'call' or (source_report_item_id is not null and source_quote is not null)),
  constraint strategy_proposals_milestone_day check (kind <> 'milestone' or offset_days is not null),
  constraint strategy_proposals_proposed_free check (state <> 'proposed' or item_id is null),
  constraint strategy_proposals_decided check ((state = 'proposed') = (decided_at is null))
);
create unique index strategy_proposals_item_once
  on public.strategy_proposals (source_report_item_id) where source_report_item_id is not null;
create index strategy_proposals_project on public.strategy_proposals (project_id, created_at);

create trigger a_set_created_by before insert on public.strategy_proposals
  for each row execute function public.set_created_by();

alter table public.strategy_proposals enable row level security;
alter table public.strategy_proposals force row level security;
revoke all on table public.strategy_proposals from anon, authenticated;
grant select on public.strategy_proposals to authenticated;
-- Only PO's import inserts directly (with the owner's session, while the
-- strategy is open); every decision goes through the functions below.
grant insert (organization_id, project_id, kind, text, proposed_text, format, offset_days,
              milestone_kind, source_type, source_report_item_id, source_quote,
              source_start_seconds)
  on public.strategy_proposals to authenticated;

create policy strategy_proposals_select_visible on public.strategy_proposals
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_proposals_insert_editable on public.strategy_proposals
  for insert to authenticated
  with check (public.strategy_is_editable(project_id) and source_type = 'call'
              and state = 'proposed' and item_id is null);

-- The reference day of the release (lib/strategy/calendar.ts referenceDate):
-- the planned release date, else the project's due date.
create or replace function public.strategy_reference_date(p_project_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.planned_release_date from public.releases r
      where r.project_id = p_project_id order by r.created_at limit 1),
    (select p.due_date from public.projects p where p.id = p_project_id));
$$;
revoke execute on function public.strategy_reference_date(uuid) from public, anon;
grant execute on function public.strategy_reference_date(uuid) to authenticated;

-- Creates the real row of a kept proposal, with the user's rights (the
-- function runs as its caller's check, strategy_is_editable, done before).
create or replace function public.strategy_proposal_item(
  p_proposal public.strategy_proposals,
  p_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_day date;
begin
  if p_proposal.kind = 'deliverable' then
    insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, format, created_by)
    values (p_proposal.organization_id, p_proposal.project_id, null, p_text, p_proposal.format,
            public.auth_person_id())
    returning id into v_id;
  elsif p_proposal.kind = 'milestone' then
    v_day := public.strategy_reference_date(p_proposal.project_id);
    if v_day is null then
      raise exception 'release_date_required' using errcode = '23514';
    end if;
    insert into public.milestones (organization_id, project_id, title, occurs_on, kind, channel, created_by)
    values (p_proposal.organization_id, p_proposal.project_id, p_text,
            v_day + p_proposal.offset_days, coalesce(p_proposal.milestone_kind, 'other'),
            case coalesce(p_proposal.milestone_kind, 'other')
              when 'release' then 'release' when 'live' then 'live' when 'press' then 'press'
              when 'other' then 'other' else 'organic' end,
            public.auth_person_id())
    returning id into v_id;
  else
    insert into public.strategy_objectives (organization_id, project_id, label, kind, source, created_by)
    values (p_proposal.organization_id, p_proposal.project_id, left(p_text, 200), 'qualitative',
            'manual', public.auth_person_id())
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.strategy_proposal_item(public.strategy_proposals, text)
  from public, anon, authenticated;

-- Removes the real row of a proposal set aside (or of an item never proposed).
create or replace function public.strategy_item_remove(p_kind text, p_project_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'deliverable' then
    delete from public.strategy_deliverables where id = p_item_id and project_id = p_project_id;
  elsif p_kind = 'milestone' then
    delete from public.milestones where id = p_item_id and project_id = p_project_id;
  else
    delete from public.strategy_objectives where id = p_item_id and project_id = p_project_id;
  end if;
end;
$$;
revoke execute on function public.strategy_item_remove(text, uuid, uuid)
  from public, anon, authenticated;

/**
 * « Confirmer » (p_keep, the words as they are or reworded: p_text) or
 * « Écarter » a proposal. Owner only, while the strategy is open. Keeping
 * creates its row (a deliverable « Hors levier », a milestone at its day
 * from the release, an objective); rewording a kept one renames its row;
 * setting it aside removes the row and keeps the proposal, struck through.
 */
create or replace function public.decide_strategy_proposal(
  p_proposal_id uuid,
  p_keep boolean,
  p_text text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.strategy_proposals%rowtype;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_item uuid;
begin
  select * into v_p from public.strategy_proposals where id = p_proposal_id for update;
  if not found or not public.can_see_project(v_p.project_id) then
    raise exception 'item_not_found';
  end if;
  if not public.strategy_is_editable(v_p.project_id) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if v_text is not null and char_length(v_text) > 300 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  if p_keep then
    v_text := coalesce(v_text, v_p.text);
    v_item := v_p.item_id;
    if v_item is null then
      v_item := public.strategy_proposal_item(v_p, v_text);
    elsif v_text is distinct from v_p.text then
      if v_p.kind = 'deliverable' then
        update public.strategy_deliverables set title = v_text where id = v_item;
      elsif v_p.kind = 'milestone' then
        update public.milestones set title = v_text where id = v_item;
      else
        update public.strategy_objectives set label = left(v_text, 200) where id = v_item;
      end if;
    end if;
    update public.strategy_proposals
       set state = 'kept', text = v_text, item_id = v_item,
           decided_by = public.auth_person_id(), decided_at = now()
     where id = p_proposal_id;
    return;
  end if;

  if v_p.item_id is not null then
    perform public.strategy_item_remove(v_p.kind, v_p.project_id, v_p.item_id);
  end if;
  update public.strategy_proposals
     set state = 'discarded', item_id = null,
         decided_by = public.auth_person_id(), decided_at = now()
   where id = p_proposal_id;
end;
$$;
revoke execute on function public.decide_strategy_proposal(uuid, boolean, text) from public, anon;
grant execute on function public.decide_strategy_proposal(uuid, boolean, text) to authenticated;

/**
 * « Ajouter un livrable / un temps fort / un objectif » in its dimension: a
 * person's own line, kept at once (« Saisi par … »), with its row.
 */
create or replace function public.add_strategy_item(
  p_project_id uuid,
  p_kind text,
  p_text text,
  p_format text default null,
  p_offset_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.strategy_proposals%rowtype;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if not public.strategy_is_editable(p_project_id) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if v_text is null or p_kind not in ('deliverable', 'milestone', 'objective') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.strategy_proposals
    (organization_id, project_id, kind, text, proposed_text, format, offset_days,
     milestone_kind, state, source_type, decided_by, decided_at)
  select p.organization_id, p.id, p_kind, v_text, v_text,
         case when p_kind = 'deliverable' then nullif(btrim(coalesce(p_format, '')), '') end,
         case when p_kind = 'milestone' then p_offset_days end,
         case when p_kind = 'milestone' then 'other' end,
         'kept', 'manual', public.auth_person_id(), now()
    from public.projects p where p.id = p_project_id
  returning * into v_p;
  update public.strategy_proposals
     set item_id = public.strategy_proposal_item(v_p, v_text)
   where id = v_p.id;
  return v_p.id;
end;
$$;
revoke execute on function public.add_strategy_item(uuid, text, text, text, integer) from public, anon;
grant execute on function public.add_strategy_item(uuid, text, text, text, integer) to authenticated;

/**
 * « Écarter » a deliverable, a milestone or an objective entered before the
 * proposals (no line here yet): it leaves its table and stays visible,
 * struck through, as a line set aside; « Confirmer » brings it back.
 */
create or replace function public.discard_strategy_item(p_kind text, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_project uuid;
  v_text text;
  v_format text;
  v_offset integer;
begin
  if p_kind = 'deliverable' then
    select organization_id, project_id, title, format into v_org, v_project, v_text, v_format
      from public.strategy_deliverables where id = p_item_id;
  elsif p_kind = 'milestone' then
    select m.organization_id, m.project_id, m.title,
           m.occurs_on - public.strategy_reference_date(m.project_id)
      into v_org, v_project, v_text, v_offset
      from public.milestones m where m.id = p_item_id;
    v_offset := coalesce(v_offset, 0);
  elsif p_kind = 'objective' then
    select organization_id, project_id, label into v_org, v_project, v_text
      from public.strategy_objectives where id = p_item_id;
  end if;
  if v_project is null or not public.can_see_project(v_project) then
    raise exception 'item_not_found';
  end if;
  if not public.strategy_is_editable(v_project) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if exists (select 1 from public.strategy_proposals where item_id = p_item_id) then
    raise exception 'invalid_transition';
  end if;
  perform public.strategy_item_remove(p_kind, v_project, p_item_id);
  insert into public.strategy_proposals
    (organization_id, project_id, kind, text, proposed_text, format, offset_days, state,
     source_type, decided_by, decided_at)
  values (v_org, v_project, p_kind, v_text, v_text, v_format,
          case when p_kind = 'milestone' then greatest(-365, least(365, v_offset)) end,
          'discarded', 'manual', public.auth_person_id(), now());
end;
$$;
revoke execute on function public.discard_strategy_item(text, uuid) from public, anon;
grant execute on function public.discard_strategy_item(text, uuid) to authenticated;

-- 4. Who decided a lever, and PO's words before a person reworded them -----
alter table public.levers
  add column decided_by uuid references public.people (id),
  add column decided_at timestamptz,
  add column proposed_label text check (proposed_label is null or char_length(proposed_label) <= 200);
grant select (decided_by, decided_at, proposed_label) on public.levers to authenticated;

create or replace function public.levers_decided()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- PO's words, kept for « Proposé : … » once reworded.
    if new.review_status = 'proposed' then
      new.proposed_label := new.label;
    elsif new.state <> 'to_decide' then
      new.decided_by := public.auth_person_id();
      new.decided_at := now();
    end if;
  elsif new.review_status is distinct from old.review_status
        or new.state is distinct from old.state then
    new.decided_by := public.auth_person_id();
    new.decided_at := now();
  end if;
  return new;
end;
$$;
create trigger b_decided before insert or update on public.levers
  for each row execute function public.levers_decided();

-- 5. The Brief de sortie validated: the project's creative directors and
-- its owner are told (proto: « Ensuite : … Conception › Accueil »).
select public.add_notification_kinds(array['strategy_validated']);

create or replace function public.strategy_documents_validated_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if new.kind <> 'brief' or new.state <> 'approved' or old.state = 'approved' then
    return null;
  end if;
  for v_person in
    select p.owner_person_id from public.projects p where p.id = new.project_id
    union
    select c.person_id from public.project_creatives c where c.project_id = new.project_id
  loop
    perform public.notify(new.organization_id, v_person, 'strategy_validated',
                          new.project_id, new.id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.strategy_documents_validated_notify() from public, anon, authenticated;
create trigger z_notify_validated after update of state on public.strategy_documents
  for each row execute function public.strategy_documents_validated_notify();
