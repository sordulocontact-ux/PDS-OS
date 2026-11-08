-- « Mes tâches »: each person's own to-do list in the Travail (retour du
-- 31/10/2026 sur /app/work: « un espace de gestionnaire de tâches […] où les
-- utilisateurs pourront rentrer leurs tâches de travail »).
--
-- Private: only its owner reads and writes it, nobody else, not even the
-- director. Tied to a project or to nothing (« préparer ma réunion »). The
-- Eisenhower matrix of the next lots reads `important` (chosen by the person)
-- and `urgent` (forced by the person; the code also counts a due date three
-- days away or less as urgent, never stored).
--
-- Unlike `tasks` (a project's task, given by its owner to someone), nobody
-- assigns these: the person writes them for themselves.

create table public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  owner_person_id uuid not null default public.auth_person_id()
    references public.people (id),
  title text not null,
  due_date date,
  important boolean not null default false,
  urgent boolean not null default false,
  project_id uuid,
  status text not null default 'todo',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_tasks_title_not_blank check (btrim(title) <> ''),
  constraint personal_tasks_title_length check (char_length(title) <= 300),
  constraint personal_tasks_status_check check (status in ('todo', 'done')),
  constraint personal_tasks_done_at check ((status = 'done') = (done_at is not null)),
  constraint personal_tasks_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete set null (project_id)
);

create index personal_tasks_owner_idx
  on public.personal_tasks (owner_person_id, status, due_date);

create trigger a_set_updated_at
  before update on public.personal_tasks
  for each row execute function public.set_updated_at();

alter table public.personal_tasks enable row level security;
alter table public.personal_tasks force row level security;
revoke all on table public.personal_tasks from anon, authenticated;
grant select, insert, update, delete on table public.personal_tasks to authenticated;

-- Its owner only, while an active member of the organization.
create policy personal_tasks_select_owner on public.personal_tasks
  for select to authenticated
  using (owner_person_id = public.auth_person_id()
         and public.is_active_member(organization_id));

-- A project, when given, is one the person sees.
create policy personal_tasks_insert_owner on public.personal_tasks
  for insert to authenticated
  with check (owner_person_id = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id)));

create policy personal_tasks_update_owner on public.personal_tasks
  for update to authenticated
  using (owner_person_id = public.auth_person_id()
         and public.is_active_member(organization_id))
  with check (owner_person_id = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id)));

create policy personal_tasks_delete_owner on public.personal_tasks
  for delete to authenticated
  using (owner_person_id = public.auth_person_id()
         and public.is_active_member(organization_id));
