-- Juridique, lot 4: Plan d'action (tickets Juridique 01 and 07,
-- docs/ARCHITECTURE.md § 8 sexies).
--
-- From the tickets:
--   * « Après confirmation, PO propose le plan d'action » ; « Obtenir une
--     synthèse et un plan confirmés avant toute mise en mouvement » (01) →
--     a plan is launched only on a confirmed dossier;
--   * « Plan : PROPOSED → CONFIRMED → ACTIVE » (07) → legal_plans.status.
--     The proposal itself is computed by code at each visit, never stored;
--     « Confirmation du plan avant lancement » is the one human decision,
--     so launching stores the plan confirmed and active at once (both
--     timestamps kept);
--   * « Item : ACTION_NOW · WAITING_EXTERNAL · BLOCKED · DONE · OBSOLETE »
--     (07) → legal_plan_items.status, with its responsibility, its
--     dependencies (other items' keys) and an optional due date
--     (« responsabilités, dépendances et calendrier »).
--
-- The items are built by the server from the confirmed dossier; the person
-- only chooses responsibles and dates. Read: manage_legal on a visible
-- project. Written only through launch_legal_plan.

create table public.legal_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  status text not null,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz,
  launched_by uuid references public.people (id),
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_plans_status_check check (status in ('proposed', 'confirmed', 'active')),
  constraint legal_plans_active_check
    check ((status = 'active') = (launched_at is not null)),
  constraint legal_plans_project_key unique (project_id),
  constraint legal_plans_id_project_key unique (id, project_id),
  constraint legal_plans_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create table public.legal_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  plan_id uuid not null,
  project_id uuid not null,
  -- Stable key of the item in the plan ("onboarding", "clearance:<id>"…),
  -- what dependencies point to.
  item_key text not null,
  -- The branch it belongs to (tickets Juridique 02 to 06).
  kind text not null,
  master_id uuid,
  label text not null,
  detail text,
  status text not null,
  depends_on text[] not null default '{}',
  responsible_person_id uuid references public.people (id),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_plan_items_kind_check
    check (kind in ('onboarding', 'contract', 'splits', 'clearance', 'formality')),
  constraint legal_plan_items_status_check check (status in (
    'action_now', 'waiting_external', 'blocked', 'done', 'obsolete')),
  constraint legal_plan_items_key_check check (char_length(item_key) between 1 and 120),
  constraint legal_plan_items_label_check check (btrim(label) <> '' and char_length(label) <= 300),
  constraint legal_plan_items_detail_check check (detail is null or char_length(detail) <= 1000),
  constraint legal_plan_items_plan_key unique (plan_id, item_key),
  constraint legal_plan_items_plan_fk
    foreign key (plan_id, project_id) references public.legal_plans (id, project_id)
    on delete cascade,
  constraint legal_plan_items_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index legal_plan_items_plan_idx on public.legal_plan_items (plan_id);

do $$
declare
  t text;
begin
  foreach t in array array['legal_plans', 'legal_plan_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                      using (public.has_permission(organization_id, ''manage_legal'')
                             and public.can_see_project(project_id))', t || '_select_legal', t);
    execute format('create trigger a_set_updated_at before update on public.%I
                      for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- Who may answer for an item: the members holding manage_legal. Listed for
-- a caller who holds it too.
create or replace function public.list_legal_people(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
  from public.people p
  where public.has_permission(p_organization_id, 'manage_legal')
    and public.person_has_permission(p_organization_id, p.id, 'manage_legal')
  order by p.first_name, p.last_name;
$$;

revoke execute on function public.list_legal_people(uuid) from public, anon;
grant execute on function public.list_legal_people(uuid) to authenticated;

-- launch_legal_plan: stores the plan the person confirmed, active at once.
-- p_items: [{ key, kind, master_id, label, detail, status, depends_on[],
-- responsible_person_id, due_on }], built by the server from the dossier.
create or replace function public.launch_legal_plan(p_project_id uuid, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_plan uuid;
  v_item jsonb;
  v_responsible uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.legal_intakes
     where project_id = p_project_id and status = 'confirmed'
  ) then
    raise exception 'legal_intake_not_confirmed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_plans where project_id = p_project_id) then
    raise exception 'legal_plan_already_launched' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 200 then
    raise exception 'legal_plan_items_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_plans
    (organization_id, project_id, status, confirmed_by, confirmed_at, launched_by, launched_at)
  values (v_org, p_project_id, 'active', v_person, now(), v_person, now())
  returning id into v_plan;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_responsible := nullif(v_item ->> 'responsible_person_id', '')::uuid;
    -- A responsible holds manage_legal in this organization.
    if v_responsible is not null
       and not public.person_has_permission(v_org, v_responsible, 'manage_legal') then
      raise exception 'legal_plan_responsible_invalid' using errcode = 'P0001';
    end if;
    insert into public.legal_plan_items
      (organization_id, plan_id, project_id, item_key, kind, master_id, label, detail, status,
       depends_on, responsible_person_id, due_on)
    values (
      v_org, v_plan, p_project_id, v_item ->> 'key', v_item ->> 'kind',
      nullif(v_item ->> 'master_id', '')::uuid, v_item ->> 'label', v_item ->> 'detail',
      v_item ->> 'status',
      coalesce(array(select jsonb_array_elements_text(v_item -> 'depends_on')), '{}'),
      v_responsible, nullif(v_item ->> 'due_on', '')::date);
  end loop;

  return v_plan;
end;
$$;

revoke execute on function public.launch_legal_plan(uuid, jsonb) from public, anon;
grant execute on function public.launch_legal_plan(uuid, jsonb) to authenticated;
