-- Distribution, recette V1 of 23/10/2026 (DIST-001, DIST-006): the guards of
-- the dossier are enforced, not only described.
--
-- Before (20261011100201, docs/ARCHITECTURE.md § 8 octies): « les contrôles
-- non vérifiés sont dits, pas bloquants », a refusal was a free note, and a
-- version could be submitted while The Orchard's correction was not made.
-- The recette asks the opposite (latest feedback wins):
--
-- 1. A version is submitted only once the six checks are recorded (« Non
--    applicable » counts), none « non conforme » (as before).
-- 2. A refusal names what is to correct (distribution_versions.
--    refusal_modules: an owner module, or the dossier's own parameters); the
--    next version is refused while those fields are the same as in the
--    refused version's snapshot.
-- 3. An anomaly still open (not on the distributor's side) blocks the next
--    version while its module's fields did not change since the version it
--    was found on; once they did, the submission marks it « en correction ».
-- 4. Exception: a derogation granted by the direction (permission
--    `administer`, distribution_derogations) — its scope (checks, refusal,
--    anomalies), the risk, the reason and a deadline — used by the next
--    submission and kept on the version the validator reads.
-- 5. The validator's approval re-checks the six checks (they may change
--    while the version waits).
-- 6. Each check says which version it was recorded for; a refusal or a
--    correction resets only the checks of the modules concerned (before: a
--    refusal reset none, a correction reset all six).

-- ------------------------------------------------------------ helpers

-- The checks a module's correction calls into question.
create or replace function public.distribution_module_checks(p_module text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_module
    when 'catalog' then array['identity', 'identifiers']
    when 'master' then array['audio']
    when 'legal' then array['rights']
    when 'design' then array['visual']
    when 'project' then array['calendar']
    when 'distribution' then array['rights', 'calendar']
    else array[]::text[]
  end;
$$;

revoke execute on function public.distribution_module_checks(text) from public, anon;
grant execute on function public.distribution_module_checks(text) to authenticated;

-- A snapshot's fields read from one module, in a stable order: what a
-- correction of that module must change. The UPC (given by The Orchard at
-- the deposit) is left out.
create or replace function public.distribution_snapshot_fields(
  p_snapshot jsonb,
  p_module text
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_array(g ->> 'key', f ->> 'key', f ->> 'label', f -> 'value')
           order by g ->> 'key', f ->> 'key', f ->> 'label'), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_snapshot -> 'sections', '[]'::jsonb)) s,
         jsonb_array_elements(coalesce(s -> 'groups', '[]'::jsonb)) g,
         jsonb_array_elements(coalesce(g -> 'fields', '[]'::jsonb)) f
   where f ->> 'origin' = p_module and coalesce(f ->> 'key', '') <> 'upc';
$$;

revoke execute on function public.distribution_snapshot_fields(jsonb, text) from public, anon;
grant execute on function public.distribution_snapshot_fields(jsonb, text) to authenticated;

-- The number a check recorded now is about: the version open (pending, or
-- approved and not superseded), else the one being prepared.
create or replace function public.distribution_working_number(p_project_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select v.number from public.distribution_versions v
      where v.project_id = p_project_id
        and (v.status = 'pending' or (v.status = 'approved' and v.superseded_at is null))
      order by v.number desc limit 1),
    (select coalesce(max(v.number), 0) + 1 from public.distribution_versions v
      where v.project_id = p_project_id));
$$;

revoke execute on function public.distribution_working_number(uuid) from public, anon;
grant execute on function public.distribution_working_number(uuid) to authenticated;

-- ------------------------------------------------------------ 6. checks per version

alter table public.distribution_checks add column version_number integer;

-- The checks already recorded: about the version prepared or open now.
update public.distribution_checks c
   set version_number = public.distribution_working_number(c.project_id)
 where c.result <> 'unchecked';

