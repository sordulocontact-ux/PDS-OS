-- Marketing › Suivi & bilan, lot 5 (ticket « Suivi & bilan », écran 4,
-- docs/ARCHITECTURE.md § 8 duodecies): the arbitration of each reserve before
-- the Marketing closing, and its follow-up.
--   * status: open (à arbitrer) → arbitrated (bloquante, suivi après clôture,
--     limite acceptée) → lifted (levée); « non applicable » and « doublon »
--     close it at once (closed). A closed or lifted reserve stays in the
--     history, never deleted;
--   * decision, with what each one requires (arbitrate_marketing_reserve):
--     blocking — the closing stays blocked until it is lifted; follow_up —
--     who, by when and through which channel; accepted_limit — a reason, and
--     only the direction (« validate ») accepts a definitive limit;
--     not_applicable — a reason; duplicate — the reserve kept, same project;
--   * the project's owner arbitrates and lifts; the person following a
--     reserve updates its follow-up and lifts it, never its decision;
--   * showing a follow-up creates nothing: the owner links an existing task
--     of the project or creates one in Travail, on purpose
--     (link_reserve_task, create_reserve_task).

alter table public.marketing_reserves drop constraint marketing_reserves_status_check;
alter table public.marketing_reserves
  add constraint marketing_reserves_status_check
    check (status in ('open', 'arbitrated', 'lifted', 'closed')),
  add column decision text,
  add column decision_reason text,
  add column follow_up_person_id uuid references public.people (id),
  add column follow_up_due_on date,
  add column follow_up_channel text,
  add column follow_up_note text,
  add column duplicate_of uuid,
  add column task_id uuid references public.tasks (id) on delete set null,
  add column arbitrated_by uuid references public.people (id),
  add column arbitrated_at timestamptz,
  add column lifted_by uuid references public.people (id),
  add column lifted_at timestamptz,
  add column lift_note text,
  add constraint marketing_reserves_decision_check check (decision is null or decision in (
    'blocking', 'follow_up', 'accepted_limit', 'not_applicable', 'duplicate')),
  add constraint marketing_reserves_texts_check check (
    char_length(coalesce(decision_reason, '')) <= 1000
    and char_length(coalesce(follow_up_channel, '')) <= 200
    and char_length(coalesce(follow_up_note, '')) <= 2000
    and char_length(coalesce(lift_note, '')) <= 1000),
  -- What each decision requires (écran 4, « Arbitrages possibles »).
  add constraint marketing_reserves_decision_requirements check (
    (decision is null) = (status = 'open')
    and (decision is distinct from 'follow_up'
         or (follow_up_person_id is not null and follow_up_due_on is not null
             and follow_up_channel is not null and btrim(follow_up_channel) <> ''))
    and (decision not in ('accepted_limit', 'not_applicable')
         or (decision_reason is not null and btrim(decision_reason) <> ''))
    and ((decision = 'duplicate') = (duplicate_of is not null))
    and (decision not in ('not_applicable', 'duplicate') or status = 'closed')
    and (status <> 'lifted' or decision in ('blocking', 'follow_up'))),
  add constraint marketing_reserves_duplicate_same_org foreign key (duplicate_of, organization_id)
    references public.marketing_reserves (id, organization_id);

-- The owner keeps writing the text of a reserve still to arbitrate only.
drop policy marketing_reserves_update on public.marketing_reserves;
create policy marketing_reserves_update on public.marketing_reserves
  for update to authenticated
  using (public.marketing_can_contribute(project_id) and status = 'open')
  with check (public.marketing_can_contribute(project_id) and status = 'open');

