-- Launch strategy (stage 2): levers, committed deliverables, milestones.
--
-- Text fields (positioning, audiences, narrative) reuse field_values with
-- deliverable = 'strategy'. Rules held by the database (rule 6):
-- - the strategy starts only once the Brief is validated;
-- - it is written only while in progress: submitted or validated, it is frozen;
-- - a deliverable hangs off a selected lever, and a lever with deliverables
--   stays selected;
-- - a call report may carry strategy items (positioning, audiences, narrative,
--   lever), proposed to the owner and never confirmed automatically.

-- ---------------------------------------------------------------------------
-- Call report items: strategy kinds
-- ---------------------------------------------------------------------------

alter table public.report_items drop constraint report_items_kind_check;
alter table public.report_items add constraint report_items_kind_check check (kind in (
  'decided', 'open', 'next_action', 'objective', 'timing', 'frame', 'need', 'team',
  'positioning', 'audiences', 'narrative', 'lever'));

-- need_family is the family of a need or of a lever (same closed taxonomy).
alter table public.report_items drop constraint report_items_family_check;
alter table public.report_items add constraint report_items_family_check check (
  (kind in ('need', 'lever')) = (need_family is not null)
  and (need_family is null or need_family in (
    'creation_content', 'promotion_distribution', 'experiences_activations', 'other')));

-- ---------------------------------------------------------------------------
-- Editability
-- ---------------------------------------------------------------------------

-- The owner writes the strategy while its stage is in progress, never before
-- it starts nor once it is submitted or validated.
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
         and s.state = 'in_progress'
     );
$$;

revoke execute on function public.strategy_is_editable(uuid) from public, anon;
grant execute on function public.strategy_is_editable(uuid) to authenticated;

-- Strategy field values follow the same rule (restrictive: added to the
-- existing owner policy, never replacing it).
create policy field_values_strategy_editable on public.field_values
  as restrictive for insert to authenticated
  with check (deliverable <> 'strategy' or public.strategy_is_editable(project_id));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- needs had no (id, organization_id) key yet: levers reference it.
alter table public.needs add constraint needs_id_org_key unique (id, organization_id);

create table public.levers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  label text not null,
  family text not null,
  -- selected = retenu, rejected = non retenu, to_decide = à arbitrer.
  state text not null default 'to_decide',
  -- The Brief need it answers, if any.
  need_id uuid,
  review_status text not null default 'confirmed',
  source_type text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint levers_label_not_blank check (btrim(label) <> ''),
  constraint levers_family_check check (family in (
    'creation_content', 'promotion_distribution', 'experiences_activations', 'other')),
  constraint levers_state_check check (state in ('selected', 'rejected', 'to_decide')),
  constraint levers_review_check check (review_status in ('proposed', 'confirmed', 'rejected')),
  constraint levers_source_check check (source_type in ('call', 'manual', 'import')),
  constraint levers_call_source check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint levers_id_org_key unique (id, organization_id),
  constraint levers_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint levers_need_same_org
    foreign key (need_id, organization_id) references public.needs (id, organization_id),
  constraint levers_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

create index levers_project_idx on public.levers (project_id, created_at);

create table public.strategy_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  lever_id uuid not null,
  title text not null,
  -- Both optional: a deliverable is committed before it is staffed.
  assignee_person_id uuid references public.people (id),
  due_date date,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_deliverables_title_not_blank check (btrim(title) <> ''),
  constraint strategy_deliverables_id_org_key unique (id, organization_id),
  constraint strategy_deliverables_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint strategy_deliverables_lever_same_org
    foreign key (lever_id, organization_id) references public.levers (id, organization_id)
);

create index strategy_deliverables_project_idx
  on public.strategy_deliverables (project_id, created_at);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null,
  -- Entered by a person: the calendar is never computed nor proposed by PO.
  occurs_on date not null,
  kind text not null default 'other',
  deliverable_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_title_not_blank check (btrim(title) <> ''),
  constraint milestones_kind_check check (kind in (
    'release', 'announcement', 'teaser', 'content', 'live', 'press', 'other')),
  constraint milestones_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  -- Removing a deliverable detaches its milestones instead of refusing.
  constraint milestones_deliverable_same_org
    foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id)
    on delete set null (deliverable_id)
);

create index milestones_project_idx on public.milestones (project_id, occurs_on);

-- ---------------------------------------------------------------------------
-- Consistency triggers
-- ---------------------------------------------------------------------------

-- A lever's need, a deliverable's lever and a milestone's deliverable belong
-- to the same project; a deliverable needs a confirmed, selected lever.
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
    if not exists (
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

create trigger levers_check_links
  before insert or update on public.levers
  for each row execute function public.check_strategy_links();
create trigger strategy_deliverables_check_links
  before insert or update on public.strategy_deliverables
  for each row execute function public.check_strategy_links();
create trigger milestones_check_links
  before insert or update on public.milestones
  for each row execute function public.check_strategy_links();

-- Authorship and timestamps are set by the database, never by the client.
do $$
declare
  t text;
begin
  foreach t in array array['levers', 'strategy_deliverables', 'milestones']
  loop
    execute format('create trigger a_set_created_by before insert on public.%I
                    for each row execute function public.set_created_by()', t);
    execute format('create trigger a_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: members read, the owner writes while the strategy is in progress
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['levers', 'strategy_deliverables', 'milestones']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (public.is_active_member(organization_id))', t || '_select_members', t);
    execute format('create policy %I on public.%I for insert to authenticated
                    with check (public.strategy_is_editable(project_id))', t || '_insert_editable', t);
    execute format('create policy %I on public.%I for update to authenticated
                    using (public.strategy_is_editable(project_id))
                    with check (public.strategy_is_editable(project_id))', t || '_update_editable', t);
  end loop;

  -- Levers are rejected, not deleted (their provenance stays); deliverables
  -- and milestones are plain planning rows and can be removed.
  foreach t in array array['strategy_deliverables', 'milestones']
  loop
    execute format('grant delete on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for delete to authenticated
                    using (public.strategy_is_editable(project_id))', t || '_delete_editable', t);
  end loop;
end;
$$;

grant insert (organization_id, project_id, label, family, state, need_id, review_status,
              source_type, source_report_item_id, source_quote, source_start_seconds)
  on public.levers to authenticated;
grant update (label, family, state, review_status) on public.levers to authenticated;

grant insert (organization_id, project_id, lever_id, title, assignee_person_id, due_date)
  on public.strategy_deliverables to authenticated;
grant update (title, assignee_person_id, due_date) on public.strategy_deliverables to authenticated;

grant insert (organization_id, project_id, title, occurs_on, kind, deliverable_id)
  on public.milestones to authenticated;
grant update (title, occurs_on, kind, deliverable_id) on public.milestones to authenticated;

-- ---------------------------------------------------------------------------
-- Starting the strategy requires a validated Brief
-- ---------------------------------------------------------------------------

create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'not_started' then
    raise exception 'invalid_transition';
  end if;

  select d.key into v_key from public.stage_definitions d where d.id = v_stage.stage_definition_id;
  if v_key = 'launch_strategy' and not exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = v_stage.project_id and d.key = 'framing' and s.state = 'validated') then
    raise exception 'previous_stage_not_validated';
  end if;

  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;