create or replace function public.record_distribution_check(
  p_project_id uuid,
  p_key text,
  p_result text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_number integer := public.distribution_working_number(p_project_id);
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.distribution_checks (organization_id, project_id, check_key,
    result, note, checked_by, checked_at, version_number)
  values (v_org, p_project_id, p_key, p_result, v_note,
    case when p_result = 'unchecked' then null else public.auth_person_id() end,
    case when p_result = 'unchecked' then null else now() end,
    case when p_result = 'unchecked' then null else v_number end)
  on conflict (project_id, check_key) do update
    set result = excluded.result, note = excluded.note,
        checked_by = excluded.checked_by, checked_at = excluded.checked_at,
        version_number = excluded.version_number;
  perform public.distribution_log(v_org, p_project_id, 'check.recorded',
    jsonb_build_object('key', p_key, 'result', p_result, 'note', v_note,
      'version', v_number));
end;
$$;

-- Back to « non vérifié » the checks of these modules (null: all six), the
-- previous results kept in the history.
create or replace function public.distribution_reset_checks(
  p_project_id uuid,
  p_modules text[],
  p_reason text
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys text[];
  v_org uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if p_modules is null then
    v_keys := array['audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar'];
  else
    select coalesce(array_agg(distinct k), '{}') into v_keys
      from unnest(p_modules) m, unnest(public.distribution_module_checks(m)) k;
  end if;
  if cardinality(v_keys) = 0 then
    return v_keys;
  end if;
  perform public.distribution_log(v_org, p_project_id, 'checks.reset',
    jsonb_build_object('reason', p_reason, 'keys', to_jsonb(v_keys),
      'checks', (select coalesce(jsonb_agg(jsonb_build_object('key', c.check_key,
                   'result', c.result, 'by', c.checked_by, 'at', c.checked_at,
                   'version', c.version_number)), '[]'::jsonb)
                   from public.distribution_checks c
                  where c.project_id = p_project_id and c.check_key = any (v_keys)
                    and c.result <> 'unchecked')));
  update public.distribution_checks
     set result = 'unchecked', note = null, checked_by = null, checked_at = null,
         version_number = null
   where project_id = p_project_id and check_key = any (v_keys);
  return v_keys;
end;
$$;

revoke execute on function public.distribution_reset_checks(uuid, text[], text) from public, anon, authenticated;

-- ------------------------------------------------------------ 2. refusal

alter table public.distribution_versions
  add column refusal_modules text[],
  add constraint distribution_versions_refusal_modules check (
    refusal_modules is null or (cardinality(refusal_modules) >= 1
      and refusal_modules <@ array['catalog', 'master', 'legal', 'design', 'project',
                                   'distribution']));

-- ------------------------------------------------------------ 4. derogation

create table public.distribution_derogations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- What it lets through: checks not recorded, a refusal's cause not
  -- corrected, an anomaly not corrected at its source.
  scope text[] not null,
  risk text not null,
  reason text not null,
  -- By when what it lets through must be settled.
  due_on date not null,
  granted_by uuid not null references public.people (id),
  granted_at timestamptz not null default now(),
  -- The version that used it.
  version_number integer,
  used_at timestamptz,
  revoked_by uuid references public.people (id),
  revoked_at timestamptz,
  constraint distribution_derogations_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_derogations_scope_check check (
    cardinality(scope) >= 1 and scope <@ array['checks', 'refusal', 'anomalies']),
  constraint distribution_derogations_texts check (
    char_length(btrim(risk)) between 1 and 1000
    and char_length(btrim(reason)) between 1 and 2000),
  constraint distribution_derogations_used check (
    (version_number is null) = (used_at is null)),
  constraint distribution_derogations_revoked check (
    (revoked_at is null) = (revoked_by is null)
    and (revoked_at is null or version_number is null))
);

-- One derogation waiting to be used at a time.
create unique index distribution_derogations_one_open
  on public.distribution_derogations (project_id)
  where version_number is null and revoked_at is null;

alter table public.distribution_derogations enable row level security;
alter table public.distribution_derogations force row level security;
revoke all on table public.distribution_derogations from anon, authenticated;
grant select on table public.distribution_derogations to authenticated;

create policy distribution_derogations_select on public.distribution_derogations
  for select to authenticated
  using (public.can_see_project(project_id));

alter table public.distribution_versions
  add column derogation_id uuid references public.distribution_derogations (id);

-- « Accorder une dérogation »: the direction only, on a project it sees.
create or replace function public.grant_distribution_derogation(
  p_project_id uuid,
  p_scope text[],
  p_risk text,
  p_reason text,
  p_due_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_scope text[];
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_see_project(p_project_id)
     or not public.has_permission(v_org, 'administer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct s order by s), '{}') into v_scope
    from unnest(coalesce(p_scope, '{}')) s;
  if cardinality(v_scope) = 0
     or not v_scope <@ array['checks', 'refusal', 'anomalies'] then
    raise exception 'scope_required' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_risk, '')), '') is null
     or nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_due_on is null or p_due_on < current_date then
    raise exception 'due_invalid' using errcode = 'P0001';
  end if;
  -- A new derogation replaces the one not used yet.
  update public.distribution_derogations
     set revoked_at = now(), revoked_by = public.auth_person_id()
   where project_id = p_project_id and version_number is null and revoked_at is null;
  insert into public.distribution_derogations (organization_id, project_id, scope,
    risk, reason, due_on, granted_by)
  values (v_org, p_project_id, v_scope, btrim(p_risk), btrim(p_reason), p_due_on,
    public.auth_person_id())
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'derogation.granted',
    jsonb_build_object('id', v_id, 'scope', to_jsonb(v_scope), 'risk', btrim(p_risk),
      'reason', btrim(p_reason), 'due_on', p_due_on));
  return v_id;
