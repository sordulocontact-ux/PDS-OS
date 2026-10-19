-- The preproduction as a checklist (proto « Projet complet » BODY.prep,
-- seedPrep; production.md § 2.9, PR-7): the company's four points become
-- tasks with a due date and who does them, seeded when its quote is
-- validated; PDS adds its own (« Saisie par … »), each with its origin;
-- the company marks its tasks « Fait » on its link, a member in the step
-- (or in Travail). The four boxes of `company_progress` are taken over.

alter table public.production_plan_actions
  add column origin text,
  add column done_at timestamptz,
  add column done_by uuid references public.people (id),
  add column done_by_contact_id uuid references public.network_contacts (id),
  add column review boolean not null default false,
  add constraint production_plan_actions_origin_check
    check (origin is null or (btrim(origin) <> '' and char_length(origin) <= 200));
grant select (origin, done_at, done_by, done_by_contact_id, review) on public.production_plan_actions to authenticated;

-- The checklist of an external production's company, once.
create function public.production_seed_checklist(s public.production_sheets)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shoot date := public.production_shoot_day(s);
  v_pos integer;
  r record;
begin
  if s.organization is distinct from 'external' or s.company_contact_id is null then
    return;
  end if;
  select coalesce(max(position) + 1, 0) into v_pos from public.production_plan_actions where sheet_id = s.id;
  for r in select * from (values
      ('calls', 'Calls techniques faits', 4, 0),
      ('gear', 'Matériel réservé', 3, 1),
      ('crew', 'Équipe confirmée', 2, 2),
      ('schedule', 'Planning envoyé', 2, 3)) as x (k, title, before, n) loop
    insert into public.production_plan_actions
      (organization_id, project_id, sheet_id, title, contact_id, due_date, status, approved_by,
       approved_at, position, template_key, origin, done_at, done_by_contact_id)
    values (s.organization_id, s.project_id, s.id, r.title, s.company_contact_id,
            case when v_shoot is not null then v_shoot - r.before end, 'approved',
            public.auth_person_id(), now(), v_pos + r.n, 'checklist_' || r.k, 'checklist',
            case when (s.company_progress ->> r.k) = 'true' then coalesce(s.company_progress_at, now()) end,
            case when (s.company_progress ->> r.k) = 'true' then s.company_contact_id end)
    on conflict (sheet_id, template_key) where template_key is not null do nothing;
  end loop;
end;
$$;
revoke execute on function public.production_seed_checklist(public.production_sheets) from public, anon, authenticated;

-- External sheets whose quote is already validated get theirs now.
do $$
declare
  s public.production_sheets%rowtype;
begin
  for s in select ps.* from public.production_sheets ps
            where ps.organization = 'external'
              and exists (select 1 from public.production_quotes q
                           where q.sheet_id = ps.id and q.status = 'approved') loop
    perform public.production_seed_checklist(s);
  end loop;
end $$;

