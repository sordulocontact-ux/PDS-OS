-- The director proposed by the company (proto « Projet complet »
-- directorBlock, portalDirector; production.md § 2.6, PR-5): on its private
-- link the company proposes one or more directors (name, showreel, why);
-- the project's side retains one, who becomes « Réalisation » with his own
-- private link; the others stay, « Non retenu ». In internal, the director
-- is still named directly in « Qui fait quoi ».

create table public.production_director_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  name text not null,
  reel_url text not null,
  note text,
  proposed_by_contact_id uuid references public.network_contacts (id),
  proposed_at timestamptz not null default now(),
  status text not null default 'proposed',
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  -- The Réseau contact made for him when retained.
  contact_id uuid references public.network_contacts (id),
  constraint production_director_proposals_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint production_director_proposals_reel_check
    check (reel_url ~ '^https://\S+$' and char_length(reel_url) <= 2000),
  constraint production_director_proposals_note_check
    check (note is null or char_length(note) <= 1000),
  constraint production_director_proposals_status_check
    check (status in ('proposed', 'retained', 'declined')),
  constraint production_director_proposals_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
create index production_director_proposals_sheet_idx
  on public.production_director_proposals (sheet_id, proposed_at);
alter table public.production_director_proposals enable row level security;
alter table public.production_director_proposals force row level security;
revoke all on table public.production_director_proposals from anon, authenticated;
grant select on public.production_director_proposals to authenticated;
create policy production_director_proposals_select on public.production_director_proposals
  for select to authenticated using (public.can_see_project(project_id));

select public.add_notification_kinds(array['production_director_proposed']);

-- The company proposes a director through its link.
create function public.propose_production_director_by_link(
  p_token text, p_name text, p_reel_url text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public.production_link_for_role(p_token, 'company');
  select * into s from public.production_sheets where id = v.sheet_id;
  if btrim(coalesce(p_name, '')) = '' or coalesce(p_reel_url, '') !~ '^https://\S+$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  insert into public.production_director_proposals
    (organization_id, project_id, sheet_id, name, reel_url, note, proposed_by_contact_id)
  values (s.organization_id, s.project_id, s.id, left(btrim(p_name), 200), btrim(p_reel_url),
          nullif(left(btrim(coalesce(p_note, '')), 1000), ''), v.contact_id);
  perform public.production_log(s.organization_id, s.project_id, s.id, 'director', s.id,
    'proposed', null, jsonb_build_object('name', btrim(p_name)));
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, p.owner_person_id, null, 'production_director_proposed', s.project_id,
         s.deliverable_id
    from public.projects p where p.id = s.project_id and p.owner_person_id is not null;
end;
$$;
revoke execute on function public.propose_production_director_by_link(text, text, text, text) from public;
grant execute on function public.propose_production_director_by_link(text, text, text, text)
  to anon, authenticated;

-- « Retenir » (whoever organises the Production): the director gets his
-- Réseau contact, the role « Réalisation » and his private link (the token
-- comes back once); the other proposals are « Non retenu ».
create function public.retain_production_director(p_proposal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.production_director_proposals%rowtype;
  s public.production_sheets%rowtype;
  v_contact uuid;
begin
  select * into d from public.production_director_proposals where id = p_proposal_id for update;
  if not found or not public.can_see_project(d.project_id) then
    raise exception 'proposal_not_found';
  end if;
  if not public.production_can_organize(d.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if d.status <> 'proposed' then
    raise exception 'invalid_transition';
  end if;
  select * into s from public.production_sheets where id = d.sheet_id for update;
  select c.id into v_contact from public.network_contacts c
   where c.organization_id = d.organization_id and c.archived_at is null
     and lower(c.name) = lower(d.name) and c.kind = 'person'
   order by c.created_at limit 1;
  if v_contact is null then
    insert into public.network_contacts (organization_id, kind, name, roles, website, created_by)
    values (d.organization_id, 'person', d.name, array['videographer'], left(d.reel_url, 500),
            public.auth_person_id())
    returning id into v_contact;
  end if;
  update public.production_director_proposals
     set status = 'retained', decided_by = public.auth_person_id(), decided_at = now(),
         contact_id = v_contact
   where id = d.id;
  update public.production_director_proposals
     set status = 'declined', decided_by = public.auth_person_id(), decided_at = now()
   where sheet_id = d.sheet_id and status = 'proposed' and id <> d.id;
  update public.production_sheets
     set director_person_id = null, director_contact_id = v_contact
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'director', s.id,
    'retained', null, jsonb_build_object('name', d.name));
  return public.create_production_provider_link(s.id, v_contact);
end;
$$;
revoke execute on function public.retain_production_director(uuid) from public, anon;
grant execute on function public.retain_production_director(uuid) to authenticated;

-- The link shows the company its proposals (same function, plus them).
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
