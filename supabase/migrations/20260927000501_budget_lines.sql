-- Budget lines of a project, against the envelope set at creation
-- (projects.budget_cents). Every total is computed by code, never stored nor
-- produced by PO (CLAUDE.md, rule 6).
-- Status: planned (prévu) → committed (engagé) → paid (payé).
-- Read: whoever sees the project. Write: its owner only.

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  label text not null,
  amount_cents bigint not null,
  -- Optional, same closed taxonomy as needs and levers.
  family text,
  -- Optional: the lever this spend serves, in the same project.
  lever_id uuid,
  status text not null default 'planned',
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_lines_label_not_blank check (btrim(label) <> ''),
  constraint budget_lines_label_length check (char_length(label) <= 200),
  constraint budget_lines_note_length check (note is null or char_length(note) <= 1000),
  constraint budget_lines_amount_positive check (amount_cents >= 0),
  constraint budget_lines_family_check check (family is null or family in (
    'creation_content', 'promotion_distribution', 'experiences_activations', 'other')),
  constraint budget_lines_status_check check (status in ('planned', 'committed', 'paid')),
  constraint budget_lines_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  -- Removing a lever detaches its lines instead of refusing.
  constraint budget_lines_lever_same_org
    foreign key (lever_id, organization_id) references public.levers (id, organization_id)
    on delete set null (lever_id)
);

create index budget_lines_project_idx on public.budget_lines (project_id, created_at);

-- A line's lever belongs to the same project.
create or replace function public.check_budget_line_lever()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lever_id is not null and not exists (
    select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id) then
    raise exception 'lever_not_in_project';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_budget_line_lever() from public, anon, authenticated;

create trigger budget_lines_check_lever
  before insert or update on public.budget_lines
  for each row execute function public.check_budget_line_lever();

-- Authorship and timestamps are set by the database, never by the client.
create trigger a_set_created_by before insert on public.budget_lines
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.budget_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.budget_lines enable row level security;
alter table public.budget_lines force row level security;
revoke all on table public.budget_lines from anon, authenticated;
grant select, delete on table public.budget_lines to authenticated;
grant insert (organization_id, project_id, label, amount_cents, family, lever_id, status, note)
  on public.budget_lines to authenticated;
grant update (label, amount_cents, family, lever_id, status, note)
  on public.budget_lines to authenticated;

create policy budget_lines_select_visible on public.budget_lines
  for select to authenticated
  using (public.can_see_project(project_id));

create policy budget_lines_insert_owner on public.budget_lines
  for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy budget_lines_update_owner on public.budget_lines
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy budget_lines_delete_owner on public.budget_lines
  for delete to authenticated
  using (public.is_project_owner(project_id));
