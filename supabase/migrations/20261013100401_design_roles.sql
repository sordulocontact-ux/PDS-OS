-- Retours Marketing du 12/10/2026, MKT-C2-08 (docs/ARCHITECTURE.md § 8 decies,
-- « Rôles, délégations et approbations »).
--
--   1. Approval is apart from creation: nobody approves what they submitted
--      or deposited themselves — a direction or sheet version, an old design
--      version — unless the project's governance explicitly allows it
--      (`design_workspaces.allow_self_approval`, set by a validator, logged).
--   2. Delegation: the project's owner hands a responsible's or a
--      validator's role on a scope (the direction, or one sheet) to another
--      member, with a reason and dates; the delegate then acts as that role
--      — edits and submits, or decides — while the delegation is active.
--      Revoked, never deleted.
--   3. Audit: delegations (given, revoked), the governance switch and the
--      old design versions (deposited, reviewed) go to design_events, like
--      submissions and decisions already do.

-- 1. Governance ----------------------------------------------------------------------

alter table public.design_workspaces
  add column allow_self_approval boolean not null default false;

create or replace function public.set_design_self_approval(
  p_project_id uuid,
  p_allow boolean,
  p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select organization_id into v_org from public.design_workspaces where project_id = p_project_id;
  if v_org is null or not public.has_permission(v_org, 'validate')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  update public.design_workspaces set allow_self_approval = p_allow where project_id = p_project_id;
  perform public.design_log(v_org, p_project_id,
    case when p_allow then 'governance.self_approval_allowed' else 'governance.self_approval_refused' end,
    null, null, jsonb_build_object('reason', v_reason));
end;
$$;
revoke execute on function public.set_design_self_approval(uuid, boolean, text) from public, anon;
grant execute on function public.set_design_self_approval(uuid, boolean, text) to authenticated;

-- 2. Delegations ---------------------------------------------------------------------

create table public.design_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  scope text not null,
  sheet_id uuid references public.design_sheets (id) on delete cascade,
  role text not null,
  from_person_id uuid not null references public.people (id),
  to_person_id uuid not null references public.people (id),
  reason text not null,
  starts_on date not null,
  ends_on date not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  revoked_by uuid references public.people (id),
  revoked_at timestamptz,
  constraint design_delegations_scope_check
    check ((scope = 'direction' and sheet_id is null) or (scope = 'sheet' and sheet_id is not null)),
  constraint design_delegations_role_check check (role in ('responsible', 'validator')),
  constraint design_delegations_dates check (ends_on >= starts_on),
  constraint design_delegations_reason check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint design_delegations_people check (from_person_id <> to_person_id),
  constraint design_delegations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index design_delegations_project_idx on public.design_delegations (project_id);
alter table public.design_delegations enable row level security;
alter table public.design_delegations force row level security;
revoke all on table public.design_delegations from anon, authenticated;
grant select on public.design_delegations to authenticated;
create policy design_delegations_select on public.design_delegations
  for select to authenticated using (public.can_see_project(project_id));

-- The current person acts as `p_role` on the scope through a delegation
-- active today (Paris).
create or replace function public.design_delegated(
  p_project_id uuid, p_scope text, p_sheet_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.design_delegations d
     where d.project_id = p_project_id and d.scope = p_scope
       and d.sheet_id is not distinct from p_sheet_id and d.role = p_role
       and d.to_person_id = public.auth_person_id() and d.revoked_at is null
       and (now() at time zone 'Europe/Paris')::date between d.starts_on and d.ends_on);
$$;
revoke execute on function public.design_delegated(uuid, text, uuid, text) from public, anon;
grant execute on function public.design_delegated(uuid, text, uuid, text) to authenticated;

-- The owner delegates the role a person holds on a scope (the direction or
-- one sheet) to another member, with a reason and dates.
create or replace function public.delegate_design_role(
  p_project_id uuid, p_scope text, p_sheet_id uuid, p_role text,
  p_from uuid, p_to uuid, p_reason text, p_starts date, p_ends date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.design_workspaces where project_id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id)
     or not public.design_is_in_progress(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_scope not in ('direction', 'sheet') or p_role not in ('responsible', 'validator')
     or (p_scope = 'sheet') <> (p_sheet_id is not null)
     or p_starts is null or p_ends is null or p_ends < p_starts
     or p_ends < (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_delegation' using errcode = '23514';
  end if;
  -- The person delegating holds that role on that scope now.
  if (p_role = 'responsible' and not exists (
        select 1 from public.design_assignments a
         where a.project_id = p_project_id and a.scope = p_scope
           and a.sheet_id is not distinct from p_sheet_id and a.ended_at is null
           and a.person_id = p_from))
     or (p_role = 'validator' and not exists (
        select 1 from public.design_validators x
         where x.project_id = p_project_id and x.scope = p_scope
           and x.sheet_id is not distinct from p_sheet_id and x.person_id = p_from)) then
    raise exception 'invalid_delegation' using errcode = '23514';
  end if;
  -- Same rule as a designation: a member who can see the project, or who
  -- does creative work (then added to the project's creative team).
  perform public.design_person_check(p_project_id, p_to);
  insert into public.design_delegations
    (organization_id, project_id, scope, sheet_id, role, from_person_id, to_person_id,
     reason, starts_on, ends_on, created_by)
  values (v_org, p_project_id, p_scope, p_sheet_id, p_role, p_from, p_to,
          btrim(coalesce(p_reason, '')), p_starts, p_ends, public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.delegate_design_role(uuid, text, uuid, text, uuid, uuid, text, date, date) from public, anon;
grant execute on function public.delegate_design_role(uuid, text, uuid, text, uuid, uuid, text, date, date) to authenticated;

create or replace function public.revoke_design_delegation(p_delegation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_delegations%rowtype;
begin
  select * into v from public.design_delegations where id = p_delegation_id for update;
  if v.id is null or not public.is_project_owner(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.revoked_at is not null then
    return;
  end if;
  update public.design_delegations
     set revoked_at = now(), revoked_by = public.auth_person_id()
   where id = p_delegation_id;
end;
$$;
revoke execute on function public.revoke_design_delegation(uuid) from public, anon;
grant execute on function public.revoke_design_delegation(uuid) to authenticated;

-- 3. Audit of delegations and old design versions ----------------------------------------

create or replace function public.design_audit_extra()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'design_delegations' then
    if tg_op = 'INSERT' then
      perform public.design_log(new.organization_id, new.project_id, 'delegation.given', new.sheet_id,
        new.to_person_id, jsonb_build_object('role', new.role, 'scope', new.scope,
          'from', new.from_person_id, 'reason', new.reason,
          'starts_on', new.starts_on, 'ends_on', new.ends_on));
    elsif old.revoked_at is null and new.revoked_at is not null then
      perform public.design_log(new.organization_id, new.project_id, 'delegation.revoked', new.sheet_id,
        new.to_person_id, jsonb_build_object('role', new.role, 'scope', new.scope));
    end if;
  elsif tg_table_name = 'design_versions' then
    if tg_op = 'INSERT' then
      perform public.design_log(new.organization_id, new.project_id, 'design_version.deposited', null,
        new.id, jsonb_build_object('number', new.number, 'deliverable_id', new.deliverable_id));
    elsif old.status is distinct from new.status then
      perform public.design_log(new.organization_id, new.project_id, 'design_version.' || new.status, null,
        new.id, jsonb_build_object('number', new.number, 'comment', new.review_comment));
    end if;
  end if;
  return new;
end;
$$;
create trigger z_audit after insert or update on public.design_delegations
  for each row execute function public.design_audit_extra();
create trigger z_audit after insert or update of status on public.design_versions
  for each row execute function public.design_audit_extra();

-- 4. Rights follow assignments and active delegations; approval apart ---------------------

create or replace function public.design_is_responsible(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.design_assignments a
                 where a.project_id = p_project_id and a.ended_at is null
                   and a.person_id = public.auth_person_id())
      or exists (select 1 from public.design_delegations d
                 where d.project_id = p_project_id and d.role = 'responsible'
                   and d.to_person_id = public.auth_person_id() and d.revoked_at is null
                   and (now() at time zone 'Europe/Paris')::date between d.starts_on and d.ends_on);
$function$;

create or replace function public.design_sheet_can_edit(p_sheet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.design_sheets s
    where s.id = p_sheet_id
      and public.design_is_in_progress(s.project_id)
      and (public.is_project_owner(s.project_id)
           or exists (select 1 from public.design_assignments a
                      where a.sheet_id = s.id and a.ended_at is null
                        and a.person_id = public.auth_person_id())
           or public.design_delegated(s.project_id, 'sheet', s.id, 'responsible'))
      and not exists (select 1 from public.design_submissions x
                      where x.sheet_id = s.id and x.status = 'pending'));
$function$;

create or replace function public.submit_design_sheet(p_sheet_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_sheets%rowtype;
  v_mode text;
  v_sections text[];
  v_id uuid;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not (public.is_project_owner(v.project_id) or exists (
            select 1 from public.design_assignments a
            where a.sheet_id = v.id and a.ended_at is null
              and a.person_id = public.auth_person_id())
          or public.design_delegated(v.project_id, 'sheet', v.id, 'responsible')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked';
  end if;
  if not exists (select 1 from public.design_assignments a
                 where a.sheet_id = v.id and a.ended_at is null) then
    raise exception 'responsible_required';
  end if;
  if not exists (select 1 from public.design_validators x where x.sheet_id = v.id) then
    raise exception 'validator_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v.id::text));
  if exists (select 1 from public.design_submissions s
             where s.sheet_id = v.id and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  -- A series follows its own tracking when set (MKT-C2-07): grouped = one
  -- decision, decomposed = one per item; else the project's mode.
  select case v.tracking when 'global' then 'global'
                         when 'per_item' then 'per_section'
                         else w.validation_mode end
    into v_mode from public.design_workspaces w
   where w.project_id = v.project_id;
  select array['sheet'] || coalesce(array_agg(i.id::text order by i.number), '{}')
    into v_sections from public.design_sheet_items i where i.sheet_id = v.id;
  insert into public.design_submissions
    (organization_id, project_id, kind, sheet_id, number, sections, snapshot, mode, submitted_by)
  values (v.organization_id, v.project_id, 'sheet', v.id,
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where sheet_id = v.id),
          v_sections, public.design_sheet_snapshot(v.id),
          coalesce(v_mode, 'per_section'), public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.submit_design_direction(p_project_id uuid, p_sections text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_mode text;
  v_id uuid;
begin
  if not (public.is_project_owner(p_project_id) or exists (
            select 1 from public.design_assignments a
            where a.project_id = p_project_id and a.scope = 'direction' and a.ended_at is null
              and a.person_id = public.auth_person_id())
          or public.design_delegated(p_project_id, 'direction', null, 'responsible')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(p_project_id) then
    raise exception 'stage_locked';
  end if;
  if cardinality(coalesce(p_sections, '{}')) = 0 or exists (
       select 1 from unnest(p_sections) s
       where s <> 'direction' and not exists (
         select 1 from public.design_deliverables d
         where d.id::text = s and d.project_id = p_project_id)) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if not exists (select 1 from public.design_validators v
                 where v.project_id = p_project_id and v.scope = 'direction') then
    raise exception 'validator_required';
  end if;
  select w.validation_mode, w.organization_id into v_mode, v_org
    from public.design_workspaces w where w.project_id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || 'direction'));
  if exists (select 1 from public.design_submissions s
             where s.project_id = p_project_id and s.kind = 'direction' and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  insert into public.design_submissions
    (organization_id, project_id, kind, number, sections, snapshot, mode, submitted_by)
  values (v_org, p_project_id, 'direction',
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where project_id = p_project_id and kind = 'direction'),
          p_sections, public.design_direction_snapshot(p_project_id, p_sections),
          coalesce(v_mode, 'per_section'), public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.decide_design_submission(p_submission_id uuid, p_section text, p_decision text, p_comment text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_submissions%rowtype;
  v_section text := coalesce(p_section, '');
  v_decided integer;
  v_status text;
begin
  select * into v from public.design_submissions where id = p_submission_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'submission_not_found';
  end if;
  if not exists (select 1 from public.design_validators x
                 where x.project_id = v.project_id and x.scope = v.kind
                   and x.sheet_id is not distinct from v.sheet_id
                   and x.person_id = public.auth_person_id())
     and not public.design_delegated(v.project_id, v.kind, v.sheet_id, 'validator') then
    raise exception 'not_a_validator' using errcode = '42501';
  end if;
  -- MKT-C2-08: nobody approves what they submitted, unless the governance
  -- of the project explicitly allows it.
  if v.submitted_by = public.auth_person_id() and not coalesce((
       select w.allow_self_approval from public.design_workspaces w
        where w.project_id = v.project_id), false) then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  if (v.mode = 'global' and v_section <> '')
     or (v.mode = 'per_section' and not (v_section = any (v.sections))) then
    raise exception 'invalid_sections' using errcode = '23514';
  end if;
  if p_decision <> 'approved' and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;
  insert into public.design_decisions
    (organization_id, project_id, submission_id, section, decision, comment, decided_by)
  values (v.organization_id, v.project_id, v.id, v_section, p_decision,
          nullif(btrim(coalesce(p_comment, '')), ''), public.auth_person_id());

  select count(*) into v_decided from public.design_decisions d where d.submission_id = v.id;
  if v.mode = 'per_section' and v_decided < cardinality(v.sections) then
    return;
  end if;
  select case when bool_or(d.decision = 'rejected') then 'rejected'
              when bool_or(d.decision = 'changes_requested') then 'changes_requested'
              else 'approved' end
    into v_status from public.design_decisions d where d.submission_id = v.id;
  update public.design_submissions set status = v_status, closed_at = now() where id = v.id;
end;
$function$;

create or replace function public.review_design_version(p_version_id uuid, p_approve boolean, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_versions%rowtype;
begin
  select * into v from public.design_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  -- MKT-C2-08: the owner never reviews a version they deposited, unless
  -- the governance of the project explicitly allows it.
  if v.created_by = public.auth_person_id() and not coalesce((
       select w.allow_self_approval from public.design_workspaces w
        where w.project_id = v.project_id), false) then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if v.status <> 'submitted' then
    raise exception 'invalid_transition';
  end if;
  if exists (select 1 from public.design_versions o
             where o.project_id = v.project_id
               and o.deliverable_id is not distinct from v.deliverable_id
               and o.number > v.number) then
    raise exception 'version_superseded';
  end if;
  if not p_approve and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;

  update public.design_versions
     set status = case when p_approve then 'approved' else 'changes_requested' end,
         review_comment = nullif(btrim(coalesce(p_comment, '')), ''),
         reviewed_by = public.auth_person_id(),
         reviewed_at = now()
   where id = p_version_id;
end;
$function$;
