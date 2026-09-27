-- "Cadre & contraintes" as reviewable lines, one per fixed type (budget,
-- production, artistic, rights), modelled exactly on public.needs: each line
-- is confirmable separately and carries its own provenance. Replaces the
-- single free-text "frame" Brief field for new Framings; existing "frame"
-- field_values rows are left as history.

create table public.framing_constraints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  type text not null,
  text text not null,
  review_status text not null default 'confirmed',
  source_type text not null default 'manual',
  source_report_item_id uuid,
  source_quote text,
  source_start_seconds numeric,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint framing_constraints_text_not_blank check (btrim(text) <> ''),
  constraint framing_constraints_type_check
    check (type in ('budget', 'production', 'artistic', 'rights', 'other')),
  constraint framing_constraints_review_check
    check (review_status in ('proposed', 'confirmed', 'rejected')),
  constraint framing_constraints_source_check
    check (source_type in ('call', 'manual', 'import')),
  constraint framing_constraints_call_source
    check ((source_type = 'call') = (source_report_item_id is not null)),
  constraint framing_constraints_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint framing_constraints_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
);

create trigger a_set_updated_at before update on public.framing_constraints
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.framing_constraints
  for each row execute function public.set_created_by();

alter table public.framing_constraints enable row level security;
alter table public.framing_constraints force row level security;
revoke all on table public.framing_constraints from anon, authenticated;
grant select on table public.framing_constraints to authenticated;

create policy framing_constraints_select_members on public.framing_constraints
  for select to authenticated
  using (public.is_active_member(organization_id));

-- Same write shape as needs: the project owner only, and only while the
-- framing accepts proposals (framing_is_open covers "no framing before a
-- call"; stage_locked, enforced elsewhere for field_values, applies here too
-- via the same owner + in-progress convention as needs and team members).
create policy framing_constraints_insert_owner on public.framing_constraints
  for insert to authenticated
  with check (public.is_project_owner(project_id) and public.framing_is_open(project_id));
create policy framing_constraints_update_owner on public.framing_constraints
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

grant insert (
  organization_id, project_id, type, text, review_status,
  source_type, source_report_item_id, source_quote, source_start_seconds
) on public.framing_constraints to authenticated;
grant update (text, review_status) on public.framing_constraints to authenticated;
