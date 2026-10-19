-- The production call on the company's private link (proto « Projet complet »
-- portal « Votre prochain rendez-vous avec PDS » and « Call de production du
-- … »; production.md § 2.5, PR-4): the calls of the sheet the contact takes
-- part in — when, how, the visio link, who, the agenda, who invited —, and
-- the last version of the summary sent to them. Never the report, its
-- quotes or anything internal. Same function as 20261018400101, plus `calls`.

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
        'amountCents', q.amount_cents, 'deliveryOn', q.delivery_on, 'status', q.status,
        'reason', q.reason, 'depositedAt', q.deposited_at) order by q.deposited_at desc)
      from public.production_quotes q where q.sheet_id = s.id), '[]'::jsonb),
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o where o.sheet_id = s.id and o.status <> 'discarded'), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('title', a.title, 'dueDate', a.due_date)
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
                         where g.call_id = c.id and g.contact_id = v.contact_id))), '[]'::jsonb));
end;
$$;
revoke execute on function public.get_production_link_journey(text) from public;
grant execute on function public.get_production_link_journey(text) to anon, authenticated;
