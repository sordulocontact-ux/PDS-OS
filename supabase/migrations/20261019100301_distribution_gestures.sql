-- Distribution, lots D3 to D5 (proto « Projet complet », docs/projet-complet/
-- distribution.md § 1.3 to § 1.6): the validator is told, and the gestures the
-- proto makes in one go are one call each.
--
-- 1. Notifications (written by triggers only): a version submitted → its
--    validator; decided → who submitted it; a closure proposed → its
--    validator; decided → who proposed it.
-- 2. declare_distribution_answers: what The Orchard said (received, accepted,
--    delivered to the platforms), several at once, each with its date and,
--    if any, its proof — one file may prove several (« Même e-mail que… »).
--    The order is only a help of the screen: nothing is deduced (§ 7).
-- 3. attach_distribution_declaration_proof: a proof added later to a
--    declaration that had none (never replaced, never on a withdrawn one).
-- 4. declare_distribution_corrections: The Orchard asks for corrections →
--    the declaration, the anomaly (from the distributor, in the module where
--    it is corrected) and the next version of the dossier, in one
--    transaction (the validated version and its deposit cycle are kept).
-- 5. confirm_distribution_platform: « Tout est bon » — the link (the one the
--    detection proposed, or the one saved), available and compliant, by the
--    person who opened it. The detection alone never verifies (CA16).
-- 6. report_distribution_platform_problem: « Il y a un problème » — what the
--    person saw and the anomaly it opens, in one gesture.

-- ------------------------------------------------------------ 1. notifications

select public.add_notification_kinds(array['distribution_version_submitted',
  'distribution_version_decided', 'distribution_closure_proposed',
  'distribution_closure_decided']);

create or replace function public.distribution_version_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.validator_person_id is distinct from new.submitted_by then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (new.organization_id, new.validator_person_id, new.submitted_by,
              'distribution_version_submitted', new.project_id, new.id);
    end if;
  elsif old.status = 'pending' and new.status <> 'pending'
        and new.submitted_by is distinct from new.decided_by then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, new.submitted_by, new.decided_by,
            'distribution_version_decided', new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.distribution_version_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.distribution_versions;
create trigger z_notify after insert or update of status on public.distribution_versions
  for each row execute function public.distribution_version_notify();

create or replace function public.distribution_closure_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.validator_person_id is distinct from new.proposed_by then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (new.organization_id, new.validator_person_id, new.proposed_by,
              'distribution_closure_proposed', new.project_id, new.id);
    end if;
  elsif old.status = 'pending' and new.status <> 'pending'
        and new.proposed_by is distinct from new.decided_by then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, new.proposed_by, new.decided_by,
            'distribution_closure_decided', new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.distribution_closure_notify() from public, anon, authenticated;

drop trigger if exists z_notify on public.distribution_closures;
create trigger z_notify after insert or update of status on public.distribution_closures
  for each row execute function public.distribution_closure_notify();

-- ------------------------------------------------------------ 2. answers

