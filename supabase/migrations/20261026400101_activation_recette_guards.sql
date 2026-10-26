-- Activations, recette Marketing V1 of 23/10/2026 (MKT-INF-001, MKT-ACT-001):
-- what an activation allows follows its status, in the database.
--
-- Before (20261011000301, 20261011300101, docs/ARCHITECTURE.md § 8 duodecies):
-- a collaboration could be negotiated, agreed, published, paid and closed on
-- an activation still « À préparer » (no owner, no deadline, not launched);
-- the activation could be closed while a creator was still in progress; an
-- agency campaign could be declared done with lines « À examiner », lines in
-- error and no coverage at all; a deadline could be any date. The recette asks
-- the opposite (latest feedback wins):
--
-- 1. Nothing happens with a creator (proposal, agreement, rights, content,
--    feedback, publication, payment, concept for that creator, issue of the
--    collaboration) unless the activation is launched — an owner, a
--    deadline, « En cours » or « Réalisée déclarée ». Choosing the creators
--    stays open. Closed, cancelled, suspended or blocked: the collaborations
--    are frozen (an agreement can still be revoked, a page still opened).
-- 2. An influence activation is closed only once every engaged creator
--    (terms accepted, a content or a publication) has an issue; the refusal
--    lists them (`creators_open:<names>`).
-- 3. In agency mode, « Déclarer réalisée » is refused while a line is « À
--    examiner », a line is in error (not refused), or no coverage is
--    declared (`activation_not_done:agency_review,agency_errors,no_coverage`).
--    The exception is a reserve — its reason, who follows it, when —
--    written by `declare_activation_done_with_reserve`, read again by the
--    bilan.
-- 4. A deadline set or moved is neither in the past (Paris) nor after the
--    end of the campaign: the release (projects.due_date) + 28 days, the
--    period of the first-month KPIs (proto « Projet complet », J+28).

-- ------------------------------------------------------------ 1. launched

-- An activation where people may act with its creators.
create or replace function public.activation_is_live(p_activation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.marketing_activations a
     where a.id = p_activation_id
       and a.status in ('in_progress', 'done_declared')
       and a.owner_person_id is not null and a.due_on is not null);
$$;

revoke execute on function public.activation_is_live(uuid) from public, anon;
grant execute on function public.activation_is_live(uuid) to authenticated;

-- The guard of every gesture with a creator. Raises
-- `collaboration_frozen:<not_launched|closed|suspended>`.
create or replace function public.influence_gesture_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activation uuid;
  v_status text;
  v_kind text;
begin
  if tg_table_name = 'influence_feedback' then
    select c.activation_id into v_activation
      from public.influence_contents c where c.id = new.content_id;
  elsif tg_table_name = 'activation_targets' then
    -- Choosing a creator stays open; the collaboration's issue is a gesture.
    if tg_op = 'INSERT' or (new.outcome is not distinct from old.outcome
                            and new.outcome_reason is not distinct from old.outcome_reason) then
      return new;
    end if;
    v_activation := new.activation_id;
  elsif tg_table_name in ('activation_evidence', 'activation_sheets') then
    -- Only what concerns one creator (a publication, their concept).
    if new.target_id is null then return new; end if;
    v_activation := new.activation_id;
  else
    -- Revoking a link and opening the page stay possible (`to_jsonb`: the
    -- columns are read by name, each table has its own).
    if tg_table_name = 'influence_agreements' and tg_op = 'UPDATE'
       and ((to_jsonb(new) ->> 'status' = 'revoked' and to_jsonb(old) ->> 'status' <> 'revoked')
            or (to_jsonb(new) - 'displayed_at') = (to_jsonb(old) - 'displayed_at')) then
      return new;
    end if;
    v_activation := new.activation_id;
  end if;

  select a.kind, a.status into v_kind, v_status
    from public.marketing_activations a where a.id = v_activation;
  if v_kind is distinct from 'influence' or public.activation_is_live(v_activation) then
    return new;
  end if;
  raise exception 'collaboration_frozen:%',
    case when v_status in ('closed', 'cancelled') then 'closed'
         when v_status = 'suspended' then 'suspended'
         else 'not_launched' end
    using errcode = '23514';
end;
$$;

revoke execute on function public.influence_gesture_guard() from public, anon, authenticated;

-- « a_live » runs after « a_fill » (same timing, alphabetical order): the
-- activation is known on insert.
do $$
declare
  t text;
