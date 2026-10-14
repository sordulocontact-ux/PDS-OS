-- Production › the provider's own space (Ibé's tests of 13/10, PROD-026,
-- PROD-028, PROD-031, PROD-032, PROD-036).
--
-- A provider (monteur, étalonneur…) is a contact of the Réseau, without an
-- account (docs/PRODUCTION-METIER.md § 2 bis). The owner gives them a
-- private link, like the mix engineer's (/m/…, 20261005011001): only the
-- token's SHA-256 is stored, the link is shown once. On their page the
-- provider finds their mission (the steps they hold, with dates and
-- access), the references, the corrections addressed to them, and deposits
-- a version (link or file) or an expected export — the owner no longer
-- types it in for them. Opening the page marks their correction requests
-- « consultée ». Written only through the functions below; no service role.

-- 1. The link ------------------------------------------------------------------

create table public.production_provider_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  contact_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  -- Set when a newer link for the same provider replaces it.
  revoked_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_provider_links_token_key unique (token_hash),
  constraint production_provider_links_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_provider_links_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_provider_links_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_provider_links_sheet_idx
  on public.production_provider_links (sheet_id, contact_id, created_at desc);

alter table public.production_provider_links enable row level security;
alter table public.production_provider_links force row level security;
revoke all on table public.production_provider_links from anon, authenticated;
grant select on table public.production_provider_links to authenticated;
create policy production_provider_links_select on public.production_provider_links
  for select to authenticated using (public.can_see_project(project_id));

-- A deposit's file goes to a one-time path of production-files.
create table public.production_provider_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  link_id uuid not null references public.production_provider_links (id) on delete cascade,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint production_provider_slots_path_key unique (path)
);
create index production_provider_slots_link_idx
  on public.production_provider_slots (link_id, created_at desc);
alter table public.production_provider_slots enable row level security;
alter table public.production_provider_slots force row level security;
revoke all on table public.production_provider_slots from anon, authenticated;

create function public.is_open_production_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.production_provider_slots s
      join public.production_provider_links l on l.id = s.link_id
     where s.path = p_path and s.used_at is null and s.expires_at > now()
       and l.revoked_at is null and l.expires_at > now());
$$;
revoke execute on function public.is_open_production_slot(text) from public;
grant execute on function public.is_open_production_slot(text) to anon, authenticated;

create policy production_files_objects_insert_provider
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'production-files' and public.is_open_production_slot(objects.name));

-- The open link behind a token, locked for an update; null when unknown,
-- replaced or expired.
create function public.production_link_of(p_token text, p_lock boolean)
returns public.production_provider_links
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  if p_lock then
    select * into v from public.production_provider_links
     where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  else
    select * into v from public.production_provider_links
     where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  end if;
  if not found or v.revoked_at is not null or v.expires_at < now() then
    return null;
  end if;
  return v;
end;
$$;
revoke execute on function public.production_link_of(text, boolean) from public, anon, authenticated;

-- « Lien du prestataire » (the owner, while Production runs): the contact
-- holds a postproduction step or a correction request of the sheet. A
-- previous link of the same provider is replaced; the token is returned
-- once, never stored. It lives 60 days after the last step's end, at least
-- 30 days, at most 180.
create function public.create_production_provider_link(p_sheet_id uuid, p_contact_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_token text;
  v_end date;
  v_days integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.production_post_steps st
                  where st.sheet_id = s.id and st.contact_id = p_contact_id)
     and not exists (select 1 from public.production_correction_requests r
                      where r.sheet_id = s.id and r.contact_id = p_contact_id) then
    raise exception 'not_a_provider';
  end if;
  select max(st.ends_on) into v_end from public.production_post_steps st
   where st.sheet_id = s.id and st.contact_id = p_contact_id;
  v_days := least(180, greatest(30,
    coalesce(v_end - (now() at time zone 'Europe/Paris')::date, 0) + 60));

  update public.production_provider_links set revoked_at = now()
   where sheet_id = s.id and contact_id = p_contact_id and revoked_at is null;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.production_provider_links
    (organization_id, project_id, sheet_id, contact_id, token_hash, expires_at, created_by)
  values (s.organization_id, s.project_id, s.id, p_contact_id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + make_interval(days => v_days),
          public.auth_person_id());
  return v_token;
end;
$$;
revoke execute on function public.create_production_provider_link(uuid, uuid) from public, anon;
grant execute on function public.create_production_provider_link(uuid, uuid) to authenticated;

-- 2. The provider's page --------------------------------------------------------------

