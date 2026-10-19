-- The quote in versions (proto « Projet complet » BODY.quote, quoteDeposit;
-- production.md § 2.7, PR-6):
--   * each deposit is a version (V1, V2…), numbered by the database, with
--     the amount it plans for the places (« dont lieux », never above the
--     total); a new version replaces the ones still undecided;
--   * « Demander une modification »: by the line producer while checking,
--     or by the budget validation while deciding — a comment the company
--     reads; refusing stays possible;
--   * the active reference is the latest version validated: it stays the
--     reference until a newer one is validated (then « Remplacé »);
--   * « Demander une révision du devis » after a validation: the reason on
--     the sheet, the step « À revoir » without blocking what follows.

alter table public.production_quotes
  add column number integer,
  add column loc_budget_cents bigint;

update public.production_quotes q set number = r.n
  from (select id, row_number() over (partition by sheet_id order by deposited_at, id) as n
          from public.production_quotes) r
 where r.id = q.id;
alter table public.production_quotes alter column number set not null;
alter table public.production_quotes add constraint production_quotes_number_key
  unique (sheet_id, number);
alter table public.production_quotes add constraint production_quotes_loc_check
  check (loc_budget_cents is null or (loc_budget_cents >= 0 and loc_budget_cents <= amount_cents));

alter table public.production_quotes drop constraint production_quotes_status_check;
alter table public.production_quotes add constraint production_quotes_status_check
  check (status in ('deposited', 'submitted', 'approved', 'rejected', 'changes', 'replaced'));
alter table public.production_quotes drop constraint production_quotes_reason_check;
alter table public.production_quotes add constraint production_quotes_reason_check
  check ((status not in ('rejected', 'changes') or btrim(coalesce(reason, '')) <> '')
         and coalesce(char_length(reason), 0) <= 1000);

alter table public.production_sheets
  add column quote_revision_reason text,
  add column quote_revision_by uuid references public.people (id),
  add column quote_revision_at timestamptz,
  add constraint production_sheets_quote_revision_check
    check (quote_revision_reason is null or char_length(quote_revision_reason) <= 1000);

select public.add_notification_kinds(array['production_quote_changes']);

-- The day(s) shot: the sheet's date, else the transferred Fiche's.
create function public.production_shoot_day(s public.production_sheets)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(s.shoot_date, (
    select case when (sub.snapshot -> 'sheet' ->> 'shoot_date') ~ '^\d{4}-\d{2}-\d{2}$'
                then (sub.snapshot -> 'sheet' ->> 'shoot_date')::date end
      from public.design_handoffs h
      join public.design_submissions sub on sub.id = h.submission_id
     where h.id = s.handoff_id));
$$;
revoke execute on function public.production_shoot_day(public.production_sheets) from public, anon, authenticated;

drop function public.add_production_quote(uuid, text, bigint, date, text, text);
drop function public.deposit_production_quote_by_link(text, text, bigint, date, text, text);
drop function public.production_quote_insert(public.production_sheets, text, bigint, date, text, text, uuid);

create function public.production_quote_insert(
  s public.production_sheets, p_label text, p_amount_cents bigint, p_delivery_on date,
  p_url text, p_note text, p_by uuid, p_loc_budget_cents bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number integer;
begin
  perform 1 from public.production_sheets where id = s.id for update;
  select coalesce(max(number), 0) + 1 into v_number from public.production_quotes where sheet_id = s.id;
  -- The versions still undecided give way to the new one.
  update public.production_quotes set status = 'replaced'
   where sheet_id = s.id and status in ('deposited', 'submitted', 'changes', 'rejected');
  insert into public.production_quotes
    (organization_id, project_id, sheet_id, label, amount_cents, delivery_on, url, note, deposited_by,
     number, loc_budget_cents)
  values (s.organization_id, s.project_id, s.id,
          coalesce(nullif(btrim(coalesce(p_label, '')), ''), 'Devis V' || v_number), p_amount_cents,
          p_delivery_on, nullif(btrim(coalesce(p_url, '')), ''), nullif(btrim(coalesce(p_note, '')), ''),
          p_by, v_number, p_loc_budget_cents)
  returning id into v_id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'quote', v_id, 'deposited',
    null, jsonb_build_object('label', 'V' || v_number, 'amount', p_amount_cents));
  return v_id;
