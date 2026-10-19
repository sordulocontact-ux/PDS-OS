-- « Contrôle avant tournage » of an external production (proto « Projet
-- complet » BODY.ready, synthesis; Artefact § 13; production.md § 2.11,
-- PR-10): the synthesis of what is really ready — read from the place, the
-- date, the company's checklist, the quote, the proposal, the blockers and
-- the informations to confirm, computed by code — is confirmed explicitly,
-- with a reason when some lines are not ready, then kept as it was
-- (`ready_snapshot`). The company reads « Préparation validée » on its link.
-- In internal, the evidence-based checks (PROD-008, 017) stay.

alter table public.production_sheets
  add column ready_snapshot jsonb,
  add column ready_forced_reason text,
  add constraint production_sheets_ready_snapshot_check
    check (ready_snapshot is null or jsonb_typeof(ready_snapshot) = 'array'),
  add constraint production_sheets_ready_forced_check
    check (ready_forced_reason is null or char_length(ready_forced_reason) <= 1000);

create function public.confirm_production_ready(p_sheet_id uuid, p_snapshot jsonb, p_force_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_missing integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.organization is distinct from 'external' then
    raise exception 'not_external';
  end if;
  if s.ready_at is not null then
    raise exception 'already_ready';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_snapshot) = 0
     or jsonb_array_length(p_snapshot) > 20 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select count(*) into v_missing from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false;
  if v_missing > 0 and btrim(coalesce(p_force_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id(), ready_snapshot = p_snapshot,
         ready_forced_reason = case when v_missing > 0 then left(btrim(p_force_reason), 1000) end
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready',
    jsonb_build_object('ready', false),
    jsonb_build_object('ready', true, 'forced', v_missing > 0,
                       'reason', nullif(btrim(coalesce(p_force_reason, '')), '')));
end;
$$;
revoke execute on function public.confirm_production_ready(uuid, jsonb, text) from public, anon;
grant execute on function public.confirm_production_ready(uuid, jsonb, text) to authenticated;

-- The link reads that the preparation is validated.
create or replace function public.get_production_link_journey(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public.production_link_of(p_token, false);
  if v.id is null then
    return null;
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  return jsonb_build_object(
    'roles', to_jsonb(public.production_link_roles(v)),
    'organization', s.organization,
    'deliveryOn', s.delivery_date,
    'progress', s.company_progress,
    'direction', jsonb_build_object('status', s.direction_status, 'comment', s.direction_comment,
      'stagingIntent', s.staging_intent, 'runOfShow', s.run_of_show, 'references', s.references_note),
    'quotes', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
        'number', q.number, 'amountCents', q.amount_cents, 'locBudgetCents', q.loc_budget_cents,
        'deliveryOn', q.delivery_on, 'status', q.status, 'url', q.url, 'note', q.note,
        'reason', q.reason, 'depositedAt', q.deposited_at, 'decidedAt', q.decided_at)
        order by q.number desc)
      from public.production_quotes q where q.sheet_id = s.id), '[]'::jsonb),
    'quoteRevision', case when s.quote_revision_at is null then null
      else jsonb_build_object('reason', s.quote_revision_reason, 'at', s.quote_revision_at) end,
    -- The deposit's deadline: the company's task about the quote, from the call.
    'quoteDue', (select a.due_date from public.production_plan_actions a
                  where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'
                    and a.title ilike '%devis%' and a.due_date is not null
                  order by a.due_date limit 1),
    'shootOn', public.production_shoot_day(s),
    'readyAt', s.ready_at,
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o where o.sheet_id = s.id and o.status <> 'discarded'), '[]'::jsonb),
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
$$;
revoke execute on function public.get_production_link_journey(text) from public;
grant execute on function public.get_production_link_journey(text) to anon, authenticated;