-- What the provider sees, by token: the state only for an unknown, replaced
-- or expired link; else the mission, the references, the corrections
-- addressed to them, the versions and the expected exports. Never another
-- provider's corrections, never budget or contacts.
create function public.get_production_provider_space(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v from public.production_provider_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case when v.revoked_at is not null then 'replaced'
                  when v.expires_at < now() then 'expired' else 'open' end;
  if v_state <> 'open' then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', 'open',
    'expiresAt', v.expires_at,
    'writable', public.project_stage_in_progress(v.project_id, 'production'),
    'provider', (select c.name from public.network_contacts c where c.id = v.contact_id),
    'project', (select p.title from public.projects p where p.id = v.project_id),
    'deliverable', (select d.title from public.production_sheets sh
                      join public.strategy_deliverables d on d.id = sh.deliverable_id
                     where sh.id = v.sheet_id),
    'manager', (select btrim(concat_ws(' ', pe.first_name, pe.last_name)) from public.projects p
                  join public.people pe on pe.id = p.owner_person_id
                 where p.id = v.project_id),
    'steps', coalesce((select jsonb_agg(jsonb_build_object(
        'key', st.step_key, 'label', st.label, 'responsibilities', st.responsibilities,
        'accessNote', st.access_note, 'startsOn', st.starts_on, 'endsOn', st.ends_on,
        'status', st.status) order by st.position, st.created_at)
      from public.production_post_steps st
      where st.sheet_id = v.sheet_id and st.contact_id = v.contact_id), '[]'::jsonb),
    'references', coalesce((select jsonb_agg(jsonb_build_object(
        'kind', r.kind, 'title', r.title, 'url', r.url, 'note', r.note,
        'fileName', f.file_name) order by r.created_at)
      from public.production_post_references r
      left join public.production_files f on f.id = r.file_id
      where r.sheet_id = v.sheet_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', rq.id, 'versionNumber', pv.number, 'dueOn', rq.due_on, 'message', rq.message,
        'status', rq.status, 'sentAt', rq.sent_at,
        'comments', coalesce((select jsonb_agg(jsonb_build_object(
            'timecodeMs', c.timecode_ms, 'category', c.category, 'body', c.body,
            'status', c.status) order by c.timecode_ms nulls first, c.created_at)
          from public.production_version_comments c where c.request_id = rq.id), '[]'::jsonb))
        order by pv.number desc)
      from public.production_correction_requests rq
      join public.production_versions pv on pv.id = rq.version_id
      where rq.sheet_id = v.sheet_id and rq.contact_id = v.contact_id
        and rq.status <> 'draft'), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
        'number', pv.number, 'status', pv.status, 'url', pv.url,
        'fileName', f.file_name, 'mine', pv.contact_id = v.contact_id,
        'submittedAt', pv.submitted_at, 'createdAt', pv.created_at)
        order by pv.number desc)
      from public.production_versions pv
      left join public.production_files f on f.id = pv.file_id
      where pv.sheet_id = v.sheet_id and pv.status <> 'draft'), '[]'::jsonb),
    'exports', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'label', e.label, 'kind', e.kind, 'url', e.url, 'result', e.result,
        'note', e.note) order by e.position, e.created_at)
      from public.production_export_checks e
      where e.sheet_id = v.sheet_id), '[]'::jsonb),
    'approved', exists (select 1 from public.production_versions pv
                         where pv.sheet_id = v.sheet_id and pv.status = 'approved'));
end;
$$;
revoke execute on function public.get_production_provider_space(text) from public;
grant execute on function public.get_production_provider_space(text) to anon, authenticated;

-- Opening the page: first and last opening, and every correction request
-- sent to this provider reads « consultée » (PROD-031).
create function public.note_production_provider_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    return;
  end if;
  update public.production_provider_links
     set first_opened_at = coalesce(first_opened_at, now()), last_opened_at = now()
   where id = v.id;
  update public.production_correction_requests
     set status = 'viewed', viewed_at = now()
   where sheet_id = v.sheet_id and contact_id = v.contact_id and status = 'sent';
end;
$$;
revoke execute on function public.note_production_provider_opened(text) from public;
grant execute on function public.note_production_provider_opened(text) to anon, authenticated;

-- 3. Deposits -----------------------------------------------------------------------

