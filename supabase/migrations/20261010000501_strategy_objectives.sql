-- Stratégie, étape 2 (docs/ARCHITECTURE.md § 6 bis): « Objectifs & KPIs »,
-- the eighth dimension of the pilotage. One row per objective, its figure
-- typed by a person (never by PO: CLAUDE.md, rule 6). Written by the owner
-- while the strategy is in progress, like the other strategy rows.

create table public.strategy_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- What is measured, as the team says it (« Streams Spotify »).
  label text not null,
  -- The figure to reach; null while it is still to be set.
  target numeric(14, 2),
  unit text,
  -- By when, if the team set it.
  due_on date,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_objectives_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint strategy_objectives_target_check check (target is null or target >= 0),
  constraint strategy_objectives_unit_check
    check (unit is null or (btrim(unit) <> '' and char_length(unit) <= 40)),
  constraint strategy_objectives_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index strategy_objectives_project_idx on public.strategy_objectives (project_id, created_at);

create trigger a_set_created_by before insert on public.strategy_objectives
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.strategy_objectives
  for each row execute function public.set_updated_at();

alter table public.strategy_objectives enable row level security;
alter table public.strategy_objectives force row level security;
revoke all on table public.strategy_objectives from anon, authenticated;
grant select, delete on table public.strategy_objectives to authenticated;
grant insert (organization_id, project_id, label, target, unit, due_on)
  on public.strategy_objectives to authenticated;
grant update (label, target, unit, due_on) on public.strategy_objectives to authenticated;
create policy strategy_objectives_select_visible on public.strategy_objectives
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_objectives_insert_editable on public.strategy_objectives
  for insert to authenticated with check (public.strategy_is_editable(project_id));
create policy strategy_objectives_update_editable on public.strategy_objectives
  for update to authenticated
  using (public.strategy_is_editable(project_id))
  with check (public.strategy_is_editable(project_id));
create policy strategy_objectives_delete_editable on public.strategy_objectives
  for delete to authenticated using (public.strategy_is_editable(project_id));
