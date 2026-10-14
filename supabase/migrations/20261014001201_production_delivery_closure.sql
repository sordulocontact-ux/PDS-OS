-- Production › delivery and closure (Ibé's tests of 13/10, PROD-035 to
-- PROD-040).
--   * an expected file says what is expected of it (format, ratio,
--     duration, language, subtitles) and keeps every file deposited on it
--     (PROD-035, PROD-036);
--   * the technical check goes point by point, by kind of file; the line
--     is conforming only when every point is, a failing point says why and
--     reopens the file for its provider (PROD-037);
--   * the transmission to Activations carries the conforming files, the
--     formats and constraints, and tells the person in charge (PROD-039);
--   * the production of a deliverable is closed once transmitted with
--     nothing left open — who and when kept (PROD-040).

-- 1. Expected files -----------------------------------------------------------------------

alter table public.production_export_checks
  add column spec text,
  add constraint production_export_checks_spec_check check (spec is null or char_length(spec) <= 500);
grant insert (spec) on public.production_export_checks to authenticated;
grant update (spec) on public.production_export_checks to authenticated;

create table public.production_export_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  line_id uuid not null references public.production_export_checks (id) on delete cascade,
  url text not null,
  -- A member, or nobody: a provider through their link.
  deposited_by uuid references public.people (id),
  deposited_at timestamptz not null default now(),
  constraint production_export_files_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
create index production_export_files_line_idx on public.production_export_files (line_id, deposited_at desc);
alter table public.production_export_files enable row level security;
alter table public.production_export_files force row level security;
revoke all on table public.production_export_files from anon, authenticated;
grant select on public.production_export_files to authenticated;
create policy production_export_files_select on public.production_export_files
  for select to authenticated using (public.can_see_project(project_id));

create function public.production_export_files_keep()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.url is not null and (tg_op = 'INSERT' or new.url is distinct from old.url) then
    insert into public.production_export_files
      (organization_id, project_id, sheet_id, line_id, url, deposited_by)
    values (new.organization_id, new.project_id, new.sheet_id, new.id, new.url,
            public.auth_person_id());
  end if;
  return null;
end;
$$;
revoke execute on function public.production_export_files_keep() from public, anon, authenticated;
create trigger z_files after insert or update of url on public.production_export_checks
  for each row execute function public.production_export_files_keep();

-- 2. The technical check, point by point ------------------------------------------------