-- A one-time path of production-files for a version's file (one hour, 20 an
-- hour per link), while Production runs.
create function public.open_production_provider_slot(p_token text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_ext text := lower(substring(coalesce(p_file_name, '') from '\.([A-Za-z0-9]{1,10})$'));
  v_path text;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255 then
    raise exception 'invalid_file_name';
  end if;
  if (select count(*) from public.production_provider_slots s
       where s.link_id = v.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits';
  end if;
  v_path := v.organization_id::text || '/' || v.project_id::text || '/' || gen_random_uuid()::text
            || coalesce('.' || v_ext, '');
  insert into public.production_provider_slots (organization_id, link_id, path, expires_at)
  values (v.organization_id, v.id, v_path, now() + interval '1 hour');
  return v_path;
end;
$$;
revoke execute on function public.open_production_provider_slot(text, text) from public;
grant execute on function public.open_production_provider_slot(text, text) to anon, authenticated;

-- « Déposer une version » (PROD-028): a link (https) or the file uploaded
-- to an open slot. The version is numbered by the database, authored by the
-- provider, and submitted to the feedback at once: the validators are
-- notified, the requests answered (production_version_submitted).
create function public.deposit_production_version(
  p_token text, p_url text, p_path text, p_file_name text, p_notes text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_slot public.production_provider_slots%rowtype;
  v_bytes bigint;
  v_mime text;
  v_file uuid;
  v_version uuid;
  v_number integer;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if (v_url is null) = (p_path is null) then
    raise exception 'one_media';
  end if;
  if v_url is not null and (v_url !~ '^https://\S+$' or char_length(v_url) > 2000) then
    raise exception 'invalid_url';
  end if;
  if v_notes is not null and char_length(v_notes) > 4000 then
    raise exception 'invalid_input';
  end if;
  if p_path is not null then
    select * into v_slot from public.production_provider_slots
     where path = p_path and link_id = v.id for update;
    if not found or v_slot.used_at is not null then
      raise exception 'file_mismatch';
    end if;
    select (o.metadata ->> 'size')::bigint, coalesce(o.metadata ->> 'mimetype', 'application/octet-stream')
      into v_bytes, v_mime
      from storage.objects o where o.bucket_id = 'production-files' and o.name = p_path;
    if v_bytes is null or v_bytes <= 0 then
      raise exception 'file_mismatch';
    end if;
    insert into public.production_files
      (organization_id, project_id, sheet_id, kind, path, file_name, mime, bytes)
    values (v.organization_id, v.project_id, v.sheet_id, 'version', p_path,
            left(btrim(coalesce(p_file_name, 'version')), 255), v_mime, v_bytes)
    returning id into v_file;
    update public.production_provider_slots set used_at = now() where id = v_slot.id;
  end if;

  insert into public.production_versions
    (organization_id, project_id, sheet_id, url, file_id, notes, contact_id)
  values (v.organization_id, v.project_id, v.sheet_id, v_url, v_file, v_notes, v.contact_id)
  returning id, number into v_version, v_number;
  update public.production_versions
     set status = 'in_review', submitted_at = now()
   where id = v_version;
  return v_number;
end;
$$;
revoke execute on function public.deposit_production_version(text, text, text, text, text) from public;
grant execute on function public.deposit_production_version(text, text, text, text, text)
  to anon, authenticated;

-- « Déposer l'export » on an expected file (PROD-036): its link, which
-- resets its check; the owner is told.
create function public.deposit_production_export(p_token text, p_line_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_owner uuid;
  v_deliverable uuid;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if v_url is null or v_url !~ '^https://\S+$' or char_length(v_url) > 2000 then
    raise exception 'invalid_url';
  end if;
  update public.production_export_checks
     set url = v_url, result = null, checked_by = null, checked_at = null, note = null
   where id = p_line_id and sheet_id = v.sheet_id;
  if not found then
    raise exception 'line_not_found';
  end if;
  select p.owner_person_id into v_owner from public.projects p where p.id = v.project_id;
  select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
  if v_owner is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_owner, null, 'production_export_deposited', v.project_id,
            v_deliverable);
  end if;
end;
$$;
revoke execute on function public.deposit_production_export(text, uuid, text) from public;
grant execute on function public.deposit_production_export(text, uuid, text) to anon, authenticated;

-- 4. Notifications ----------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'project_transmitted', 'project_accepted', 'project_refused',
    'project_clarification_requested', 'validation_requested', 'validation_approved',
    'validation_rejected', 'task_assigned', 'project_creative_added',
    'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
    'contract_review_requested', 'contract_approved', 'contract_changes_requested',
    'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
    'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
    'master_final_approved', 'master_mastering_changes_requested', 'clearance_terms_proposed',
    'clearance_terms_validated', 'clearance_terms_rejected', 'strategy_review_requested',
    'strategy_review_approved', 'strategy_review_changes_requested', 'strategy_review_reminder',
    'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
    'master_mastering_delivery_received', 'legal_form_received', 'call_report_shared',
    'master_engineer_signal', 'design_version_discarded', 'design_submission_requested',
    'design_submission_decided',
    'production_version_submitted', 'production_corrections_sent',
    'production_export_deposited'])) not valid;
