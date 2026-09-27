-- Agenda of a planned call: points to cover and an approximate duration,
-- prepared before the call happens (docs/CONTEXTE-PROJET.md § 6, usage 5).

alter table public.calls
  add column agenda jsonb,
  add column duration_minutes integer,
  add constraint calls_agenda_array check (agenda is null or jsonb_typeof(agenda) = 'array'),
  add constraint calls_duration_positive check (duration_minutes is null or duration_minutes > 0);

grant insert (agenda, duration_minutes) on public.calls to authenticated;
grant update (agenda, duration_minutes) on public.calls to authenticated;

-- "Commencer en amont": opens the framing without a call. framing_is_open()
-- itself only requires a brief field_values row to exist, but the restrictive
-- field_values_framing_open policy checks framing_is_open() on every insert —
-- including the first one meant to satisfy it. A security definer function,
-- gated on is_project_owner() like start_stage(), breaks that circularity.
create or replace function public.start_framing_without_call(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  select organization_id into v_organization_id
    from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'project_not_found';
  end if;
  if public.framing_is_open(p_project_id) then
    return;
  end if;

  insert into public.field_values
    (organization_id, project_id, deliverable, field_key, value, status, source_type, created_by)
  values
    (v_organization_id, p_project_id, 'brief', 'objective', '""'::jsonb, 'rejected', 'manual', public.auth_person_id());
end;
$$;

revoke execute on function public.start_framing_without_call(uuid) from public, anon;
grant execute on function public.start_framing_without_call(uuid) to authenticated;
