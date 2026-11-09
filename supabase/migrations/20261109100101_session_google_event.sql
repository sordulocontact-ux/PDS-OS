-- A planned studio session goes to the label's Google Agenda, its internal
-- team invited (retour d'Ibé du 01/11/2026, decisions of 05/11): the event's
-- id, written by the code with the user's session once Google answered
-- (lib/sessions/calendar.ts). Never a state: the session's stays computed.

alter table public.master_sessions add column google_event_id text;

alter table public.master_sessions add constraint master_sessions_google_event_check
  check (google_event_id is null or char_length(google_event_id) between 1 and 1024);

grant update (google_event_id) on public.master_sessions to authenticated;
