-- Recette Marketing V1 d'Ibé (23/10/2026), Production :
--
-- MKT-PROD-001 — « Changement de lieu contournable sans nouvelle proposition ».
--   Rule 14 (Ibé, 15/10) said a change marks what depends on it « à revoir »
--   and « tout le reste continue »; the recette of 23/10 asks the opposite
--   before the shoot: the latest feedback wins. A place, a date, a quote's
--   revision or a new version of the director's proposal asked after
--   « Préparation validée » reopens it — as long as the shoot has not
--   started —, so the shoot (gated on `ready_at`, 20261010006101) waits for a
--   new control. What changed is kept (`ready_reopened_because`); the former
--   confirmation stays in the history (production_events).
--
-- MKT-PROD-002 — « Dérogation avant tournage trop permissive ».
--   Each line of the synthesis has a severity, decided here from its key:
--   critical (place, date, crew, planning, quote, proposal, active blocker)
--   or minor (gear, informations to confirm). A minor line not ready is
--   confirmed with a reason, as before. A critical one makes the
--   confirmation a request: a reason and a catch-up plan (who, before when,
--   for each critical line), decided by the direction (`administer`) or the
--   sheet's quote validator, never by who asked. Approved, the preparation is
--   validated and each line of the plan becomes a task (« Dérogation du … »).

alter table public.production_sheets
  add column ready_reopened_at timestamptz,
  add column ready_reopened_because text[] not null default '{}',
  add column ready_request_at timestamptz,
  add column ready_request_by uuid references public.people (id),
  add column ready_request_snapshot jsonb,
  add column ready_request_reason text,
  add column ready_request_plan jsonb,
  add column ready_approved_by uuid references public.people (id),
  add column ready_approved_at timestamptz,
  add constraint production_sheets_ready_request_reason_check
    check (ready_request_reason is null or char_length(ready_request_reason) <= 1000);

select public.add_notification_kinds(array['production_ready_requested', 'production_ready_decided']);