create or replace function public.decide_production_quote(p_quote_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.production_quotes%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  select * into q from public.production_quotes where id = p_quote_id for update;
  if not found or not public.can_see_project(q.project_id) then
    raise exception 'quote_not_found';
  end if;
  select * into s from public.production_sheets where id = q.sheet_id for update;
  if s.quote_validator_person_id is distinct from public.auth_person_id()
     or not public.project_stage_in_progress(q.project_id, 'production') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if q.status <> 'submitted' then
    raise exception 'quote_not_submitted';
  end if;
  if not coalesce(p_approve, false) and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  if p_approve then
    update public.production_quotes set status = 'replaced'
     where sheet_id = q.sheet_id and status = 'approved' and id <> q.id;
    update public.production_sheets
       set quote_revision_reason = null, quote_revision_by = null, quote_revision_at = null
     where id = s.id;
    -- The company's preproduction starts with its checklist (proto seedPrep).
    perform public.production_seed_checklist(s);
  end if;
  update public.production_quotes
     set status = case when p_approve then 'approved' else 'rejected' end,
         reason = case when p_approve then null else btrim(p_reason) end,
         decided_by = public.auth_person_id(), decided_at = now()
   where id = q.id;
  perform public.production_log(q.organization_id, q.project_id, q.sheet_id, 'quote', q.id,
    case when p_approve then 'approved' else 'rejected' end, null,
    jsonb_build_object('label', 'V' || q.number, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
  v_handler := public.production_quote_handler(q.sheet_id);
  if v_handler is not null and v_handler is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (q.organization_id, v_handler, public.auth_person_id(), 'production_quote_decided',
            q.project_id, s.deliverable_id);
  end if;
end;
$$;


-- « Ajouter une tâche » to the checklist (whoever organises): a member gets
-- it in Travail, a contact on its link; its origin says who wrote it.
create function public.add_production_checklist_task(
  p_sheet_id uuid, p_title text, p_person_id uuid, p_contact_id uuid, p_due_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_id uuid;
  v_by text;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_title, '')) = '' or (p_person_id is not null and p_contact_id is not null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_person_id is not null and not public.production_person_is_member(p_person_id, s.organization_id) then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  select btrim(first_name || ' ' || coalesce(last_name, '')) into v_by
    from public.people where id = public.auth_person_id();
  insert into public.production_plan_actions
    (organization_id, project_id, sheet_id, title, person_id, contact_id, due_date, status,
     approved_by, approved_at, position, origin)
  values (s.organization_id, s.project_id, s.id, left(btrim(p_title), 300), p_person_id, p_contact_id,
          p_due_date, 'approved', public.auth_person_id(), now(),
          coalesce((select max(position) + 1 from public.production_plan_actions where sheet_id = s.id), 0),
          left('Saisie par ' || coalesce(v_by, '—'), 200))
  returning id into v_id;
  if p_person_id is not null and p_due_date is not null then
    perform public.create_production_task(v_id, p_person_id, p_due_date);
  end if;
  return v_id;
end;
$$;
revoke execute on function public.add_production_checklist_task(uuid, text, uuid, uuid, date) from public, anon;
grant execute on function public.add_production_checklist_task(uuid, text, uuid, uuid, date) to authenticated;

-- « Fait » in the step: its holder (a member) or whoever organises; the
-- task in Travail follows.
create function public.finish_production_action(p_action_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.production_plan_actions%rowtype;
begin
  select * into a from public.production_plan_actions where id = p_action_id for update;
  if not found or not public.can_see_project(a.project_id) then
    raise exception 'action_not_found';
  end if;
  if not (public.production_can_organize(a.project_id)
          or (a.person_id = public.auth_person_id()
              and public.project_stage_in_progress(a.project_id, 'production'))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.status <> 'approved' or a.done_at is not null then
    raise exception 'invalid_transition';
  end if;
  update public.production_plan_actions
     set done_at = now(), done_by = public.auth_person_id(), review = false
   where id = a.id;
  if a.task_id is not null then
    update public.tasks set status = 'done', done_at = coalesce(done_at, now())
     where id = a.task_id and status <> 'done';
  end if;
end;
$$;
revoke execute on function public.finish_production_action(uuid) from public, anon;
grant execute on function public.finish_production_action(uuid) to authenticated;

-- « Fait » on the company's link: one of its own tasks.
create function public.finish_production_action_by_link(p_token text, p_action_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  a public.production_plan_actions%rowtype;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  select * into a from public.production_plan_actions where id = p_action_id for update;
  if not found or a.sheet_id <> v.sheet_id or a.contact_id is distinct from v.contact_id
     or a.status <> 'approved' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.done_at is not null then
    return;
  end if;
  update public.production_plan_actions
     set done_at = now(), done_by_contact_id = v.contact_id, review = false
   where id = a.id;
end;
$$;
revoke execute on function public.finish_production_action_by_link(text, uuid) from public;
grant execute on function public.finish_production_action_by_link(text, uuid) to anon, authenticated;

-- The link reads its tasks with their origin and state.
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
