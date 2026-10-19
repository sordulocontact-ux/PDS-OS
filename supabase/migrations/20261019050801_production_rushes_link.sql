-- The rushes, apart from the shoot (proto « Projet complet » BODY.rushes;
-- production.md § 2.15, PR-12): once the shoot happened, the company gives
-- the link to fetch the rushes on its private link; the production then
-- declares them received (video and audio) and the backup verified — a
-- person's word each, stamped by the database, never a check of the files.

alter table public.production_shoots
  add column rushes_url text,
  add column rushes_url_at timestamptz,
  add column rushes_url_contact_id uuid references public.network_contacts (id),
  add constraint production_shoots_rushes_url_check
    check (rushes_url is null or (rushes_url ~ '^https://\S+$' and char_length(rushes_url) <= 2000));
grant select (rushes_url, rushes_url_at, rushes_url_contact_id) on public.production_shoots to authenticated;

select public.add_notification_kinds(array['production_rushes_linked']);

create function public.set_production_rushes_by_link(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  v := public.production_link_for_role(p_token, 'company');
  if coalesce(p_url, '') !~ '^https://\S+$' or char_length(p_url) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  if not exists (select 1 from public.production_shoots sh
                  where sh.sheet_id = s.id and sh.state in ('done', 'partial', 'interrupted')) then
    raise exception 'shoot_not_done';
  end if;
  update public.production_shoots
     set rushes_url = btrim(p_url), rushes_url_at = now(), rushes_url_contact_id = v.contact_id
   where sheet_id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'shoot', s.id, 'rushes_linked',
    null, jsonb_build_object('url', btrim(p_url)));
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_rushes_linked', s.project_id,
            s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.set_production_rushes_by_link(text, text) from public;
grant execute on function public.set_production_rushes_by_link(text, text) to anon, authenticated;

-- The link reads the shoot's state and its rushes' link.
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
    'shootState', (select sh.state from public.production_shoots sh where sh.sheet_id = s.id),
    'rushesUrl', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url from public.production_shoots sh where sh.sheet_id = s.id) end,
    'rushesAt', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url_at from public.production_shoots sh where sh.sheet_id = s.id) end,
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
