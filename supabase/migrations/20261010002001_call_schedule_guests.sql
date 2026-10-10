-- A call planned like a Teams meeting (Sacha, 10/10/2026):
--
-- 1. A time slot: `occurred_at` is its start, `ends_at` its end (same rule as
--    a calendar: the end comes after the start). Null on the calls made
--    before, and on those prepared from a workflow (Cadrage, Stratégie,
--    Master), which keep their agenda's duration.
-- 2. Guests outside the team, invited by e-mail (`call_guests`): a contact
--    of the Réseau (`contact_id`, its address copied at invitation time) or
--    an address typed in the form. Members stay in `call_attendees`.
-- 3. The Google Calendar event that carries the Meet link and sends the
--    invitations (`google_event_id`), written by the server with the
--    creator's session right after the event is created.

alter table public.calls
  add column ends_at timestamptz,
  add column google_event_id text,
  add constraint calls_ends_after_start
    check (ends_at is null or ends_at > occurred_at),
  add constraint calls_google_event_id_check
    check (google_event_id is null or char_length(google_event_id) between 1 and 1024);

grant insert (ends_at, google_event_id) on public.calls to authenticated;
grant update (ends_at, google_event_id) on public.calls to authenticated;

create table public.call_guests (
  call_id uuid not null,
  organization_id uuid not null,
  email text not null,
  -- Display name: the contact's, or none for a typed address.
  name text,
  contact_id uuid,
  created_at timestamptz not null default now(),
  primary key (call_id, email),
  constraint call_guests_email_check
    check (char_length(email) <= 320
           and email = lower(btrim(email))
           and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint call_guests_name_check
    check (name is null or (btrim(name) <> '' and char_length(name) <= 200)),
  constraint call_guests_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
    on delete cascade,
  -- A contact deleted from the Réseau leaves the address of the invitation.
  constraint call_guests_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
    on delete set null (contact_id)
);

create index call_guests_contact_idx on public.call_guests (contact_id)
  where contact_id is not null;

alter table public.call_guests enable row level security;
alter table public.call_guests force row level security;
revoke all on public.call_guests from anon, authenticated;

-- Read by whoever sees the call, written by whoever works on it.
create policy call_guests_select_visible on public.call_guests
  for select to authenticated
  using (public.can_see_call(call_id));
create policy call_guests_insert_owner on public.call_guests
  for insert to authenticated
  with check (public.is_call_owner(call_id));
create policy call_guests_delete_owner on public.call_guests
  for delete to authenticated
  using (public.is_call_owner(call_id));

grant select, delete on public.call_guests to authenticated;
grant insert (call_id, organization_id, email, name, contact_id)
  on public.call_guests to authenticated;
