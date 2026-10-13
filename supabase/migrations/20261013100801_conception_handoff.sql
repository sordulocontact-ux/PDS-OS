-- MKT-C2-13: closing the Conception and passing to Production
-- (docs/ARCHITECTURE.md § 8 decies, lot C12).
--   * the closing references the exact Brief créatif validated: recorded
--     when the Conception stage becomes validated (design_workspaces);
--   * « Passer en Production » (the owner, once the Conception is
--     validated): hands over every validated sheet that is current and not
--     excluded, against that Brief, starts the Production stage, and turns
--     each reserve of an approval into a Travail task (owner and due date).
--     Excluding a deliverable needs a reason; its work stays in Conception.
--     Idempotent: a second run creates no handoff, task nor stage twice;
--   * a sheet asked to change or refused is not handed: it stays in
--     Conception with its status (a reserve of an approval never blocks: an
--     approval with reserves is an approval, MKT-C2-11);
--   * reopening: the direction only (holder of 'validate'), with a reason;
--     the impact (deliverables already in Production) is kept, the stage
--     goes back to « En cours » for a new validation, and nothing approved
--     is rewritten — briefs, decisions and handoffs stay as they were.

-- 1. The closing ------------------------------------------------------------

alter table public.design_workspaces
  add column closed_brief_id uuid references public.design_briefs (id) on delete set null,
  add column closed_at timestamptz;

create function public.design_stage_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = 'validated' and old.state <> 'validated' and exists (
    select 1 from public.stage_definitions d
     where d.id = new.stage_definition_id and d.key = 'design') then
    update public.design_workspaces w
       set closed_brief_id = (select b.id from public.design_briefs b
                               where b.project_id = new.project_id
                               order by b.number desc limit 1),
           closed_at = now()
     where w.project_id = new.project_id;
  end if;
  return null;
end;
$$;
revoke execute on function public.design_stage_closed() from public, anon, authenticated;

create trigger z_design_closed after update of state on public.project_stages
  for each row execute function public.design_stage_closed();

-- 2. Exclusions from the transfer -------------------------------------------

create table public.design_handoff_exclusions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  design_deliverable_id uuid not null unique,
  reason text not null,
  excluded_by uuid references public.people (id),
  excluded_at timestamptz not null default now(),
  constraint design_handoff_exclusions_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint design_handoff_exclusions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint design_handoff_exclusions_deliverable_same_org
    foreign key (design_deliverable_id, organization_id)
    references public.design_deliverables (id, organization_id) on delete cascade
);
alter table public.design_handoff_exclusions enable row level security;
alter table public.design_handoff_exclusions force row level security;
revoke all on table public.design_handoff_exclusions from anon, authenticated;
grant select on public.design_handoff_exclusions to authenticated;
create policy design_handoff_exclusions_select on public.design_handoff_exclusions
  for select to authenticated using (public.can_see_project(project_id));

-- 3. Reopenings ---------------------------------------------------------------

create table public.design_reopenings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  reason text not null,
  -- The Brief créatif the closing referenced, kept as it was.
  brief_id uuid references public.design_briefs (id) on delete set null,
  -- [{ title, version, delivered }]: what was already in Production.
  impact jsonb not null default '[]'::jsonb,
  reopened_by uuid references public.people (id),
  reopened_at timestamptz not null default now(),
  constraint design_reopenings_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 2000),
  constraint design_reopenings_impact_check check (jsonb_typeof(impact) = 'array'),
  constraint design_reopenings_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index design_reopenings_project_idx on public.design_reopenings (project_id, reopened_at desc);
alter table public.design_reopenings enable row level security;
alter table public.design_reopenings force row level security;
revoke all on table public.design_reopenings from anon, authenticated;
grant select on public.design_reopenings to authenticated;
create policy design_reopenings_select on public.design_reopenings
  for select to authenticated using (public.can_see_project(project_id));

-- 4. A reserve's follow-up task, created once --------------------------------

alter table public.tasks
  add column design_decision_id uuid references public.design_decisions (id) on delete set null;
create unique index tasks_design_decision_key on public.tasks (design_decision_id)
  where design_decision_id is not null;

-- 5. « Passer en Production » -------------------------------------------------