create or replace function public.declare_distribution_answers(
  p_project_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 3 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- In the order of the frieze: received, accepted, delivered.
  for v_item in
    select x from jsonb_array_elements(p_items) x
     order by array_position(array['received', 'accepted', 'platforms_delivered'], x ->> 'kind')
  loop
    if (v_item ->> 'kind') not in ('received', 'accepted', 'platforms_delivered') then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    perform public.declare_distribution(p_project_id, v_item ->> 'kind',
      nullif(v_item ->> 'declared_on', '')::date, null, null,
      nullif(v_item ->> 'proof_path', ''), nullif(v_item ->> 'proof_name', ''), null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.declare_distribution_answers(uuid, jsonb) from public, anon;
grant execute on function public.declare_distribution_answers(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------ 3. proof later

create or replace function public.attach_distribution_declaration_proof(
  p_declaration_id uuid,
  p_proof_path text,
  p_proof_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_declarations%rowtype;
begin
  select * into v_row from public.distribution_declarations
   where id = p_declaration_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.withdrawn_at is not null then
    raise exception 'already_withdrawn' using errcode = 'P0001';
  end if;
  if v_row.proof_path is not null or v_row.proof_url is not null then
    raise exception 'proof_exists' using errcode = 'P0001';
  end if;
  update public.distribution_declarations
     set proof_path = nullif(p_proof_path, ''),
         proof_name = nullif(btrim(coalesce(p_proof_name, '')), '')
   where id = p_declaration_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'declaration.proof_added', jsonb_build_object('id', v_row.id, 'kind', v_row.kind,
      'version', v_row.version_number));
end;
$$;

revoke execute on function public.attach_distribution_declaration_proof(uuid, text, text) from public, anon;
grant execute on function public.attach_distribution_declaration_proof(uuid, text, text) to authenticated;

-- ------------------------------------------------------------ 4. corrections

alter table public.distribution_anomalies
  add column from_distributor boolean not null default false;

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
  -- The declaration (refused without a deposit of the current version).
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
  -- The next version: the validated one and its cycle stay in the history.
  perform public.prepare_distribution_version(p_project_id, v_note);
  return v_anomaly;
end;
$$;

revoke execute on function public.declare_distribution_corrections(uuid, text, text, text, text) from public, anon;
grant execute on function public.declare_distribution_corrections(uuid, text, text, text, text) to authenticated;

-- ------------------------------------------------------------ 5. « Tout est bon »

create or replace function public.confirm_distribution_platform(
  p_project_id uuid,
  p_platform text,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_row public.distribution_platforms%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and platform = p_platform for update;
  if not found then
    if v_url is null or p_platform not in ('spotify', 'apple_music', 'deezer',
         'youtube_music', 'amazon_music') then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    insert into public.distribution_platforms (organization_id, project_id, platform, url)
    values (v_org, p_project_id, p_platform, v_url)
    returning * into v_row;
  elsif v_row.url is null or (v_url is not null and v_url is distinct from v_row.url) then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    update public.distribution_platforms set url = v_url where id = v_row.id;
  end if;
  update public.distribution_platforms
     set verification = 'verified', verification_note = null,
         verified_by = public.auth_person_id(), verified_at = now(),
         compliance = 'compliant', compliance_note = null,
         compliance_by = public.auth_person_id(), compliance_at = now(),
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform, 'verification', 'verified',
      'compliance', 'compliant', 'url', coalesce(v_url, v_row.url)));
end;
$$;

revoke execute on function public.confirm_distribution_platform(uuid, text, text) from public, anon;
grant execute on function public.confirm_distribution_platform(uuid, text, text) to authenticated;

-- ------------------------------------------------------------ 6. a problem

create or replace function public.report_distribution_platform_problem(
  p_project_id uuid,
  p_platform text,
  p_problem text,
  p_note text,
  p_module text,
  p_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_row public.distribution_platforms%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_anomaly uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_problem not in ('unavailable', 'non_compliant') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and platform = p_platform for update;
  if not found then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    insert into public.distribution_platforms (organization_id, project_id, platform, url)
    values (v_org, p_project_id, p_platform, v_url)
    returning * into v_row;
  elsif v_row.url is null then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    update public.distribution_platforms set url = v_url where id = v_row.id;
  end if;
  update public.distribution_platforms
     set verification = case when p_problem = 'unavailable' then 'unavailable' else 'verified' end,
         verification_note = case when p_problem = 'unavailable' then v_note end,
         verified_by = public.auth_person_id(), verified_at = now(),
         compliance = case when p_problem = 'unavailable' then 'unchecked' else 'non_compliant' end,
         compliance_note = case when p_problem = 'unavailable' then null else v_note end,
         compliance_by = case when p_problem = 'unavailable' then null else public.auth_person_id() end,
         compliance_at = case when p_problem = 'unavailable' then null else now() end,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform,
      'verification', case when p_problem = 'unavailable' then 'unavailable' else 'verified' end,
      'compliance', case when p_problem = 'unavailable' then 'unchecked' else 'non_compliant' end,
      'url', coalesce(v_url, v_row.url)));
  insert into public.distribution_anomalies (organization_id, project_id, version_number,
    kind, description, platform, severity, source_module, reported_by)
  values (v_org, p_project_id,
    (select max(v.number) from public.distribution_versions v where v.project_id = p_project_id),
    case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
    v_note, p_platform, 'major', p_module, public.auth_person_id())
  returning id into v_anomaly;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_anomaly, 'kind',
      case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
      'severity', 'major', 'module', p_module, 'platform', p_platform));
  return v_anomaly;
end;
$$;

revoke execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text) to authenticated;
