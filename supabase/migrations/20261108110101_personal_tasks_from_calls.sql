-- « Mes tâches », lot 4 (retour du 31/10/2026): « quand il y a une réunion
-- et qu'il y a des tâches à faire détectées par l'IA […] elle pourra elle-même
-- venir et les ajouter dans cet espace-là ».
--
-- A next action of a call's report is suggested to the person it names (else
-- to the call's owner); they add it or set it aside, never PO alone (a
-- person decides, CLAUDE.md rule 6). Both answers are a row here, so the
-- suggestion does not come back: 'todo' once added, 'dismissed' once set
-- aside (never listed).
--
-- The call and the item stay optional links: deleting the call (delete_call)
-- or regenerating its report keeps the person's task, without its source.

alter table public.personal_tasks
  add column source_call_id uuid,
  add column source_report_item_id uuid,
  add constraint personal_tasks_call_same_org
    foreign key (source_call_id, organization_id) references public.calls (id, organization_id)
    on delete set null (source_call_id),
  add constraint personal_tasks_item_same_org
    foreign key (source_report_item_id, organization_id)
    references public.report_items (id, organization_id)
    on delete set null (source_report_item_id);

alter table public.personal_tasks drop constraint personal_tasks_status_check;
alter table public.personal_tasks add constraint personal_tasks_status_check
  check (status in ('todo', 'done', 'dismissed'));

-- One answer per person and suggestion.
create unique index personal_tasks_owner_item_key
  on public.personal_tasks (owner_person_id, source_report_item_id)
  where source_report_item_id is not null;

create index personal_tasks_owner_call_idx
  on public.personal_tasks (owner_person_id, source_call_id)
  where source_call_id is not null;

-- The call, when given, is one the person sees (RLS of the inserts and
-- updates, on top of the project's).
drop policy personal_tasks_insert_owner on public.personal_tasks;
create policy personal_tasks_insert_owner on public.personal_tasks
  for insert to authenticated
  with check (owner_person_id = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id))
              and (source_call_id is null or public.can_see_call(source_call_id)));

drop policy personal_tasks_update_owner on public.personal_tasks;
create policy personal_tasks_update_owner on public.personal_tasks
  for update to authenticated
  using (owner_person_id = public.auth_person_id()
         and public.is_active_member(organization_id))
  with check (owner_person_id = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id))
              and (source_call_id is null or public.can_see_call(source_call_id)));
