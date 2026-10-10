-- A task can name the deliverable it is about (UX test of 09/10/2026,
-- section 5: « Livrer la miniature » opened the Cadrage). The task then leads
-- to that deliverable in the Conception; without one it leads to the
-- project's Travail, where it is ticked.
--
-- Same project only (checked by trigger); the deliverable's deletion keeps
-- the task, without its link.

alter table public.tasks add column deliverable_id uuid;
alter table public.tasks add constraint tasks_deliverable_same_org
  foreign key (deliverable_id, organization_id)
  references public.strategy_deliverables (id, organization_id)
  on delete set null (deliverable_id);
create index tasks_deliverable_idx on public.tasks (deliverable_id)
  where deliverable_id is not null;

create or replace function public.tasks_check_deliverable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and not exists (
    select 1 from public.strategy_deliverables d
     where d.id = new.deliverable_id and d.project_id = new.project_id
  ) then
    raise exception 'task_deliverable_other_project' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger tasks_check_deliverable
  before insert or update of deliverable_id, project_id on public.tasks
  for each row execute function public.tasks_check_deliverable();

grant insert (deliverable_id) on public.tasks to authenticated;
grant update (deliverable_id) on public.tasks to authenticated;
