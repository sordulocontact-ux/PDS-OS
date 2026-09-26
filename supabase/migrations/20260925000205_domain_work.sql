-- Deliverable fields, needs, team, tasks and open points.
--
-- Two invariants (docs/CONTEXTE-PROJET.md § 11):
-- - every business value carries its provenance (source_* columns);
-- - a task and an open point are two distinct entities.

-- Deliverable fields (Brief, Strategy, Design doc), append-only: each edit or
-- confirmation inserts a row, the current value is the latest one. This is at
-- once the version history and the provenance log.
create table public.field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  deliverable text not null,
  field_key text not null,
  value jsonb not null,
  -- proposed = suggested by PO (AI), shown as "proposé · à confirmer".
  status text not null,
  source_type text not null,
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint field_values_deliverable_check
    check (deliverable in ('brief', 'strategy', 'design_doc')),
  constraint field_values_key_format check (field_key ~ '^[a-z][a-z_]*$'),
  constraint field_values_status_check check (status in ('proposed', 'confirmed', 'rejected')),
  constraint field_values_source_check check (source_type in ('call', 'manual', 'import')),
  constraint field_values_call_source
    check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint field_values_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint field_values_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

create index field_values_current_idx
  on public.field_values (project_id, deliverable, field_key, created_at desc);

create view public.current_field_values
with (security_invoker = true) as
  select distinct on (project_id, deliverable, field_key) *
  from public.field_values
  order by project_id, deliverable, field_key, created_at desc;

-- Columns shared by the reviewable, sourced entities below.
-- review_status: proposed (by PO) → confirmed / rejected (by a person).

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  label text not null,
  family text not null,
  -- "Identifier un besoin n'engage rien" : identified ≠ committed.
  state text not null default 'identified',
  review_status text not null default 'confirmed',
  source_type text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint needs_label_not_blank check (btrim(label) <> ''),
  constraint needs_family_check check (family in (
    'creation_content', 'promotion_distribution', 'experiences_activations', 'other')),
  constraint needs_state_check check (state in ('identified', 'committed')),
  constraint needs_review_check check (review_status in ('proposed', 'confirmed', 'rejected')),
  constraint needs_source_check check (source_type in ('call', 'manual', 'import')),
  constraint needs_call_source check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint needs_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint needs_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

create table public.project_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- Optional: someone named in a call may not exist as a Person yet.
  person_id uuid references public.people (id),
  display_name text not null,
  role text,
  review_status text not null default 'confirmed',
  source_type text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_name_not_blank check (btrim(display_name) <> ''),
  constraint team_review_check check (review_status in ('proposed', 'confirmed', 'rejected')),
  constraint team_source_check check (source_type in ('call', 'manual', 'import')),
  constraint team_call_source check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint team_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint team_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

-- A task has an owner and a due date. Always.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null,
  assignee_person_id uuid not null references public.people (id),
  due_date date not null,
  status text not null default 'todo',
  done_at timestamptz,
  source_report_item_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (btrim(title) <> ''),
  constraint tasks_status_check check (status in ('todo', 'done')),
  constraint tasks_done_at check ((status = 'done') = (done_at is not null)),
  constraint tasks_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint tasks_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

-- An open point is a decision not taken yet: no owner, no due date.
create table public.open_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  question text not null,
  status text not null default 'open',
  resolution text,
  resolved_at timestamptz,
  source_report_item_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint open_points_question_not_blank check (btrim(question) <> ''),
  constraint open_points_status_check check (status in ('open', 'resolved')),
  constraint open_points_resolution check (
    (status = 'resolved') = (resolved_at is not null)
    and (status = 'open' or btrim(coalesce(resolution, '')) <> '')),
  constraint open_points_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint open_points_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);
