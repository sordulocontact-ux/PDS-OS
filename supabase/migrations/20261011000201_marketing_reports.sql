-- Marketing › Suivi & bilan, lot 3 (ticket « Suivi & bilan », écran 2,
-- docs/ARCHITECTURE.md § 8 duodecies): the exportable report, a frozen and
-- versioned photograph of the follow-up.
--   1. marketing_reserves: a reserve (a limit of the results: links to check,
--      statistics to get back…), proposed when a report is prepared or added
--      by hand. A live object: the next lots arbitrate it, follow it after the
--      closing; a report keeps the list as it was.
--   2. marketing_reports: one version per generation, numbered by the
--      database, never rewritten. The snapshot (activations of the scope,
--      their evidence, objectives of the Strategy, reserves, texts written by
--      the author) is built here from the tables, never sent by the browser;
--      its SHA-256 fingerprint is stored with it. The rules the figures are
--      computed with keep their version (rules_version). A new version
--      supersedes the previous ones still waiting; an approved one stays as
--      it was.
--   3. marketing_report_budgets: the budget totals of a version, apart, read
--      only by whoever reads the project's budget (the budget keeps the
--      permissions of its module).
-- Prepared by the project's contributors (owner, creative directors).

-- 1. Reserves --------------------------------------------------------------------------

create table public.marketing_reserves (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  category text not null,
  description text not null,
  -- Where it comes from: a report's preparation, added by hand, the closing.
  origin text not null default 'manual',
  origin_report_id uuid,
  activation_id uuid,
  status text not null default 'open',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_reserves_category_check check (category in (
    'links', 'statistics', 'coverage', 'activations', 'payments', 'rights', 'evidence', 'other')),
  constraint marketing_reserves_description_check
    check (btrim(description) <> '' and char_length(description) <= 1000),
  constraint marketing_reserves_origin_check check (origin in ('report', 'manual', 'closure')),
  constraint marketing_reserves_status_check check (status in ('open')),
  constraint marketing_reserves_id_org_key unique (id, organization_id),
  constraint marketing_reserves_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint marketing_reserves_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete set null (activation_id)
);
create index marketing_reserves_project_idx on public.marketing_reserves (project_id, created_at);

create function public.marketing_reserves_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activation_id is not null and not exists (
       select 1 from public.marketing_activations a
        where a.id = new.activation_id and a.project_id = new.project_id) then
    raise exception 'activation_other_project' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_reserves_check() from public, anon, authenticated;
create trigger a_check before insert or update on public.marketing_reserves
  for each row execute function public.marketing_reserves_check();
create trigger a_set_created_by before insert on public.marketing_reserves
  for each row execute function public.set_created_by();
create trigger b_updated_at before update on public.marketing_reserves
  for each row execute function public.set_updated_at();

alter table public.marketing_reserves enable row level security;
alter table public.marketing_reserves force row level security;
revoke all on table public.marketing_reserves from anon, authenticated;
grant select on public.marketing_reserves to authenticated;
-- « Proposer une réserve » by hand; the report's own go through its function.
grant insert (organization_id, project_id, category, description, activation_id)
  on public.marketing_reserves to authenticated;
grant update (category, description, activation_id) on public.marketing_reserves to authenticated;
create policy marketing_reserves_select on public.marketing_reserves
  for select to authenticated using (public.can_see_project(project_id));
create policy marketing_reserves_insert on public.marketing_reserves
  for insert to authenticated with check (public.marketing_can_contribute(project_id));
create policy marketing_reserves_update on public.marketing_reserves
  for update to authenticated
  using (public.marketing_can_contribute(project_id) and status = 'open')
  with check (public.marketing_can_contribute(project_id));

-- 2. Reports ---------------------------------------------------------------------------

