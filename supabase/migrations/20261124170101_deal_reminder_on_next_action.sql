-- A deal's reminder is told on the day of its next action too (UX test of
-- 24/11/2026, ux-tests/2026-11-24-deals-profils, P4): « Pour le » and
-- « Relancer le » read as one date to four testers out of four, and two of
-- them set only « Pour le », which never told anyone. The form now asks one
-- date, « Me le rappeler le », written to both; this tells the earlier of the
-- two dates for the deals that still have only one (created with a date, or
-- written before). The mark keeps the day told: a new date is told again.
create or replace function public.flag_due_deal_follow_ups()
returns integer
language sql
security definer
set search_path = ''
as $$
  with due as (
    update public.deals d
       set follow_up_notified_on = least(d.follow_up_on, d.next_action_on)
     where least(d.follow_up_on, d.next_action_on) is not null
       and least(d.follow_up_on, d.next_action_on)
             <= (now() at time zone 'Europe/Paris')::date
       and d.follow_up_notified_on is distinct from least(d.follow_up_on, d.next_action_on)
       and d.stage not in ('signed', 'abandoned')
       and d.assignee_person_id is not null
    returning d.id, d.organization_id, d.project_id, d.assignee_person_id),
  told as (
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select due.organization_id, due.assignee_person_id, null, 'deal_follow_up_due',
           due.project_id, due.id
      from due
    returning 1)
  select count(*)::integer from told;
$$;
revoke execute on function public.flag_due_deal_follow_ups() from public, anon, authenticated;
grant execute on function public.flag_due_deal_follow_ups() to service_role;
