-- Page loads audit (27/10/2026, docs/ARCHITECTURE.md § 3 bis): the pages
-- heard a project's changes and the person's new notifications through
-- Realtime « postgres_changes », which reads the database's change log for
-- every listener: 33 400 calls of realtime.list_changes in 24 h on the
-- pre-prod (≈ 277 s of database time), on a free database already queueing
-- the pages' reads. The database now sends each signal itself, once, as a
-- Realtime broadcast on a private channel (realtime.send):
-- - `project:<id>`, event `changed`, { version, changed_by }: from
--   project_live_bump, the same moments as before (project_live_tick);
-- - `notifications:<person id>`, event `inserted`, { id }: after each new
--   notification.
-- The signals still carry no data: pages read again with the person's
-- session. Who may hear a channel is decided here, by RLS on
-- realtime.messages: a project's channel for whoever sees the project, a
-- person's notifications for that person only. Nobody may send on them
-- (no insert policy): only these functions do.

create or replace function public.project_live_bump(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version bigint;
  v_changed_by uuid;
begin
  insert into public.project_live (project_id, organization_id, changed_by)
  select p.id, p.organization_id, auth.uid()
    from public.projects p where p.id = p_project_id
  on conflict (project_id) do update
    set version = public.project_live.version + 1,
        changed_at = now(),
        changed_by = excluded.changed_by
  returning version, changed_by into v_version, v_changed_by;
  -- A project being deleted (its row already gone) sends nothing.
  if v_version is not null then
    perform realtime.send(
      jsonb_build_object('version', v_version, 'changed_by', v_changed_by),
      'changed', 'project:' || p_project_id::text, true);
  end if;
end;
$$;
revoke execute on function public.project_live_bump(uuid) from public, anon, authenticated;

create or replace function public.notification_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id),
    'inserted', 'notifications:' || new.recipient_person_id::text, true);
  return null;
end;
$$;
revoke execute on function public.notification_broadcast() from public, anon, authenticated;

drop trigger if exists notification_broadcast on public.notifications;
create trigger notification_broadcast after insert on public.notifications
  for each row execute function public.notification_broadcast();

-- Who hears a private channel. The topic is checked before any cast: a
-- malformed one is refused, never an error.
drop policy if exists pds_live_topics_read on realtime.messages;
create policy pds_live_topics_read on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and case
      when realtime.topic() ~ '^project:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_see_project(substr(realtime.topic(), 9)::uuid)
      when realtime.topic() ~ '^notifications:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then substr(realtime.topic(), 15)::uuid = public.auth_person_id()
      else false
    end
  );

-- Nobody listens to the change log any more.
alter publication supabase_realtime drop table public.notifications;
alter publication supabase_realtime drop table public.project_live;
