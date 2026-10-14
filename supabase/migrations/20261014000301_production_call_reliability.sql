-- Production › the technical call (Ibé's tests of 13/10, PROD-004): a call
-- created from the Préproduction now has an end, like every call planned
-- from the Calls (the agenda's minutes, one hour when the agenda says
-- none), so it shows in the agenda and its page as any other. The team
-- members kept as participants are invited by the app right after
-- (lib/calls/invite.ts), as for the Stratégie's exchanges.

create or replace function public.create_production_call(
  p_sheet_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb,
  p_purpose text,
  p_participants jsonb,
  p_format text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sheet public.production_sheets%rowtype;
  v_call uuid;
  v_minutes integer;
begin
  select * into v_sheet from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v_sheet.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(v_sheet.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;

  insert into public.calls (organization_id, project_id, title, occurred_at, ends_at,
                            meeting_url, consent, agenda, duration_minutes)
  values (v_sheet.organization_id, v_sheet.project_id, p_title, p_occurred_at,
          p_occurred_at + make_interval(mins => coalesce(nullif(v_minutes, 0), 60)),
          case when p_format = 'video' then nullif(btrim(p_meeting_url), '') end,
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;

  insert into public.production_calls
    (call_id, organization_id, project_id, sheet_id, purpose, participants, format)
  values (v_call, v_sheet.organization_id, v_sheet.project_id, p_sheet_id, p_purpose,
          coalesce(p_participants, '[]'::jsonb), p_format);
  return v_call;
end;
$$;
