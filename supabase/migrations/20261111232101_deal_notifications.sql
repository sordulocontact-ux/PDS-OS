-- Business module, lot BIZ 4: the deals' notifications, to the assignee and
-- the direction only.
--
--   deal_assigned             a deal given to its negotiator      → him
--   deal_agreement_proposed   an accord de principe to validate   → the direction
--   deal_agreement_validated  validated                           → the assignee
--   deal_agreement_refused    sent back to negotiation, a reason  → the assignee
--   deal_follow_up_due        the follow-up date has come         → the assignee
--
-- Written by a trigger on the deal's journal (the project's rule: the
-- notifications are written by triggers only), and, for the follow-ups, by
-- the daily job that already flags the Distribution's overdue reserves
-- (/api/cron/detect-releases, service role). The app sends the pushes after
-- each gesture (schedulePendingPushes).

select public.add_notification_kinds(array['deal_assigned', 'deal_agreement_proposed',
  'deal_agreement_validated', 'deal_agreement_refused', 'deal_follow_up_due']);

-- The members who validate (the direction) of an organization.
create or replace function public.deal_directors(p_org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.person_id
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
   where m.organization_id = p_org
     and m.status = 'approved'
     and 'validate' = any (public.role_permissions(m.role));
$$;
revoke execute on function public.deal_directors(uuid) from public, anon, authenticated;

create or replace function public.deal_events_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_director uuid;
begin
  select * into v from public.deals where id = new.deal_id;
  if not found then
    return null;
  end if;
  if new.kind = 'assigned' and (new.detail ->> 'assignee') is not null then
    perform public.notify(v.organization_id, (new.detail ->> 'assignee')::uuid,
                          'deal_assigned', v.project_id, v.id);
  elsif new.kind = 'stage' and new.to_stage = 'agreement'
        and new.detail ->> 'agreement' = 'pending' then
    for v_director in select public.deal_directors(v.organization_id) loop
      perform public.notify(v.organization_id, v_director, 'deal_agreement_proposed',
                            v.project_id, v.id);
    end loop;
  elsif new.kind in ('agreement_validated', 'agreement_refused') then
    perform public.notify(v.organization_id, v.assignee_person_id,
                          'deal_' || new.kind, v.project_id, v.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.deal_events_notify() from public, anon, authenticated;

create trigger z_notify after insert on public.deal_events
  for each row execute function public.deal_events_notify();

-- The follow-ups whose date has come (Paris), told once to the assignee of
-- an open deal; a new date is told again (set_deal_next_action clears the
-- mark). Called by the daily cron only. Returns how many were told.
create or replace function public.flag_due_deal_follow_ups()
returns integer
language sql
security definer
set search_path = ''
as $$
  with due as (
    update public.deals d
       set follow_up_notified_on = d.follow_up_on
     where d.follow_up_on is not null
       and d.follow_up_on <= (now() at time zone 'Europe/Paris')::date
       and d.follow_up_notified_on is distinct from d.follow_up_on
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