-- A line's severity (MKT-PROD-002), from its key — never from the browser.
create function public.production_ready_critical(p_key text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_key in ('place', 'date', 'crew', 'plan', 'quote', 'direction', 'blockers');
$$;
revoke execute on function public.production_ready_critical(text) from public, anon;
grant execute on function public.production_ready_critical(text) to authenticated;

-- MKT-PROD-001: what changed after the confirmation reopens it.
create function public.production_ready_reopen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_what text[] := '{}';
begin
  if old.ready_at is null and old.ready_request_at is null then
    return new;
  end if;
  -- The confirmation itself, or its decision, is not a change.
  if new.ready_at is distinct from old.ready_at
     or new.ready_request_at is distinct from old.ready_request_at then
    return new;
  end if;
  if exists (select 1 from public.production_shoots sh
              where sh.sheet_id = new.id
                and sh.state in ('in_progress', 'done', 'partial', 'interrupted')) then
    return new;
  end if;
  if new.location_name is distinct from old.location_name then
    v_what := array_append(v_what, 'place');
  end if;
  if new.schedule_changed_at is not null
     and new.schedule_changed_at is distinct from old.schedule_changed_at then
    v_what := array_append(v_what, 'date');
  end if;
  if new.quote_revision_at is not null
     and new.quote_revision_at is distinct from old.quote_revision_at then
    v_what := array_append(v_what, 'quote');
  end if;
  if new.direction_revision_at is not null
     and new.direction_revision_at is distinct from old.direction_revision_at then
    v_what := array_append(v_what, 'direction');
  end if;
  if cardinality(v_what) = 0 then
    return new;
  end if;
  new.ready_at := null;
  new.ready_by := null;
  new.ready_approved_by := null;
  new.ready_approved_at := null;
  new.ready_request_at := null;
  new.ready_request_by := null;
  new.ready_request_snapshot := null;
  new.ready_request_reason := null;
  new.ready_request_plan := null;
  new.ready_reopened_at := now();
  new.ready_reopened_because := v_what;
  return new;
end;
$$;
revoke execute on function public.production_ready_reopen() from public, anon, authenticated;
create trigger e_ready_reopen before update on public.production_sheets
  for each row execute function public.production_ready_reopen();

-- A date changed after the confirmation, before this migration: reopened too.
update public.production_sheets s
   set ready_at = null, ready_by = null, ready_reopened_at = s.schedule_changed_at,
       ready_reopened_because = array['date']
 where s.ready_at is not null and s.schedule_changed_at is not null
   and s.schedule_changed_at >= s.ready_at
   and not exists (select 1 from public.production_shoots sh
                    where sh.sheet_id = s.id
                      and sh.state in ('in_progress', 'done', 'partial', 'interrupted'));

-- « Confirmer : préparation validée », or « Demander la validation de la
-- direction » when a critical line is not ready (MKT-PROD-002).
drop function public.confirm_production_ready(uuid, jsonb, text);
create function public.confirm_production_ready(
  p_sheet_id uuid, p_snapshot jsonb, p_force_reason text, p_plan jsonb default null)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  s public.production_sheets%rowtype;
  v_missing integer;
  v_critical text[];
  v_plan jsonb := '[]'::jsonb;
  v_key text;
  v_line jsonb;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.organization is distinct from 'external' then
    raise exception 'not_external';
  end if;
  if s.ready_at is not null then
    raise exception 'already_ready';
  end if;
  if s.ready_request_at is not null then
    raise exception 'request_pending';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_snapshot) = 0
     or jsonb_array_length(p_snapshot) > 20 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select count(*) into v_missing from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false;
  select coalesce(array_agg(distinct r ->> 'key'), '{}') into v_critical
    from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false
     and public.production_ready_critical(r ->> 'key');
  if v_missing > 0 and btrim(coalesce(p_force_reason, '')) = '' then
    raise exception 'reason_required';
  end if;

  if cardinality(v_critical) > 0 then
    -- A catch-up line for each critical point: a member, a day not past.
    if jsonb_typeof(coalesce(p_plan, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_plan) > 20 then
      raise exception 'plan_required';
    end if;
    foreach v_key in array v_critical loop
      select l into v_line from jsonb_array_elements(p_plan) l where l ->> 'key' = v_key limit 1;
      if v_line is null or nullif(v_line ->> 'personId', '') is null
         or nullif(v_line ->> 'dueOn', '') is null then
        raise exception 'plan_required';
      end if;
      if (v_line ->> 'dueOn')::date < v_today then
        raise exception 'plan_due_past';
      end if;
      if not exists (select 1 from public.memberships m
                      where m.organization_id = s.organization_id
                        and m.person_id = (v_line ->> 'personId')::uuid and m.status = 'approved') then
        raise exception 'plan_person_invalid';
      end if;
      v_plan := v_plan || jsonb_build_array(jsonb_build_object(
        'key', v_key, 'personId', v_line ->> 'personId', 'dueOn', v_line ->> 'dueOn',
        'label', (select r ->> 'label' from jsonb_array_elements(p_snapshot) r
                   where r ->> 'key' = v_key limit 1)));
    end loop;
    update public.production_sheets
       set ready_request_at = now(), ready_request_by = public.auth_person_id(),
           ready_request_snapshot = p_snapshot, ready_request_reason = left(btrim(p_force_reason), 1000),
           ready_request_plan = v_plan
     where id = s.id;
    perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready_requested',
      null, jsonb_build_object('critical', to_jsonb(v_critical), 'reason', btrim(p_force_reason), 'plan', v_plan));
    -- To who decides: the direction and the quote validator, never the asker.
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select distinct s.organization_id, m.person_id, public.auth_person_id(), 'production_ready_requested',
           s.project_id, s.deliverable_id
      from public.memberships m
     where m.organization_id = s.organization_id and m.status = 'approved'
       and ('administer' = any (public.role_permissions(m.role))
            or m.person_id = s.quote_validator_person_id)
       and m.person_id is distinct from public.auth_person_id();
    return 'requested';
  end if;

  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id(), ready_snapshot = p_snapshot,
         ready_forced_reason = case when v_missing > 0 then left(btrim(p_force_reason), 1000) end,
         ready_reopened_at = null, ready_reopened_because = '{}'
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready',
    jsonb_build_object('ready', s.ready_at is not null, 'snapshot', s.ready_snapshot),
    jsonb_build_object('ready', true, 'forced', v_missing > 0,
                       'reason', nullif(btrim(coalesce(p_force_reason, '')), '')));
  return 'ready';