create function public.production_export_points(p_kind text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'export' then array['format', 'codec', 'ratio', 'resolution', 'duration', 'audio']
    when 'subtitles' then array['sync', 'spelling', 'language']
    when 'qc' then array['image', 'sound', 'credits']
    else array['conformity'] end;
$$;

create table public.production_export_check_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  line_id uuid not null references public.production_export_checks (id) on delete cascade,
  key text not null,
  result text not null,
  note text,
  checked_by uuid references public.people (id),
  checked_at timestamptz not null default now(),
  constraint production_export_check_items_key unique (line_id, key),
  constraint production_export_check_items_result_check check (result in ('ok', 'not_ok')),
  constraint production_export_check_items_note_check check (
    (result = 'ok' or btrim(coalesce(note, '')) <> '') and coalesce(char_length(note), 0) <= 500),
  constraint production_export_check_items_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
alter table public.production_export_check_items enable row level security;
alter table public.production_export_check_items force row level security;
revoke all on table public.production_export_check_items from anon, authenticated;
grant select on public.production_export_check_items to authenticated;
create policy production_export_check_items_select on public.production_export_check_items
  for select to authenticated using (public.can_see_project(project_id));

-- « Contrôler »: the points of one file; the line follows — conforming when
-- every point is, not conforming (with the failing points as its note)
-- when one is not, to check otherwise.
create function public.check_production_export(p_line_id uuid, p_points jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.production_export_checks%rowtype;
  v_points text[];
  v_point jsonb;
  v_me uuid := public.auth_person_id();
  v_failed text;
  v_done integer;
begin
  select * into l from public.production_export_checks where id = p_line_id for update;
  if not found or not public.can_see_project(l.project_id) then
    raise exception 'line_not_found';
  end if;
  if not public.production_can_organize(l.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if l.url is null then
    raise exception 'export_not_deposited';
  end if;
  v_points := public.production_export_points(l.kind);
  for v_point in select * from jsonb_array_elements(coalesce(p_points, '[]'::jsonb)) loop
    if not (v_point ->> 'key' = any (v_points)) then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    insert into public.production_export_check_items
      (organization_id, project_id, sheet_id, line_id, key, result, note, checked_by)
    values (l.organization_id, l.project_id, l.sheet_id, l.id, v_point ->> 'key',
            v_point ->> 'result', nullif(btrim(coalesce(v_point ->> 'note', '')), ''), v_me)
    on conflict (line_id, key) do update
      set result = excluded.result, note = excluded.note, checked_by = v_me, checked_at = now();
  end loop;
  select string_agg(i.key || ' : ' || i.note, ' · ' order by i.key) into v_failed
    from public.production_export_check_items i
   where i.line_id = l.id and i.result = 'not_ok';
  select count(*) into v_done from public.production_export_check_items i
   where i.line_id = l.id and i.key = any (v_points);
  update public.production_export_checks
     set result = case when v_failed is not null then 'not_ok'
                       when v_done = cardinality(v_points) then 'ok' end,
         note = left(v_failed, 1000)
   where id = l.id;
  -- Checked again with the same result: who and when are this check's.
  update public.production_export_checks set checked_by = v_me, checked_at = now()
   where id = l.id and result is not null;
end;
$$;
revoke execute on function public.check_production_export(uuid, jsonb) from public, anon;
grant execute on function public.check_production_export(uuid, jsonb) to authenticated;

-- A new file deposited on a line: its points are to check again.
create function public.production_export_points_reset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.url is distinct from old.url then
    delete from public.production_export_check_items where line_id = new.id;
  end if;
  return null;
end;
$$;
revoke execute on function public.production_export_points_reset() from public, anon, authenticated;
create trigger z_points after update of url on public.production_export_checks
  for each row execute function public.production_export_points_reset();

-- 3. Transmission to Activations --------------------------------------------------------

alter table public.production_activation_handoffs
  add column exports jsonb not null default '[]'::jsonb,
  add column recipient_person_id uuid references public.people (id),
  add constraint production_activation_handoffs_exports_check check (jsonb_typeof(exports) = 'array');

create function public.transmit_production_to_activations(
  p_sheet_id uuid, p_formats text[], p_constraints text, p_recipient_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_delivery public.deliverable_deliveries%rowtype;
  v_me uuid := public.auth_person_id();
  v_id uuid;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_delivery from public.deliverable_deliveries
   where deliverable_id = v_sheet.deliverable_id;
  if not found or v_delivery.delivered_at is null then
    raise exception 'not_delivered';
  end if;
  -- Only creatively validated and technically conforming files go.
  if v_delivery.approved_at is null or exists (
    select 1 from public.production_export_checks e
     where e.sheet_id = v_sheet.id and e.result is distinct from 'ok') then
    raise exception 'exports_not_conforming';
  end if;
  if p_recipient_person_id is not null
     and not public.production_person_is_member(p_recipient_person_id, v_sheet.organization_id) then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  insert into public.production_activation_handoffs
    (organization_id, project_id, sheet_id, deliverable_id, version_id, final_url, delivered_at,
     formats, constraints_note, confirmed_by, exports, recipient_person_id)
  values (v_sheet.organization_id, v_sheet.project_id, p_sheet_id, v_sheet.deliverable_id,
          v_delivery.version_id, v_delivery.final_url, v_delivery.delivered_at,
          coalesce(p_formats, '{}'), nullif(btrim(coalesce(p_constraints, '')), ''), v_me,
          coalesce((select jsonb_agg(jsonb_build_object('label', e.label, 'url', e.url, 'spec', e.spec)
                                      order by e.position, e.created_at)
                      from public.production_export_checks e where e.sheet_id = v_sheet.id),
                   '[]'::jsonb),
          p_recipient_person_id)
  returning id into v_id;
  perform public.production_log(v_sheet.organization_id, v_sheet.project_id, v_sheet.id, 'handoff',
    v_id, 'sent', null, jsonb_build_object('recipient', p_recipient_person_id));
  if p_recipient_person_id is not null and p_recipient_person_id is distinct from v_me then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_sheet.organization_id, p_recipient_person_id, v_me, 'production_handed_off',
            v_sheet.project_id, v_sheet.deliverable_id);
  end if;
  return v_id;
end;
$$;
revoke execute on function public.transmit_production_to_activations(uuid, text[], text, uuid)
  from public, anon;
grant execute on function public.transmit_production_to_activations(uuid, text[], text, uuid)
  to authenticated;

-- 4. Closing a deliverable's production --------------------------------------------------

alter table public.production_sheets
  add column closed_at timestamptz,
  add column closed_by uuid references public.people (id);

-- « Clôturer » (the owner): transmitted, no equipment still out, no incident
-- blocking the closing. The production stays readable.
create function public.close_production_sheet(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.production_activation_handoffs h where h.sheet_id = s.id) then
    raise exception 'not_handed_off';
  end if;
  if exists (select 1 from public.production_equipment e
              where e.sheet_id = s.id and e.source <> 'owned'
                and e.status in ('booked', 'picked_up', 'on_site', 'to_return'))
     or exists (select 1 from public.production_incidents i
                 where i.sheet_id = s.id and i.blocks_closing and i.resolved_at is null) then
    raise exception 'closing_blocked';
  end if;
  update public.production_sheets set closed_at = now(), closed_by = public.auth_person_id()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'closed',
    null, jsonb_build_object('closed', true));
end;
$$;
revoke execute on function public.close_production_sheet(uuid) from public, anon;
grant execute on function public.close_production_sheet(uuid) to authenticated;

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
    'production_export_deposited', 'production_shoot_started',
    'production_call_sheet_published', 'production_step_done', 'production_handed_off'])) not valid;

