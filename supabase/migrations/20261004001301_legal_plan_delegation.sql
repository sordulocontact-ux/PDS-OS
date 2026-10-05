-- Juridique, lot 5: Suivi (ticket Juridique 07, docs/ARCHITECTURE.md
-- § 8 sexies). Where each action stands is computed by code from its source
-- objects at each visit (nothing stored here). What the Suivi writes is the
-- responsibility: « Délégation ou escalade explicite lorsque le responsable
-- change », kept in a journal (the ticket's MVP: « journal »).
--
--   * legal_plan_events: who changed an action's responsible or due date,
--     from what to what, and when;
--   * update_legal_plan_item: the only way to change them (manage_legal on
--     a visible project; a responsible holds manage_legal).

create table public.legal_plan_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  item_id uuid not null references public.legal_plan_items (id) on delete cascade,
  kind text not null,
  from_value text,
  to_value text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_plan_events_kind_check check (kind in ('responsible_changed', 'due_changed')),
  constraint legal_plan_events_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create index legal_plan_events_item_idx on public.legal_plan_events (item_id, created_at);

alter table public.legal_plan_events enable row level security;
alter table public.legal_plan_events force row level security;
revoke all on public.legal_plan_events from anon, authenticated;
grant select on public.legal_plan_events to authenticated;
create policy legal_plan_events_select_legal on public.legal_plan_events
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));

create or replace function public.update_legal_plan_item(
  p_item_id uuid,
  p_responsible_person_id uuid,
  p_due_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.legal_plan_items%rowtype;
  v_person uuid := public.auth_person_id();
begin
  select * into v_item from public.legal_plan_items where id = p_item_id for update;
  if not found or v_person is null
     or not public.has_permission(v_item.organization_id, 'manage_legal')
     or not public.can_see_project(v_item.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_responsible_person_id is not null
     and not public.person_has_permission(v_item.organization_id, p_responsible_person_id,
                                          'manage_legal') then
    raise exception 'legal_plan_responsible_invalid' using errcode = 'P0001';
  end if;

  if v_item.responsible_person_id is distinct from p_responsible_person_id then
    insert into public.legal_plan_events
      (organization_id, project_id, item_id, kind, from_value, to_value, created_by)
    values (v_item.organization_id, v_item.project_id, v_item.id, 'responsible_changed',
            v_item.responsible_person_id::text, p_responsible_person_id::text, v_person);
  end if;
  if v_item.due_on is distinct from p_due_on then
    insert into public.legal_plan_events
      (organization_id, project_id, item_id, kind, from_value, to_value, created_by)
    values (v_item.organization_id, v_item.project_id, v_item.id, 'due_changed',
            v_item.due_on::text, p_due_on::text, v_person);
  end if;

  update public.legal_plan_items
     set responsible_person_id = p_responsible_person_id, due_on = p_due_on
   where id = p_item_id;
end;
$$;

revoke execute on function public.update_legal_plan_item(uuid, uuid, date) from public, anon;
grant execute on function public.update_legal_plan_item(uuid, uuid, date) to authenticated;
