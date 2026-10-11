-- Distribution, lot 6 (ticket « Distribution » § 6.12, § 9, CA12-CA13): the
-- anomalies, and a new version of the dossier once a source is corrected.
--
-- 1. distribution_anomalies: type, description, platform (if any), severity,
--    state, author, date and the module that owns the correction (§ 9). The
--    correction itself is made in that module, never here (CA12): an anomaly
--    only says where and why, and its state is followed (open → being
--    corrected → resolved, or dismissed), each change with who, when, why.
-- 2. prepare_distribution_version: after a correction at the source, the
--    owner reopens the dossier for a new version. The approved version is
--    marked superseded (kept, with its snapshot and its deposit cycle, CA13);
--    the six checks go back to « non vérifié » for the new version (their
--    previous results stay in the history). The new version then goes
--    through the same validation and a new deposit is declared.

create table public.distribution_anomalies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The dossier version current when it was found, if any.
  version_number integer,
  kind text not null,
  description text not null,
  platform text,
  severity text not null,
  source_module text not null,
  state text not null default 'open',
  state_note text,
  reported_by uuid not null references public.people (id),
  reported_at timestamptz not null default now(),
  state_by uuid references public.people (id),
  state_at timestamptz,
  constraint distribution_anomalies_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_anomalies_kind_check check (kind in (
    'wrong_audio', 'metadata', 'credit_isrc', 'cover', 'platform_unavailable',
    'territory_rights', 'date', 'other')),
  constraint distribution_anomalies_description_check
    check (char_length(btrim(description)) between 1 and 2000),
  constraint distribution_anomalies_platform_check check (
    platform is null or platform in ('spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music')
    or platform ~ '^other_[a-z0-9]{8}$'),
  constraint distribution_anomalies_severity_check
    check (severity in ('minor', 'major', 'blocking')),
  -- Where the correction is made: an owner module, the dossier's own
  -- parameters (distribution) or the distributor's side.
  constraint distribution_anomalies_module_check check (source_module in (
    'catalog', 'master', 'legal', 'design', 'project', 'distribution', 'distributor')),
  constraint distribution_anomalies_state_check
    check (state in ('open', 'in_correction', 'resolved', 'dismissed')),
  constraint distribution_anomalies_state_stamped check (
    (state = 'open') = (state_at is null) and (state_at is null) = (state_by is null)),
  constraint distribution_anomalies_closing_reason check (
    state not in ('resolved', 'dismissed') or char_length(btrim(coalesce(state_note, ''))) > 0),
  constraint distribution_anomalies_note_length
    check (state_note is null or char_length(state_note) <= 1000)
);

create index distribution_anomalies_project_idx
  on public.distribution_anomalies (project_id, reported_at desc);

alter table public.distribution_anomalies enable row level security;
alter table public.distribution_anomalies force row level security;
revoke all on table public.distribution_anomalies from anon, authenticated;
grant select on table public.distribution_anomalies to authenticated;

create policy distribution_anomalies_select on public.distribution_anomalies
  for select to authenticated
  using (public.can_see_project(project_id));

-- « Signaler une anomalie »: the owner or the designated validator.
create or replace function public.report_distribution_anomaly(
  p_project_id uuid,
  p_kind text,
  p_description text,
  p_platform text,
  p_severity text,
  p_source_module text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.distribution_anomalies (organization_id, project_id, version_number,
    kind, description, platform, severity, source_module, reported_by)
  values (v_org, p_project_id,
    (select max(v.number) from public.distribution_versions v where v.project_id = p_project_id),
    p_kind, btrim(coalesce(p_description, '')), nullif(p_platform, ''), p_severity,
    p_source_module, public.auth_person_id())
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_id, 'kind', p_kind, 'severity', p_severity,
      'module', p_source_module, 'platform', nullif(p_platform, '')));
  return v_id;
end;
$$;

revoke execute on function public.report_distribution_anomaly(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.report_distribution_anomaly(uuid, text, text, text, text, text) to authenticated;

create or replace function public.set_distribution_anomaly_state(
  p_anomaly_id uuid,
  p_state text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_anomalies%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.distribution_anomalies where id = p_anomaly_id for update;
  if not found or not public.can_check_distribution(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.distribution_anomalies
     set state = p_state, state_note = v_note,
         state_by = case when p_state = 'open' then null else public.auth_person_id() end,
         state_at = case when p_state = 'open' then null else now() end
   where id = p_anomaly_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id, 'anomaly.state',
    jsonb_build_object('id', v_row.id, 'from', v_row.state, 'to', p_state, 'note', v_note));
end;
$$;

revoke execute on function public.set_distribution_anomaly_state(uuid, text, text) from public, anon;
grant execute on function public.set_distribution_anomaly_state(uuid, text, text) to authenticated;

-- « Préparer une nouvelle version » after a correction at the source.
create or replace function public.prepare_distribution_version(
  p_project_id uuid,
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
  update public.distribution_versions set superseded_at = now() where id = v_version.id;
  perform public.distribution_log(v_version.organization_id, p_project_id,
    'version.superseded', jsonb_build_object('number', v_version.number, 'note', v_note,
      'checks', (select coalesce(jsonb_agg(jsonb_build_object('key', c.check_key,
                   'result', c.result, 'by', c.checked_by, 'at', c.checked_at)), '[]'::jsonb)
                   from public.distribution_checks c where c.project_id = p_project_id)));
  update public.distribution_checks
     set result = 'unchecked', note = null, checked_by = null, checked_at = null
   where project_id = p_project_id;
end;
$$;

revoke execute on function public.prepare_distribution_version(uuid, text) from public, anon;
grant execute on function public.prepare_distribution_version(uuid, text) to authenticated;
