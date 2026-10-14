-- Production › the sheet's activity log (Ibé's tests of 13/10, PROD-002 and
-- PROD-008): who changed what, when, with the value before and after, for
-- the moments that matter — a status, a responsible, a due date, a check, a
-- decision. Written by triggers only (the actor is the session's person,
-- none for a provider's link); read by whoever sees the project. Never
-- edited, never deleted but with its sheet.

create table public.production_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  -- version, request, action, check, sheet, shoot, export, delivery, step, link.
  entity text not null,
  entity_id uuid not null,
  -- created, status, holder, due, dates, location, ready, confirmed, result,
  -- link, decision, sent.
  action text not null,
  before jsonb,
  after jsonb,
  actor_person_id uuid references public.people (id),
  at timestamptz not null default now(),
  constraint production_events_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_events_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_events_sheet_idx on public.production_events (sheet_id, at desc);

alter table public.production_events enable row level security;
alter table public.production_events force row level security;
revoke all on table public.production_events from anon, authenticated;
grant select on public.production_events to authenticated;
create policy production_events_select on public.production_events
  for select to authenticated using (public.can_see_project(project_id));

create function public.production_log(
  p_org uuid, p_project uuid, p_sheet uuid, p_entity text, p_entity_id uuid,
  p_action text, p_before jsonb, p_after jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.production_events
    (organization_id, project_id, sheet_id, entity, entity_id, action, before, after, actor_person_id)
  values (p_org, p_project, p_sheet, p_entity, p_entity_id, p_action, p_before, p_after,
          public.auth_person_id());
$$;
revoke execute on function public.production_log(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;

-- The holder of a row, as the log keeps it: a member or a Réseau contact.
create function public.production_holder_json(p_person uuid, p_contact uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_person is not null then jsonb_build_object('kind', 'person', 'id', p_person)
    when p_contact is not null then jsonb_build_object('kind', 'contact', 'id', p_contact)
  end;
$$;
revoke execute on function public.production_holder_json(uuid, uuid) from public, anon, authenticated;

-- Versions: deposited, then each status (submitted, corrections, decision).
create function public.production_versions_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'version',
      new.id, 'created', null, jsonb_build_object('number', new.number));
  elsif new.status is distinct from old.status then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'version',
      new.id, 'status', jsonb_build_object('number', old.number, 'status', old.status),
      jsonb_build_object('number', new.number, 'status', new.status, 'note', new.decision_note));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_versions_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.production_versions
  for each row execute function public.production_versions_log();

-- Correction requests: asked, given to someone else, due date, status.
create function public.production_requests_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number integer;
begin
  select number into v_number from public.production_versions where id = new.version_id;
  if tg_op = 'INSERT' then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'request',
      new.id, 'created', null,
      jsonb_build_object('number', v_number, 'holder',
        public.production_holder_json(new.person_id, new.contact_id), 'due', new.due_on));
    return null;
  end if;
  if (new.person_id, new.contact_id) is distinct from (old.person_id, old.contact_id) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'request',
      new.id, 'holder',
      jsonb_build_object('number', v_number, 'holder', public.production_holder_json(old.person_id, old.contact_id)),
      jsonb_build_object('number', v_number, 'holder', public.production_holder_json(new.person_id, new.contact_id)));
  end if;
  if new.due_on is distinct from old.due_on then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'request',
      new.id, 'due', jsonb_build_object('number', v_number, 'due', old.due_on),
      jsonb_build_object('number', v_number, 'due', new.due_on));
  end if;
  if new.status is distinct from old.status or new.reminders > old.reminders then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'request',
      new.id, 'status', jsonb_build_object('number', v_number, 'status', old.status),
      jsonb_build_object('number', v_number, 'status', new.status, 'reminders', new.reminders));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_requests_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.production_correction_requests
  for each row execute function public.production_requests_log();

-- Plan actions: status, who, by when.
create function public.production_actions_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'action',
      new.id, 'status', jsonb_build_object('title', old.title, 'status', old.status),
      jsonb_build_object('title', new.title, 'status', new.status));
  end if;
  if (new.person_id, new.contact_id) is distinct from (old.person_id, old.contact_id) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'action',
      new.id, 'holder',
      jsonb_build_object('title', new.title, 'holder', public.production_holder_json(old.person_id, old.contact_id)),
      jsonb_build_object('title', new.title, 'holder', public.production_holder_json(new.person_id, new.contact_id)));
  end if;
  if new.due_date is distinct from old.due_date then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'action',
      new.id, 'due', jsonb_build_object('title', new.title, 'due', old.due_date),
      jsonb_build_object('title', new.title, 'due', new.due_date));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_actions_log() from public, anon, authenticated;
create trigger z_log after update on public.production_plan_actions
  for each row execute function public.production_actions_log();

