-- Distribution, lot 7 (ticket « Distribution » § 6.13, § 10, CA14-CA17): the
-- closure of the follow-up, normal or with reserves, and its reopening.
--
-- distribution_closures: the owner proposes, the designated validator
-- (holder of `validate`, never the owner) decides. A normal closure needs
-- every condition met — re-checked here: deposit, reception, acceptance and
-- delivery declared, the five platforms of reference verified available and
-- compliant, the six checks recorded without « non conforme », no anomaly
-- open. Otherwise only a closure with reserves: the reserves (computed by
-- lib/distribution/closure.ts, grouped by cause with their detail) are kept
-- as proposed, with the arbitration that explains why the follow-up closes
-- anyway. A reserve is never turned into a verification: the closure stays
-- « clôturée avec réserves ». A reopening adds who, when and why, without
-- erasing the decision; a new closure is then proposed.

create table public.distribution_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  version_number integer not null,
  kind text not null,
  reserves jsonb not null default '[]'::jsonb,
  arbitration text,
  status text not null default 'pending',
  proposed_by uuid not null references public.people (id),
  proposed_at timestamptz not null default now(),
  validator_person_id uuid not null references public.people (id),
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_note text,
  reopened_by uuid references public.people (id),
  reopened_at timestamptz,
  reopen_note text,
  constraint distribution_closures_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_closures_kind_check check (kind in ('normal', 'reserves')),
  constraint distribution_closures_reserves_check check (
    jsonb_typeof(reserves) = 'array'
    and (kind = 'normal') = (jsonb_array_length(reserves) = 0)),
  constraint distribution_closures_arbitration check (
    kind = 'normal' or char_length(btrim(coalesce(arbitration, ''))) > 0),
  constraint distribution_closures_status_check
    check (status in ('pending', 'closed', 'rejected')),
  constraint distribution_closures_decided check (
    (status = 'pending') = (decided_at is null) and (decided_at is null) = (decided_by is null)),
  constraint distribution_closures_refusal check (
    status <> 'rejected' or char_length(btrim(coalesce(decision_note, ''))) > 0),
  constraint distribution_closures_reopened check (
    (reopened_at is null) = (reopened_by is null)
    and (reopened_at is null or (status = 'closed'
         and char_length(btrim(coalesce(reopen_note, ''))) > 0))),
  constraint distribution_closures_texts check (
    (arbitration is null or char_length(arbitration) <= 2000)
    and (decision_note is null or char_length(decision_note) <= 2000)
    and (reopen_note is null or char_length(reopen_note) <= 2000))
);

-- One closure at a time: pending, or closed and not reopened.
create unique index distribution_closures_one_open
  on public.distribution_closures (project_id)
  where status = 'pending' or (status = 'closed' and reopened_at is null);

alter table public.distribution_closures enable row level security;
alter table public.distribution_closures force row level security;
revoke all on table public.distribution_closures from anon, authenticated;
grant select on table public.distribution_closures to authenticated;

create policy distribution_closures_select on public.distribution_closures
  for select to authenticated
  using (public.can_see_project(project_id));