-- « Arbitrer »: one decision per reserve, what it requires checked here;
-- who and when are written by the database. A reserve still open or already
-- arbitrated (not lifted, not closed) can be arbitrated again.
create function public.arbitrate_marketing_reserve(
  p_reserve_id uuid,
  p_decision text,
  p_reason text,
  p_follow_up_person_id uuid,
  p_follow_up_due_on date,
  p_follow_up_channel text,
  p_duplicate_of uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_channel text := nullif(btrim(coalesce(p_follow_up_channel, '')), '');
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.is_project_owner(v.project_id)
     and not (p_decision = 'accepted_limit' and public.has_permission(v.organization_id, 'validate')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status not in ('open', 'arbitrated') then
    raise exception 'invalid_transition';
  end if;
  if p_decision not in ('blocking', 'follow_up', 'accepted_limit', 'not_applicable', 'duplicate') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- A definitive limit is the direction's to accept.
  if p_decision = 'accepted_limit' and not public.has_permission(v.organization_id, 'validate') then
    raise exception 'limit_needs_direction' using errcode = '42501';
  end if;
  if p_decision in ('accepted_limit', 'not_applicable') and v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if p_decision = 'follow_up' and (p_follow_up_person_id is null or p_follow_up_due_on is null
                                   or v_channel is null
                                   or not public.production_person_is_member(p_follow_up_person_id,
                                                                            v.organization_id)) then
    raise exception 'follow_up_incomplete' using errcode = '23514';
  end if;
  if p_decision = 'duplicate' and (p_duplicate_of is null or p_duplicate_of = v.id or not exists (
       select 1 from public.marketing_reserves k
        where k.id = p_duplicate_of and k.project_id = v.project_id
          and k.decision is distinct from 'duplicate')) then
    raise exception 'invalid_duplicate' using errcode = '23514';
  end if;
  update public.marketing_reserves
     set decision = p_decision,
         decision_reason = v_reason,
         follow_up_person_id = case when p_decision = 'follow_up' then p_follow_up_person_id end,
         follow_up_due_on = case when p_decision = 'follow_up' then p_follow_up_due_on end,
         follow_up_channel = case when p_decision = 'follow_up' then v_channel end,
         duplicate_of = case when p_decision = 'duplicate' then p_duplicate_of end,
         status = case when p_decision in ('not_applicable', 'duplicate') then 'closed'
                       else 'arbitrated' end,
         arbitrated_by = public.auth_person_id(),
         arbitrated_at = now()
   where id = v.id;
end;
$$;
revoke execute on function public.arbitrate_marketing_reserve(uuid, text, text, uuid, date, text, uuid)
  from public, anon;
grant execute on function public.arbitrate_marketing_reserve(uuid, text, text, uuid, date, text, uuid)
  to authenticated;

-- The person following a reserve, or the owner.
create function public.marketing_reserve_holder(p_reserve_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.marketing_reserves r
                  where r.id = p_reserve_id
                    and (public.is_project_owner(r.project_id)
                         or r.follow_up_person_id = public.auth_person_id()));
$$;
revoke execute on function public.marketing_reserve_holder(uuid) from public, anon, authenticated;

-- « Lever la réserve »: what was to lift or to follow is done.
create function public.lift_marketing_reserve(p_reserve_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.marketing_reserve_holder(v.id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'arbitrated' or v.decision not in ('blocking', 'follow_up') then
    raise exception 'invalid_transition';
  end if;
  if char_length(coalesce(p_note, '')) > 1000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.marketing_reserves
     set status = 'lifted', lifted_by = public.auth_person_id(), lifted_at = now(),
         lift_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = v.id;
end;
$$;
revoke execute on function public.lift_marketing_reserve(uuid, text) from public, anon;
grant execute on function public.lift_marketing_reserve(uuid, text) to authenticated;

-- The follow-up's news, by whoever follows it; never its decision.
create function public.note_marketing_reserve(p_reserve_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.marketing_reserve_holder(v.id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'arbitrated' or v.decision <> 'follow_up' then
    raise exception 'invalid_transition';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.marketing_reserves set follow_up_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = v.id;
end;
$$;
revoke execute on function public.note_marketing_reserve(uuid, text) from public, anon;
grant execute on function public.note_marketing_reserve(uuid, text) to authenticated;

-- A task of Travail behind a follow-up: an existing one of the project, or
-- one created on purpose (title = the reserve, who and when = its follow-up).
create function public.link_reserve_task(p_reserve_id uuid, p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'arbitrated' or v.decision not in ('blocking', 'follow_up') then
    raise exception 'invalid_transition';
  end if;
  if p_task_id is not null and not exists (
       select 1 from public.tasks t where t.id = p_task_id and t.project_id = v.project_id) then
    raise exception 'invalid_task' using errcode = '23514';
  end if;
  update public.marketing_reserves set task_id = p_task_id where id = v.id;
end;
$$;
revoke execute on function public.link_reserve_task(uuid, uuid) from public, anon;
grant execute on function public.link_reserve_task(uuid, uuid) to authenticated;

create function public.create_reserve_task(p_reserve_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
  v_task uuid;
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'arbitrated' or v.decision <> 'follow_up' then
    raise exception 'invalid_transition';
  end if;
  if v.task_id is not null then
    raise exception 'task_already_created';
  end if;
  insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
  values (v.organization_id, v.project_id, left(v.description, 200), v.follow_up_person_id,
          v.follow_up_due_on)
  returning id into v_task;
  update public.marketing_reserves set task_id = v_task where id = v.id;
  return v_task;
end;
$$;
revoke execute on function public.create_reserve_task(uuid) from public, anon;
grant execute on function public.create_reserve_task(uuid) to authenticated;

-- The audit names an arbitration, a lifting, a note, a task: reserve.updated
-- (lot 3) already keeps the fields before and after; the kind says which.
create or replace function public.marketing_report_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
begin
  if tg_table_name = 'marketing_reserves' then
    if tg_op = 'INSERT' then
      perform public.marketing_log(new.organization_id, new.project_id, 'reserve.created', new.id,
                                   new.activation_id, null,
                                   jsonb_build_object('category', new.category,
                                                      'description', new.description,
                                                      'origin', new.origin), null);
    elsif (to_jsonb(new) - array['updated_at', 'origin_report_id'])
          is distinct from (to_jsonb(old) - array['updated_at', 'origin_report_id']) then
      v_kind := case
        when new.status = 'lifted' and old.status <> 'lifted' then 'reserve.lifted'
        when new.arbitrated_at is distinct from old.arbitrated_at then 'reserve.arbitrated'
        when new.task_id is distinct from old.task_id then 'reserve.task_linked'
        when new.follow_up_note is distinct from old.follow_up_note then 'reserve.follow_up_noted'
        else 'reserve.updated' end;
      perform public.marketing_log(new.organization_id, new.project_id, v_kind, new.id,
                                   new.activation_id, d.old_value, d.new_value,
                                   case v_kind when 'reserve.arbitrated' then new.decision_reason
                                               when 'reserve.lifted' then new.lift_note end)
         from public.marketing_diff(to_jsonb(old), to_jsonb(new),
                                    array['updated_at', 'origin_report_id', 'arbitrated_by',
                                          'lifted_by']) d;
    end if;
  elsif tg_op = 'INSERT' then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.generated', new.id,
                                 null, null,
                                 jsonb_build_object('version', new.version,
                                                    'content_hash', new.content_hash), null);
  elsif new.state is distinct from old.state
        and new.state not in ('approved_provisional', 'changes_requested', 'postponed') then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.' || new.state,
                                 new.id, null, jsonb_build_object('state', old.state),
                                 jsonb_build_object('state', new.state, 'version', new.version),
                                 null);
  end if;
  return null;
end;
$$;

-- A report still carries the reserves not lifted nor closed (lot 3 took the
-- « open » ones only).
create or replace function public.marketing_report_snapshot(
  p_project_id uuid,
  p_activation_ids uuid[],
  p_period_start date,
  p_period_end date,
  p_sections text[],
  p_summary text,
  p_recommendations text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with person as (
    select p.id, btrim(concat_ws(' ', p.first_name, p.last_name)) as name from public.people p
  ),
  acts as (
    select a.*, o.name as owner_name, d.title as deliverable_title, l.label as lever_label
      from public.marketing_activations a
      left join person o on o.id = a.owner_person_id
      left join public.strategy_deliverables d on d.id = a.deliverable_id
      left join public.levers l on l.id = a.lever_id
     where a.project_id = p_project_id and a.id = any (p_activation_ids)
  )
  select jsonb_build_object(
    'project', (select jsonb_build_object('id', pr.id, 'title', pr.title)
                  from public.projects pr where pr.id = p_project_id),
    'generated_at', now(),
    'period', jsonb_build_object('start', p_period_start, 'end', p_period_end),
    'sections', to_jsonb(p_sections),
    'summary', nullif(btrim(coalesce(p_summary, '')), ''),
    'recommendations', nullif(btrim(coalesce(p_recommendations, '')), ''),
    'activations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'title', a.title, 'kind', a.kind, 'status', a.status,
               'owner_name', a.owner_name, 'deliverable_title', a.deliverable_title,
               'lever_label', a.lever_label, 'starts_on', a.starts_on, 'ends_on', a.ends_on,
               'archived_at', a.archived_at, 'created_at', a.created_at)
             order by a.created_at)
        from acts a), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'activation_id', e.activation_id, 'kind', e.kind, 'label', e.label,
               'url', e.url, 'platform', e.platform, 'metric', e.metric, 'value', e.value,
               'period_start', e.period_start, 'period_end', e.period_end,
               'availability', e.availability, 'reported_by', e.reported_by,
               'observed_on', e.observed_on, 'verification', e.verification,
               'verified_at', e.verified_at, 'verified_by_name', v.name,
               'link_unreachable_at', e.link_unreachable_at, 'created_at', e.created_at)
             order by e.created_at)
        from public.marketing_evidence e
        left join person v on v.id = e.verified_by
       where e.project_id = p_project_id and e.archived_at is null
         and e.activation_id = any (p_activation_ids)), '[]'::jsonb),
    'excluded_activations', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title) order by a.created_at)
        from public.marketing_activations a
       where a.project_id = p_project_id and a.archived_at is null
         and not (a.id = any (p_activation_ids))), '[]'::jsonb),
    'objectives', jsonb_build_object(
      'strategic', (select f.value #>> '{}' from public.current_field_values f
                     where f.project_id = p_project_id and f.deliverable = 'strategy'
                       and f.field_key = 'strategic_objective' and f.status = 'confirmed'
                     limit 1),
      'kpis', coalesce((
        select jsonb_agg(jsonb_build_object('label', o.label, 'kind', o.kind, 'target', o.target,
                                            'unit', o.unit, 'due_on', o.due_on)
                         order by o.created_at)
          from public.strategy_objectives o where o.project_id = p_project_id), '[]'::jsonb)),
    'reserves', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'category', r.category, 'description', r.description,
               'origin', r.origin, 'activation_id', r.activation_id, 'status', r.status,
               'decision', r.decision)
             order by r.created_at)
        from public.marketing_reserves r
       where r.project_id = p_project_id and r.status in ('open', 'arbitrated')), '[]'::jsonb)
  );
$$;