create table public.marketing_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  version integer not null,
  -- generated → to_validate → approved_provisional / changes_requested /
  -- postponed; superseded by a newer version; finalized once a closing
  -- refers to it (lot 6).
  state text not null default 'generated',
  period_start date,
  period_end date,
  activation_ids uuid[] not null,
  sections text[] not null,
  rules_version integer not null,
  format text not null default 'report',
  snapshot jsonb not null,
  content_hash text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  submitted_by uuid references public.people (id),
  submitted_at timestamptz,
  constraint marketing_reports_version_key unique (project_id, version),
  constraint marketing_reports_id_org_key unique (id, organization_id),
  constraint marketing_reports_version_positive check (version > 0),
  constraint marketing_reports_state_check check (state in (
    'generated', 'to_validate', 'approved_provisional', 'changes_requested', 'postponed',
    'superseded', 'finalized')),
  constraint marketing_reports_period_check
    check (period_start is null or period_end is null or period_end >= period_start),
  constraint marketing_reports_scope_check
    check (cardinality(activation_ids) between 1 and 500),
  constraint marketing_reports_sections_check check (
    cardinality(sections) between 1 and 8
    and sections <@ array['summary', 'objectives', 'activations', 'results', 'statistics',
                          'budget', 'reserves', 'annexes']),
  constraint marketing_reports_rules_check check (rules_version between 1 and 1000),
  constraint marketing_reports_format_check check (format in ('report')),
  constraint marketing_reports_snapshot_check
    check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 2000000),
  constraint marketing_reports_hash_check check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint marketing_reports_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index marketing_reports_project_idx on public.marketing_reports (project_id, version desc);

alter table public.marketing_reports enable row level security;
alter table public.marketing_reports force row level security;
revoke all on table public.marketing_reports from anon, authenticated;
-- Written only through the functions below (security definer).
grant select on public.marketing_reports to authenticated;
create policy marketing_reports_select on public.marketing_reports
  for select to authenticated using (public.can_see_project(project_id));

-- The origin report of a reserve: declared once both tables exist.
alter table public.marketing_reserves
  add constraint marketing_reserves_report_same_org foreign key (origin_report_id, organization_id)
    references public.marketing_reports (id, organization_id) on delete set null (origin_report_id);