-- Checks before the shoot: confirmed or reopened, required or not.
create function public.production_checks_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.confirmed_at is not null then
      perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
        new.id, 'confirmed', null, jsonb_build_object('key', new.key, 'note', new.note));
    end if;
    return null;
  end if;
  if (new.confirmed_at is null) <> (old.confirmed_at is null) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
      new.id, 'confirmed', jsonb_build_object('key', old.key, 'confirmed', old.confirmed_at is not null),
      jsonb_build_object('key', new.key, 'confirmed', new.confirmed_at is not null, 'note', new.note));
  end if;
  if new.required is distinct from old.required then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'check',
      new.id, 'required', jsonb_build_object('key', old.key, 'required', old.required),
      jsonb_build_object('key', new.key, 'required', new.required));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_checks_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.production_readiness_checks
  for each row execute function public.production_checks_log();

-- The sheet: its dates and envelope, its location, « prête pour tournage ».
create function public.production_sheets_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb := jsonb_build_object('shoot', old.shoot_date, 'postStart', old.post_start,
    'postEnd', old.post_end, 'delivery', old.delivery_date, 'envelope', old.budget_envelope_cents);
  v_after jsonb := jsonb_build_object('shoot', new.shoot_date, 'postStart', new.post_start,
    'postEnd', new.post_end, 'delivery', new.delivery_date, 'envelope', new.budget_envelope_cents);
begin
  if v_before is distinct from v_after then
    perform public.production_log(new.organization_id, new.project_id, new.id, 'sheet', new.id,
      'dates', v_before, v_after);
  end if;
  if (new.location_status, new.location_name) is distinct from (old.location_status, old.location_name) then
    perform public.production_log(new.organization_id, new.project_id, new.id, 'sheet', new.id,
      'location', jsonb_build_object('status', old.location_status, 'name', old.location_name),
      jsonb_build_object('status', new.location_status, 'name', new.location_name));
  end if;
  if (new.ready_at is null) <> (old.ready_at is null) then
    perform public.production_log(new.organization_id, new.project_id, new.id, 'sheet', new.id,
      'ready', jsonb_build_object('ready', old.ready_at is not null),
      jsonb_build_object('ready', new.ready_at is not null));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_sheets_log() from public, anon, authenticated;
create trigger z_log after update on public.production_sheets
  for each row execute function public.production_sheets_log();

-- The shoot's state.
create function public.production_shoots_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.state is distinct from old.state then
    -- One shoot per sheet: the sheet is its id.
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'shoot',
      new.sheet_id, 'status',
      case when tg_op = 'UPDATE' then jsonb_build_object('status', old.state) end,
      jsonb_build_object('status', new.state));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_shoots_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.production_shoots
  for each row execute function public.production_shoots_log();

-- An expected export: its file (link) and its check.
create function public.production_exports_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.url is distinct from old.url then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'link', jsonb_build_object('label', old.label, 'url', old.url),
      jsonb_build_object('label', new.label, 'url', new.url));
  end if;
  if new.result is distinct from old.result then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'export',
      new.id, 'result', jsonb_build_object('label', old.label, 'result', old.result),
      jsonb_build_object('label', new.label, 'result', new.result, 'note', new.note));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_exports_log() from public, anon, authenticated;
create trigger z_log after update on public.production_export_checks
  for each row execute function public.production_exports_log();

-- A postproduction step: who does it, its status.
create function public.production_steps_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.person_id, new.contact_id) is distinct from (old.person_id, old.contact_id) then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'step',
      new.id, 'holder',
      jsonb_build_object('key', new.step_key, 'label', new.label, 'holder', public.production_holder_json(old.person_id, old.contact_id)),
      jsonb_build_object('key', new.step_key, 'label', new.label, 'holder', public.production_holder_json(new.person_id, new.contact_id)));
  end if;
  if new.status is distinct from old.status then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'step',
      new.id, 'status', jsonb_build_object('key', old.step_key, 'label', old.label, 'status', old.status),
      jsonb_build_object('key', new.step_key, 'label', new.label, 'status', new.status));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_steps_log() from public, anon, authenticated;
create trigger z_log after update on public.production_post_steps
  for each row execute function public.production_steps_log();

-- A provider's link created (sent).
create function public.production_links_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'link',
    new.id, 'sent', null, jsonb_build_object('holder', public.production_holder_json(null, new.contact_id)));
  return null;
end;
$$;
revoke execute on function public.production_links_log() from public, anon, authenticated;
create trigger z_log after insert on public.production_provider_links
  for each row execute function public.production_links_log();

-- The delivery's three decisions (deliverable_deliveries has no sheet: read
-- through the deliverable).
create function public.production_deliveries_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet uuid;
begin
  select id into v_sheet from public.production_sheets where deliverable_id = new.deliverable_id;
  if v_sheet is null then
    return null;
  end if;
  if tg_op = 'INSERT' or (new.approved_at is null) <> (old.approved_at is null)
     or (new.checked_at is null) <> (old.checked_at is null)
     or (new.delivered_at is null) <> (old.delivered_at is null) then
    perform public.production_log(new.organization_id, new.project_id, v_sheet, 'delivery',
      new.id, 'decision',
      case when tg_op = 'UPDATE' then jsonb_build_object('approved', old.approved_at is not null,
        'checked', old.checked_at is not null, 'delivered', old.delivered_at is not null) end,
      jsonb_build_object('approved', new.approved_at is not null,
        'checked', new.checked_at is not null, 'delivered', new.delivered_at is not null));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_deliveries_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.deliverable_deliveries
  for each row execute function public.production_deliveries_log();
