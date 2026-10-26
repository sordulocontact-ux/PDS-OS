-- Distribution, recette V1 of 23/10/2026 (DIST-003, DIST-007): an early
-- closure is a decision of the direction, and a reserve lives until it is
-- lifted.
--
-- Before (20261011100601, ticket « Distribution » § 10 and its example
-- Piégée): a closure with reserves could be proposed as soon as the deposit
-- was declared, decided by the designated validator, its reserves a label
-- and a detail. The recette asks (latest feedback wins):
--
-- 1. A closure with reserves follows the acceptance by The Orchard. Before
--    it, only an exceptional decision of the direction: « Annulée »,
--    « Abandonnée », or « Clôturée avec réserves » ahead of time — each with
--    a typed reason and the arbitration, decided by a holder of
--    `administer`. Cancelled and abandoned are distinct kinds.
-- 2. Each reserve has a category, a criticality, an owner (a member), a
--    deadline, the proof expected, and a status. Once the closure is
--    decided they become rows (distribution_reserves) followed until lifted.
-- 3. Lifting a reserve needs a proof, then the check of another person
--    (the owner of the project or the validator, never the one who asked).
-- 4. A reserve past its deadline is flagged by the daily job
--    (flag_overdue_distribution_reserves, the cron's service role only) and
--    its owner and the closure's decider are told (by trigger).

-- ------------------------------------------------------------ helpers

create or replace function public.distribution_is_member(
  p_organization_id uuid,
  p_person_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
     where m.organization_id = p_organization_id
       and m.person_id = p_person_id
       and m.status = 'approved');
$$;

revoke execute on function public.distribution_is_member(uuid, uuid) from public, anon;
grant execute on function public.distribution_is_member(uuid, uuid) to authenticated;

-- The current version accepted by The Orchard, and not asked for
-- corrections since (the rule of distribution_closure_ready).
create or replace function public.distribution_accepted(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with v as (select public.distribution_current_version(p_project_id) as number),
  a as (
    select max(d.declared_at) as at from public.distribution_declarations d, v
     where d.project_id = p_project_id and d.version_number = v.number
       and d.withdrawn_at is null and d.kind = 'accepted')
  select a.at is not null and not exists (
      select 1 from public.distribution_declarations d, v
       where d.project_id = p_project_id and d.version_number = v.number
         and d.withdrawn_at is null and d.kind = 'corrections_requested'
         and d.declared_at > a.at)
    from a;
$$;

revoke execute on function public.distribution_accepted(uuid) from public, anon;
grant execute on function public.distribution_accepted(uuid) to authenticated;

-- ------------------------------------------------------------ 1. kinds

alter table public.distribution_closures
  drop constraint distribution_closures_kind_check,
  drop constraint distribution_closures_reserves_check,
  alter column version_number drop not null,
  add column reason_kind text,
  -- Closed with reserves before The Orchard accepted: the direction's call.
  add column early boolean not null default false;

alter table public.distribution_closures
  add constraint distribution_closures_kind_check
    check (kind in ('normal', 'reserves', 'cancelled', 'abandoned')),
  add constraint distribution_closures_reserves_check check (
    jsonb_typeof(reserves) = 'array'
    and (kind = 'reserves') = (jsonb_array_length(reserves) > 0)),
  add constraint distribution_closures_reason_kind_check check (
    reason_kind is null or reason_kind in ('release_cancelled', 'artist_withdrawal',
      'rights_issue', 'distributor_refusal', 'direction_decision', 'other')),
  add constraint distribution_closures_direction check (
    (kind in ('cancelled', 'abandoned') or early) = (reason_kind is not null)),
  add constraint distribution_closures_early_check check (not early or kind = 'reserves');

-- ------------------------------------------------------------ 2. reserves

create table public.distribution_reserves (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  closure_id uuid not null references public.distribution_closures (id) on delete cascade,
  position integer not null,
  -- distributor, availability, compliance, checks, anomalies.
  category text not null,
  label text not null,
  details jsonb not null default '[]'::jsonb,
  criticality text not null,
  owner_person_id uuid not null references public.people (id),
  due_on date not null,
  expected_proof text not null,
  status text not null default 'open',
  lift_note text,
  lift_proof_path text,
  lift_proof_name text,
  lift_proof_url text,
  lift_requested_by uuid references public.people (id),
  lift_requested_at timestamptz,
  lifted_by uuid references public.people (id),
  lifted_at timestamptz,
  -- The last refusal of a lift, said to whoever asks again.
  lift_refusal_note text,
  overdue_at timestamptz,
  created_at timestamptz not null default now(),
  constraint distribution_reserves_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_reserves_category_check check (category in (
    'distributor', 'availability', 'compliance', 'checks', 'anomalies')),
  constraint distribution_reserves_criticality_check
    check (criticality in ('minor', 'major', 'critical')),
  constraint distribution_reserves_status_check
    check (status in ('open', 'lift_requested', 'lifted')),
  constraint distribution_reserves_texts check (
    char_length(btrim(label)) between 1 and 300
    and char_length(btrim(expected_proof)) between 1 and 500
    and (lift_note is null or char_length(lift_note) <= 1000)
    and (lift_refusal_note is null or char_length(lift_refusal_note) <= 1000)),
  constraint distribution_reserves_details check (jsonb_typeof(details) = 'array'),
  constraint distribution_reserves_lift_requested check (
    (status = 'open') = (lift_requested_at is null)
    and (lift_requested_at is null) = (lift_requested_by is null)
    and (lift_requested_at is null
         or lift_proof_path is not null or lift_proof_url is not null)),
  constraint distribution_reserves_lifted check (
    (status = 'lifted') = (lifted_at is not null)
    and (lifted_at is null) = (lifted_by is null)
    and (lifted_by is null or lifted_by is distinct from lift_requested_by)),
  constraint distribution_reserves_proof_path check (
    lift_proof_path is null or lift_proof_path ~ ('^' || organization_id::text || '/'
      || project_id::text || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint distribution_reserves_proof_name check (
    (lift_proof_path is null) = (lift_proof_name is null)
    and (lift_proof_name is null or char_length(lift_proof_name) between 1 and 255)),
  constraint distribution_reserves_proof_url check (
    lift_proof_url is null or (char_length(lift_proof_url) <= 2048
      and lift_proof_url ~ '^https://\S+$')),
  constraint distribution_reserves_position unique (closure_id, position)
);

create index distribution_reserves_project_idx
  on public.distribution_reserves (project_id, closure_id);
create index distribution_reserves_due_idx
  on public.distribution_reserves (due_on) where status <> 'lifted' and overdue_at is null;

alter table public.distribution_reserves enable row level security;
alter table public.distribution_reserves force row level security;
revoke all on table public.distribution_reserves from anon, authenticated;
grant select on table public.distribution_reserves to authenticated;

create policy distribution_reserves_select on public.distribution_reserves
  for select to authenticated
  using (public.can_see_project(project_id));

-- The reserves proposed, read back strictly: every one carries what the
-- recette asks, its owner a member, its deadline not in the past.
create or replace function public.distribution_reserves_valid(
  p_organization_id uuid,
  p_reserves jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  if p_reserves is null or jsonb_typeof(p_reserves) <> 'array'
     or jsonb_array_length(p_reserves) = 0 then
    return false;
  end if;
  for r in select x from jsonb_array_elements(p_reserves) x loop
    if jsonb_typeof(r) <> 'object'
       or coalesce(r ->> 'cause', '') not in ('distributor', 'availability', 'compliance',
            'checks', 'anomalies')
       or char_length(btrim(coalesce(r ->> 'label', ''))) not between 1 and 300
       or jsonb_typeof(coalesce(r -> 'details', 'null'::jsonb)) <> 'array'
       or coalesce(r ->> 'criticality', '') not in ('minor', 'major', 'critical')
       or char_length(btrim(coalesce(r ->> 'expectedProof', ''))) not between 1 and 500
       or coalesce(r ->> 'dueOn', '') !~ '^\d{4}-\d{2}-\d{2}$'
       or (r ->> 'dueOn')::date < current_date
       or coalesce(r ->> 'ownerPersonId', '') !~ '^[0-9a-f-]{36}$'
       or not public.distribution_is_member(p_organization_id, (r ->> 'ownerPersonId')::uuid) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke execute on function public.distribution_reserves_valid(uuid, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------ propose, decide

drop function public.propose_distribution_closure(uuid, text, jsonb, text);

create function public.propose_distribution_closure(
  p_project_id uuid,
  p_kind text,
  p_reserves jsonb,
  p_arbitration text,
  p_reason_kind text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.distribution_dossiers%rowtype;
  v_version integer;
  v_deposited boolean;
  v_accepted boolean;
  v_early boolean := false;
  v_arbitration text := nullif(btrim(coalesce(p_arbitration, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason_kind, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind not in ('normal', 'reserves', 'cancelled', 'abandoned') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into v_dossier from public.distribution_dossiers where project_id = p_project_id;
  if not found or v_dossier.validator_person_id is null
     or not public.person_has_permission(v_dossier.organization_id,
              v_dossier.validator_person_id, 'validate') then
    raise exception 'no_validator' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_closures
              where project_id = p_project_id
                and (status = 'pending' or (status = 'closed' and reopened_at is null))) then
    raise exception 'closure_open' using errcode = 'P0001';
  end if;
  v_version := public.distribution_current_version(p_project_id);
  v_deposited := v_version is not null and exists (
    select 1 from public.distribution_declarations
     where project_id = p_project_id and version_number = v_version
       and kind = 'deposit' and withdrawn_at is null);
  v_accepted := v_deposited and public.distribution_accepted(p_project_id);
  if p_kind in ('normal', 'reserves') and not v_deposited then
    raise exception 'not_deposited' using errcode = 'P0001';
  end if;
  if p_kind = 'normal' and not public.distribution_closure_ready(p_project_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  if p_kind = 'reserves' and not v_accepted then
    -- Before The Orchard accepted: only the direction, for a typed reason.
    if v_reason is null then
      raise exception 'not_accepted' using errcode = 'P0001';
    end if;
    v_early := true;
  end if;
  if p_kind in ('cancelled', 'abandoned') and v_reason is null then
    raise exception 'reason_kind_required' using errcode = 'P0001';
  end if;
  if p_kind <> 'normal' and v_arbitration is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_kind = 'reserves'
     and not public.distribution_reserves_valid(v_dossier.organization_id, p_reserves) then
    raise exception 'reserves_invalid' using errcode = 'P0001';
  end if;
  insert into public.distribution_closures (organization_id, project_id, version_number,
    kind, reserves, arbitration, proposed_by, validator_person_id, reason_kind, early)
  values (v_dossier.organization_id, p_project_id, v_version, p_kind,
    case when p_kind = 'reserves' then p_reserves else '[]'::jsonb end,
    case when p_kind = 'normal' then null else v_arbitration end,
    public.auth_person_id(), v_dossier.validator_person_id,
    case when p_kind in ('cancelled', 'abandoned') or v_early then v_reason end,
    v_early);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'closure.proposed', jsonb_build_object('kind', p_kind, 'version', v_version,
      'early', v_early, 'reason_kind', v_reason,
      'reserves', case when p_kind = 'reserves' then jsonb_array_length(p_reserves) else 0 end));
end;
$$;

revoke execute on function public.propose_distribution_closure(uuid, text, jsonb, text, text) from public, anon;
grant execute on function public.propose_distribution_closure(uuid, text, jsonb, text, text) to authenticated;

-- Who decides: the designated validator, or the direction for a closure
-- ahead of time (cancelled, abandoned, early reserves).
create or replace function public.decide_distribution_closure(
  p_closure_id uuid,
  p_approve boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_closures%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_direction boolean;
begin
  select * into v_row from public.distribution_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'closure_not_found' using errcode = 'P0001';
  end if;
  v_direction := v_row.kind in ('cancelled', 'abandoned') or v_row.early;
  if v_direction then
    if not public.has_permission(v_row.organization_id, 'administer') then
      raise exception 'not_direction' using errcode = '42501';
    end if;
  elsif v_row.validator_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_row.organization_id, 'validate') then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'already_decided' using errcode = 'P0001';
  end if;
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_approve and v_row.kind = 'normal'
     and not public.distribution_closure_ready(v_row.project_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  update public.distribution_closures
     set status = case when p_approve then 'closed' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note
   where id = p_closure_id;
  if p_approve and v_row.kind = 'reserves' then
    insert into public.distribution_reserves (organization_id, project_id, closure_id,
      position, category, label, details, criticality, owner_person_id, due_on,
      expected_proof)
    select v_row.organization_id, v_row.project_id, v_row.id, x.ord::integer,
      x.r ->> 'cause', btrim(x.r ->> 'label'), coalesce(x.r -> 'details', '[]'::jsonb),
      x.r ->> 'criticality', (x.r ->> 'ownerPersonId')::uuid, (x.r ->> 'dueOn')::date,
      btrim(x.r ->> 'expectedProof')
      from jsonb_array_elements(v_row.reserves) with ordinality as x(r, ord);
  end if;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    case when p_approve then 'closure.closed' else 'closure.rejected' end,
    jsonb_build_object('kind', v_row.kind, 'note', v_note, 'early', v_row.early));
end;
$$;

-- ------------------------------------------------------------ 3. lifting

select public.add_notification_kinds(array['distribution_reserve_lift_requested',
  'distribution_reserve_lift_decided', 'distribution_reserve_overdue']);

-- « Lever la réserve »: its owner or the project's owner, with the proof.
create or replace function public.request_distribution_reserve_lift(
  p_reserve_id uuid,
  p_note text,
  p_proof_path text,
  p_proof_name text,
  p_proof_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_reserves%rowtype;
  v_path text := nullif(p_proof_path, '');
  v_url text := nullif(btrim(coalesce(p_proof_url, '')), '');
begin
  select * into v_row from public.distribution_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v_row.project_id)
     or not (v_row.owner_person_id = public.auth_person_id()
             or public.is_project_owner(v_row.project_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'open' then
    raise exception 'not_open' using errcode = 'P0001';
  end if;
  if v_path is null and v_url is null then
    raise exception 'proof_required' using errcode = 'P0001';
  end if;
  update public.distribution_reserves
     set status = 'lift_requested', lift_note = nullif(btrim(coalesce(p_note, '')), ''),
         lift_proof_path = v_path,
         lift_proof_name = case when v_path is null then null
                                else nullif(btrim(coalesce(p_proof_name, '')), '') end,
         lift_proof_url = v_url,
         lift_requested_by = public.auth_person_id(), lift_requested_at = now()
   where id = p_reserve_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'reserve.lift_requested', jsonb_build_object('id', v_row.id, 'label', v_row.label));
end;
$$;

revoke execute on function public.request_distribution_reserve_lift(uuid, text, text, text, text) from public, anon;
grant execute on function public.request_distribution_reserve_lift(uuid, text, text, text, text) to authenticated;

-- « Confirmer la levée » / « Refuser »: another person than the one who
-- asked — the project's owner, the validator, or the direction.
create or replace function public.decide_distribution_reserve_lift(
  p_reserve_id uuid,
  p_approve boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_reserves%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.distribution_reserves where id = p_reserve_id for update;
  if not found or not (public.can_check_distribution(v_row.project_id)
       or (public.can_see_project(v_row.project_id)
           and public.has_permission(v_row.organization_id, 'administer'))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'lift_requested' then
    raise exception 'not_requested' using errcode = 'P0001';
  end if;
  if v_row.lift_requested_by = public.auth_person_id() then
    raise exception 'same_person' using errcode = 'P0001';
  end if;
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.distribution_reserves
       set status = 'lifted', lifted_by = public.auth_person_id(), lifted_at = now()
     where id = p_reserve_id;
  else
    update public.distribution_reserves
       set status = 'open', lift_refusal_note = v_note, lift_note = null,
           lift_proof_path = null, lift_proof_name = null, lift_proof_url = null,
           lift_requested_by = null, lift_requested_at = null
     where id = p_reserve_id;
  end if;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    case when p_approve then 'reserve.lifted' else 'reserve.lift_refused' end,
    jsonb_build_object('id', v_row.id, 'label', v_row.label, 'note', v_note,
      'proof_path', v_row.lift_proof_path, 'proof_url', v_row.lift_proof_url));
end;
$$;

revoke execute on function public.decide_distribution_reserve_lift(uuid, boolean, text) from public, anon;
grant execute on function public.decide_distribution_reserve_lift(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------ 4. overdue

-- The daily job: reserves of a standing closure past their deadline.
create or replace function public.flag_overdue_distribution_reserves()
returns integer
language sql
security definer
set search_path = ''
as $$
  with flagged as (
    update public.distribution_reserves r
       set overdue_at = now()
      from public.distribution_closures c
     where c.id = r.closure_id and c.status = 'closed' and c.reopened_at is null
       and r.status <> 'lifted' and r.overdue_at is null
       and r.due_on < (now() at time zone 'Europe/Paris')::date
    returning r.id)
  select count(*)::integer from flagged;
$$;

revoke execute on function public.flag_overdue_distribution_reserves() from public, anon, authenticated;
grant execute on function public.flag_overdue_distribution_reserves() to service_role;

create or replace function public.distribution_reserve_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closure public.distribution_closures%rowtype;
  v_owner uuid;
begin
  select * into v_closure from public.distribution_closures where id = new.closure_id;
  select owner_person_id into v_owner from public.projects where id = new.project_id;
  if new.overdue_at is not null and old.overdue_at is null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select new.organization_id, p, null, 'distribution_reserve_overdue', new.project_id, new.id
      from (select distinct unnest(array[new.owner_person_id, v_closure.decided_by]) as p) x
     where p is not null;
  elsif new.status = 'lift_requested' and old.status = 'open' then
    -- The one who checks: the project's owner, else the closure's decider.
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select new.organization_id, p, new.lift_requested_by,
           'distribution_reserve_lift_requested', new.project_id, new.id
      from (select case when v_owner is distinct from new.lift_requested_by then v_owner
                        else v_closure.decided_by end as p) x
     where p is not null and p is distinct from new.lift_requested_by;
  elsif old.status = 'lift_requested' and new.status <> 'lift_requested'
        and old.lift_requested_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, old.lift_requested_by, public.auth_person_id(),
            'distribution_reserve_lift_decided', new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.distribution_reserve_notify() from public, anon, authenticated;

create trigger z_notify after update on public.distribution_reserves
  for each row execute function public.distribution_reserve_notify();

select public.attach_project_live();