-- 5. The provider sees what is expected of each file and its failing points ------------------------------------

create or replace function public.get_production_provider_space(p_token text)
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
        'id', st.id, 'key', st.step_key, 'label', st.label, 'responsibilities', st.responsibilities,
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
        'note', e.note, 'spec', e.spec,
        'failed', coalesce((select jsonb_agg(jsonb_build_object('key', i.key, 'note', i.note)
                                              order by i.key)
                              from public.production_export_check_items i
                             where i.line_id = e.id and i.result = 'not_ok'), '[]'::jsonb))
        order by e.position, e.created_at)
      from public.production_export_checks e
      where e.sheet_id = v.sheet_id), '[]'::jsonb),
    'approved', exists (select 1 from public.production_versions pv
                         where pv.sheet_id = v.sheet_id and pv.status = 'approved'));
end;
$$;

-- 6. The checklist's changes are in the history (PROD-035) -----------------------------

create or replace function public.production_exports_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'created', null, jsonb_build_object('label', new.label, 'spec', new.spec));
    return null;
  end if;
  if tg_op = 'DELETE' then
    -- Not when the whole sheet goes (cascade): nothing is left to log on.
    if exists (select 1 from public.production_sheets s where s.id = old.sheet_id) then
      perform public.production_log(old.organization_id, old.project_id, old.sheet_id, 'export',
        old.id, 'removed', jsonb_build_object('label', old.label), null);
    end if;
    return null;
  end if;
  if (new.label, new.spec) is distinct from (old.label, old.spec) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'spec', jsonb_build_object('label', old.label, 'spec', old.spec),
      jsonb_build_object('label', new.label, 'spec', new.spec));
  end if;
  if new.url is distinct from old.url then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'link', jsonb_build_object('label', old.label, 'url', old.url),
      jsonb_build_object('label', new.label, 'url', new.url));
  end if;
  if new.result is distinct from old.result then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'result', jsonb_build_object('label', old.label, 'result', old.result),
      jsonb_build_object('label', new.label, 'result', new.result, 'note', new.note));
  end if;
  return null;
end;
$$;
drop trigger z_log on public.production_export_checks;
create trigger z_log after insert or update or delete on public.production_export_checks
  for each row execute function public.production_exports_log();
