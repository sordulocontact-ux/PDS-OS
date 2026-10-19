-- Distribution, lot D2 (proto « Projet complet », step « Paramètres de
-- distribution », docs/projet-complet/distribution.md § 1.2): the parameters
-- are confirmed in one gesture, with what PDS OS proposed.
--
-- 1. distribution_dossiers.params_confirmed_at / _by: the step is done once
--    the owner confirmed them. They stay editable until the submission of a
--    version (distribution_dossier_editable); a later change is in the
--    history, the confirmation stands.
-- 2. confirm_distribution_params(project, validator, preorder, preorder_on):
--    the owner only, while the dossier is editable. What the screen proposed
--    and nobody changed is written with the confirmation: the validator (a
--    holder of `validate`, never the owner) when none is designated, the
--    pre-order read in the Stratégie when it was never said. Refused while
--    the pre-listening or the price tier is not said (« À renseigner »), or
--    when a pre-order or a pre-listening starts on or after the release
--    (projects.due_date).
-- 3. submit_distribution_version also refuses unconfirmed parameters and a
--    borrowing not secured (distribution_legal_blockers): the server's
--    snapshot was the only guard before, now the database checks too.

alter table public.distribution_dossiers
  add column params_confirmed_at timestamptz,
  add column params_confirmed_by uuid references public.people (id),
  add constraint distribution_dossiers_params_confirmed check (
    (params_confirmed_at is null) = (params_confirmed_by is null));

create or replace function public.confirm_distribution_params(
  p_project_id uuid,
  p_validator uuid,
  p_preorder boolean,
  p_preorder_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_dossier public.distribution_dossiers%rowtype;
  v_missing text[] := '{}';
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.distribution_dossier_editable(p_project_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  insert into public.distribution_dossiers (organization_id, project_id)
  values (v_project.organization_id, p_project_id)
  on conflict (project_id) do nothing;
  select * into v_dossier from public.distribution_dossiers
   where project_id = p_project_id for update;

  -- The proposals nobody changed.
  if v_dossier.validator_person_id is null and p_validator is not null then
    if p_validator = v_project.owner_person_id
       or not public.person_has_permission(v_project.organization_id, p_validator, 'validate') then
      raise exception 'validator_invalid' using errcode = 'P0001';
    end if;
    v_dossier.validator_person_id := p_validator;
  end if;
  if v_dossier.preorder is null and p_preorder is not null then
    v_dossier.preorder := p_preorder;
    v_dossier.preorder_on := case when p_preorder then p_preorder_on end;
  end if;

  if v_dossier.preorder is null then v_missing := array_append(v_missing, 'preorder'); end if;
  if v_dossier.prelisten is null then v_missing := array_append(v_missing, 'prelisten'); end if;
  if v_dossier.price_tier is null then v_missing := array_append(v_missing, 'price_tier'); end if;
  if v_dossier.validator_person_id is null then v_missing := array_append(v_missing, 'validator'); end if;
  if cardinality(v_missing) > 0 then
    raise exception 'params_missing' using errcode = 'P0001',
      detail = array_to_string(v_missing, ',');
  end if;
  if v_project.due_date is not null and (
       (v_dossier.preorder and v_dossier.preorder_on >= v_project.due_date)
       or (v_dossier.prelisten and v_dossier.prelisten_on >= v_project.due_date)) then
    raise exception 'date_after_release' using errcode = 'P0001';
  end if;

  update public.distribution_dossiers
     set validator_person_id = v_dossier.validator_person_id,
         preorder = v_dossier.preorder,
         preorder_on = v_dossier.preorder_on,
         params_confirmed_at = now(),
         params_confirmed_by = public.auth_person_id(),
         updated_at = now()
   where id = v_dossier.id;
  perform public.distribution_log(v_project.organization_id, p_project_id,
    'dossier.parameters_confirmed',
    jsonb_build_object('validator', v_dossier.validator_person_id));
end;
$$;

revoke execute on function public.confirm_distribution_params(uuid, uuid, boolean, date) from public, anon;
grant execute on function public.confirm_distribution_params(uuid, uuid, boolean, date) to authenticated;

-- The parameters' history leaves the confirmation out: it has its own event.
create or replace function public.distribution_dossier_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_skip text[] := array['id', 'organization_id', 'project_id', 'created_by',
    'created_at', 'updated_at', 'validator_person_id', 'params_confirmed_at',
    'params_confirmed_by'];
  v_new jsonb := to_jsonb(new) - v_skip;
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) - v_skip
    else '{}'::jsonb end;
  v_changed text[];
begin
  select coalesce(array_agg(key order by key), '{}') into v_changed
    from jsonb_each(v_new) n
   where n.value is distinct from coalesce(v_old -> n.key, 'null'::jsonb);
  if cardinality(v_changed) = 0 then
    return null;
  end if;
  perform public.distribution_log(new.organization_id, new.project_id,
    'dossier.parameters_saved',
    jsonb_build_object('changed', to_jsonb(v_changed), 'values', v_new));
  return null;
end;
$$;

-- « Soumettre » : as before, and the database now refuses unconfirmed
-- parameters and a borrowing to secure.
create or replace function public.submit_distribution_version(
  p_project_id uuid,
  p_snapshot jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.distribution_dossiers%rowtype;
  v_number integer;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_dossier from public.distribution_dossiers
   where project_id = p_project_id for update;
  if not found or v_dossier.validator_person_id is null
     or not public.person_has_permission(v_dossier.organization_id,
              v_dossier.validator_person_id, 'validate') then
    raise exception 'no_validator' using errcode = 'P0001';
  end if;
  if v_dossier.params_confirmed_at is null then
    raise exception 'params_not_confirmed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_legal_blockers(p_project_id)) then
    raise exception 'legal_blockers' using errcode = 'P0001';
  end if;
  if not public.distribution_dossier_editable(p_project_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_checks
              where project_id = p_project_id and result = 'non_compliant') then
    raise exception 'checks_non_compliant' using errcode = 'P0001';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select coalesce(max(number), 0) + 1 into v_number
    from public.distribution_versions where project_id = p_project_id;
  insert into public.distribution_versions (organization_id, project_id, number,
    snapshot, submitted_by, validator_person_id)
  values (v_dossier.organization_id, p_project_id, v_number, p_snapshot,
    public.auth_person_id(), v_dossier.validator_person_id);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'version.submitted', jsonb_build_object('number', v_number,
      'validator', v_dossier.validator_person_id));
  return v_number;
end;
$$;

-- The dossiers already submitted had their parameters confirmed de facto.
update public.distribution_dossiers d
   set params_confirmed_at = v.submitted_at, params_confirmed_by = v.submitted_by
  from (select distinct on (project_id) project_id, submitted_at, submitted_by
          from public.distribution_versions order by project_id, number) v
 where v.project_id = d.project_id and d.params_confirmed_at is null;