end;
$$;
revoke execute on function public.production_quote_insert(public.production_sheets, text, bigint, date, text, text, uuid, bigint)
  from public, anon, authenticated;

create function public.add_production_quote(
  p_sheet_id uuid, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text,
  p_loc_budget_cents bigint default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return public.production_quote_insert(s, p_label, p_amount_cents, p_delivery_on, p_url, p_note,
                                        public.auth_person_id(), p_loc_budget_cents);
end;
$$;
revoke execute on function public.add_production_quote(uuid, text, bigint, date, text, text, bigint) from public, anon;
grant execute on function public.add_production_quote(uuid, text, bigint, date, text, text, bigint) to authenticated;

-- The company deposits a version through its link.
create function public.deposit_production_quote_by_link(
  p_token text, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text,
  p_loc_budget_cents bigint default null)
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
  select * into s from public.production_sheets where id = v.sheet_id;
  perform public.production_quote_insert(s, p_label, p_amount_cents, p_delivery_on, p_url, p_note, null,
                                         p_loc_budget_cents);
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_quote_deposited', s.project_id,
            s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.deposit_production_quote_by_link(text, text, bigint, date, text, text, bigint) from public;
grant execute on function public.deposit_production_quote_by_link(text, text, bigint, date, text, text, bigint)
  to anon, authenticated;

-- « Demander une modification »: the line producer while checking, the
-- budget validation while deciding; the comment goes to the company.
create function public.request_production_quote_changes(p_quote_id uuid, p_comment text)
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
  select * into s from public.production_sheets where id = q.sheet_id;
  if not ((q.status = 'deposited' and public.production_can_organize(q.project_id))
          or (q.status = 'submitted' and s.quote_validator_person_id = public.auth_person_id()
              and public.project_stage_in_progress(q.project_id, 'production'))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;
  update public.production_quotes
     set status = 'changes', reason = left(btrim(p_comment), 1000),
         decided_by = public.auth_person_id(), decided_at = now()
   where id = q.id;
  perform public.production_log(q.organization_id, q.project_id, q.sheet_id, 'quote', q.id, 'changes',
    null, jsonb_build_object('label', 'V' || q.number, 'reason', btrim(p_comment)));
  v_handler := public.production_quote_handler(q.sheet_id);
  if v_handler is not null and v_handler is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (q.organization_id, v_handler, public.auth_person_id(), 'production_quote_changes',
            q.project_id, s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.request_production_quote_changes(uuid, text) from public, anon;
grant execute on function public.request_production_quote_changes(uuid, text) to authenticated;

-- « Valider » / « Refuser » (the validator): a version validated becomes the
-- active reference, the former one is « Remplacé », the revision asked ends.
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

-- « Demander une révision du devis » (whoever organises): the validated
-- version stays the reference until a new one is validated.
create function public.request_production_quote_revision(p_sheet_id uuid, p_reason text)
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
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  if not exists (select 1 from public.production_quotes where sheet_id = s.id and status = 'approved') then
    raise exception 'no_active_quote';
  end if;
  update public.production_sheets
     set quote_revision_reason = left(btrim(p_reason), 1000), quote_revision_by = public.auth_person_id(),
         quote_revision_at = now()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'quote', s.id, 'revision',
    null, jsonb_build_object('reason', btrim(p_reason)));
end;
$$;
revoke execute on function public.request_production_quote_revision(uuid, text) from public, anon;
grant execute on function public.request_production_quote_revision(uuid, text) to authenticated;

-- The link reads the versions, the revision asked and the deadline.
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