create function public.pass_to_production(p_project_id uuid, p_exclusions jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_owner uuid;
  v_brief uuid;
  v_production uuid;
  v_production_state text;
  v_item jsonb;
  v_excluded uuid[] := '{}';
  v_handed int := 0;
  v_tasks int := 0;
  v_count int;
  v_started boolean := false;
  r record;
  d record;
begin
  select p.organization_id, p.owner_person_id into v_org, v_owner
    from public.projects p where p.id = p_project_id;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
    where s.project_id = p_project_id and sd.key = 'design' and s.state = 'validated') then
    raise exception 'conception_not_validated';
  end if;
  select coalesce(w.closed_brief_id,
                  (select b.id from public.design_briefs b
                    where b.project_id = p_project_id order by b.number desc limit 1))
    into v_brief
    from public.design_workspaces w where w.project_id = p_project_id;
  if v_brief is null then
    raise exception 'brief_required';
  end if;
  select s.id, s.state into v_production, v_production_state
    from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
   where s.project_id = p_project_id and sd.key = 'production'
   for update of s;
  if v_production is null then
    raise exception 'stage_not_found';
  end if;
  if v_production_state = 'validated' then
    raise exception 'production_closed';
  end if;

  -- The exclusions as chosen now: each with its reason.
  if jsonb_typeof(coalesce(p_exclusions, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_exclusions, '[]'::jsonb)) loop
    if not exists (select 1 from public.design_deliverables dd
                    where dd.id = (v_item ->> 'deliverable_id')::uuid
                      and dd.project_id = p_project_id) then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    if nullif(btrim(coalesce(v_item ->> 'reason', '')), '') is null then
      raise exception 'exclusion_reason_required' using errcode = '23514';
    end if;
    v_excluded := v_excluded || (v_item ->> 'deliverable_id')::uuid;
    insert into public.design_handoff_exclusions
      (organization_id, project_id, design_deliverable_id, reason, excluded_by)
    values (v_org, p_project_id, (v_item ->> 'deliverable_id')::uuid,
            btrim(v_item ->> 'reason'), public.auth_person_id())
    on conflict (design_deliverable_id) do update
      set reason = excluded.reason, excluded_by = excluded.excluded_by,
          excluded_at = now();
  end loop;
  delete from public.design_handoff_exclusions e
   where e.project_id = p_project_id and not (e.design_deliverable_id = any (v_excluded));

  -- Every validated sheet still current and not excluded, once.
  for r in
    select s.id as sheet_id, s.organization_id, s.delivery_date, s.title,
           (select sub.id from public.design_submissions sub
             where sub.sheet_id = s.id and sub.status <> 'withdrawn'
             order by sub.number desc limit 1) as submission_id
      from public.design_sheets s
     where s.project_id = p_project_id
       and not (s.design_deliverable_id = any (v_excluded))
  loop
    continue when r.submission_id is null
      or not exists (select 1 from public.design_submissions sub
                      where sub.id = r.submission_id and sub.status = 'approved')
      or not public.design_submission_is_current(r.submission_id);
    insert into public.design_handoffs
      (organization_id, project_id, sheet_id, submission_id, brief_id, confirmed_by)
    values (r.organization_id, p_project_id, r.sheet_id, r.submission_id, v_brief,
            public.auth_person_id())
    on conflict (sheet_id, submission_id) do nothing;
    get diagnostics v_count = row_count;
    v_handed := v_handed + v_count;

    -- A reserve goes on with an owner (the sheet's responsible, else the
    -- project's owner) and a due date (the sheet's, else in a week).
    for d in select dec.id, dec.reserves from public.design_decisions dec
              where dec.submission_id = r.submission_id and dec.decision = 'approved'
                and nullif(btrim(coalesce(dec.reserves, '')), '') is not null loop
      insert into public.tasks
        (organization_id, project_id, assignee_person_id, title, due_date,
         design_decision_id, created_by)
      values (v_org, p_project_id,
              coalesce((select a.person_id from public.design_assignments a
                         where a.sheet_id = r.sheet_id and a.scope = 'sheet'
                           and a.ended_at is null
                         order by a.assigned_at desc limit 1), v_owner),
              left('Réserve sur « ' || r.title || ' » : ' || btrim(d.reserves), 300),
              coalesce(r.delivery_date, (now() at time zone 'Europe/Paris')::date + 7),
              d.id, public.auth_person_id())
      on conflict (design_decision_id) where design_decision_id is not null do nothing;
      get diagnostics v_count = row_count;
      v_tasks := v_tasks + v_count;
    end loop;
  end loop;

  -- The direction's reserves too, with its responsible.
  for d in select dec.id, dec.reserves from public.design_decisions dec
             join public.design_submissions sub on sub.id = dec.submission_id
            where sub.project_id = p_project_id and sub.sheet_id is null
              and dec.decision = 'approved'
              and nullif(btrim(coalesce(dec.reserves, '')), '') is not null loop
    insert into public.tasks
      (organization_id, project_id, assignee_person_id, title, due_date,
       design_decision_id, created_by)
    values (v_org, p_project_id,
            coalesce((select a.person_id from public.design_assignments a
                       where a.project_id = p_project_id and a.scope = 'direction'
                         and a.ended_at is null
                       order by a.assigned_at desc limit 1), v_owner),
            left('Réserve sur la direction de la sortie : ' || btrim(d.reserves), 300),
            (now() at time zone 'Europe/Paris')::date + 7,
            d.id, public.auth_person_id())
    on conflict (design_decision_id) where design_decision_id is not null do nothing;
    get diagnostics v_count = row_count;
    v_tasks := v_tasks + v_count;
  end loop;

  if v_production_state = 'not_started' then
    perform public.start_stage(v_production);
    v_started := true;
  end if;

  perform public.design_log(v_org, p_project_id, 'conception.handed_to_production', null,
                            v_brief, jsonb_build_object('handed', v_handed, 'tasks', v_tasks,
                                                        'excluded', cardinality(v_excluded)));
  return jsonb_build_object('handed', v_handed, 'tasks', v_tasks, 'started', v_started);
