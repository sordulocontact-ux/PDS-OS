-- Juridique, lot 9 J11 (ticket Juridique 08, proto « Projet complet », « Prêt pour
-- la sortie »): the readiness is computed by code at each read from every source
-- (lib/legal/readiness), never stored; what is stored here are the direction's
-- decisions around it — a waiver on one control (with why), the label's policy
-- (does the SACEM block?) and the final validation before The Orchard, with the
-- auditable snapshot of the controls it saw (« snapshot auditable »).
-- Readable by whoever sees the project (the Distribution reads the validation);
-- written by functions only, by a member who validates (the direction).

-- 1. Waivers ------------------------------------------------------------------------------------

create table public.release_readiness_waivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The control it lets through (« borrow:<id> », « master-final:<id> »…).
  control_key text not null,
  -- What the control was, as shown when the waiver was granted.
  control_label text not null,
  reason text not null,
  granted_by uuid not null references public.people (id),
  granted_at timestamptz not null default now(),
  constraint release_readiness_waivers_key_check
    check (control_key ~ '^[a-z0-9][a-z0-9_:.-]{0,119}$'),
  constraint release_readiness_waivers_label_check
    check (btrim(control_label) <> '' and char_length(control_label) <= 300),
  constraint release_readiness_waivers_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint release_readiness_waivers_unique unique (project_id, control_key),
  constraint release_readiness_waivers_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

-- 2. The label's policy --------------------------------------------------------------------------

create table public.release_readiness_policies (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- Off by default: a SACEM declaration not filed puts the release « À risque ».
  sacem_blocks boolean not null default false,
  updated_by uuid not null references public.people (id),
  updated_at timestamptz not null default now()
);

-- 3. The final validation ------------------------------------------------------------------------

create table public.release_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  validated_by uuid not null references public.people (id),
  validated_at timestamptz not null default now(),
  -- The controls as they stood, computed by code (lib/legal/readiness).
  snapshot jsonb not null,
  constraint release_validations_snapshot_check check (jsonb_typeof(snapshot) = 'array'),
  constraint release_validations_unique unique (project_id),
  constraint release_validations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

-- 4. Reading ------------------------------------------------------------------------------------

alter table public.release_readiness_waivers enable row level security;
alter table public.release_readiness_waivers force row level security;
revoke all on table public.release_readiness_waivers from anon, authenticated;
grant select on public.release_readiness_waivers to authenticated;
create policy release_readiness_waivers_select on public.release_readiness_waivers
  for select to authenticated using (public.can_see_project(project_id));

alter table public.release_readiness_policies enable row level security;
alter table public.release_readiness_policies force row level security;
revoke all on table public.release_readiness_policies from anon, authenticated;
grant select on public.release_readiness_policies to authenticated;
create policy release_readiness_policies_select on public.release_readiness_policies
  for select to authenticated using (public.is_active_member(organization_id));

alter table public.release_validations enable row level security;
alter table public.release_validations force row level security;
revoke all on table public.release_validations from anon, authenticated;
grant select on public.release_validations to authenticated;
create policy release_validations_select on public.release_validations
  for select to authenticated using (public.can_see_project(project_id));

create trigger zz_project_live after insert or update or delete on public.release_readiness_waivers
  for each row execute function public.project_live_tick('project');
create trigger zz_project_live after insert or update or delete on public.release_validations
  for each row execute function public.project_live_tick('project');

-- 5. Writing: the direction, by functions ---------------------------------------------------------

create or replace function public.grant_release_waiver(
  p_project_id uuid, p_control_key text, p_control_label text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'validate')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'release_waiver_reason_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.release_validations where project_id = p_project_id) then
    raise exception 'release_already_validated' using errcode = 'P0001';
  end if;
  insert into public.release_readiness_waivers
    (organization_id, project_id, control_key, control_label, reason, granted_by)
  values (v_org, p_project_id, p_control_key, left(btrim(p_control_label), 300),
          left(v_reason, 1000), v_me)
  on conflict (project_id, control_key) do update
    set reason = excluded.reason, control_label = excluded.control_label,
        granted_by = excluded.granted_by, granted_at = now();
end;
$$;

create or replace function public.set_release_policy(p_organization_id uuid, p_sacem_blocks boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.auth_person_id();
begin
  if v_me is null or not public.has_permission(p_organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.release_readiness_policies (organization_id, sacem_blocks, updated_by)
  values (p_organization_id, coalesce(p_sacem_blocks, false), v_me)
  on conflict (organization_id) do update
    set sacem_blocks = excluded.sacem_blocks, updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

-- The code decides whether anything still blocks (every source is read in
-- lib/legal/readiness and the server action refuses otherwise); the
-- database keeps who validated, when, and what the controls were.
create or replace function public.validate_release(p_project_id uuid, p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'validate')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_snapshot) > 300 then
    raise exception 'release_snapshot_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.release_validations where project_id = p_project_id) then
    raise exception 'release_already_validated' using errcode = 'P0001';
  end if;
  insert into public.release_validations (organization_id, project_id, validated_by, snapshot)
  values (v_org, p_project_id, v_me, p_snapshot);
end;
$$;

revoke execute on function public.grant_release_waiver(uuid, text, text, text) from public, anon;
grant execute on function public.grant_release_waiver(uuid, text, text, text) to authenticated;
revoke execute on function public.set_release_policy(uuid, boolean) from public, anon;
grant execute on function public.set_release_policy(uuid, boolean) to authenticated;
revoke execute on function public.validate_release(uuid, jsonb) from public, anon;
grant execute on function public.validate_release(uuid, jsonb) to authenticated;
