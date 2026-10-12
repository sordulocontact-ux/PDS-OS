-- Retours Marketing du 11/10/2026, MKT-S1-05 et MKT-S1-13
-- (docs/ARCHITECTURE.md § 6 bis, « Stratégie »).
--
-- Publics prioritaires: each public is a row with its segment, its
-- priority, its need or insight and the channel foreseen (the closed
-- choices and the free answer stay the summary). A KPI says who follows it.

create table public.strategy_audiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  segment text not null,
  -- primary = cœur de cible, secondary = à conquérir ensuite.
  priority text not null default 'primary',
  insight text,
  channel text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_audiences_segment_check
    check (btrim(segment) <> '' and char_length(segment) <= 120),
  constraint strategy_audiences_priority_check check (priority in ('primary', 'secondary')),
  constraint strategy_audiences_insight_check
    check (insight is null or (btrim(insight) <> '' and char_length(insight) <= 500)),
  constraint strategy_audiences_channel_check
    check (channel is null or (btrim(channel) <> '' and char_length(channel) <= 200)),
  constraint strategy_audiences_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);
create index strategy_audiences_project_idx on public.strategy_audiences (project_id, created_at);

create trigger a_set_created_by before insert on public.strategy_audiences
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.strategy_audiences
  for each row execute function public.set_updated_at();

alter table public.strategy_audiences enable row level security;
alter table public.strategy_audiences force row level security;
revoke all on table public.strategy_audiences from anon, authenticated;
grant select, delete on table public.strategy_audiences to authenticated;
grant insert (organization_id, project_id, segment, priority, insight, channel)
  on public.strategy_audiences to authenticated;
grant update (segment, priority, insight, channel) on public.strategy_audiences to authenticated;

-- As the rest of the strategy: read by who sees the project, written by its
-- owner while the strategy is in progress.
create policy strategy_audiences_select_visible on public.strategy_audiences
  for select to authenticated using (public.can_see_project(project_id));
create policy strategy_audiences_insert_editable on public.strategy_audiences
  for insert to authenticated with check (public.strategy_is_editable(project_id));
create policy strategy_audiences_update_editable on public.strategy_audiences
  for update to authenticated
  using (public.strategy_is_editable(project_id))
  with check (public.strategy_is_editable(project_id));
create policy strategy_audiences_delete_editable on public.strategy_audiences
  for delete to authenticated using (public.strategy_is_editable(project_id));

-- Who follows a KPI (MKT-S1-13): a member of the organization.
alter table public.strategy_objectives
  add column owner_person_id uuid references public.people (id) on delete set null;
grant insert (owner_person_id) on public.strategy_objectives to authenticated;
grant update (owner_person_id) on public.strategy_objectives to authenticated;
