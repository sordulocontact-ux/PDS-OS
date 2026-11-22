-- « Je voudrais pouvoir tout modifier : rajouter des gens, changer l'ordre du jour… » (Sacha 21/11/2026).
-- Whoever planned a deal's call (« Caler le call »: the project's owner, who is not in the call) now
-- arranges it like whoever works on it: its slot, who takes part, its agenda, its video link, its name.
-- She still never records or processes it (is_call_owner unchanged): only those columns, guarded by
-- a_guard_arranger, and never once something is recorded (reschedule_call, updateCallAgenda).

-- Who arranges a call: whoever works on it, or whoever planned a deal's call while she reads the deal
-- and it is open.
create or replace function public.can_arrange_call(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_call_owner(p_call_id)
      or exists (
        select 1 from public.calls c
          join public.deals d on d.id = c.deal_id
         where c.id = p_call_id
           and c.created_by = public.auth_person_id()
           and public.is_active_member(c.organization_id)
           and d.stage not in ('signed', 'abandoned')
           and public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id));
$$;
revoke execute on function public.can_arrange_call(uuid) from public, anon;
grant execute on function public.can_arrange_call(uuid) to authenticated;

-- Its people.
drop policy call_attendees_insert_owner on public.call_attendees;
create policy call_attendees_insert_owner on public.call_attendees
  for insert to authenticated with check (public.can_arrange_call(call_id));
drop policy call_attendees_delete_owner on public.call_attendees;
create policy call_attendees_delete_owner on public.call_attendees
  for delete to authenticated using (public.can_arrange_call(call_id));
drop policy call_guests_insert_owner on public.call_guests;
create policy call_guests_insert_owner on public.call_guests
  for insert to authenticated with check (public.can_arrange_call(call_id));
drop policy call_guests_delete_owner on public.call_guests;
create policy call_guests_delete_owner on public.call_guests
  for delete to authenticated using (public.can_arrange_call(call_id));

-- The call itself: the arranger's row, only its arrangement.
create policy calls_update_arranger on public.calls
  for update to authenticated
  using (public.can_arrange_call(id))
  with check (public.can_arrange_call(id));

-- Fires first (before b_*): what the arranger asked, before other triggers stamp the row.
create or replace function public.calls_guard_arranger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arranged constant text[] := array['title', 'occurred_at', 'ends_at', 'meeting_url', 'agenda',
                                      'duration_minutes', 'google_event_id', 'updated_at'];
begin
  if public.auth_person_id() is null or public.is_call_owner(old.id) then
    return new;
  end if;
  if (to_jsonb(new) - v_arranged) is distinct from (to_jsonb(old) - v_arranged) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger a_guard_arranger before update on public.calls
  for each row execute function public.calls_guard_arranger();

-- « Modifier l'horaire »: the same rule.
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
  if not public.can_arrange_call(v.id) then
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