end;
$function$;
revoke execute on function public.confirm_production_ready(uuid, jsonb, text, jsonb) from public, anon;
grant execute on function public.confirm_production_ready(uuid, jsonb, text, jsonb) to authenticated;

-- The direction decides a derogation (MKT-PROD-002): approved, the
-- preparation is validated and the plan becomes tasks; refused, with a
-- reason, the request is withdrawn.
create function public.decide_production_ready(p_sheet_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  s public.production_sheets%rowtype;
  v_me uuid := public.auth_person_id();
  v_line jsonb;
  v_pos integer;
  v_origin text;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if s.ready_request_at is null then
    raise exception 'no_request';
  end if;
  if not (public.has_permission(s.organization_id, 'administer') or v_me = s.quote_validator_person_id)
     or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_me = s.ready_request_by then
    raise exception 'same_person';
  end if;
  if p_approve is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if not p_approve then
    if btrim(coalesce(p_reason, '')) = '' then
      raise exception 'reason_required';
    end if;
    update public.production_sheets
       set ready_request_at = null, ready_request_by = null, ready_request_snapshot = null,
           ready_request_reason = null, ready_request_plan = null
     where id = s.id;
    perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready_refused',
      null, jsonb_build_object('reason', left(btrim(p_reason), 1000)));
  else
    update public.production_sheets
       set ready_at = now(), ready_by = s.ready_request_by, ready_snapshot = s.ready_request_snapshot,
           ready_forced_reason = s.ready_request_reason, ready_approved_by = v_me, ready_approved_at = now(),
           ready_request_at = null, ready_request_by = null, ready_request_snapshot = null,
           ready_request_reason = null, ready_request_plan = null,
           ready_reopened_at = null, ready_reopened_because = '{}'
     where id = s.id;
    v_origin := 'Dérogation du ' || to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM');
    select coalesce(max(position) + 1, 0) into v_pos from public.production_plan_actions where sheet_id = s.id;
    for v_line in select * from jsonb_array_elements(coalesce(s.ready_request_plan, '[]'::jsonb)) loop
      insert into public.production_plan_actions
        (organization_id, project_id, sheet_id, title, person_id, status, approved_by, approved_at,
         position, origin, review, due_date)
      values (s.organization_id, s.project_id, s.id,
              left('Rattraper avant le tournage : ' || coalesce(v_line ->> 'label', v_line ->> 'key'), 300),
              (v_line ->> 'personId')::uuid, 'approved', v_me, now(), v_pos, v_origin, true,
              (v_line ->> 'dueOn')::date);
      v_pos := v_pos + 1;
    end loop;
    perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready',
      jsonb_build_object('ready', false),
      jsonb_build_object('ready', true, 'forced', true, 'reason', s.ready_request_reason,
                         'approvedBy', v_me));
  end if;
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  values (s.organization_id, s.ready_request_by, v_me, 'production_ready_decided', s.project_id, s.deliverable_id);
end;
$function$;
revoke execute on function public.decide_production_ready(uuid, boolean, text) from public, anon;
grant execute on function public.decide_production_ready(uuid, boolean, text) to authenticated;