create table public.marketing_report_budgets (
  report_id uuid primary key references public.marketing_reports (id) on delete cascade,
  organization_id uuid not null,
  project_id uuid not null,
  planned_cents bigint not null,
  committed_cents bigint not null,
  paid_cents bigint not null,
  constraint marketing_report_budgets_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.marketing_report_budgets enable row level security;
alter table public.marketing_report_budgets force row level security;
revoke all on table public.marketing_report_budgets from anon, authenticated;
grant select on public.marketing_report_budgets to authenticated;
create policy marketing_report_budgets_select on public.marketing_report_budgets
  for select to authenticated
  using (public.can_see_project(project_id) and public.can_read_project_budget(project_id));

-- The snapshot of a report, built from the tables as they are now.
create function public.marketing_report_snapshot(
  p_project_id uuid,
  p_activation_ids uuid[],
  p_period_start date,
  p_period_end date,
  p_sections text[],
  p_summary text,
  p_recommendations text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with person as (
    select p.id, btrim(concat_ws(' ', p.first_name, p.last_name)) as name from public.people p
  ),
  acts as (
    select a.*, o.name as owner_name, d.title as deliverable_title, l.label as lever_label
      from public.marketing_activations a
      left join person o on o.id = a.owner_person_id
      left join public.strategy_deliverables d on d.id = a.deliverable_id
      left join public.levers l on l.id = a.lever_id
     where a.project_id = p_project_id and a.id = any (p_activation_ids)
  )
  select jsonb_build_object(
    'project', (select jsonb_build_object('id', pr.id, 'title', pr.title)
                  from public.projects pr where pr.id = p_project_id),
    'generated_at', now(),
    'period', jsonb_build_object('start', p_period_start, 'end', p_period_end),
    'sections', to_jsonb(p_sections),
    'summary', nullif(btrim(coalesce(p_summary, '')), ''),
    'recommendations', nullif(btrim(coalesce(p_recommendations, '')), ''),
    'activations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'title', a.title, 'kind', a.kind, 'status', a.status,
               'owner_name', a.owner_name, 'deliverable_title', a.deliverable_title,
               'lever_label', a.lever_label, 'starts_on', a.starts_on, 'ends_on', a.ends_on,
               'archived_at', a.archived_at, 'created_at', a.created_at)
             order by a.created_at)
        from acts a), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'activation_id', e.activation_id, 'kind', e.kind, 'label', e.label,
               'url', e.url, 'platform', e.platform, 'metric', e.metric, 'value', e.value,
               'period_start', e.period_start, 'period_end', e.period_end,
               'availability', e.availability, 'reported_by', e.reported_by,
               'observed_on', e.observed_on, 'verification', e.verification,
               'verified_at', e.verified_at, 'verified_by_name', v.name,
               'link_unreachable_at', e.link_unreachable_at, 'created_at', e.created_at)
             order by e.created_at)
        from public.marketing_evidence e
        left join person v on v.id = e.verified_by
       where e.project_id = p_project_id and e.archived_at is null
         and e.activation_id = any (p_activation_ids)), '[]'::jsonb),
    'excluded_activations', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title) order by a.created_at)
        from public.marketing_activations a
       where a.project_id = p_project_id and a.archived_at is null
         and not (a.id = any (p_activation_ids))), '[]'::jsonb),
    'objectives', jsonb_build_object(
      'strategic', (select f.value #>> '{}' from public.current_field_values f
                     where f.project_id = p_project_id and f.deliverable = 'strategy'
                       and f.field_key = 'strategic_objective' and f.status = 'confirmed'
                     limit 1),
      'kpis', coalesce((
        select jsonb_agg(jsonb_build_object('label', o.label, 'kind', o.kind, 'target', o.target,
                                            'unit', o.unit, 'due_on', o.due_on)
                         order by o.created_at)
          from public.strategy_objectives o where o.project_id = p_project_id), '[]'::jsonb)),
    'reserves', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'category', r.category, 'description', r.description,
               'origin', r.origin, 'activation_id', r.activation_id, 'status', r.status)
             order by r.created_at)
        from public.marketing_reserves r
       where r.project_id = p_project_id and r.status = 'open'), '[]'::jsonb)
  );
$$;
revoke execute on function public.marketing_report_snapshot(uuid, uuid[], date, date, text[], text, text)
  from public, anon, authenticated;

