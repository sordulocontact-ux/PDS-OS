-- « Modifier l'horaire » of a call (Sacha 21/11/2026: « pourquoi je peux pas modifier le call (date,
-- heure) ? »): one gesture for the calendar's drag and the call's page. Who works on the call moves it
-- (is_call_owner), and, on a deal's call, whoever planned it (« Caler le call »: the project's owner, who
-- is not in the call) while she still reads the deal. Never once something is recorded. Only its slot
-- changes; its Google event id is returned for the server to move the event.

create or replace function public.reschedule_call(
  p_call_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.calls%rowtype;
begin
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
     or p_ends_at - p_starts_at > interval '12 hours' then
    raise exception 'invalid_slot' using errcode = '22023';
  end if;
  select * into v from public.calls where id = p_call_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (public.is_call_owner(v.id)
          or (v.deal_id is not null
              and v.created_by = public.auth_person_id()
              and public.is_active_member(v.organization_id)
              and exists (select 1 from public.deals d
                           where d.id = v.deal_id
                             and d.stage not in ('signed', 'abandoned')
                             and public.can_read_deal(d.organization_id, d.assignee_person_id,
                                                      d.project_id)))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.audio_path is not null then
    raise exception 'call_recorded' using errcode = 'P0001';
  end if;
  update public.calls
     set occurred_at = p_starts_at, ends_at = p_ends_at
   where id = v.id;
  return v.google_event_id;
end;
$$;
revoke execute on function public.reschedule_call(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.reschedule_call(uuid, timestamptz, timestamptz) to authenticated;