begin
  foreach t in array array['influence_proposals', 'influence_agreements', 'influence_rights',
                           'influence_contents', 'influence_feedback', 'influence_payments',
                           'activation_targets', 'activation_evidence', 'activation_sheets'] loop
    execute format('drop trigger if exists a_live on public.%I', t);
    execute format('create trigger a_live before insert or update on public.%I
                      for each row execute function public.influence_gesture_guard()', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------ 2. closure

-- The engaged creators of an influence activation without an issue, by name.
create or replace function public.activation_open_creators(p_activation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(coalesce(c.name, '—'), ', ' order by c.name)
    from public.activation_targets t
    left join public.network_contacts c on c.id = t.contact_id
   where t.activation_id = p_activation_id and t.outcome is null
     and (exists (select 1 from public.influence_proposals p
                   where p.target_id = t.id and p.accepted_at is not null)
          or exists (select 1 from public.influence_contents x where x.target_id = t.id)
          or exists (select 1 from public.activation_evidence e
                      where e.target_id = t.id and e.withdrawn_at is null));
$$;

revoke execute on function public.activation_open_creators(uuid) from public, anon, authenticated;

create or replace function public.close_activation(p_activation_id uuid, p_kind text, p_reserves jsonb, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_has_reserves boolean :=
    p_reserves is not null and jsonb_typeof(p_reserves) = 'array'
    and jsonb_array_length(p_reserves) > 0;
  v_open text;
begin
  select * into v from public.marketing_activations where id = p_activation_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status = 'closed' then raise exception 'already_closed'; end if;
  if p_kind not in ('definitive', 'with_reserves')
     or (p_kind = 'with_reserves' and not v_has_reserves)
     or (p_reserves is not null and jsonb_typeof(p_reserves) <> 'array')
     or char_length(coalesce(v_note, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_kind = 'definitive' and v_has_reserves and v_note is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  -- Every engaged creator has an issue first (MKT-INF-001).
  if v.kind = 'influence' then
    v_open := public.activation_open_creators(v.id);
    if v_open is not null then
      raise exception 'creators_open:%', v_open using errcode = '23514';
    end if;
  end if;
  perform set_config('pds.activation_closure', 'on', true);
  update public.marketing_activations
     set status = 'closed', status_reason = null, closure_kind = p_kind,
         closure_reserves = case when v_has_reserves then p_reserves end,
         closure_note = v_note, closed_by = public.auth_person_id(), closed_at = now()
   where id = v.id;
  perform set_config('pds.activation_closure', 'off', true);
  perform public.log_activation_event(v.id, 'activation.closed', null, null,
    jsonb_build_object('kind', p_kind, 'reserves', p_reserves), v_note);
end;
$$;

-- ------------------------------------------------------------ 3 and 4. check

-- The last day of the campaign: the release + 28 days; null without a date.
create or replace function public.marketing_campaign_end(p_project_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select p.due_date + 28 from public.projects p where p.id = p_project_id;
$$;

revoke execute on function public.marketing_campaign_end(uuid) from public, anon;
grant execute on function public.marketing_campaign_end(uuid) to authenticated;

-- What an agency campaign still lacks to be declared done.
create or replace function public.agency_done_gaps(p_activation_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when exists (
      select 1 from public.agency_rows r
       where r.activation_id = p_activation_id and r.absent_since is null
         and r.pds_decision = 'to_review') then 'agency_review' end,
    case when exists (
      select 1 from public.agency_rows r
        join public.agency_snapshot_rows s
          on s.snapshot_id = r.last_snapshot_id and s.row_key = r.row_key
       where r.activation_id = p_activation_id and r.absent_since is null
         and r.pds_decision <> 'refused' and jsonb_array_length(s.errors) > 0) then 'agency_errors' end,
    case when not exists (
      select 1 from public.activation_evidence e
       where e.activation_id = p_activation_id and e.withdrawn_at is null) then 'no_coverage' end
  ], null);
$$;

revoke execute on function public.agency_done_gaps(uuid) from public, anon;
grant execute on function public.agency_done_gaps(uuid) to authenticated;

create or replace function public.marketing_activations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text[];
  v_resumed boolean := false;
  v_end date;
begin
  if new.lever_id is not null and not exists (
       select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id)
     or new.deliverable_id is not null and not exists (
       select 1 from public.strategy_deliverables d
        where d.id = new.deliverable_id and d.project_id = new.project_id)
     or new.handoff_id is not null and not exists (
       select 1 from public.production_activation_handoffs h
        where h.id = new.handoff_id and h.project_id = new.project_id) then
    raise exception 'source_not_in_project' using errcode = '23514';
  end if;
  if new.owner_person_id is not null
     and not public.production_person_is_member(new.owner_person_id, new.organization_id) then
    raise exception 'owner_not_member' using errcode = '23514';
  end if;
  -- A deadline set or moved: from today (Paris) to the end of the campaign.
  if new.due_on is not null
     and (tg_op = 'INSERT' or new.due_on is distinct from old.due_on) then
    if new.due_on < (now() at time zone 'Europe/Paris')::date then
      raise exception 'due_in_past' using errcode = '23514';
    end if;
    v_end := public.marketing_campaign_end(new.project_id);
    if v_end is not null and new.due_on > v_end then
      raise exception 'due_after_campaign:%', v_end using errcode = '23514';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'to_prepare' or new.closure_kind is not null
       or new.status_before_suspension is not null then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    return new;
  end if;
  if current_setting('pds.activation_closure', true) is distinct from 'on'
     and (new.closure_kind is distinct from old.closure_kind
          or new.closed_at is distinct from old.closed_at
          or new.closure_reserves is distinct from old.closure_reserves
          or (new.status = 'closed') <> (old.status = 'closed')) then
    raise exception 'use_close_activation' using errcode = '42501';
  end if;

  -- « Suspendre »: from a live status only; the interrupted one is kept.
  if new.status = 'suspended' and old.status <> 'suspended' then
    if old.status not in ('to_prepare', 'in_progress', 'done_declared', 'blocked') then
      raise exception 'invalid_transition' using errcode = '23514';
    end if;
    new.status_before_suspension := old.status;
  elsif old.status = 'suspended' and new.status <> 'suspended' then
    -- « Reprendre » returns where it was; cancelling stays possible.
    if new.status <> 'cancelled' and new.status <> old.status_before_suspension then
      raise exception 'invalid_transition' using errcode = '23514';
    end if;
    v_resumed := new.status <> 'cancelled';
    new.status_before_suspension := null;
    if new.status in ('to_prepare', 'in_progress', 'done_declared') then
      new.status_reason := null;
    end if;
  elsif new.status = 'suspended' then
    new.status_before_suspension := old.status_before_suspension;
  else
    new.status_before_suspension := null;
  end if;

  -- Starting : from À préparer or Bloquée to En cours or Réalisée déclarée.
  -- Read on the new row (an owner and a due date given in the same update
  -- count), blockers and dependencies as they are now.
  if old.status in ('to_prepare', 'blocked')
     and new.status in ('in_progress', 'done_declared') then
    v_missing := array_remove(array[
      case when new.owner_person_id is null then 'owner' end,
      case when new.due_on is null then 'due' end], null)
      || coalesce((select array_agg(m) from unnest(public.activation_launch_gaps(new.id)) m
                    where m in ('blocker', 'dependency')), '{}');
    if cardinality(v_missing) > 0 then
      raise exception 'activation_not_ready:%', array_to_string(v_missing, ',')
        using errcode = '23514';
    end if;
  end if;

  -- « Déclarer réalisée » (not a resumption): a campaign in house is done
  -- once it has really begun. Proof and statistics are read apart.
  if new.status = 'done_declared' and old.status <> 'done_declared' and not v_resumed
     and new.mode = 'internal' then
    if new.kind = 'influence' and not exists (
         select 1 from public.activation_evidence e
          where e.activation_id = new.id and e.target_id is not null
            and e.kind = 'publication' and e.withdrawn_at is null) then
      raise exception 'activation_not_done:no_publication' using errcode = '23514';
    end if;
    if new.kind = 'press' and not exists (
         select 1 from public.activation_messages m
          where m.activation_id = new.id and m.target_id is not null
            and m.status = 'sent_declared') then
      raise exception 'activation_not_done:no_message' using errcode = '23514';
    end if;
  end if;
  -- An agency campaign: its lines decided, none in error, some coverage —
  -- or a reserve, written by declare_activation_done_with_reserve.
  if new.status = 'done_declared' and old.status <> 'done_declared' and not v_resumed
     and new.mode = 'agency'
     and current_setting('pds.agency_done_exception', true) is distinct from 'on' then
    v_missing := public.agency_done_gaps(new.id);
    if cardinality(v_missing) > 0 then
      raise exception 'activation_not_done:%', array_to_string(v_missing, ',')
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- « Déclarer réalisée avec une réserve »: an agency campaign whose lines are
-- not all settled is declared done, and what remains becomes a reserve of
-- the bilan (open: the bilan arbitrates it), with who follows it and when.
create or replace function public.declare_activation_done_with_reserve(
  p_activation_id uuid, p_reason text, p_person_id uuid, p_due_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_gaps text[];
  v_id uuid;
begin
  select * into v from public.marketing_activations where id = p_activation_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.mode is distinct from 'agency' or v.status not in ('in_progress') then
    raise exception 'invalid_transition' using errcode = '23514';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 1000 or p_person_id is null or p_due_on is null
     or not public.production_person_is_member(p_person_id, v.organization_id) then
    raise exception 'follow_up_incomplete' using errcode = '23514';
  end if;
  if p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'due_in_past' using errcode = '23514';
  end if;
  v_gaps := public.agency_done_gaps(v.id);
  insert into public.marketing_reserves
    (organization_id, project_id, category, description, origin, activation_id,
     follow_up_person_id, follow_up_due_on)
  values (v.organization_id, v.project_id, 'coverage', v_reason, 'manual', v.id,
          p_person_id, p_due_on)
  returning id into v_id;
  perform set_config('pds.agency_done_exception', 'on', true);
  update public.marketing_activations set status = 'done_declared' where id = v.id;
  perform set_config('pds.agency_done_exception', 'off', true);
  perform public.log_activation_event(v.id, 'activation.done_with_reserve', v_id, null,
    jsonb_build_object('gaps', to_jsonb(v_gaps), 'person_id', p_person_id, 'due_on', p_due_on),
    v_reason);
  return v_id;
end;
$$;

revoke execute on function public.declare_activation_done_with_reserve(uuid, text, uuid, date)
  from public, anon;
grant execute on function public.declare_activation_done_with_reserve(uuid, text, uuid, date)
  to authenticated;
