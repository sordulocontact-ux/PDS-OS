-- Juridique, lot 9 J3 (proto « Projet complet », docs/projet-complet/legal.md E4):
-- the contracts to provide for are confirmed in the Plan d'action, before
-- the launch. « Pas d'accord nécessaire » needs its reason, kept and shown;
-- changing a démarche's responsible or due date needs its reason too, kept
-- in the plan's journal (« Gardé dans l'historique »).

-- 1. Why no agreement is needed with a person -------------------------------------------------

create table public.legal_no_agreement_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  contact_id uuid not null,
  reason text not null,
  decided_by uuid not null references public.people (id),
  decided_at timestamptz not null default now(),
  constraint legal_no_agreement_reasons_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint legal_no_agreement_reasons_unique unique (project_id, contact_id),
  constraint legal_no_agreement_reasons_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint legal_no_agreement_reasons_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade
);
create index legal_no_agreement_reasons_contact_idx
  on public.legal_no_agreement_reasons (contact_id);

alter table public.legal_no_agreement_reasons enable row level security;
alter table public.legal_no_agreement_reasons force row level security;
revoke all on table public.legal_no_agreement_reasons from anon, authenticated;
grant select on public.legal_no_agreement_reasons to authenticated;
create policy legal_no_agreement_reasons_select on public.legal_no_agreement_reasons
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));

create trigger zz_project_live after insert or update or delete
  on public.legal_no_agreement_reasons
  for each row execute function public.project_live_tick('project');

-- 2. The mapping, with the reason of « Pas d'accord nécessaire » ------------------------------

create or replace function public.approve_contract_mapping(p_project_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_item jsonb;
  v_contact uuid;
  v_roles text[];
  v_template public.contract_templates%rowtype;
  v_type text;
  v_fee bigint;
  v_reason text;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then
    raise exception 'mapping_invalid';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_contact := (v_item ->> 'contact_id')::uuid;
    if not exists (select 1 from public.network_contacts
                    where id = v_contact and organization_id = v_org) then
      raise exception 'mapping_contact_invalid';
    end if;
    -- Generated already: left untouched.
    continue when exists (select 1 from public.legal_agreement_needs
                           where project_id = p_project_id and contact_id = v_contact
                             and contract_id is not null);

    if coalesce((v_item ->> 'needed')::boolean, false) is false then
      -- « Pas d'accord nécessaire » is said with its reason (proto, rule 11).
      v_reason := nullif(btrim(coalesce(v_item ->> 'reason', '')), '');
      if v_reason is null then
        raise exception 'mapping_reason_required';
      end if;
      delete from public.legal_agreement_needs
       where project_id = p_project_id and contact_id = v_contact;
      insert into public.legal_no_agreement_reasons
        (organization_id, project_id, contact_id, reason, decided_by)
      values (v_org, p_project_id, v_contact, left(v_reason, 1000), v_me)
      on conflict (project_id, contact_id) do update
        set reason = excluded.reason, decided_by = excluded.decided_by,
            decided_at = now();
      continue;
    end if;
    delete from public.legal_no_agreement_reasons
     where project_id = p_project_id and contact_id = v_contact;

    v_roles := array(select jsonb_array_elements_text(coalesce(v_item -> 'roles', '[]')));
    v_fee := nullif(v_item ->> 'fee_cents', '')::bigint;
    v_template := null;
    if nullif(v_item ->> 'template_id', '') is not null then
      select * into v_template from public.contract_templates
       where id = (v_item ->> 'template_id')::uuid and organization_id = v_org;
      if not found or v_template.status <> 'validated' then
        raise exception 'mapping_template_not_validated';
      end if;
      if not (v_template.roles && v_roles) then
        raise exception 'mapping_template_incompatible';
      end if;
      v_type := v_template.type;
    else
      v_type := coalesce(nullif(v_item ->> 'contract_type', ''), 'other');
    end if;

    insert into public.legal_agreement_needs
      (organization_id, project_id, contact_id, roles, contract_type, template_id,
       fee_cents, approved_by, approved_at)
    values (v_org, p_project_id, v_contact, v_roles, v_type, v_template.id, v_fee,
            v_me, now())
    on conflict (project_id, contact_id) do update
      set roles = excluded.roles, contract_type = excluded.contract_type,
          template_id = excluded.template_id, fee_cents = excluded.fee_cents,
          approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  end loop;

  perform public.log_contract_event(v_org, null, p_project_id, 'contract_mapping.approved');
end;
$$;
revoke execute on function public.approve_contract_mapping(uuid, jsonb) from public, anon;
grant execute on function public.approve_contract_mapping(uuid, jsonb) to authenticated;

-- 3. A delegation with its reason -------------------------------------------------------------

alter table public.legal_plan_events add column reason text;
alter table public.legal_plan_events add constraint legal_plan_events_reason_check
  check (reason is null or (btrim(reason) <> '' and char_length(reason) <= 1000));

create or replace function public.change_legal_plan_item(
  p_item_id uuid, p_responsible_person_id uuid, p_due_on date, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null then
    raise exception 'legal_plan_reason_required' using errcode = 'P0001';
  end if;
  -- Same rights and journal as update_legal_plan_item; the reason goes on
  -- the events this change wrote.
  perform public.update_legal_plan_item(p_item_id, p_responsible_person_id, p_due_on);
  update public.legal_plan_events
     set reason = left(v_reason, 1000)
   where item_id = p_item_id and created_by = public.auth_person_id()
     and created_at = now() and reason is null;
end;
$$;
revoke execute on function public.change_legal_plan_item(uuid, uuid, date, text)
  from public, anon;
grant execute on function public.change_legal_plan_item(uuid, uuid, date, text)
  to authenticated;
