-- Fixes from the back-end audit of 2026-09-27 (docs/ARCHITECTURE.md § 2 and § 8 bis).
--
-- 1. Contracts in the artist-files bucket were readable by every member.
-- 2. A submitted or validated framing could still be rewritten by its owner.
-- 3. project_masters could change on a launched or archived project.
-- 4. Web Push: any member could read colleagues' subscriptions through
--    claim_push_deliveries, then drop or take them over.

-- ---------------------------------------------------------------------------
-- 1. Artist files: reading an object follows its row
-- ---------------------------------------------------------------------------

-- The old policy allowed any object *without a visible contract row*. The
-- subquery runs under the caller's RLS, which hides contract rows from anyone
-- without manage_catalog: for them the test was always true. Now positive:
-- catalog managers read everything (including an object being uploaded), the
-- others only objects whose row they can see.
drop policy artist_files_objects_select on storage.objects;

create policy artist_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artist-files'
    and public.is_active_member(public.try_uuid((storage.foldername(objects.name))[1]))
    and (
      public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
      or exists (select 1 from public.artist_files f where f.path = objects.name)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Framing: written only while not submitted
-- ---------------------------------------------------------------------------

-- Same states as OPEN_STATES in lib/framing/import-report.ts. Once submitted
-- (awaiting_validation) or validated, the Brief, needs and team are frozen:
-- a validated stage is final.
create or replace function public.framing_is_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id
      and d.key = 'framing'
      and s.state in ('not_started', 'in_progress')
  );
$$;

revoke execute on function public.framing_is_editable(uuid) from public, anon;
grant execute on function public.framing_is_editable(uuid) to authenticated;

-- Restrictive: added to the owner and framing_is_open policies.
create policy field_values_framing_editable on public.field_values
  as restrictive for insert to authenticated
  with check (deliverable <> 'brief' or public.framing_is_editable(project_id));

create policy needs_framing_editable_insert on public.needs
  as restrictive for insert to authenticated
  with check (public.framing_is_editable(project_id));
create policy needs_framing_editable_update on public.needs
  as restrictive for update to authenticated
  using (public.framing_is_editable(project_id))
  with check (public.framing_is_editable(project_id));

create policy project_team_members_framing_editable_insert on public.project_team_members
  as restrictive for insert to authenticated
  with check (public.framing_is_editable(project_id));
create policy project_team_members_framing_editable_update on public.project_team_members
  as restrictive for update to authenticated
  using (public.framing_is_editable(project_id))
  with check (public.framing_is_editable(project_id));

-- ---------------------------------------------------------------------------
-- 3. project_masters: only before launch, on a live project and master
-- ---------------------------------------------------------------------------

-- Security definer: create_project inserts the links right after the project,
-- whose visibility must not decide here.
create or replace function public.project_masters_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects p
                  where p.id = p_project_id and p.archived_at is null)
     and not public.is_project_launched(p_project_id);
$$;

revoke execute on function public.project_masters_editable(uuid) from public, anon;
grant execute on function public.project_masters_editable(uuid) to authenticated;

drop policy project_masters_insert_creators on public.project_masters;
drop policy project_masters_delete_creators on public.project_masters;

create policy project_masters_insert_creators on public.project_masters
  for insert to authenticated
  with check (
    public.has_permission(organization_id, 'create_projects')
    and public.project_masters_editable(project_id)
    and exists (select 1 from public.masters m
                 where m.id = master_id and m.archived_at is null)
  );

create policy project_masters_delete_creators on public.project_masters
  for delete to authenticated
  using (
    public.has_permission(organization_id, 'create_projects')
    and public.project_masters_editable(project_id)
  );

-- ---------------------------------------------------------------------------
-- 4. Web Push: subscriptions only reach the app server
-- ---------------------------------------------------------------------------

-- Pushes leave with the actor's own session (no service role), so the actor's
-- request receives the recipients' subscriptions. Called straight from the
-- browser, that handed any member their colleagues' endpoints and keys, and
-- with them the power to drop or take over those subscriptions. The server
-- now proves itself with a secret kept in Vault (name push_claim_secret) and
-- in the PUSH_CLAIM_SECRET environment variable. Without it: no push.
create or replace function public.push_secret_matches(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_secret is not null
     and exists (
       select 1 from vault.decrypted_secrets s
        where s.name = 'push_claim_secret'
          and extensions.digest(s.decrypted_secret, 'sha256')
            = extensions.digest(p_secret, 'sha256')
     );
$$;

-- Internal: only the functions below call it.
revoke execute on function public.push_secret_matches(text) from public, anon, authenticated;

drop function public.claim_push_deliveries();

create function public.claim_push_deliveries(p_secret text)
returns table (
  notification_id uuid, kind text, project_id uuid, subject_id uuid,
  recipient_person_id uuid, endpoint text, p256dh text, auth text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_matches(p_secret) then
    raise exception 'push_not_allowed' using errcode = '42501';
  end if;

  return query
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
end;
$$;

revoke execute on function public.claim_push_deliveries(text) from public, anon;
grant execute on function public.claim_push_deliveries(text) to authenticated;

-- Unsubscribing: one's own browsers only.
create or replace function public.forget_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
   where endpoint = p_endpoint and person_id = public.auth_person_id();
$$;

-- A push service answered 404/410 while the server was sending: the
-- subscription is gone, whoever it belonged to. Server only (secret).
create function public.drop_gone_push_subscription(p_endpoint text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_matches(p_secret) then
    raise exception 'push_not_allowed' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.drop_gone_push_subscription(text, text) from public, anon;
grant execute on function public.drop_gone_push_subscription(text, text) to authenticated;

-- Known push services only: the server POSTs to every saved endpoint, so an
-- arbitrary https URL would make it call any host. Same list as
-- isPushServiceUrl in lib/notifications/push-hosts.ts. A browser still
-- belongs to whoever subscribed last on it (shared computer): the endpoint is
-- unguessable and no longer leaks, so knowing it is the capability again.
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
  if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'push_service_unknown' using errcode = '22023';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (person_id, endpoint, p256dh, auth)
  values (v_person, p_endpoint, p_p256dh, p_auth);
end;
$$;
