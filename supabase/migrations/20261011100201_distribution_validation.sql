-- Distribution, lot 3 (ticket « Distribution » § 6.6-6.7, § 8, § 11, CA06,
-- CA11): the six consistency checks and the human validation of the dossier.
--
-- 1. distribution_dossiers.validator_person_id: the « validateur
--    Distribution », designated by the project's owner among the holders of
--    `validate`, never the owner himself (separation preparer / validator,
--    the narrowest reading of § 11 until it is arbitrated). Without one, no
--    validation can be asked nor shown as acquired.
-- 2. distribution_checks: the six checks, each « non vérifié » until a person
--    records « conforme », « non conforme » (with a note) or « non
--    applicable »; who and when are written by the database. Recorded by the
--    owner or the designated validator, before the deposit and after the
--    publication alike (§ 8).
-- 3. distribution_versions: each submission is a numbered version with the
--    snapshot of what was submitted (§ 5: « un instantané d'audit de ce qui
--    a été validé ou utilisé »), decided by its validator. A version is never
--    rewritten; a refusal says why. While one is pending or approved, the
--    dossier's parameters are frozen (a new version is prepared from a
--    corrected source, lot 6: superseded_at).
-- Everything is written through these functions or with column grants; the
-- history (distribution_events) by the functions themselves.

-- ------------------------------------------------------------ 1. validator

alter table public.distribution_dossiers
  add column validator_person_id uuid references public.people (id);

-- ------------------------------------------------------------ 3. versions

create table public.distribution_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  number integer not null,
  snapshot jsonb not null,
  status text not null default 'pending',
  submitted_by uuid not null references public.people (id),
  submitted_at timestamptz not null default now(),
  -- Who was asked, at the time of the submission.
  validator_person_id uuid not null references public.people (id),
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_note text,
  -- A newer version was prepared from corrected sources (lot 6).
  superseded_at timestamptz,
  constraint distribution_versions_number_key unique (project_id, number),
  constraint distribution_versions_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_versions_number_positive check (number >= 1),
  constraint distribution_versions_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint distribution_versions_decided check (
    (status = 'pending') = (decided_at is null)
    and (decided_at is null) = (decided_by is null)),
  constraint distribution_versions_refusal_reason check (
    status <> 'rejected' or char_length(btrim(coalesce(decision_note, ''))) > 0),
  constraint distribution_versions_note_length
    check (decision_note is null or char_length(decision_note) <= 2000)
);

create unique index distribution_versions_one_pending
  on public.distribution_versions (project_id) where status = 'pending';

alter table public.distribution_versions enable row level security;
alter table public.distribution_versions force row level security;
revoke all on table public.distribution_versions from anon, authenticated;
grant select on table public.distribution_versions to authenticated;

create policy distribution_versions_select on public.distribution_versions
  for select to authenticated
  using (public.can_see_project(project_id));

-- The dossier may change while no version is pending nor approved (or the
-- approved one was superseded by a new preparation).
create or replace function public.distribution_dossier_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.distribution_versions v
     where v.project_id = p_project_id
       and (v.status = 'pending' or (v.status = 'approved' and v.superseded_at is null)));
$$;

revoke execute on function public.distribution_dossier_editable(uuid) from public, anon;
grant execute on function public.distribution_dossier_editable(uuid) to authenticated;

create policy distribution_dossiers_update_editable on public.distribution_dossiers
  as restrictive for update to authenticated
  using (public.distribution_dossier_editable(project_id))
  with check (public.distribution_dossier_editable(project_id));