-- « Générer le rapport »: the reserves chosen in the preparation are created,
-- then the snapshot is taken and fingerprinted; older versions still waiting
-- are superseded. Returns the new report's id.
create function public.generate_marketing_report(
  p_project_id uuid,
  p_activation_ids uuid[],
  p_period_start date,
  p_period_end date,
  p_sections text[],
  p_summary text,
  p_recommendations text,
  p_reserves jsonb,
  p_rules_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_snapshot jsonb;
  v_id uuid;
  v_reserve jsonb;
  v_ids uuid[];
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.marketing_can_contribute(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_activation_ids) x;
  if cardinality(v_ids) = 0 or exists (
       select 1 from unnest(v_ids) x
        where not exists (select 1 from public.marketing_activations a
                           where a.id = x and a.project_id = p_project_id
                             and a.archived_at is null)) then
    raise exception 'invalid_scope' using errcode = '23514';
  end if;
  if char_length(coalesce(p_summary, '')) > 5000
     or char_length(coalesce(p_recommendations, '')) > 5000
     or jsonb_typeof(coalesce(p_reserves, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reserves, '[]'::jsonb)) > 30 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  -- One generation at a time per project: the version number is the next one.
  perform 1 from public.projects where id = p_project_id for update;
  select coalesce(max(version), 0) + 1 into v_version
    from public.marketing_reports where project_id = p_project_id;
  v_id := gen_random_uuid();

  for v_reserve in select * from jsonb_array_elements(coalesce(p_reserves, '[]'::jsonb)) loop
    insert into public.marketing_reserves
      (organization_id, project_id, category, description, origin, activation_id)
    values (v_org, p_project_id, v_reserve ->> 'category', v_reserve ->> 'description', 'report',
            nullif(v_reserve ->> 'activation_id', '')::uuid);
  end loop;

  v_snapshot := public.marketing_report_snapshot(p_project_id, v_ids, p_period_start, p_period_end,
                                                 p_sections, p_summary, p_recommendations);
  update public.marketing_reports set state = 'superseded'
   where project_id = p_project_id and state in ('generated', 'to_validate', 'changes_requested',
                                                'postponed');
  insert into public.marketing_reports
    (id, organization_id, project_id, version, period_start, period_end, activation_ids, sections,
     rules_version, snapshot, content_hash, created_by)
  values (v_id, v_org, p_project_id, v_version, p_period_start, p_period_end, v_ids, p_sections,
          p_rules_version, v_snapshot,
          encode(extensions.digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex'),
          public.auth_person_id());
  update public.marketing_reserves set origin_report_id = v_id
   where project_id = p_project_id and origin = 'report' and origin_report_id is null;

  -- The budget, apart, only when the author reads it and asked for it.
  if 'budget' = any (p_sections) and public.can_read_project_budget(p_project_id) then
    insert into public.marketing_report_budgets
      (report_id, organization_id, project_id, planned_cents, committed_cents, paid_cents)
    select v_id, v_org, p_project_id,
           coalesce(sum(amount_cents) filter (where status = 'planned'), 0),
           coalesce(sum(amount_cents) filter (where status in ('committed', 'paid')), 0),
           coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
      from public.budget_lines where project_id = p_project_id;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.generate_marketing_report(uuid, uuid[], date, date, text[], text, text, jsonb, integer)
  from public, anon;
grant execute on function public.generate_marketing_report(uuid, uuid[], date, date, text[], text, text, jsonb, integer)
  to authenticated;

-- 3. Audit ---------------------------------------------------------------------------

create function public.marketing_report_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'marketing_reserves' then
    if tg_op = 'INSERT' then
      perform public.marketing_log(new.organization_id, new.project_id, 'reserve.created', new.id,
                                   new.activation_id, null,
                                   jsonb_build_object('category', new.category,
                                                      'description', new.description,
                                                      'origin', new.origin), null);
    elsif (to_jsonb(new) - array['updated_at', 'origin_report_id'])
          is distinct from (to_jsonb(old) - array['updated_at', 'origin_report_id']) then
      perform public.marketing_log(new.organization_id, new.project_id, 'reserve.updated', new.id,
                                   new.activation_id, d.old_value, d.new_value, null)
         from public.marketing_diff(to_jsonb(old), to_jsonb(new),
                                    array['updated_at', 'origin_report_id']) d;
    end if;
  elsif tg_op = 'INSERT' then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.generated', new.id,
                                 null, null,
                                 jsonb_build_object('version', new.version,
                                                    'content_hash', new.content_hash), null);
  elsif new.state is distinct from old.state then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.' || new.state,
                                 new.id, null, jsonb_build_object('state', old.state),
                                 jsonb_build_object('state', new.state, 'version', new.version),
                                 null);
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_report_events_write() from public, anon, authenticated;
create trigger z_events after insert or update on public.marketing_reserves
  for each row execute function public.marketing_report_events_write();
create trigger z_events after insert or update of state on public.marketing_reports
  for each row execute function public.marketing_report_events_write();

-- A report is never rewritten: only its state moves (and the submission
-- stamp), through the functions of the next lots.
create function public.marketing_reports_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['state', 'submitted_by', 'submitted_at'])
     is distinct from (to_jsonb(old) - array['state', 'submitted_by', 'submitted_at']) then
    raise exception 'report_frozen' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_reports_frozen() from public, anon, authenticated;
create trigger a_frozen before update on public.marketing_reports
  for each row execute function public.marketing_reports_frozen();
