-- Marketing › Suivi & bilan, lot 6 (ticket « Suivi & bilan », écran 5,
-- docs/ARCHITECTURE.md § 8 duodecies): the Marketing closing, apart from the
-- whole project's closing.
--   * the owner asks for it on the reference report — the newest version
--     approved as a provisional review (or finalized by a closing since
--     reopened) — once every reserve is arbitrated and
--     no blocking reserve is left (request_marketing_closure);
--   * the validator decides: « Clôturer sans réserve » (nothing left),
--     « Clôturer avec réserves » (follow-ups or definitive limits left),
--     « Demander des corrections », « Reporter » (a comment for the last two);
--     never the person who asked (decide_marketing_closure). Closing freezes
--     the reference report (finalized) and stores the reserves as they were;
--   * once closed, the Marketing is read under control: activations and new
--     reserves are refused, arbitrations frozen; follow-ups go on (notes,
--     lifting, tasks), complementary evidence and new report versions are
--     accepted — the dashboard moves, the closing does not;
--   * reopening: the direction only, with a reason (reopen_marketing_closure);
--     the past decision is never rewritten;
--   * nothing here touches project_stages: the whole project's closing (the
--     « review » stage, Vue d'ensemble › Clôture du projet) stays separate and
--     explicit.

create table public.marketing_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  report_id uuid not null,
  -- requested → closed_clean / closed_with_reserves / changes_requested /
  -- postponed; a closed one may be reopened.
  state text not null default 'requested',
  request_note text,
  requested_by uuid not null references public.people (id),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_comment text,
  -- The reserves when the decision was taken (arbitration, follow-up).
  reserves jsonb,
  reopened_by uuid references public.people (id),
  reopened_at timestamptz,
  reopen_reason text,
  constraint marketing_closures_state_check check (state in (
    'requested', 'closed_clean', 'closed_with_reserves', 'changes_requested', 'postponed',
    'reopened')),
  constraint marketing_closures_texts_check check (
    char_length(coalesce(request_note, '')) <= 2000
    and char_length(coalesce(decision_comment, '')) <= 2000
    and char_length(coalesce(reopen_reason, '')) <= 2000),
  constraint marketing_closures_decided_check
    check ((state = 'requested') = (decided_at is null)),
  constraint marketing_closures_comment_check
    check (state not in ('changes_requested', 'postponed') or decision_comment is not null),
  constraint marketing_closures_reopen_check
    check ((state = 'reopened') = (reopened_at is not null and reopen_reason is not null)),
  constraint marketing_closures_separation check (decided_by is null or decided_by <> requested_by),
  constraint marketing_closures_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint marketing_closures_report_same_org foreign key (report_id, organization_id)
    references public.marketing_reports (id, organization_id)
);
-- One closing at a time: requested or in force.
create unique index marketing_closures_active_key on public.marketing_closures (project_id)
  where state in ('requested', 'closed_clean', 'closed_with_reserves');
create index marketing_closures_project_idx on public.marketing_closures (project_id, requested_at desc);

alter table public.marketing_closures enable row level security;
alter table public.marketing_closures force row level security;
revoke all on table public.marketing_closures from anon, authenticated;
grant select on public.marketing_closures to authenticated;
create policy marketing_closures_select on public.marketing_closures
  for select to authenticated using (public.can_see_project(project_id));

create function public.marketing_is_closed(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.marketing_closures c
                  where c.project_id = p_project_id
                    and c.state in ('closed_clean', 'closed_with_reserves'));
$$;
revoke execute on function public.marketing_is_closed(uuid) from public, anon;
grant execute on function public.marketing_is_closed(uuid) to authenticated;