end;
$$;
revoke execute on function public.pass_to_production(uuid, jsonb) from public, anon;
grant execute on function public.pass_to_production(uuid, jsonb) to authenticated;

-- 6. Reopening ----------------------------------------------------------------

create function public.reopen_design(p_project_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_stage uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select p.organization_id into v_org from public.projects p where p.id = p_project_id;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if not public.has_permission(v_org, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select s.id into v_stage from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
   where s.project_id = p_project_id and sd.key = 'design' and s.state = 'validated'
   for update of s;
  if v_stage is null then
    raise exception 'invalid_transition';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  insert into public.design_reopenings
    (organization_id, project_id, reason, brief_id, impact, reopened_by)
  values (v_org, p_project_id, v_reason,
          (select w.closed_brief_id from public.design_workspaces w
            where w.project_id = p_project_id),
          coalesce((
            select jsonb_agg(jsonb_build_object(
                     'title', x.title, 'version', x.number, 'delivered', x.delivered)
                     order by x.title)
              from (select distinct on (h.sheet_id) s.title, sub.number,
                           exists (select 1 from public.deliverable_deliveries dl
                                    where dl.deliverable_id = dd.strategy_deliverable_id
                                      and dl.delivered_at is not null) as delivered
                      from public.design_handoffs h
                      join public.design_sheets s on s.id = h.sheet_id
                      join public.design_deliverables dd on dd.id = s.design_deliverable_id
                      join public.design_submissions sub on sub.id = h.submission_id
                     where h.project_id = p_project_id
                     order by h.sheet_id, sub.number desc) x), '[]'::jsonb),
          public.auth_person_id());
  update public.design_workspaces
     set closed_brief_id = null, closed_at = null
   where project_id = p_project_id;
  update public.project_stages
     set state = 'in_progress', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = v_stage;
  perform public.design_log(v_org, p_project_id, 'conception.reopened', null, null,
                            jsonb_build_object('reason', v_reason));
end;
$$;
revoke execute on function public.reopen_design(uuid, text) from public, anon;
grant execute on function public.reopen_design(uuid, text) to authenticated;

-- 7. Projects already validated: their closing is the latest Brief. ------------

update public.design_workspaces w
   set closed_brief_id = (select b.id from public.design_briefs b
                           where b.project_id = w.project_id order by b.number desc limit 1),
       closed_at = s.state_changed_at
  from public.project_stages s
  join public.stage_definitions sd on sd.id = s.stage_definition_id
 where s.project_id = w.project_id and sd.key = 'design' and s.state = 'validated';