-- Every condition of a normal closure, on the current version (§ 10).
create or replace function public.distribution_closure_ready(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with v as (select public.distribution_current_version(p_project_id) as number)
  select v.number is not null
     and (select count(distinct d.kind) from public.distribution_declarations d
           where d.project_id = p_project_id and d.version_number = v.number
             and d.withdrawn_at is null
             and d.kind in ('deposit', 'received', 'accepted', 'platforms_delivered')) = 4
     and not exists (select 1 from public.distribution_declarations d
           where d.project_id = p_project_id and d.version_number = v.number
             and d.withdrawn_at is null and d.kind = 'corrections_requested'
             and d.declared_at > coalesce((select max(a.declared_at)
               from public.distribution_declarations a
              where a.project_id = p_project_id and a.version_number = v.number
                and a.withdrawn_at is null and a.kind = 'accepted'), '-infinity'))
     and (select count(*) from public.distribution_platforms p
           where p.project_id = p_project_id
             and p.platform in ('spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music')
             and p.verification = 'verified' and p.compliance = 'compliant') = 5
     and (select count(*) from public.distribution_checks c
           where c.project_id = p_project_id
             and c.result in ('compliant', 'not_applicable')) = 6
     and not exists (select 1 from public.distribution_anomalies a
           where a.project_id = p_project_id and a.state in ('open', 'in_correction'))
  from v;
$$;

revoke execute on function public.distribution_closure_ready(uuid) from public, anon;
grant execute on function public.distribution_closure_ready(uuid) to authenticated;

create or replace function public.propose_distribution_closure(
  p_project_id uuid,
  p_kind text,
  p_reserves jsonb,
  p_arbitration text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.distribution_dossiers%rowtype;
  v_version integer;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_dossier from public.distribution_dossiers where project_id = p_project_id;
  if not found or v_dossier.validator_person_id is null
     or not public.person_has_permission(v_dossier.organization_id,
              v_dossier.validator_person_id, 'validate') then
    raise exception 'no_validator' using errcode = 'P0001';
  end if;
  v_version := public.distribution_current_version(p_project_id);
  if v_version is null or not exists (
       select 1 from public.distribution_declarations
        where project_id = p_project_id and version_number = v_version
          and kind = 'deposit' and withdrawn_at is null) then
    raise exception 'not_deposited' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_closures
              where project_id = p_project_id
                and (status = 'pending' or (status = 'closed' and reopened_at is null))) then
    raise exception 'closure_open' using errcode = 'P0001';
  end if;
  if p_kind = 'normal' and not public.distribution_closure_ready(p_project_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  insert into public.distribution_closures (organization_id, project_id, version_number,
    kind, reserves, arbitration, proposed_by, validator_person_id)
  values (v_dossier.organization_id, p_project_id, v_version, p_kind,
    case when p_kind = 'normal' then '[]'::jsonb else coalesce(p_reserves, '[]'::jsonb) end,
    nullif(btrim(coalesce(p_arbitration, '')), ''),
    public.auth_person_id(), v_dossier.validator_person_id);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'closure.proposed', jsonb_build_object('kind', p_kind, 'version', v_version,
      'reserves', case when p_kind = 'normal' then 0 else jsonb_array_length(coalesce(p_reserves, '[]'::jsonb)) end));
end;
$$;

revoke execute on function public.propose_distribution_closure(uuid, text, jsonb, text) from public, anon;
grant execute on function public.propose_distribution_closure(uuid, text, jsonb, text) to authenticated;

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
begin
  select * into v_row from public.distribution_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'closure_not_found' using errcode = 'P0001';
  end if;
  if v_row.validator_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_row.organization_id, 'validate') then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'already_decided' using errcode = 'P0001';
  end if;
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  -- A normal closure is re-checked at the moment it is validated.
  if p_approve and v_row.kind = 'normal'
     and not public.distribution_closure_ready(v_row.project_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  update public.distribution_closures
     set status = case when p_approve then 'closed' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note
   where id = p_closure_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    case when p_approve then 'closure.closed' else 'closure.rejected' end,
    jsonb_build_object('kind', v_row.kind, 'note', v_note));
end;
$$;

revoke execute on function public.decide_distribution_closure(uuid, boolean, text) from public, anon;
grant execute on function public.decide_distribution_closure(uuid, boolean, text) to authenticated;

-- « Rouvrir »: the owner or the validator; the decision stays, the reopening
-- is added (§ 13).
create or replace function public.reopen_distribution_closure(
  p_project_id uuid,
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
begin
  if not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_row from public.distribution_closures
   where project_id = p_project_id and status = 'closed' and reopened_at is null
   for update;
  if not found then
    raise exception 'not_closed' using errcode = 'P0001';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.distribution_closures
     set reopened_by = public.auth_person_id(), reopened_at = now(), reopen_note = v_note
   where id = v_row.id;
  perform public.distribution_log(v_row.organization_id, p_project_id, 'closure.reopened',
    jsonb_build_object('kind', v_row.kind, 'note', v_note));
end;
$$;

revoke execute on function public.reopen_distribution_closure(uuid, text) from public, anon;
grant execute on function public.reopen_distribution_closure(uuid, text) to authenticated;
