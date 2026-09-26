-- Stage state machine and validation requests.
--
-- States are facts produced by code (CLAUDE.md, rule 6). Clients never write
-- project_stages.state or validations directly: only these functions do, and
-- each checks the caller's membership and the allowed transition.
--
-- Generic circuit (pending the client's answer, § 10 question 2): any active
-- member can be named validator; only the named validator decides.

create table public.validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_stage_id uuid not null,
  requested_by uuid not null references public.people (id),
  validator_person_id uuid not null references public.people (id),
  state text not null default 'pending',
  request_note text,
  decision_comment text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint validations_state_check check (state in ('pending', 'approved', 'rejected')),
  constraint validations_decided check ((state = 'pending') = (decided_at is null)),
  constraint validations_rejection_reason
    check (state <> 'rejected' or btrim(coalesce(decision_comment, '')) <> ''),
  constraint validations_stage_same_org
    foreign key (project_stage_id, organization_id)
    references public.project_stages (id, organization_id)
);

-- At most one pending request per stage.
create unique index validations_one_pending
  on public.validations (project_stage_id) where state = 'pending';

-- not_started → in_progress, and validated → in_progress (reopen).
create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state not in ('not_started', 'validated') then
    raise exception 'invalid_transition';
  end if;
  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;

-- in_progress → awaiting_validation, with a named validator.
create or replace function public.request_validation(
  p_stage_id uuid,
  p_validator_person_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_id uuid;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if v_stage.state <> 'in_progress' then
    raise exception 'invalid_transition';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.person_id = p_validator_person_id
      and m.organization_id = v_stage.organization_id
      and m.status = 'approved'
  ) then
    raise exception 'validator_not_member';
  end if;

  insert into public.validations
    (organization_id, project_stage_id, requested_by, validator_person_id, request_note)
  values
    (v_stage.organization_id, p_stage_id, public.auth_person_id(), p_validator_person_id,
     nullif(btrim(p_note), ''))
  returning id into v_id;

  update public.project_stages
     set state = 'awaiting_validation', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = p_stage_id;
  return v_id;
end;
$$;

-- awaiting_validation → validated (approve) or in_progress (reject, with reason).
create or replace function public.decide_validation(
  p_validation_id uuid,
  p_approve boolean,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_validation public.validations%rowtype;
begin
  select * into v_validation from public.validations where id = p_validation_id for update;
  if not found or not public.is_active_member(v_validation.organization_id) then
    raise exception 'validation_not_found';
  end if;
  if v_validation.state <> 'pending' then
    raise exception 'already_decided';
  end if;
  if v_validation.validator_person_id is distinct from public.auth_person_id() then
    raise exception 'not_the_validator';
  end if;

  update public.validations
     set state = case when p_approve then 'approved' else 'rejected' end,
         decision_comment = nullif(btrim(p_comment), ''),
         decided_at = now()
   where id = p_validation_id;

  update public.project_stages
     set state = case when p_approve then 'validated' else 'in_progress' end,
         state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = v_validation.project_stage_id;
end;
$$;

revoke execute on function public.start_stage(uuid) from public, anon;
revoke execute on function public.request_validation(uuid, uuid, text) from public, anon;
revoke execute on function public.decide_validation(uuid, boolean, text) from public, anon;
grant execute on function public.start_stage(uuid) to authenticated;
grant execute on function public.request_validation(uuid, uuid, text) to authenticated;
grant execute on function public.decide_validation(uuid, boolean, text) to authenticated;
