-- « Annuler l'échange » (Cadrage › Échange de cadrage, maquette Figma PDS OS
-- node 282:6170, Sacha 28/10/2026): the framing exchange planned but not
-- held is removed, and the Cadrage goes back to its two ways in.
--
-- Only the project's owner, and only while nothing was recorded: no audio,
-- no take begun, no transcript, no report. The call goes with what cascades
-- from it (framing_calls, attendees, guests); its invitations
-- in the app go too, since they would open a call that no longer exists.
-- Returns the Google event to cancel (null without one): the server cancels
-- it, and Google tells the guests.

create function public.cancel_framing_call(p_call_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_event text;
begin
  select f.project_id into v_project
    from public.framing_calls f where f.call_id = p_call_id;
  if v_project is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not public.is_project_owner(v_project) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select c.google_event_id into v_event
    from public.calls c
   where c.id = p_call_id
     and c.status = 'draft'
     and c.audio_path is null
     and not exists (select 1 from public.call_recording_takes t where t.call_id = c.id)
     and not exists (select 1 from public.transcripts t where t.call_id = c.id)
     and not exists (select 1 from public.call_reports r where r.call_id = c.id)
   for update;
  if not found then
    raise exception 'call_recorded' using errcode = '23514';
  end if;

  delete from public.notifications
   where kind = 'call_invited' and subject_id = p_call_id;
  delete from public.calls where id = p_call_id;
  return v_event;
end;
$$;

revoke execute on function public.cancel_framing_call(uuid) from public, anon;
grant execute on function public.cancel_framing_call(uuid) to authenticated;
