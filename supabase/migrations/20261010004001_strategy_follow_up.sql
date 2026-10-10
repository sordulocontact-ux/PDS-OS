-- Stratégie, étape 14 (docs/ARCHITECTURE.md § 6 bis): the follow-up before
-- and after the release.
--   1. a KPI's measured values, noted by a person from a real source (an
--      analytics screen, a press clipping…) with the date it was read; Deezer
--      fans are read by code and never stored here. No value is ever made up:
--      without a measure, nothing is compared.
--   2. a recommendation (computed by code from real data) applied or ignored:
--      it is not offered again; « Appliquer » may create a task.
-- Written by the project's owner: the follow-up goes on after the strategy is
-- validated (frozen), so it does not depend on strategy_is_editable.
-- "if not exists": a local database that applied the reverted 20261009000101
-- already holds strategy_recommendations.

-- 1. Measures ----------------------------------------------------------------------------

create table public.strategy_kpi_measures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  objective_id uuid not null references public.strategy_objectives (id) on delete cascade,
  value numeric(14, 2) not null,
  measured_on date not null,
  -- Where the figure was read (« Spotify for Artists », « relevé presse »).
  source_note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint strategy_kpi_measures_value_check check (value >= 0),
  constraint strategy_kpi_measures_source_check
    check (source_note is null or (btrim(source_note) <> '' and char_length(source_note) <= 200)),
  constraint strategy_kpi_measures_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index strategy_kpi_measures_objective_idx
  on public.strategy_kpi_measures (objective_id, measured_on desc);

-- A measure belongs to a quantitative KPI of the same project.
create function public.strategy_kpi_measures_check()
returns trigger
language plpgsql
-- Reads the KPI whatever the caller sees: the access itself is RLS's.
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.strategy_objectives o
                 where o.id = new.objective_id and o.project_id = new.project_id
                   and o.kind = 'quantitative') then
    raise exception 'objective_not_measurable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.strategy_kpi_measures_check() from public, anon, authenticated;
create trigger a_check before insert on public.strategy_kpi_measures
  for each row execute function public.strategy_kpi_measures_check();
create trigger a_set_created_by before insert on public.strategy_kpi_measures
  for each row execute function public.set_created_by();

alter table public.strategy_kpi_measures enable row level security;
alter table public.strategy_kpi_measures force row level security;
revoke all on table public.strategy_kpi_measures from anon, authenticated;
grant select, delete on public.strategy_kpi_measures to authenticated;
grant insert (organization_id, project_id, objective_id, value, measured_on, source_note)
  on public.strategy_kpi_measures to authenticated;
create policy strategy_kpi_measures_select_visible on public.strategy_kpi_measures
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_kpi_measures_insert_owner on public.strategy_kpi_measures
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy strategy_kpi_measures_delete_owner on public.strategy_kpi_measures
  for delete to authenticated using (public.is_project_owner(project_id));

-- 2. Recommendations -------------------------------------------------------------------

create table if not exists public.strategy_recommendations (
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
drop trigger if exists a_set_created_by on public.strategy_recommendations;
create trigger a_set_created_by before insert on public.strategy_recommendations
  for each row execute function public.set_created_by();
alter table public.strategy_recommendations enable row level security;
alter table public.strategy_recommendations force row level security;
revoke all on table public.strategy_recommendations from anon, authenticated;
grant select on public.strategy_recommendations to authenticated;
grant insert (organization_id, project_id, rule_key, state, task_id)
  on public.strategy_recommendations to authenticated;
drop policy if exists strategy_recommendations_select_visible on public.strategy_recommendations;
create policy strategy_recommendations_select_visible on public.strategy_recommendations
  for select to authenticated using (public.can_see_project(project_id));
drop policy if exists strategy_recommendations_insert_owner on public.strategy_recommendations;
create policy strategy_recommendations_insert_owner on public.strategy_recommendations
  for insert to authenticated with check (public.is_project_owner(project_id));
