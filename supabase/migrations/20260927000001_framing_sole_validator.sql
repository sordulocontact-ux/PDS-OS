-- In V1 there is exactly one validator: the holder of "validate" (the
-- general director). Asking the owner to pick one among a list of active
-- members no longer matches the org (docs/CONTEXTE-PROJET.md § 10, question
-- 2 — resolved by Sacha, 27/09/2026): request_validation resolves the
-- validator itself instead of receiving it from the client, and refuses
-- explicitly rather than guessing if the org is ever misconfigured (no
-- director, or more than one).

-- Resolves the validator for an organization: exactly one holder of
-- "validate" among active members, or an explicit error otherwise.
create or replace function public.sole_validator(p_organization_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  select array_agg(p.id) into v_ids
  from public.people p
  where public.is_active_member(p_organization_id)
    and public.person_has_permission(p_organization_id, p.id, 'validate');

  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'no_validator';
  end if;
  if array_length(v_ids, 1) > 1 then
    raise exception 'multiple_validators';
  end if;
  return v_ids[1];
end;
$$;

revoke execute on function public.sole_validator(uuid) from public, anon;
grant execute on function public.sole_validator(uuid) to authenticated;

-- The old 3-argument signature (client-chosen validator) is replaced, not
-- overloaded: `create or replace` cannot change a function's argument
-- types, so the previous version must be dropped explicitly or it would
-- keep existing, unprotected by sole_validator.
drop function if exists public.request_validation(uuid, uuid, text);

-- in_progress → awaiting_validation, validator resolved by sole_validator.
create or replace function public.request_validation(
  p_stage_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_validator_person_id uuid;
  v_id uuid;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'in_progress' then
    raise exception 'invalid_transition';
  end if;

  v_validator_person_id := public.sole_validator(v_stage.organization_id);

  insert into public.validations
    (organization_id, project_stage_id, requested_by, validator_person_id, request_note)
  values
    (v_stage.organization_id, p_stage_id, public.auth_person_id(), v_validator_person_id,
     nullif(btrim(p_note), ''))
  returning id into v_id;

  update public.project_stages
     set state = 'awaiting_validation', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = p_stage_id;
  return v_id;
end;
$$;

revoke execute on function public.request_validation(uuid, text) from public, anon;
grant execute on function public.request_validation(uuid, text) to authenticated;