end;
$$;

revoke execute on function public.grant_distribution_derogation(uuid, text[], text, text, date) from public, anon;
grant execute on function public.grant_distribution_derogation(uuid, text[], text, text, date) to authenticated;

create or replace function public.revoke_distribution_derogation(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_see_project(p_project_id)
     or not public.has_permission(v_org, 'administer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.distribution_derogations
     set revoked_at = now(), revoked_by = public.auth_person_id()
   where project_id = p_project_id and version_number is null and revoked_at is null
  returning id into v_id;
  if v_id is null then
    raise exception 'no_derogation' using errcode = 'P0001';
  end if;
  perform public.distribution_log(v_org, p_project_id, 'derogation.revoked',
    jsonb_build_object('id', v_id));
end;
$$;

revoke execute on function public.revoke_distribution_derogation(uuid) from public, anon;
grant execute on function public.revoke_distribution_derogation(uuid) to authenticated;

-- The owner is told a derogation was granted on their dossier.
select public.add_notification_kinds(array['distribution_derogation_granted']);

create or replace function public.distribution_derogation_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_person_id into v_owner from public.projects where id = new.project_id;
  if v_owner is not null and v_owner is distinct from new.granted_by then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, v_owner, new.granted_by,
            'distribution_derogation_granted', new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.distribution_derogation_notify() from public, anon, authenticated;

create trigger z_notify after insert on public.distribution_derogations
  for each row execute function public.distribution_derogation_notify();

-- ------------------------------------------------------------ 1-3. what blocks a submission

-- What blocks the version this snapshot would become, beyond the rules of
-- the screen: checks not all recorded, the last refusal's cause unchanged,
-- an anomaly not corrected at its source.
create or replace function public.distribution_submit_blockers(
  p_project_id uuid,
  p_snapshot jsonb
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_codes text[] := '{}';
  v_last public.distribution_versions%rowtype;
  v_module text;
  r record;
begin
  if (select count(*) from public.distribution_checks c
       where c.project_id = p_project_id and c.result <> 'unchecked') < 6 then
    v_codes := v_codes || 'checks_unrecorded'::text;
  end if;
  select * into v_last from public.distribution_versions v
   where v.project_id = p_project_id order by v.number desc limit 1;
  if found and v_last.status = 'rejected' and v_last.refusal_modules is not null then
    foreach v_module in array v_last.refusal_modules loop
      if public.distribution_snapshot_fields(v_last.snapshot, v_module)
         = public.distribution_snapshot_fields(p_snapshot, v_module) then
        v_codes := v_codes || 'refusal_unresolved'::text;
        exit;
      end if;
    end loop;
  end if;
  for r in
    select a.source_module, v.snapshot
      from public.distribution_anomalies a
      join public.distribution_versions v
        on v.project_id = a.project_id and v.number = a.version_number
     where a.project_id = p_project_id and a.state in ('open', 'in_correction')
       and a.source_module <> 'distributor'
  loop
    if public.distribution_snapshot_fields(r.snapshot, r.source_module)
       = public.distribution_snapshot_fields(p_snapshot, r.source_module) then
      v_codes := v_codes || 'anomalies_unresolved'::text;
      exit;
    end if;
  end loop;
  return v_codes;
end;
$$;

revoke execute on function public.distribution_submit_blockers(uuid, jsonb) from public, anon;
grant execute on function public.distribution_submit_blockers(uuid, jsonb) to authenticated;

create or replace function public.distribution_blocker_scope(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_code
    when 'checks_unrecorded' then 'checks'
    when 'refusal_unresolved' then 'refusal'
    when 'anomalies_unresolved' then 'anomalies'
  end;
$$;

revoke execute on function public.distribution_blocker_scope(text) from public, anon;
grant execute on function public.distribution_blocker_scope(text) to authenticated;

-- « Soumettre » : as before (20261019100201), and now the six checks, the
-- refusal's cause and the anomalies, unless the direction derogated.
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
  v_blockers text[];
  v_derogation public.distribution_derogations%rowtype;
  v_used boolean := false;
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
  v_blockers := public.distribution_submit_blockers(p_project_id, p_snapshot);
  if cardinality(v_blockers) > 0 then
    select * into v_derogation from public.distribution_derogations
     where project_id = p_project_id and version_number is null and revoked_at is null
     for update;
    if not found or not (array(select public.distribution_blocker_scope(b)
                                 from unnest(v_blockers) b) <@ v_derogation.scope) then
      raise exception '%', v_blockers[1] using errcode = 'P0001';
    end if;
    v_used := true;
  end if;
  select coalesce(max(number), 0) + 1 into v_number
    from public.distribution_versions where project_id = p_project_id;
  insert into public.distribution_versions (organization_id, project_id, number,
    snapshot, submitted_by, validator_person_id, derogation_id)
  values (v_dossier.organization_id, p_project_id, v_number, p_snapshot,
    public.auth_person_id(), v_dossier.validator_person_id,
    case when v_used then v_derogation.id end);
  if v_used then
    update public.distribution_derogations
       set version_number = v_number, used_at = now()
     where id = v_derogation.id;
  end if;
  -- An anomaly whose module changed since the version it was found on is
  -- being corrected: this version carries the correction.
  update public.distribution_anomalies a
     set state = 'in_correction', state_by = public.auth_person_id(), state_at = now(),
         state_note = format('Corrigée à la source : V%s soumise', v_number)
    from public.distribution_versions v
   where a.project_id = p_project_id and a.state = 'open'
     and a.source_module <> 'distributor'
     and v.project_id = a.project_id and v.number = a.version_number
     and public.distribution_snapshot_fields(v.snapshot, a.source_module)
         <> public.distribution_snapshot_fields(p_snapshot, a.source_module);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'version.submitted', jsonb_build_object('number', v_number,
      'validator', v_dossier.validator_person_id,
      'derogation', case when v_used then v_derogation.id end,
      'derogated', case when v_used then to_jsonb(v_blockers) end));
  return v_number;
end;
$$;

-- « Valider » / « Refuser »: a refusal says why and what is to correct (the
-- checks of those modules are to redo); an approval re-checks the six.
drop function public.decide_distribution_version(uuid, boolean, text);

create function public.decide_distribution_version(
  p_version_id uuid,
  p_approve boolean,
  p_note text,
  p_modules text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.distribution_versions%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_modules text[];
  v_derogated boolean;
begin
  select * into v_version from public.distribution_versions
   where id = p_version_id for update;
  if not found or not public.can_see_project(v_version.project_id) then
    raise exception 'version_not_found' using errcode = 'P0001';
  end if;
  if v_version.validator_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_version.organization_id, 'validate') then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_version.status <> 'pending' then
    raise exception 'already_decided' using errcode = 'P0001';
  end if;
  if p_approve then
    if exists (select 1 from public.distribution_checks
                where project_id = v_version.project_id and result = 'non_compliant') then
      raise exception 'checks_non_compliant' using errcode = 'P0001';
    end if;
    select coalesce('checks' = any (d.scope), false) into v_derogated
      from public.distribution_derogations d where d.id = v_version.derogation_id;
    if (select count(*) from public.distribution_checks c
         where c.project_id = v_version.project_id and c.result <> 'unchecked') < 6
       and not coalesce(v_derogated, false) then
      raise exception 'checks_unrecorded' using errcode = 'P0001';
    end if;
  else
    if v_note is null then
      raise exception 'reason_required' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(distinct m order by m), '{}') into v_modules
      from unnest(coalesce(p_modules, '{}')) m;
    if cardinality(v_modules) = 0 then
      raise exception 'modules_required' using errcode = 'P0001';
    end if;
    if not v_modules <@ array['catalog', 'master', 'legal', 'design', 'project',
                              'distribution'] then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
  end if;
  update public.distribution_versions
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note,
         refusal_modules = case when p_approve then null else v_modules end
   where id = p_version_id;
  perform public.distribution_log(v_version.organization_id, v_version.project_id,
    case when p_approve then 'version.approved' else 'version.rejected' end,
    jsonb_build_object('number', v_version.number, 'note', v_note,
      'modules', case when p_approve then null else to_jsonb(v_modules) end));
  if not p_approve then
    perform public.distribution_reset_checks(v_version.project_id, v_modules,
      format('V%s refusée', v_version.number));
  end if;
end;
$$;

revoke execute on function public.decide_distribution_version(uuid, boolean, text, text[]) from public, anon;
grant execute on function public.decide_distribution_version(uuid, boolean, text, text[]) to authenticated;

-- « Préparer la version suivante »: as before (20261011100501), the checks
-- of the corrected modules only go back to « non vérifié » (null: all six).
drop function public.prepare_distribution_version(uuid, text);

create function public.prepare_distribution_version(
  p_project_id uuid,
  p_note text,
  p_modules text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.distribution_versions%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.distribution_versions
              where project_id = p_project_id and status = 'pending') then
    raise exception 'validation_pending' using errcode = 'P0001';
  end if;
  select * into v_version from public.distribution_versions
   where project_id = p_project_id and status = 'approved' and superseded_at is null
   order by number desc limit 1 for update;
  if not found then
    raise exception 'nothing_to_supersede' using errcode = 'P0001';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_modules is not null and not p_modules <@ array['catalog', 'master', 'legal',
       'design', 'project', 'distribution', 'distributor'] then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.distribution_versions set superseded_at = now() where id = v_version.id;
  perform public.distribution_log(v_version.organization_id, p_project_id,
    'version.superseded', jsonb_build_object('number', v_version.number, 'note', v_note,
      'modules', to_jsonb(p_modules)));
  perform public.distribution_reset_checks(p_project_id, p_modules,
    format('V%s remplacée', v_version.number));
end;
$$;

revoke execute on function public.prepare_distribution_version(uuid, text, text[]) from public, anon;
grant execute on function public.prepare_distribution_version(uuid, text, text[]) to authenticated;

-- The Orchard's corrections: as before (20261019100301), the next version
-- resets only the checks of the module where it is corrected.
create or replace function public.declare_distribution_corrections(
  p_project_id uuid,
  p_note text,
  p_kind text,
  p_module text,
  p_severity text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_anomaly uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  v_version := public.distribution_current_version(p_project_id);
  perform public.declare_distribution(p_project_id, 'corrections_requested',
    current_date, null, v_note, null, null, null);
  insert into public.distribution_anomalies (organization_id, project_id, version_number,
    kind, description, platform, severity, source_module, reported_by, from_distributor)
  values (v_org, p_project_id, v_version, p_kind, v_note, null, p_severity, p_module,
    public.auth_person_id(), true)
  returning id into v_anomaly;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_anomaly, 'kind', p_kind, 'severity', p_severity,
      'module', p_module, 'from', 'distributor'));
  perform public.prepare_distribution_version(p_project_id, v_note, array[p_module]);
  return v_anomaly;
end;
$$;

select public.attach_project_live();
