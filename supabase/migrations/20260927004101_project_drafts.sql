-- Drafts of the "Nouveau projet" form (feedback n°6, 27/09/2026): a project
-- being created is kept as it is typed, so leaving the page (to create a
-- project manager's account, say) loses nothing. A draft is personal: only
-- its author reads, changes or deletes it, and only while they may create
-- projects. It is never a project: no stage, no team, nothing notified; the
-- project is still created by create_project(), and the draft then deleted.

create table public.project_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  -- The form as it was left: field name → text value, the same values the
  -- form gets back after a refused submission. Checked again on creation.
  form_values jsonb not null default '{}'::jsonb,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_drafts_values_object check (jsonb_typeof(form_values) = 'object'),
  constraint project_drafts_values_size check (pg_column_size(form_values) <= 65536)
);

create index project_drafts_created_by_idx on public.project_drafts (created_by, updated_at desc);

create trigger a_set_created_by before insert on public.project_drafts
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.project_drafts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.project_drafts enable row level security;
alter table public.project_drafts force row level security;
revoke all on table public.project_drafts from anon, authenticated;
grant select, delete on table public.project_drafts to authenticated;
grant insert (organization_id, form_values) on public.project_drafts to authenticated;
grant update (form_values) on public.project_drafts to authenticated;

create policy project_drafts_select_own on public.project_drafts
  for select to authenticated
  using (created_by = public.auth_person_id()
         and public.has_permission(organization_id, 'create_projects'));

create policy project_drafts_insert_own on public.project_drafts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'create_projects'));

create policy project_drafts_update_own on public.project_drafts
  for update to authenticated
  using (created_by = public.auth_person_id()
         and public.has_permission(organization_id, 'create_projects'))
  with check (created_by = public.auth_person_id());

create policy project_drafts_delete_own on public.project_drafts
  for delete to authenticated
  using (created_by = public.auth_person_id());