-- « Désigner le validateur »: the owner, a holder of `validate`, not himself.
create or replace function public.set_distribution_validator(
  p_project_id uuid,
  p_person_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_person_id is not null and (
       p_person_id = v_project.owner_person_id
       or not public.person_has_permission(v_project.organization_id, p_person_id, 'validate')) then
    raise exception 'validator_invalid' using errcode = 'P0001';
  end if;
  -- Never while a version waits for its validator or stands approved.
  if not public.distribution_dossier_editable(p_project_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  insert into public.distribution_dossiers (organization_id, project_id, validator_person_id)
  values (v_project.organization_id, p_project_id, p_person_id)
  on conflict (project_id) do update set validator_person_id = excluded.validator_person_id,
    updated_at = now();
  perform public.distribution_log(v_project.organization_id, p_project_id,
    'validator.set', jsonb_build_object('person_id', p_person_id));
end;
$$;

revoke execute on function public.set_distribution_validator(uuid, uuid) from public, anon;
grant execute on function public.set_distribution_validator(uuid, uuid) to authenticated;

-- ------------------------------------------------------------ 2. checks

create table public.distribution_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  check_key text not null,
  result text not null default 'unchecked',
  note text,
  checked_by uuid references public.people (id),
  checked_at timestamptz,
  constraint distribution_checks_key unique (project_id, check_key),
  constraint distribution_checks_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_checks_key_check check (check_key in (
    'audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar')),
  constraint distribution_checks_result_check check (result in (
    'unchecked', 'compliant', 'non_compliant', 'not_applicable')),
  constraint distribution_checks_reason check (
    result <> 'non_compliant' or char_length(btrim(coalesce(note, ''))) > 0),
  constraint distribution_checks_note_length
    check (note is null or char_length(note) <= 1000),
  constraint distribution_checks_stamped check (
    (result = 'unchecked') = (checked_at is null))
);

alter table public.distribution_checks enable row level security;
alter table public.distribution_checks force row level security;
revoke all on table public.distribution_checks from anon, authenticated;
grant select on table public.distribution_checks to authenticated;

create policy distribution_checks_select on public.distribution_checks
  for select to authenticated
  using (public.can_see_project(project_id));

-- The owner, or the validator the dossier designates.
create or replace function public.can_check_distribution(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
      or (public.can_see_project(p_project_id) and exists (
            select 1 from public.distribution_dossiers d
             where d.project_id = p_project_id
               and d.validator_person_id = public.auth_person_id()
               and public.has_permission(d.organization_id, 'validate')));
$$;

revoke execute on function public.can_check_distribution(uuid) from public, anon;
grant execute on function public.can_check_distribution(uuid) to authenticated;

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
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.distribution_checks
    (organization_id, project_id, check_key, result, note, checked_by, checked_at)
  values (v_org, p_project_id, p_key, p_result, v_note,
    case when p_result = 'unchecked' then null else public.auth_person_id() end,
    case when p_result = 'unchecked' then null else now() end)
  on conflict (project_id, check_key) do update
    set result = excluded.result, note = excluded.note,
        checked_by = excluded.checked_by, checked_at = excluded.checked_at;
  perform public.distribution_log(v_org, p_project_id, 'check.recorded',
    jsonb_build_object('key', p_key, 'result', p_result, 'note', v_note));
end;
$$;

revoke execute on function public.record_distribution_check(uuid, text, text, text) from public, anon;
grant execute on function public.record_distribution_check(uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------ submit, decide

-- « Soumettre à validation »: the owner, with the snapshot the server built
-- (lib/distribution/snapshot.ts, which checks readiness with the same rule
-- as the screen). The validator must still hold `validate`.
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

revoke execute on function public.submit_distribution_version(uuid, jsonb) from public, anon;
grant execute on function public.submit_distribution_version(uuid, jsonb) to authenticated;

-- « Valider » / « Refuser »: the validator asked, still holding `validate`;
-- a refusal says why.
create or replace function public.decide_distribution_version(
  p_version_id uuid,
  p_approve boolean,
  p_note text
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
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.distribution_versions
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note
   where id = p_version_id;
  perform public.distribution_log(v_version.organization_id, v_version.project_id,
    case when p_approve then 'version.approved' else 'version.rejected' end,
    jsonb_build_object('number', v_version.number, 'note', v_note));
end;
$$;

revoke execute on function public.decide_distribution_version(uuid, boolean, text) from public, anon;
grant execute on function public.decide_distribution_version(uuid, boolean, text) to authenticated;

-- The parameters' history leaves the validator out: it has its own event.
create or replace function public.distribution_dossier_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_skip text[] := array['id', 'organization_id', 'project_id', 'created_by',
    'created_at', 'updated_at', 'validator_person_id'];
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
