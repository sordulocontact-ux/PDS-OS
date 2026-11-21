-- « Caler le call » (Sacha 21/11/2026): « je veux pouvoir mettre une réunion 5 ans après ».
-- The business manager's free slots were the next 5 working days (10 at most); they are now read
-- one period at a time, from p_from to p_to (the months the calendar shows), up to five years ahead.
-- Same rules as before (20261120140101): working days, on the hour from 10:00 to 18:00 Paris, an
-- hour from now at the soonest, minus the calls PDS OS knows he is in; read by whoever plans calls.

drop function if exists public.negotiator_free_slots(uuid, integer, integer);

create or replace function public.negotiator_free_slots(
  p_person_id uuid,
  p_from date default null,
  p_to date default null,
  p_minutes integer default 30)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_from date;
  v_to date;
  v_length interval := make_interval(mins => least(greatest(coalesce(p_minutes, 30), 15), 240));
begin
  select m.organization_id into v_org
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
   where m.person_id = p_person_id
     and m.status = 'approved'
     and 'negotiate' = any (public.role_permissions(m.role))
     and (public.has_permission(m.organization_id, 'pilot_projects')
          or public.has_permission(m.organization_id, 'validate'))
   limit 1;
  if v_org is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Two months at most a call, from today to five years ahead.
  v_from := greatest(coalesce(p_from, v_today), v_today);
  v_to := least(coalesce(p_to, v_from + 61), v_from + 61,
                (v_today + interval '5 years')::date);
  if v_to < v_from then
    return;
  end if;

  return query
  with days as (
    select d::date as day
      from generate_series(v_from, v_to, interval '1 day') as d
     where extract(isodow from d) < 6),
  candidates as (
    select ((days.day + make_time(h, 0, 0)) at time zone 'Europe/Paris') as s
      from days cross join generate_series(10, 18) as h),
  busy as (
    select c.occurred_at as s,
           coalesce(c.ends_at,
                    c.occurred_at + make_interval(mins => coalesce(c.duration_minutes, 30))) as e
      from public.calls c
      left join public.deals d on d.id = c.deal_id
     where c.organization_id = v_org
       and c.occurred_at < ((v_to + 1)::timestamp at time zone 'Europe/Paris')
       and c.occurred_at > ((v_from - 1)::timestamp at time zone 'Europe/Paris')
       and case
             when c.deal_id is not null then d.assignee_person_id = p_person_id
             else c.created_by = p_person_id
                  or exists (select 1 from public.call_attendees ca
                              where ca.call_id = c.id and ca.person_id = p_person_id)
           end)
  select c.s, c.s + v_length
    from candidates c
   where c.s >= now() + interval '1 hour'
     and not exists (select 1 from busy b where b.s < c.s + v_length and b.e > c.s)
   order by c.s;
end;
$$;
revoke execute on function public.negotiator_free_slots(uuid, date, date, integer) from public, anon;
grant execute on function public.negotiator_free_slots(uuid, date, date, integer) to authenticated;
