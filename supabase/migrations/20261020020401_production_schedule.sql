-- The shoot's date and hours as a decision (proto « Projet complet »
-- schedModal, production.md § 2.11; Artefact § 11): « Fixer / Changer la
-- date et les horaires » — the date, the start, the end, where it was
-- decided. A new decision replaces the previous one, which stays in the
-- history; the sheet's shoot date follows. A change after a first decision
-- asks to review what depends on it (rule 14: « À revoir », nothing
-- blocked): a task « Mettre à jour le planning et la feuille de service »
-- for whoever runs the preproduction, and the « Contrôle avant tournage »
-- already confirmed is to be confirmed again.

create table public.production_schedule_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  shoot_on date not null,
  starts_at time not null,
  ends_at time not null,
  source text not null,
  decided_by uuid references public.people (id),
  decided_at timestamptz not null default now(),
  replaced_at timestamptz,
  constraint production_schedule_decisions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_schedule_decisions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_schedule_decisions_hours_check check (ends_at > starts_at),
  constraint production_schedule_decisions_source_check
    check (source in ('meeting', 'call', 'whatsapp', 'email', 'other'))
);
create index production_schedule_decisions_sheet_idx
  on public.production_schedule_decisions (sheet_id, decided_at desc);
create unique index production_schedule_decisions_current_key
  on public.production_schedule_decisions (sheet_id) where replaced_at is null;

alter table public.production_schedule_decisions enable row level security;
alter table public.production_schedule_decisions force row level security;
revoke all on public.production_schedule_decisions from anon, authenticated;
grant select on public.production_schedule_decisions to authenticated;
create policy production_schedule_decisions_select on public.production_schedule_decisions
  for select to authenticated using (public.can_see_project(project_id));

-- A confirmed « Contrôle avant tournage » made before the last change of
-- date is to be confirmed again (computed, never stored).
alter table public.production_sheets
  add column schedule_changed_at timestamptz;

select public.add_notification_kinds(array['production_schedule_changed']);

-- « Valider la date et les horaires » (the project's owner).
create function public.decide_production_schedule(
  p_sheet_id uuid, p_date date, p_start time, p_end time, p_source text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  prev public.production_schedule_decisions%rowtype;
  v_pos integer;
  v_origin text;
  v_handler uuid;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_date is null or p_start is null or p_end is null then
    raise exception 'schedule_required';
  end if;
  if p_end <= p_start then
    raise exception 'end_before_start';
  end if;
  if p_source is null or p_source not in ('meeting', 'call', 'whatsapp', 'email', 'other') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into prev from public.production_schedule_decisions
   where sheet_id = s.id and replaced_at is null for update;
  if prev.id is not null then
    if (prev.shoot_on, prev.starts_at, prev.ends_at) = (p_date, p_start, p_end) then
      raise exception 'same_schedule';
    end if;
    update public.production_schedule_decisions set replaced_at = now() where id = prev.id;
  end if;
  insert into public.production_schedule_decisions
    (organization_id, project_id, sheet_id, shoot_on, starts_at, ends_at, source, decided_by)
  values (s.organization_id, s.project_id, s.id, p_date, p_start, p_end, p_source, public.auth_person_id());
  update public.production_sheets
     set shoot_date = p_date,
         schedule_changed_at = case when prev.id is not null then now() else schedule_changed_at end
   where id = s.id;

  -- A change: what depends on the date is to review.
  if prev.id is not null then
    v_origin := 'Changement de date du ' || to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM');
    select coalesce(max(position) + 1, 0) into v_pos from public.production_plan_actions where sheet_id = s.id;
    insert into public.production_plan_actions
      (organization_id, project_id, sheet_id, title, person_id, contact_id, status, approved_by,
       approved_at, position, origin, review)
    values (s.organization_id, s.project_id, s.id, 'Mettre à jour le planning et la feuille de service',
            case when s.organization = 'external' and s.company_contact_id is not null then null
                 else public.production_quote_handler(s.id) end,
            case when s.organization = 'external' then s.company_contact_id end,
            'approved', public.auth_person_id(), now(), v_pos, v_origin, true);
    v_handler := public.production_quote_handler(s.id);
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select s.organization_id, x.id, public.auth_person_id(), 'production_schedule_changed',
           s.project_id, s.deliverable_id
      from (select v_handler as id
            union select pc.person_id from public.project_creatives pc where pc.project_id = s.project_id) x
     where x.id is not null and x.id is distinct from public.auth_person_id();
  end if;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'schedule',
    case when prev.id is null then null
         else jsonb_build_object('date', prev.shoot_on, 'start', prev.starts_at, 'end', prev.ends_at) end,
    jsonb_build_object('date', p_date, 'start', p_start, 'end', p_end, 'source', p_source));
end;
$$;
revoke execute on function public.decide_production_schedule(uuid, date, time, time, text) from public, anon;
grant execute on function public.decide_production_schedule(uuid, date, time, time, text) to authenticated;

-- The preparation confirmed before a change of date is confirmed again: the
-- new synthesis replaces it, the previous one stays in the history.
create or replace function public.confirm_production_ready(p_sheet_id uuid, p_snapshot jsonb, p_force_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  s public.production_sheets%rowtype;
  v_missing integer;
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
  if s.ready_at is not null
     and not (s.schedule_changed_at is not null and s.schedule_changed_at > s.ready_at) then
    raise exception 'already_ready';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_snapshot) = 0
     or jsonb_array_length(p_snapshot) > 20 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select count(*) into v_missing from jsonb_array_elements(p_snapshot) r
   where coalesce((r ->> 'ok')::boolean, false) = false;
  if v_missing > 0 and btrim(coalesce(p_force_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  update public.production_sheets
     set ready_at = now(), ready_by = public.auth_person_id(), ready_snapshot = p_snapshot,
         ready_forced_reason = case when v_missing > 0 then left(btrim(p_force_reason), 1000) end
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'ready',
    jsonb_build_object('ready', s.ready_at is not null, 'snapshot', s.ready_snapshot),
    jsonb_build_object('ready', true, 'forced', v_missing > 0,
                       'reason', nullif(btrim(coalesce(p_force_reason, '')), '')));
end;
$function$;
