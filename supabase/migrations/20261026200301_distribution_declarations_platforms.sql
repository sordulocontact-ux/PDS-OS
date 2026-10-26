-- Distribution, recette V1 of 23/10/2026 (DIST-004, DIST-005): what is
-- declared says where it comes from, in an order that holds, and a platform
-- is verified with its proof.
--
-- 1. distribution_declarations.source: where the person learnt it (The
--    Orchard's portal, its e-mail, another e-mail, a call, other) — ticket
--    § 7: « sa source éventuelle ». The dates follow the frieze: nothing
--    before the deposit, the deposit not before the version's validation,
--    received ≤ accepted ≤ delivered ≤ available.
-- 2. distribution_platforms: the territory seen, the day it was seen and
--    the proof (a capture in the private bucket, or a link) — required by
--    « Tout est bon ». An unavailability opens an anomaly with its action,
--    its owner and its deadline (distribution_anomalies gains them).
-- 3. verify_distribution_platform (no proof) is closed: « Tout est bon » and
--    « Il y a un problème » are the only ways to verify.

-- ------------------------------------------------------------ 1. declarations

alter table public.distribution_declarations
  add column source text,
  add constraint distribution_declarations_source_check check (
    source is null or source in ('orchard_portal', 'orchard_email', 'email', 'call', 'other'));

-- The frieze's order; corrections only follow the deposit.
create or replace function public.distribution_declaration_rank(p_kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'deposit' then 0 when 'received' then 1 when 'accepted' then 2
    when 'platforms_delivered' then 3 when 'available' then 4 end;
$$;

revoke execute on function public.distribution_declaration_rank(text) from public, anon;
grant execute on function public.distribution_declaration_rank(text) to authenticated;

drop function public.declare_distribution(uuid, text, date, text, text, text, text, text);

create function public.declare_distribution(
  p_project_id uuid,
  p_kind text,
  p_declared_on date default null,
  p_orchard_id text default null,
  p_note text default null,
  p_proof_path text default null,
  p_proof_name text default null,
  p_proof_url text default null,
  p_source text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_on date := coalesce(p_declared_on, (now() at time zone 'Europe/Paris')::date);
  v_rank integer := public.distribution_declaration_rank(p_kind);
  v_validated date;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_version := public.distribution_current_version(p_project_id);
  if v_version is null then
    raise exception 'not_validated' using errcode = 'P0001';
  end if;
  if p_declared_on is not null and p_declared_on > v_today then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_kind = 'deposit' then
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and version_number = v_version
                  and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
    select (v.decided_at at time zone 'Europe/Paris')::date into v_validated
      from public.distribution_versions v
     where v.project_id = p_project_id and v.number = v_version;
    if v_on < v_validated then
      raise exception 'date_order' using errcode = 'P0001';
    end if;
  else
    if not exists (select 1 from public.distribution_declarations
                    where project_id = p_project_id and version_number = v_version
                      and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'not_deposited' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and version_number = v_version
                  and kind = p_kind and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
  end if;
  -- The dates hold with the frieze: nothing earlier than a step before it,
  -- nothing later than a step after it (corrections: after the deposit).
  if exists (
       select 1 from public.distribution_declarations d
        where d.project_id = p_project_id and d.version_number = v_version
          and d.withdrawn_at is null and d.kind <> 'corrections_requested'
          and (
            (p_kind = 'corrections_requested' and d.kind = 'deposit'
              and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) > v_on)
            or (v_rank is not null and (
              (public.distribution_declaration_rank(d.kind) < v_rank
                and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) > v_on)
              or (public.distribution_declaration_rank(d.kind) > v_rank
                and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) < v_on))))) then
    raise exception 'date_order' using errcode = 'P0001';
  end if;
  insert into public.distribution_declarations (organization_id, project_id,
    version_number, kind, declared_on, orchard_id, note, proof_path, proof_name,
    proof_url, declared_by, source)
  values (v_org, p_project_id, v_version, p_kind, p_declared_on,
    nullif(btrim(coalesce(p_orchard_id, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(p_proof_path, ''), nullif(btrim(coalesce(p_proof_name, '')), ''),
    nullif(btrim(coalesce(p_proof_url, '')), ''),
    public.auth_person_id(), nullif(p_source, ''))
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'declaration.' || p_kind,
    jsonb_build_object('id', v_id, 'version', v_version,
      'declared_on', p_declared_on, 'source', nullif(p_source, ''),
      'proof', nullif(p_proof_path, '') is not null or nullif(btrim(coalesce(p_proof_url, '')), '') is not null));
  return v_id;
end;
$$;

revoke execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text, text) from public, anon;
grant execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text, text) to authenticated;

-- What The Orchard said, several at once (20261019100301), each with its
-- source now.
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
  for v_item in
    select x from jsonb_array_elements(p_items) x
     order by array_position(array['received', 'accepted', 'platforms_delivered'], x ->> 'kind')
  loop
    if (v_item ->> 'kind') not in ('received', 'accepted', 'platforms_delivered') then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    perform public.declare_distribution(p_project_id, v_item ->> 'kind',
      nullif(v_item ->> 'declared_on', '')::date, null, null,
      nullif(v_item ->> 'proof_path', ''), nullif(v_item ->> 'proof_name', ''), null,
      nullif(v_item ->> 'source', ''));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ------------------------------------------------------------ 2. anomalies

alter table public.distribution_anomalies
  add column action text,
  add column owner_person_id uuid references public.people (id),
  add column due_on date,
  add constraint distribution_anomalies_action_check check (
    action is null or char_length(btrim(action)) between 1 and 1000);

-- ------------------------------------------------------------ 2. platforms

alter table public.distribution_platforms
  add column territory text,
  add column observed_on date,
  add column proof_path text,
  add column proof_name text,
  add column proof_url text,
  add constraint distribution_platforms_territory_check check (
    territory is null or char_length(btrim(territory)) between 1 and 200),
  add constraint distribution_platforms_proof_path check (
    proof_path is null or proof_path ~ ('^' || organization_id::text || '/'
      || project_id::text || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  add constraint distribution_platforms_proof_name check (
    (proof_path is null) = (proof_name is null)
    and (proof_name is null or char_length(proof_name) between 1 and 255)),
  add constraint distribution_platforms_proof_url check (
    proof_url is null or (char_length(proof_url) <= 2048 and proof_url ~ '^https://\S+$'));

drop function public.confirm_distribution_platform(uuid, text, text);

create function public.confirm_distribution_platform(
  p_project_id uuid,
  p_platform text,
  p_url text,
  p_territory text default null,
  p_observed_on date default null,
  p_proof_path text default null,
  p_proof_name text default null,
  p_proof_url text default null
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
  v_territory text := nullif(btrim(coalesce(p_territory, '')), '');
  v_path text := nullif(p_proof_path, '');
  v_proof_url text := nullif(btrim(coalesce(p_proof_url, '')), '');
  v_on date := coalesce(p_observed_on, (now() at time zone 'Europe/Paris')::date);
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_territory is null then
    raise exception 'territory_required' using errcode = 'P0001';
  end if;
  if v_path is null and v_proof_url is null then
    raise exception 'proof_required' using errcode = 'P0001';
  end if;
  if v_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_input' using errcode = '23514';
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
         territory = v_territory, observed_on = v_on,
         proof_path = v_path,
         proof_name = case when v_path is null then null
                           else coalesce(nullif(btrim(coalesce(p_proof_name, '')), ''), 'capture') end,
         proof_url = v_proof_url,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform, 'verification', 'verified',
      'compliance', 'compliant', 'url', coalesce(v_url, v_row.url),
      'territory', v_territory, 'observed_on', v_on,
      'proof', true));
end;
$$;

revoke execute on function public.confirm_distribution_platform(uuid, text, text, text, date, text, text, text) from public, anon;
grant execute on function public.confirm_distribution_platform(uuid, text, text, text, date, text, text, text) to authenticated;

drop function public.report_distribution_platform_problem(uuid, text, text, text, text, text);

create function public.report_distribution_platform_problem(
  p_project_id uuid,
  p_platform text,
  p_problem text,
  p_note text,
  p_module text,
  p_url text,
  p_action text default null,
  p_owner_person_id uuid default null,
  p_due_on date default null
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
  v_action text := nullif(btrim(coalesce(p_action, '')), '');
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
  -- An unavailability says what is done about it, by whom, by when.
  if p_problem = 'unavailable' and (v_action is null or p_owner_person_id is null
       or p_due_on is null) then
    raise exception 'action_required' using errcode = 'P0001';
  end if;
  if p_owner_person_id is not null
     and not public.distribution_is_member(v_org, p_owner_person_id) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_due_on is not null and p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'due_invalid' using errcode = 'P0001';
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
         territory = null, observed_on = (now() at time zone 'Europe/Paris')::date,
         proof_path = null, proof_name = null, proof_url = null,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform,
      'verification', case when p_problem = 'unavailable' then 'unavailable' else 'verified' end,
      'compliance', case when p_problem = 'unavailable' then 'unchecked' else 'non_compliant' end,
      'url', coalesce(v_url, v_row.url)));
  insert into public.distribution_anomalies (organization_id, project_id, version_number,
    kind, description, platform, severity, source_module, reported_by,
    action, owner_person_id, due_on)
  values (v_org, p_project_id,
    (select max(v.number) from public.distribution_versions v where v.project_id = p_project_id),
    case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
    v_note, p_platform, 'major', p_module, public.auth_person_id(),
    v_action, p_owner_person_id, p_due_on)
  returning id into v_anomaly;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_anomaly, 'kind',
      case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
      'severity', 'major', 'module', p_module, 'platform', p_platform,
      'action', v_action, 'owner', p_owner_person_id, 'due_on', p_due_on));
  return v_anomaly;
end;
$$;

revoke execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text, text, uuid, date) from public, anon;
grant execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text, text, uuid, date) to authenticated;

-- ------------------------------------------------------------ 3. no verification without proof

revoke execute on function public.verify_distribution_platform(uuid, text, text, text, text, text) from authenticated;
