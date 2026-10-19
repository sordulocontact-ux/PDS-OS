-- The edit of an external production (proto « Projet complet » BODY.post and
-- BODY.delivery, production.md § 2.16, PR-12 rest):
--   * the company deposits its versions on its private link, with no post
--     step to create first (it already could: a link of a role holder may
--     deposit; the external validation's link may not);
--   * each version is validated by the internal creative validation and,
--     when « Qui fait quoi » names one, by the external one — in addition,
--     never in its place: the version is approved once both are;
--   * the company deposits the final file of the validated version on its
--     link; then the technical check of the exports and the delivery to its
--     recipients stay three distinct decisions (20261020020201).
-- The links read the edit's versions (company, external validation), the
-- final file and the delivery; a light journey's link reads its versions.

-- 1. The two sides of a version ----------------------------------------------------------

alter table public.production_versions
  add column int_approved_by uuid references public.people (id),
  add column int_approved_at timestamptz,
  add column ext_status text not null default 'none',
  add column ext_contact_id uuid,
  add column ext_at timestamptz,
  add column ext_note text,
  add constraint production_versions_ext_check check (
    ext_status in ('none', 'pending', 'approved', 'changes')
    and coalesce(char_length(ext_note), 0) <= 2000),
  add constraint production_versions_ext_same_org foreign key (ext_contact_id, organization_id)
    references public.network_contacts (id, organization_id);

-- Submitted: the external validation is awaited when one is named.
create function public.production_version_ext_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'in_review' and old.status = 'draft' then
    new.ext_status := case when exists (select 1 from public.production_sheets s
                                         where s.id = new.sheet_id and s.creative_ext_contact_id is not null)
                           then 'pending' else 'none' end;
    new.int_approved_by := null;
    new.int_approved_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_version_ext_open() from public, anon, authenticated;
create trigger b_ext_open before update of status on public.production_versions
  for each row execute function public.production_version_ext_open();

select public.add_notification_kinds(array['production_version_decided', 'production_final_deposited']);

-- The version approved once both sides are: the delivery's creative
-- decision follows (as decide_production_version did).
create function public.production_version_finalize(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_deliverable uuid;
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if v.int_approved_at is null or v.ext_status not in ('approved', 'none')
     or v.status not in ('in_review', 'final_review') then
    return;
  end if;
  update public.production_versions
     set status = 'approved', decided_by = v.int_approved_by,
         decided_at = greatest(v.int_approved_at, coalesce(v.ext_at, v.int_approved_at))
   where id = v.id;
  select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
  insert into public.deliverable_deliveries
    (organization_id, project_id, deliverable_id, version_id, final_set_by, approved_by, approved_at)
  values (v.organization_id, v.project_id, v_deliverable, v.id, v.int_approved_by, v.int_approved_by, now())
  on conflict (deliverable_id) do update
    set version_id = excluded.version_id, approved_by = excluded.approved_by,
        approved_at = excluded.approved_at, checked_by = null, checked_at = null,
        delivered_by = null, delivered_at = null;
end;
$$;
revoke execute on function public.production_version_finalize(uuid) from public, anon, authenticated;

-- « Valider » by the internal creative validation: alone when no external
-- validation is awaited, else its half of the decision.
create or replace function public.decide_production_version(p_version_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_me uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status not in ('in_review', 'final_review') then
    raise exception 'invalid_transition';
  end if;
  if p_decision = 'changes' then
    raise exception 'recipient_required';
  end if;
  if p_decision not in ('approve', 'refuse') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_decision = 'refuse' and v_note is null then
    raise exception 'reason_required';
  end if;
  if p_decision = 'refuse' then
    update public.production_versions
       set status = 'refused', decided_by = v_me, decided_at = now(), decision_note = v_note
     where id = v.id;
    return;
  end if;
  if v.int_approved_at is not null then
    raise exception 'invalid_transition';
  end if;
  update public.production_versions
     set int_approved_by = v_me, int_approved_at = now(), decision_note = coalesce(v_note, decision_note)
   where id = v.id;
  perform public.production_version_finalize(v.id);
end;
$$;

-- « Valider le montage Vn » / « Demander des modifications » by the
-- external creative validation, on its private link.
create function public._decide_production_version_by_link_h(
  p_link_hash text, p_version_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.production_provider_links%rowtype;
  v public.production_versions%rowtype;
  s public.production_sheets%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  l := public._production_link_for_role_h(p_link_hash, 'creativeExt');
  select * into v from public.production_versions
   where id = p_version_id and sheet_id = l.sheet_id for update;
  if not found then
    raise exception 'version_not_found';
  end if;
  if v.status not in ('in_review', 'final_review') or v.ext_status <> 'pending' then
    raise exception 'invalid_transition';
  end if;
  if not coalesce(p_approve, false) and v_note is null then
    raise exception 'reason_required';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  if coalesce(p_approve, false) then
    update public.production_versions
       set ext_status = 'approved', ext_contact_id = l.contact_id, ext_at = now(), ext_note = v_note
     where id = v.id;
    perform public.production_version_finalize(v.id);
  else
    update public.production_versions
       set ext_status = 'changes', ext_contact_id = l.contact_id, ext_at = now(), ext_note = v_note,
           status = 'changes_requested'
     where id = v.id;
  end if;
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, null, 'production_version_decided', s.project_id, s.deliverable_id
    from (select p.owner_person_id as id from public.projects p where p.id = s.project_id
          union select pc.person_id from public.project_creatives pc where pc.project_id = s.project_id) x
   where x.id is not null;
end;
$$;
revoke execute on function public._decide_production_version_by_link_h(text, uuid, boolean, text) from public, anon, authenticated;

create function public.decide_production_version_by_link(
  p_token text, p_version_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._decide_production_version_by_link_h(public.link_token_hash(p_token), p_version_id,
    p_approve, p_note);
end;
$$;
revoke execute on function public.decide_production_version_by_link(text, uuid, boolean, text) from public;
grant execute on function public.decide_production_version_by_link(text, uuid, boolean, text) to anon, authenticated;

create function public.decide_production_version_by_link(
  p_contact_token text, p_item_id uuid, p_version_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._decide_production_version_by_link_h(
    public.contact_item_hash('provider', p_contact_token, p_item_id), p_version_id, p_approve, p_note);
end;
$$;
revoke execute on function public.decide_production_version_by_link(text, uuid, uuid, boolean, text) from public;
grant execute on function public.decide_production_version_by_link(text, uuid, uuid, boolean, text) to anon, authenticated;

-- The external validation removed: what waited for it no longer does.
create or replace function public.set_production_creative_ext(p_sheet_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_id uuid;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = s.organization_id and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;
  if p_contact_id is not distinct from s.creative_ext_contact_id then
    return;
  end if;
  update public.production_sheets set creative_ext_contact_id = p_contact_id where id = s.id;
  if p_contact_id is null then
    update public.production_direction_versions set ext_status = 'none'
     where sheet_id = s.id and ext_status = 'pending';
    perform public.production_direction_sync(s.id);
    for v_id in update public.production_versions set ext_status = 'none'
                 where sheet_id = s.id and ext_status = 'pending' returning id loop
      perform public.production_version_finalize(v_id);
    end loop;
  end if;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'creative_ext',
    jsonb_build_object('contact', s.creative_ext_contact_id), jsonb_build_object('contact', p_contact_id));
end;
$$;

-- 2. The company's deposits on its link --------------------------------------------------

-- A version deposited through a link: never by the external validation alone.
create or replace function public._deposit_production_version_h(p_link_hash text, p_url text, p_path text, p_file_name text, p_notes text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
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
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if public.production_link_roles(v) = array['creativeExt']
     and not exists (select 1 from public.production_post_steps st
                      where st.sheet_id = v.sheet_id and st.contact_id = v.contact_id) then
    raise exception 'not_allowed' using errcode = '42501';
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
$function$;

-- « Déposer le fichier final du montage Vn » (the company, on its link):
-- the link of the validated version's final file. The technical check and
-- the delivery start again from it.
create function public._set_production_final_by_link_h(p_link_hash text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  d public.deliverable_deliveries%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
  v_handler uuid;
begin
  l := public._production_link_for_role_h(p_link_hash, 'company');
  if v_url !~ '^https://\S+$' or char_length(v_url) > 2048 then
    raise exception 'invalid_url';
  end if;
  select * into s from public.production_sheets where id = l.sheet_id;
  select * into d from public.deliverable_deliveries where deliverable_id = s.deliverable_id for update;
  if not found or d.approved_at is null then
    raise exception 'no_validated_version';
  end if;
  if d.delivered_at is not null then
    raise exception 'already_delivered';
  end if;
  update public.deliverable_deliveries
     set final_url = v_url, final_set_at = now(), checked_by = null, checked_at = null
   where id = d.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'delivery', d.id, 'final_linked',
    null, jsonb_build_object('url', v_url));
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_final_deposited', s.project_id, s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public._set_production_final_by_link_h(text, text) from public, anon, authenticated;

create function public.set_production_final_by_link(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._set_production_final_by_link_h(public.link_token_hash(p_token), p_url);
end;
$$;
revoke execute on function public.set_production_final_by_link(text, text) from public;
grant execute on function public.set_production_final_by_link(text, text) to anon, authenticated;

create function public.set_production_final_by_link(p_contact_token text, p_item_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._set_production_final_by_link_h(
    public.contact_item_hash('provider', p_contact_token, p_item_id), p_url);
end;
$$;
revoke execute on function public.set_production_final_by_link(text, uuid, text) from public;
grant execute on function public.set_production_final_by_link(text, uuid, text) to anon, authenticated;

-- 3. What the links read ------------------------------------------------------------------

-- The versions of the edit (or of a light journey), the final file and the
-- delivery: for the company and the external validation only.
create function public.production_link_cut(v public.production_provider_links, p_roles text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not (p_roles && array['company', 'creativeExt']) then null else jsonb_build_object(
    'track', case when s.derived_from_sheet_id is not null then 'derived'
                  when public.production_is_artwork(s.deliverable_id) then 'artwork' else 'shoot' end,
    'gate', case when s.derived_from_sheet_id is null then null
                 else jsonb_build_object('clip', (select d.title from public.production_sheets f
                                                    join public.strategy_deliverables d on d.id = f.deliverable_id
                                                   where f.id = s.derived_from_sheet_id),
                                         'done', public.production_cut_approved(s.derived_from_sheet_id)) end,
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pv.id, 'number', pv.number, 'status', pv.status, 'url', pv.url,
        'fileName', f.file_name, 'width', pv.image_width, 'height', pv.image_height,
        'submittedAt', coalesce(pv.submitted_at, pv.created_at),
        'intApproved', pv.int_approved_at is not null or pv.status = 'approved',
        'extStatus', pv.ext_status, 'extNote', pv.ext_note,
        -- What PDS asked to change: the company reads it to redo the edit.
        'note', case when pv.status in ('changes_requested', 'refused') then pv.decision_note end)
        order by pv.number desc)
      from public.production_versions pv
      left join public.production_files f on f.id = pv.file_id
      where pv.sheet_id = s.id and pv.status <> 'draft'), '[]'::jsonb),
    'finalUrl', dd.final_url, 'finalAt', dd.final_set_at,
    'approvedAt', dd.approved_at, 'checkedAt', dd.checked_at, 'deliveredAt', dd.delivered_at,
    'recipients', coalesce((select jsonb_agg(coalesce(
          (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, '')) from public.people pe where pe.id = r.person_id),
          (select c.name from public.network_contacts c where c.id = r.contact_id), r.name) order by r.created_at)
        from public.production_delivery_recipients r
       where r.sheet_id = s.id and r.delivered_at = dd.delivered_at), '[]'::jsonb))
  end
    from public.production_sheets s
    left join public.deliverable_deliveries dd on dd.deliverable_id = s.deliverable_id
   where s.id = v.sheet_id;
$$;
revoke execute on function public.production_link_cut(public.production_provider_links, text[]) from public, anon, authenticated;

create or replace function public._get_production_link_journey_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_roles text[];
begin
  v := public._production_link_of_h(p_link_hash, false);
  if v.id is null then
    return null;
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  v_roles := public.production_link_roles(v);
  return jsonb_build_object(
    'roles', to_jsonb(v_roles),
    'organization', s.organization,
    'deliveryOn', s.delivery_date,
    'progress', s.company_progress,
    'direction', jsonb_build_object('status', s.direction_status, 'comment', s.direction_comment,
      'stagingIntent', s.staging_intent, 'runOfShow', s.run_of_show, 'references', s.references_note),
    'directionVersions', case when v_roles && array['director', 'creativeExt'] then
      coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'number', d.number,
          'treatmentUrl', d.treatment_url, 'moodboardUrl', d.moodboard_url, 'cuttingUrl', d.cutting_url,
          'note', d.note, 'depositedAt', d.deposited_at,
          'depositedBy', coalesce((select c.name from public.network_contacts c where c.id = d.deposited_by_contact),
                                  (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
                                     from public.people pe where pe.id = d.deposited_by_person)),
          'intStatus', d.int_status, 'intComment', d.int_comment, 'intAt', d.int_at,
          'extStatus', d.ext_status, 'extComment', d.ext_comment, 'extAt', d.ext_at)
          order by d.number desc)
        from public.production_direction_versions d where d.sheet_id = s.id), '[]'::jsonb)
      else '[]'::jsonb end,
    'directionRevision', case when s.direction_revision_at is null or not (v_roles && array['director'])
      then null else jsonb_build_object('reason', s.direction_revision_reason, 'at', s.direction_revision_at) end,
    'cut', public.production_link_cut(v, v_roles),
    'quotes', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
        'number', q.number, 'amountCents', q.amount_cents, 'locBudgetCents', q.loc_budget_cents,
        'deliveryOn', q.delivery_on, 'status', q.status, 'url', q.url, 'note', q.note,
        'reason', q.reason, 'depositedAt', q.deposited_at, 'decidedAt', q.decided_at)
        order by q.number desc)
      from public.production_quotes q where q.sheet_id = s.id and 'company' = any (v_roles)), '[]'::jsonb),
    'quoteRevision', case when s.quote_revision_at is null then null
      else jsonb_build_object('reason', s.quote_revision_reason, 'at', s.quote_revision_at) end,
    'quoteDue', (select a.due_date from public.production_plan_actions a
                  where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'
                    and a.title ilike '%devis%' and a.due_date is not null
                  order by a.due_date limit 1),
    'shootOn', public.production_shoot_day(s),
    'readyAt', s.ready_at,
    'shootState', (select sh.state from public.production_shoots sh where sh.sheet_id = s.id),
    'rushesUrl', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url from public.production_shoots sh where sh.sheet_id = s.id) end,
    'rushesAt', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url_at from public.production_shoots sh where sh.sheet_id = s.id) end,
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o
      where o.sheet_id = s.id and o.status <> 'discarded' and 'company' = any (v_roles)), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title,
        'dueDate', a.due_date, 'origin', a.origin, 'doneAt', a.done_at, 'review', a.review,
        'checklist', coalesce(a.origin = 'checklist' or a.template_key like 'checklist\_%', false))
        order by a.due_date nulls last, a.position)
      from public.production_plan_actions a
      where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object(
        'title', c.title, 'occurredAt', c.occurred_at, 'format', pc.format,
        'meetingUrl', c.meeting_url, 'status', c.status,
        'participants', coalesce((select jsonb_agg(p ->> 'name')
           from jsonb_array_elements(pc.participants) p), '[]'::jsonb),
        'agenda', coalesce((select jsonb_agg(a ->> 'topic')
           from jsonb_array_elements(case when jsonb_typeof(c.agenda) = 'array'
                                          then c.agenda else '[]'::jsonb end) a), '[]'::jsonb),
        'invitedAt', c.created_at,
        'invitedBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
           from public.people pe where pe.id = c.created_by),
        'summary', (select jsonb_build_object('version', cs.version, 'text', cs.text,
              'sentAt', cs.sent_at,
              'sentBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
                           from public.people pe where pe.id = cs.sent_by))
           from public.call_summaries cs
          where cs.call_id = c.id
            and cs.recipients @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
          order by cs.version desc limit 1))
        order by c.occurred_at)
      from public.production_calls pc join public.calls c on c.id = pc.call_id
      where pc.sheet_id = s.id
        and (pc.participants @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
             or exists (select 1 from public.call_guests g
                         where g.call_id = c.id and g.contact_id = v.contact_id))), '[]'::jsonb),
    'directorProposals', case when s.company_contact_id = v.contact_id then
      coalesce((select jsonb_agg(jsonb_build_object('name', d.name, 'reelUrl', d.reel_url,
          'note', d.note, 'status', d.status, 'proposedAt', d.proposed_at) order by d.proposed_at)
        from public.production_director_proposals d
        where d.sheet_id = s.id and d.proposed_by_contact_id = v.contact_id), '[]'::jsonb)
      else '[]'::jsonb end);
end;
$function$;
revoke execute on function public._get_production_link_journey_h(text) from public, anon, authenticated;
