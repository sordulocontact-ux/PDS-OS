-- Business, réunion avec Ibé du 18/11/2026 (52:10 « on a oublié l'étape avec
-- le business manager », 1:00:07 à 1:04:28, 1:17:44 à 1:19:23): the call of
-- negotiation, before any contract.
--
--   « Dès que l'artiste est vert, la cheffe de projet regarde les dispos du
--   business manager sur son agenda et cale un call entre lui et le manager
--   de l'artiste. » She is not in the call. The business manager records it
--   (Meet or the app's recorder), writes what was said (or the transcript
--   does), the accord goes to the direction, and once it is validated the
--   cheffe de projet launches the contracts with those terms: no contract
--   before the accord, the artist may refuse and leave the project.
--
--   1. can_plan_negotiation_call: the call of a music deal still before its
--      accord (to contact, call planned, negotiation) is planned by whoever
--      writes the deal, AND by the owner of its project, who reads the deal
--      without writing it (décision: she plans the call, she never writes
--      the deal's stage, terms or accord; the call is then the deal's,
--      recorded and processed by its negotiator, is_call_owner unchanged).
--   2. negotiator_free_slots: the free slots of a member who negotiates, for
--      whoever plans a deal's call (the direction, the project managers):
--      the next working days, 10:00 to 18:00 Paris, minus the calls PDS OS
--      knows he is in (his deals' calls, the calls he created or attends).
--      Only the free slots leave the database, never what fills the others.
--      His Google agenda is not read (docs/ARCHITECTURE.md § 4 quater: the
--      domain's key reads only the connected member's own address).
--   3. plan_deal_negotiation_call: « Caler le call » in one gesture — on a
--      deal, or on a participation without a live deal (the deal is then
--      opened by create_deal, its rules unchanged), giving the deal its
--      negotiator when it has none (the direction or the project's owner,
--      as assign_deal); the call, its guests from the Réseau or by e-mail,
--      and a deal « à contacter » moves to « Call prévu » (journal).
--      set_deal_negotiation_call_link: the Meet link Google gave, written by
--      whoever planned the call (he is not its owner).
--   4. participation_deal_state / project_participation_deal_states: where a
--      participation's deal stands (its stage, its accord, its calls), for
--      whoever sees the project — the « Taux / accord » column and the
--      « Caler le call » button of the « Titres et artistes » board (Maël).
--      A contract waits for agreement_validated.
--   5. The owner of the deal's project is told when its accord de principe
--      is validated (« place au contrat »): the kind deal_agreement_validated
--      already says so; a second trigger on the journal, deal_events_notify
--      is not rewritten.

-- 1 ------------------------------------------------------------------------------------------
create or replace function public.can_plan_negotiation_call(p_deal public.deals)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_deal.kind = 'music'
     and p_deal.stage in ('to_contact', 'call_planned', 'negotiation')
     and (public.can_write_deal(p_deal.organization_id, p_deal.assignee_person_id)
          or (p_deal.project_id is not null and public.is_project_owner(p_deal.project_id)));
$$;
revoke execute on function public.can_plan_negotiation_call(public.deals)
  from public, anon, authenticated;

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.negotiator_free_slots(
  p_person_id uuid,
  p_days integer default 5,
  p_minutes integer default 30)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_days integer := least(greatest(coalesce(p_days, 5), 1), 10);
  v_length interval := make_interval(mins => least(greatest(coalesce(p_minutes, 30), 15), 240));
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select m.organization_id into v_org
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
   where m.person_id = p_person_id
     and m.status = 'approved'
     and 'negotiate' = any (public.role_permissions(m.role))
     and (public.has_permission(m.organization_id, 'pilot_projects')
          or public.has_permission(m.organization_id, 'validate'))
   limit 1;
  if v_org is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with days as (
    select d::date as day
      from generate_series(v_today, v_today + 20, interval '1 day') as d
     where extract(isodow from d) < 6
     order by d
     limit v_days),
  candidates as (
    select ((days.day + make_time(h, 0, 0)) at time zone 'Europe/Paris') as s
      from days cross join generate_series(10, 18) as h),
  busy as (
    select c.occurred_at as s,
           coalesce(c.ends_at,
                    c.occurred_at + make_interval(mins => coalesce(c.duration_minutes, 30))) as e
      from public.calls c
      left join public.deals d on d.id = c.deal_id
     where c.organization_id = v_org
       and c.occurred_at < ((v_today + 21)::timestamp at time zone 'Europe/Paris')
       and case
             when c.deal_id is not null then d.assignee_person_id = p_person_id
             else c.created_by = p_person_id
                  or exists (select 1 from public.call_attendees ca
                              where ca.call_id = c.id and ca.person_id = p_person_id)
           end)
  select c.s, c.s + v_length
    from candidates c
   where c.s >= now() + interval '1 hour'
     and not exists (select 1 from busy b where b.s < c.s + v_length and b.e > c.s)
   order by c.s;
end;
$$;
revoke execute on function public.negotiator_free_slots(uuid, integer, integer) from public, anon;
grant execute on function public.negotiator_free_slots(uuid, integer, integer) to authenticated;

-- 3 ------------------------------------------------------------------------------------------
create or replace function public.plan_deal_negotiation_call(
  p_title text,
  p_occurred_at timestamptz,
  p_ends_at timestamptz,
  p_deal_id uuid default null,
  p_participation_id uuid default null,
  p_assignee_person_id uuid default null,
  p_meeting_url text default null,
  p_agenda jsonb default null,
  p_guests jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_deal uuid := p_deal_id;
  v_title text := public.clean_deal_text(p_title, 200);
  v_url text := nullif(btrim(p_meeting_url), '');
  v_guests jsonb := coalesce(p_guests, '[]'::jsonb);
  v_call uuid;
begin
  if (p_deal_id is null) = (p_participation_id is null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_title is null then
    raise exception 'title_required' using errcode = '22023';
  end if;
  if p_occurred_at is null or p_ends_at is null or p_ends_at <= p_occurred_at
     or p_ends_at - p_occurred_at > interval '12 hours' then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;
  if v_url is not null and (char_length(v_url) > 500 or v_url !~ '^https://\S+$') then
    raise exception 'link_invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(v_guests) <> 'array' or jsonb_array_length(v_guests) > 50
     or (p_agenda is not null and jsonb_typeof(p_agenda) <> 'array') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  -- On a participation: its live deal, else a new one (create_deal decides
  -- who may open it and whether the participation is still in play).
  if v_deal is null then
    select d.id into v_deal from public.deals d
     where d.participation_id = p_participation_id and d.stage <> 'abandoned';
    if v_deal is null then
      if p_assignee_person_id is null then
        raise exception 'negotiator_required' using errcode = '22023';
      end if;
      v_deal := public.create_deal(p_participation_id => p_participation_id,
                                   p_assignee_person_id => p_assignee_person_id);
    end if;
  end if;

  select * into v from public.deals where id = v_deal for update;
  if not found or not public.can_read_deal(v.organization_id, v.assignee_person_id, v.project_id) then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if v.stage in ('signed', 'abandoned') then
    raise exception 'deal_closed' using errcode = 'P0001';
  end if;
  if v.kind <> 'music' then
    raise exception 'negotiation_call_music_only' using errcode = '22023';
  end if;
  if v.stage not in ('to_contact', 'call_planned', 'negotiation') then
    raise exception 'negotiation_call_too_late' using errcode = 'P0001';
  end if;
  if not public.can_plan_negotiation_call(v) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- The call is with the deal's negotiator: given now when it has none.
  if v.assignee_person_id is null then
    if p_assignee_person_id is null then
      raise exception 'negotiator_required' using errcode = '22023';
    end if;
    if not (public.has_permission(v.organization_id, 'validate')
            or (v.project_id is not null and public.is_project_owner(v.project_id))) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    perform public.check_deal_assignee(v.organization_id, p_assignee_person_id);
    update public.deals set assignee_person_id = p_assignee_person_id
     where id = v.id returning * into v;
    perform public.log_deal_event(v, 'assigned', null, null, null,
      jsonb_build_object('assignee', p_assignee_person_id));
  elsif p_assignee_person_id is not null
        and p_assignee_person_id <> v.assignee_person_id then
    raise exception 'negotiator_changed' using errcode = 'P0001';
  end if;

  insert into public.calls
    (organization_id, deal_id, title, occurred_at, ends_at, meeting_url, agenda, consent)
  values (v.organization_id, v.id, v_title, p_occurred_at, p_ends_at, v_url,
          case when jsonb_array_length(coalesce(p_agenda, '[]'::jsonb)) > 0 then p_agenda end,
          'granted')
  returning id into v_call;

  insert into public.call_guests (call_id, organization_id, email, name, contact_id)
  select v_call, v.organization_id, lower(btrim(g ->> 'email')),
         nullif(btrim(g ->> 'name'), ''), nullif(g ->> 'contact_id', '')::uuid
    from jsonb_array_elements(v_guests) as g
  on conflict do nothing;

  if v.stage = 'to_contact' then
    update public.deals
       set stage = 'call_planned', stage_changed_by = public.auth_person_id(),
           stage_changed_at = now()
     where id = v.id returning * into v;
    perform public.log_deal_event(v, 'stage', 'to_contact', 'call_planned', null,
      jsonb_build_object('call', v_call));
  end if;
  return v_call;
end;
$$;
revoke execute on function public.plan_deal_negotiation_call(
  text, timestamptz, timestamptz, uuid, uuid, uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.plan_deal_negotiation_call(
  text, timestamptz, timestamptz, uuid, uuid, uuid, text, jsonb, jsonb) to authenticated;

-- The Meet link of a call just planned, by whoever planned it, once.
create or replace function public.set_deal_negotiation_call_link(
  p_call_id uuid,
  p_meeting_url text,
  p_google_event_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_call public.calls%rowtype;
begin
  select * into v_call from public.calls where id = p_call_id for update;
  if not found or v_call.deal_id is null or not public.can_see_call(p_call_id) then
    raise exception 'call_not_found' using errcode = 'P0002';
  end if;
  select * into v from public.deals where id = v_call.deal_id;
  if v_call.created_by is distinct from public.auth_person_id()
     or not public.can_plan_negotiation_call(v) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_call.meeting_url is not null or v_call.google_event_id is not null then
    raise exception 'link_exists' using errcode = 'P0001';
  end if;
  update public.calls
     set meeting_url = p_meeting_url, google_event_id = p_google_event_id
   where id = p_call_id;
end;
$$;
revoke execute on function public.set_deal_negotiation_call_link(uuid, text, text) from public, anon;
grant execute on function public.set_deal_negotiation_call_link(uuid, text, text) to authenticated;

-- 4 ------------------------------------------------------------------------------------------
-- One row per participation of the project, for whoever sees the project:
-- its live deal, else its latest abandoned one, else none (deal_id null).
create or replace function public.project_participation_deal_states(p_project_id uuid)
returns table (
  participation_id uuid,
  deal_id uuid,
  stage text,
  agreement_status text,
  agreement_validated boolean,
  next_call_at timestamptz,
  last_call_at timestamptz,
  can_plan_call boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select tp.id, d.id, d.stage, d.agreement_status,
         coalesce(d.agreement_status = 'validated', false),
         (select min(c.occurred_at) from public.calls c
           where c.deal_id = d.id and c.status = 'draft'
             and coalesce(c.ends_at, c.occurred_at) > now()),
         (select max(c.occurred_at) from public.calls c
           where c.deal_id = d.id and c.occurred_at <= now()),
         case
           when d.id is not null then public.can_plan_negotiation_call(d)
           else tp.status not in ('declined', 'withdrawn')
                and pt.status <> 'abandoned'
                and (public.has_permission(tp.organization_id, 'validate')
                     or public.is_project_owner(tp.project_id))
         end
    from public.title_participations tp
    join public.project_titles pt on pt.id = tp.title_id
    left join lateral (
      select x.id from public.deals x
       where x.participation_id = tp.id
       order by (x.stage = 'abandoned'), x.created_at desc
       limit 1) latest on true
    left join public.deals d on d.id = latest.id
   where tp.project_id = p_project_id
     and public.can_see_project(p_project_id);
$$;
revoke execute on function public.project_participation_deal_states(uuid) from public, anon;
grant execute on function public.project_participation_deal_states(uuid) to authenticated;

create or replace function public.participation_deal_state(p_participation_id uuid)
returns table (
  deal_id uuid,
  stage text,
  agreement_status text,
  agreement_validated boolean,
  next_call_at timestamptz,
  last_call_at timestamptz,
  can_plan_call boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.deal_id, s.stage, s.agreement_status, s.agreement_validated, s.next_call_at,
         s.last_call_at, s.can_plan_call
    from public.title_participations tp,
         lateral public.project_participation_deal_states(tp.project_id) s
   where tp.id = p_participation_id and s.participation_id = tp.id;
$$;
revoke execute on function public.participation_deal_state(uuid) from public, anon;
grant execute on function public.participation_deal_state(uuid) to authenticated;

-- 5 ------------------------------------------------------------------------------------------
create or replace function public.deal_events_notify_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_owner uuid;
begin
  if not (new.kind = 'agreement_validated'
          or (new.kind = 'stage' and new.to_stage = 'agreement'
              and new.detail ->> 'agreement' = 'validated')) then
    return null;
  end if;
  select * into v from public.deals where id = new.deal_id;
  if not found or v.project_id is null then
    return null;
  end if;
  select p.owner_person_id into v_owner from public.projects p where p.id = v.project_id;
  -- The negotiator is told by deal_events_notify; never twice.
  if v_owner is not distinct from v.assignee_person_id then
    return null;
  end if;
  perform public.notify(v.organization_id, v_owner, 'deal_agreement_validated',
                        v.project_id, v.id);
  return null;
end;
$$;
revoke execute on function public.deal_events_notify_owner() from public, anon, authenticated;
create trigger z_notify_owner after insert on public.deal_events
  for each row execute function public.deal_events_notify_owner();