-- « Demander la clôture ».
create function public.request_marketing_closure(p_project_id uuid, p_report_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_report public.marketing_reports%rowtype;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform 1 from public.projects where id = p_project_id for update;
  if public.marketing_is_closed(p_project_id) then
    raise exception 'already_closed';
  end if;
  if exists (select 1 from public.marketing_closures c
              where c.project_id = p_project_id and c.state = 'requested') then
    raise exception 'closure_pending';
  end if;
  select * into v_report from public.marketing_reports
   where id = p_report_id and project_id = p_project_id;
  -- The newest version approved as a provisional review; after a reopening,
  -- the finalized one it rested on still counts.
  if not found or v_report.state not in ('approved_provisional', 'finalized') or exists (
       select 1 from public.marketing_reports r
        where r.project_id = p_project_id and r.state in ('approved_provisional', 'finalized')
          and r.version > v_report.version) then
    raise exception 'report_not_reference';
  end if;
  if exists (select 1 from public.marketing_reserves r
              where r.project_id = p_project_id and r.status = 'open') then
    raise exception 'reserves_unarbitrated';
  end if;
  if exists (select 1 from public.marketing_reserves r
              where r.project_id = p_project_id and r.status = 'arbitrated'
                and r.decision = 'blocking') then
    raise exception 'reserves_blocking';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.sole_validator(v_org);
  insert into public.marketing_closures
    (organization_id, project_id, report_id, request_note, requested_by)
  values (v_org, p_project_id, p_report_id, nullif(btrim(coalesce(p_note, '')), ''),
          public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.request_marketing_closure(uuid, uuid, text) from public, anon;
grant execute on function public.request_marketing_closure(uuid, uuid, text) to authenticated;

-- The validator's decision on the closing asked.
create function public.decide_marketing_closure(p_closure_id uuid, p_decision text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_closures%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_remaining integer;
begin
  select * into v from public.marketing_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.state <> 'requested' then
    raise exception 'invalid_transition';
  end if;
  if v_me = v.requested_by then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if p_decision not in ('closed_clean', 'closed_with_reserves', 'changes_requested', 'postponed') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_decision in ('changes_requested', 'postponed') and v_comment is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  if char_length(coalesce(v_comment, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_decision in ('closed_clean', 'closed_with_reserves') then
    -- The reserves are read again: something may have moved since the request.
    if exists (select 1 from public.marketing_reserves r
                where r.project_id = v.project_id
                  and (r.status = 'open' or (r.status = 'arbitrated' and r.decision = 'blocking'))) then
      raise exception 'reserves_unarbitrated';
    end if;
    select count(*) into v_remaining from public.marketing_reserves r
     where r.project_id = v.project_id and r.status = 'arbitrated';
    if p_decision = 'closed_clean' and v_remaining > 0 then
      raise exception 'reserves_remaining';
    end if;
    if p_decision = 'closed_with_reserves' and v_remaining = 0 then
      raise exception 'no_reserves';
    end if;
  end if;
  update public.marketing_closures
     set state = p_decision, decided_by = v_me, decided_at = now(), decision_comment = v_comment,
         reserves = coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', r.id, 'category', r.category, 'description', r.description,
                    'status', r.status, 'decision', r.decision, 'reason', r.decision_reason,
                    'follow_up_person_id', r.follow_up_person_id,
                    'follow_up_due_on', r.follow_up_due_on,
                    'follow_up_channel', r.follow_up_channel) order by r.created_at)
             from public.marketing_reserves r where r.project_id = v.project_id), '[]'::jsonb)
   where id = v.id;
  if p_decision in ('closed_clean', 'closed_with_reserves') then
    update public.marketing_reports set state = 'finalized' where id = v.report_id;
  end if;
end;
$$;
revoke execute on function public.decide_marketing_closure(uuid, text, text) from public, anon;
grant execute on function public.decide_marketing_closure(uuid, text, text) to authenticated;

-- « Rouvrir le Marketing »: the direction, with a reason; the past decision
-- stays as it was.
create function public.reopen_marketing_closure(p_closure_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_closures%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v from public.marketing_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.state not in ('closed_clean', 'closed_with_reserves') then
    raise exception 'invalid_transition';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.marketing_closures
     set state = 'reopened', reopened_by = public.auth_person_id(), reopened_at = now(),
         reopen_reason = v_reason
   where id = v.id;
end;
$$;
revoke execute on function public.reopen_marketing_closure(uuid, text) from public, anon;
grant execute on function public.reopen_marketing_closure(uuid, text) to authenticated;

-- Lecture contrôlée: once closed, no activation moves and no reserve is
-- added or arbitrated; follow-ups, evidence and new report versions go on.
create function public.marketing_closed_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.marketing_is_closed(new.project_id) then
    -- A follow-up's own columns keep moving after the closing.
    if tg_table_name = 'marketing_reserves' and tg_op = 'UPDATE'
       and (to_jsonb(new) - array['status', 'lifted_by', 'lifted_at', 'lift_note', 'follow_up_note',
                                  'task_id', 'updated_at'])
           = (to_jsonb(old) - array['status', 'lifted_by', 'lifted_at', 'lift_note', 'follow_up_note',
                                    'task_id', 'updated_at'])
       and (new.status = old.status or (old.status = 'arbitrated' and new.status = 'lifted')) then
      return new;
    end if;
    raise exception 'marketing_closed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_closed_guard() from public, anon, authenticated;
create trigger a_closed before insert or update on public.marketing_activations
  for each row execute function public.marketing_closed_guard();
create trigger a_closed before insert or update on public.marketing_reserves
  for each row execute function public.marketing_closed_guard();

-- Audit: the request, the decision and the reopening, with who, the state
-- before and after, and the reason or comment.
create function public.marketing_closure_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.marketing_log(new.organization_id, new.project_id, 'closure.requested', new.id,
                                 null, null, jsonb_build_object('report_id', new.report_id),
                                 new.request_note);
  elsif new.state is distinct from old.state then
    perform public.marketing_log(new.organization_id, new.project_id, 'closure.' || new.state,
                                 new.id, null, jsonb_build_object('state', old.state),
                                 jsonb_build_object('state', new.state),
                                 coalesce(new.reopen_reason, new.decision_comment));
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_closure_events_write() from public, anon, authenticated;
create trigger z_events after insert or update on public.marketing_closures
  for each row execute function public.marketing_closure_events_write();
