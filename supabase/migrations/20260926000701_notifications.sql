-- Notifications: one table fed by the database itself (triggers), so no
-- write path can forget to notify. Read by the bell (and Realtime while the
-- app is open) and delivered as Web Push when a browser subscribed.
--
-- Never to oneself. The text is written by the code from the kind and the
-- linked objects: nothing but identifiers is stored here.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  recipient_person_id uuid not null references public.people (id),
  -- Who caused it; null when the server job did.
  actor_person_id uuid references public.people (id),
  kind text not null,
  project_id uuid,
  -- The transmission, validation or task behind the notification.
  subject_id uuid,
  read_at timestamptz,
  -- Set when the actor's request took it for Web Push delivery.
  push_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind_check check (kind in (
    'project_transmitted', 'project_accepted', 'project_refused',
    'project_clarification_requested', 'validation_requested',
    'validation_approved', 'validation_rejected', 'task_assigned')),
  constraint notifications_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index notifications_recipient_idx
  on public.notifications (recipient_person_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_person_id) where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;
revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
-- Each person reads their own notifications, and only while an active member.
create policy notifications_select_recipient on public.notifications
  for select to authenticated
  using (recipient_person_id = public.auth_person_id()
         and public.is_active_member(organization_id));

-- Realtime: the bell and the page refresh listen to new rows (RLS applies).
alter publication supabase_realtime add table public.notifications;

create or replace function public.notify(
  p_organization_id uuid,
  p_recipient_person_id uuid,
  p_kind text,
  p_project_id uuid,
  p_subject_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.auth_person_id();
begin
  if p_recipient_person_id is null or p_recipient_person_id is not distinct from v_actor then
    return;
  end if;
  insert into public.notifications (organization_id, recipient_person_id, actor_person_id, kind,
                                    project_id, subject_id)
  values (p_organization_id, p_recipient_person_id, v_actor, p_kind, p_project_id, p_subject_id);
end;
$$;

revoke execute on function public.notify(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: transmissions, validations, tasks
-- ---------------------------------------------------------------------------

create or replace function public.project_assignments_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.organization_id, new.assignee_person_id, 'project_transmitted',
                          new.project_id, new.id);
  elsif old.status = 'pending' and new.status <> 'pending' then
    perform public.notify(new.organization_id, new.assigned_by, 'project_' || new.status,
                          new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.project_assignments_notify() from public, anon, authenticated;

create trigger z_notify after insert or update of status on public.project_assignments
  for each row execute function public.project_assignments_notify();

create or replace function public.validations_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  select s.project_id into v_project_id from public.project_stages s where s.id = new.project_stage_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.organization_id, new.validator_person_id, 'validation_requested',
                          v_project_id, new.id);
  elsif old.state = 'pending' and new.state <> 'pending' then
    perform public.notify(new.organization_id, new.requested_by, 'validation_' || new.state,
                          v_project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.validations_notify() from public, anon, authenticated;

create trigger z_notify after insert or update of state on public.validations
  for each row execute function public.validations_notify();

create or replace function public.tasks_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.assignee_person_id is distinct from old.assignee_person_id then
    perform public.notify(new.organization_id, new.assignee_person_id, 'task_assigned',
                          new.project_id, new.id);
  end if;
  return null;
end;
$$;

revoke execute on function public.tasks_notify() from public, anon, authenticated;

create trigger z_notify after insert or update of assignee_person_id on public.tasks
  for each row execute function public.tasks_notify();

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------

-- Null ids = everything unread of the caller.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications
       set read_at = now()
     where recipient_person_id = public.auth_person_id()
       and read_at is null
       and (p_ids is null or id = any (p_ids))
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Web Push subscriptions
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  -- Unguessable URL of the browser's push service.
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint),
  constraint push_subscriptions_endpoint_https check (endpoint ~ '^https://')
);

create index push_subscriptions_person_idx on public.push_subscriptions (person_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant select on table public.push_subscriptions to authenticated;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (person_id = public.auth_person_id());

-- A browser belongs to whoever subscribed last on it (shared computer).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid := public.auth_person_id();
begin
  if v_person is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (person_id, endpoint, p256dh, auth)
  values (v_person, p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- Drops an endpoint: unsubscribed by its owner, or reported gone (404/410)
-- by the push service. Knowing the endpoint is the capability.
create or replace function public.forget_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke execute on function public.forget_push_subscription(text) from public, anon;
grant execute on function public.forget_push_subscription(text) to authenticated;

-- Web Push without the service role: right after acting, the actor's own
-- request takes the notifications it has just caused, with the recipients'
-- subscriptions, and marks them taken. Nothing else is reachable this way.
create or replace function public.claim_push_deliveries()
returns table (
  notification_id uuid, kind text, project_id uuid, subject_id uuid,
  recipient_person_id uuid, endpoint text, p256dh text, auth text
)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.notifications n
       set push_claimed_at = now()
     where n.actor_person_id = public.auth_person_id()
       and n.push_claimed_at is null
       and n.created_at > now() - interval '10 minutes'
    returning n.id, n.kind, n.project_id, n.subject_id, n.recipient_person_id
  )
  select c.id, c.kind, c.project_id, c.subject_id, c.recipient_person_id,
         s.endpoint, s.p256dh, s.auth
  from claimed c
  join public.push_subscriptions s on s.person_id = c.recipient_person_id;
$$;

revoke execute on function public.claim_push_deliveries() from public, anon;
grant execute on function public.claim_push_deliveries() to authenticated;
