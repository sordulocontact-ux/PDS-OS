-- PROJ-UX-03: the agenda of a call stays editable after it is created (until
-- it is recorded), and its last change is said: who, when. Written by the
-- database when the agenda changes, never by the client.
alter table public.calls
  add column agenda_edited_at timestamptz,
  add column agenda_edited_by uuid references public.people (id);

create function public.calls_agenda_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agenda is distinct from old.agenda then
    new.agenda_edited_at := now();
    new.agenda_edited_by := public.auth_person_id();
  end if;
  return new;
end;
$$;

create trigger b_agenda_edited before update of agenda on public.calls
  for each row execute function public.calls_agenda_edited();
