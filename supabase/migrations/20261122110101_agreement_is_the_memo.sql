-- The accord de principe is the deal memo (réunion avec Ibé du 18/11/2026, Sacha 22/11/2026: « je comprends
-- pas trop comment passer à la prochaine étape fluidement »): after the call, the label sends its deal memo
-- (or the business manager writes one from the terms), the business manager shows it to the direction, the
-- direction validates it or asks for changes, then he sends the validated accord back; the long contract
-- follows. The memo's circuit (20261120150101) now moves the deal:
--   « Montrer à la direction » (submit_deal_memo)      → « Accord de principe », to validate;
--   the direction validates the memo (validate_deal_memo) → the accord is validated (straight from the
--                                                          negotiation when she validates a memo not shown);
--   she asks for changes (request_deal_memo_changes)    → back to « Négociation », with her reason;
--   the validated accord is sent back (record_deal_memo_sent) → « Contractualisation ».
-- Those stage and accord events carry the memo (`detail.memo`): no second memo is photographed for them
-- (deal_events_memo) and no second notification is sent (the memo's own say it, deal_memo_events_notify).
-- The accord proposed from the terms (« Changer d'étape », a confirmed term) is unchanged, and the
-- direction's decision on it still settles the latest memo.

-- The memo's events move the deal: one helper, the deal locked by the caller.
create or replace function public.deal_memo_moves(p_deal public.deals, p_memo uuid, p_to text,
                                                  p_agreement text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_from text := p_deal.stage;
begin
  update public.deals
     set stage = p_to,
         agreement_status = p_agreement,
         agreement_decided_by = case when p_agreement = 'validated'
                                          and (v_from <> 'agreement' or p_deal.agreement_status = 'pending')
                                     then public.auth_person_id()
                                     when p_agreement is null then null
                                     else agreement_decided_by end,
         agreement_decided_at = case when p_agreement = 'validated'
                                          and (v_from <> 'agreement' or p_deal.agreement_status = 'pending')
                                     then now()
                                     when p_agreement is null then null
                                     else agreement_decided_at end,
         stage_changed_by = case when p_to <> v_from then public.auth_person_id() else stage_changed_by end,
         stage_changed_at = case when p_to <> v_from then now() else stage_changed_at end
   where id = p_deal.id
  returning * into v;
  if p_to <> v_from then
    perform public.log_deal_event(v, case when p_agreement is null and v_from = 'agreement'
                                          then 'agreement_refused' else 'stage' end,
      v_from, p_to, p_reason,
      jsonb_build_object('memo', p_memo) ||
      case when p_to = 'agreement' then jsonb_build_object('agreement', p_agreement) else '{}'::jsonb end);
  end if;
  -- Validated in place (« Accord de principe » to validate → validated).
  if p_to = 'agreement' and v_from = 'agreement' and p_agreement = 'validated' then
    perform public.log_deal_event(v, 'agreement_validated', null, null, null,
      jsonb_build_object('memo', p_memo));
  end if;
end;
$$;
revoke execute on function public.deal_memo_moves(public.deals, uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.submit_deal_memo(p_memo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id for update;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if v_memo.changes_at is not null then
    raise exception 'memo_changes_requested' using errcode = 'P0001';
  end if;
  if v_memo.submitted_at is not null then
    raise exception 'memo_submitted' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set submitted_by = public.auth_person_id(), submitted_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_submitted', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
  -- Shown to the direction: the accord de principe, to validate.
  if v.stage in ('to_contact', 'call_planned', 'negotiation') then
    perform public.deal_memo_moves(v, p_memo_id, 'agreement', 'pending');
  end if;
end;
$$;

create or replace function public.validate_deal_memo(p_memo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
begin
  select * into v_memo from public.deal_memos where id = p_memo_id for update;
  if not found then
    raise exception 'memo_not_found' using errcode = 'P0002';
  end if;
  v := public.lock_deal_for_write(v_memo.deal_id);
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deal_memos m
              where m.deal_id = v_memo.deal_id and m.number > v_memo.number) then
    raise exception 'memo_not_latest' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set status = 'validated', validated_by = public.auth_person_id(), validated_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_validated', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
  -- The direction's yes on the memo is her yes on the accord.
  if v.stage in ('to_contact', 'call_planned', 'negotiation')
     or (v.stage = 'agreement' and v.agreement_status = 'pending') then
    perform public.deal_memo_moves(v, p_memo_id, 'agreement', 'validated');
  end if;
end;
$$;

create or replace function public.request_deal_memo_changes(p_memo_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_reason text := public.clean_deal_text(p_reason, 2000);
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id for update;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if v_memo.changes_at is not null then
    raise exception 'memo_changes_requested' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set changes_reason = v_reason, changes_by = public.auth_person_id(), changes_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_changes_requested', null, null, v_reason,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
  -- Changes asked on the accord: back to the negotiation, her reason said.
  if v.stage = 'agreement' and v.agreement_status = 'pending' then
    perform public.deal_memo_moves(v, p_memo_id, 'negotiation', null, v_reason);
  end if;
end;
$$;

create or replace function public.record_deal_memo_sent(p_memo_id uuid, p_sent_to text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_to text := public.clean_deal_text(p_sent_to, 4000);
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id for update;
  if v_memo.status <> 'validated' then
    raise exception 'memo_not_validated' using errcode = 'P0001';
  end if;
  if v_memo.sent_at is not null then
    raise exception 'memo_sent' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set sent_by = public.auth_person_id(), sent_at = now(), sent_to = v_to
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_sent', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number, 'to', v_to));
  -- The validated accord sent back: the long contract comes next.
  if v.stage = 'agreement' and v.agreement_status = 'validated' then
    perform public.deal_memo_moves(v, p_memo_id, 'contracting', 'validated');
  end if;
end;
$$;

-- The memo's own moves photograph no second memo.
create or replace function public.deal_events_memo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_memo uuid;
begin
  if new.detail ? 'memo' and new.kind in ('stage', 'agreement_validated', 'agreement_refused') then
    return null;
  end if;
  select * into v from public.deals where id = new.deal_id;
  if not found then
    return null;
  end if;
  if new.kind = 'stage' and new.to_stage = 'agreement' then
    v_memo := public.snapshot_deal_memo(v,
      case when new.detail ->> 'agreement' = 'validated' then 'validated' else 'draft' end);
    perform public.log_deal_event(v, 'memo', null, null, null,
      jsonb_build_object('memo', v_memo, 'agreement', true));
  elsif new.kind = 'agreement_validated' then
    update public.deal_memos m
       set status = 'validated', validated_by = public.auth_person_id(), validated_at = now()
     where m.id = (select x.id from public.deal_memos x
                    where x.deal_id = v.id order by x.number desc limit 1)
       and m.status = 'draft'
    returning m.id into v_memo;
    if v_memo is null then
      v_memo := public.snapshot_deal_memo(v, 'validated');
    end if;
    perform public.log_deal_event(v, 'memo_validated', null, null, null,
      jsonb_build_object('memo', v_memo, 'agreement', true));
  end if;
  return null;
end;
$$;

-- …and send no second notification: the memo's events already told the direction (shown) and the
-- negotiator (validated, changes asked). The project's owner is still told the accord is validated
-- (deal_events_notify_owner).
create or replace function public.deal_events_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_director uuid;
begin
  select * into v from public.deals where id = new.deal_id;
  if not found then
    return null;
  end if;
  if new.kind = 'assigned' and (new.detail ->> 'assignee') is not null then
    perform public.notify(v.organization_id, (new.detail ->> 'assignee')::uuid,
                          'deal_assigned', v.project_id, v.id);
  elsif new.detail ? 'memo' then
    return null;
  elsif new.kind = 'stage' and new.to_stage = 'agreement'
        and new.detail ->> 'agreement' = 'pending' then
    for v_director in select public.deal_directors(v.organization_id) loop
      perform public.notify(v.organization_id, v_director, 'deal_agreement_proposed',
                            v.project_id, v.id);
    end loop;
  elsif new.kind in ('agreement_validated', 'agreement_refused') then
    perform public.notify(v.organization_id, v.assignee_person_id,
                          'deal_' || new.kind, v.project_id, v.id);
  end if;
  return null;
end;
$$;
