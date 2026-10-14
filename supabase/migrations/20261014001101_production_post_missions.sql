-- Production › the postproduction's missions (Ibé's tests of 13/10,
-- PROD-025, PROD-026):
--   * a step does not start without someone doing it;
--   * the provider says « Mission terminée » from their link: the step is
--     done, the owner is told (the next action moves on);
--   * a step added or removed is in the log, as its holder and status are.

create function public.production_post_steps_holder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'todo' and new.person_id is null and new.contact_id is null then
    raise exception 'step_without_holder' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger c_holder before insert or update on public.production_post_steps
  for each row execute function public.production_post_steps_holder();

-- « Mission terminée », by a provider's link: only their own step.
create function public.finish_production_step_by_link(p_token text, p_step_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  st public.production_post_steps%rowtype;
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
  select * into st from public.production_post_steps
   where id = p_step_id and sheet_id = v.sheet_id and contact_id = v.contact_id for update;
  if not found then
    raise exception 'step_not_found';
  end if;
  if st.status = 'done' then
    return;
  end if;
  update public.production_post_steps set status = 'done' where id = st.id;
  select p.owner_person_id into v_owner from public.projects p where p.id = v.project_id;
  select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
  if v_owner is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_owner, null, 'production_step_done', v.project_id, v_deliverable);
  end if;
end;
$$;
revoke execute on function public.finish_production_step_by_link(text, uuid) from public;
grant execute on function public.finish_production_step_by_link(text, uuid) to anon, authenticated;

-- The provider's page knows its steps' ids (to finish them).
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
        'note', e.note) order by e.position, e.created_at)
      from public.production_export_checks e
      where e.sheet_id = v.sheet_id), '[]'::jsonb),
    'approved', exists (select 1 from public.production_versions pv
                         where pv.sheet_id = v.sheet_id and pv.status = 'approved'));
end;
$$;

create or replace function public.production_steps_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'step',
      new.id, 'created', null, jsonb_build_object('key', new.step_key, 'label', new.label));
    return null;
  end if;
  if tg_op = 'DELETE' then
    -- Not when the whole sheet goes (cascade): nothing is left to log on.
    if exists (select 1 from public.production_sheets s where s.id = old.sheet_id) then
      perform public.production_log(old.organization_id, old.project_id, old.sheet_id, 'step',
        old.id, 'removed', jsonb_build_object('key', old.step_key, 'label', old.label), null);
    end if;
    return null;
  end if;
  if (new.person_id, new.contact_id) is distinct from (old.person_id, old.contact_id) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'step',
      new.id, 'holder',
      jsonb_build_object('key', new.step_key, 'label', new.label, 'holder', public.production_holder_json(old.person_id, old.contact_id)),
      jsonb_build_object('key', new.step_key, 'label', new.label, 'holder', public.production_holder_json(new.person_id, new.contact_id)));
  end if;
  if new.status is distinct from old.status then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'step',
      new.id, 'status', jsonb_build_object('key', old.step_key, 'label', old.label, 'status', old.status),
      jsonb_build_object('key', new.step_key, 'label', new.label, 'status', new.status));
  end if;
  return null;
end;
$$;
drop trigger z_log on public.production_post_steps;
create trigger z_log after insert or update or delete on public.production_post_steps
  for each row execute function public.production_steps_log();

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
    'production_call_sheet_published', 'production_step_done'])) not valid;
