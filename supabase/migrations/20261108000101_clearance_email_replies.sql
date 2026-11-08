-- The rights holders' replies to an authorisation request, collected from
-- PO's mailbox (Sacha, 08/11/2026: « PDS ne peut pas détecter le retour du
-- mail pour ajouter la réponse ? »).
--
-- The request leaves with a reply address of its own
-- (po+aut-<clearance id>@…, lib/email/reply-address.ts). Every 10 minutes,
-- pg_cron calls /api/cron/inbox (secret in Vault), which reads the replies
-- and files each one here with the service role (a cron: the only place it
-- is used). A reply is kept in the journal as an e-mail received, once (its
-- Message-ID), and the clearance's responsible is told. Its state does not
-- move: a reply may be an out-of-office or a question, the next step stays
-- a person's gesture (« Lire la réponse » in « Négocier »).

-- ------------------------------------------------------------ the journal

alter table public.legal_clearance_communications
  add column external_id text,
  add column from_address text;

alter table public.legal_clearance_communications
  add constraint legal_clearance_communications_external_id_check
    check (external_id is null or char_length(external_id) between 1 and 500),
  add constraint legal_clearance_communications_from_address_check
    check (from_address is null or char_length(from_address) between 3 and 320);

-- One e-mail, filed once, whatever the number of runs that see it.
create unique index legal_clearance_communications_external_id_key
  on public.legal_clearance_communications (external_id)
  where external_id is not null;

-- ------------------------------------------------------------ notification

select public.add_notification_kinds(array['clearance_reply_received']);

-- ------------------------------------------------------------ filing a reply

-- Called by the cron only (service role): false when the clearance is closed
-- or gone, or the e-mail was filed before.
create or replace function public.receive_clearance_reply(
  p_clearance_id uuid,
  p_external_id text,
  p_from text,
  p_body text,
  p_received_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype;
  v_id uuid;
  v_body text := left(btrim(coalesce(p_body, '')), 8000);
begin
  select * into v from public.legal_clearances where id = p_clearance_id;
  if not found or v.status in ('cleared', 'abandoned') or v_body = ''
     or nullif(btrim(coalesce(p_external_id, '')), '') is null then
    return false;
  end if;
  insert into public.legal_clearance_communications
    (organization_id, clearance_id, kind, direction, body, occurred_at, created_by,
     external_id, from_address)
  values (v.organization_id, v.id, 'email', 'in', v_body,
          least(coalesce(p_received_at, now()), now()), null,
          left(btrim(p_external_id), 500), nullif(left(btrim(coalesce(p_from, '')), 320), ''))
  on conflict (external_id) where external_id is not null do nothing
  returning id into v_id;
  if v_id is null then
    return false;
  end if;
  perform public.log_clearance_event(v, 'clearance.communication', null, null, 'email · in');
  perform public.notify(
    v.organization_id,
    coalesce(v.responsible_person_id,
             (select p.owner_person_id from public.projects p where p.id = v.project_id)),
    'clearance_reply_received', v.project_id, v.id);
  return true;
end;
$$;

revoke execute on function public.receive_clearance_reply(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.receive_clearance_reply(uuid, text, text, text, timestamptz)
  to service_role;

-- ------------------------------------------------------------ every 10 minutes

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- The route and the cron's secret are in Vault (names inbox_poll_url and
-- cron_secret, the same value as CRON_SECRET): without them (local stack,
-- a base not set up), the job does nothing.
create or replace function public.poll_inbox()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select s.decrypted_secret into v_url
    from vault.decrypted_secrets s where s.name = 'inbox_poll_url';
  select s.decrypted_secret into v_secret
    from vault.decrypted_secrets s where s.name = 'cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000);
end;
$$;

revoke execute on function public.poll_inbox() from public, anon, authenticated;

select cron.schedule('pds-inbox-poll', '*/10 * * * *', 'select public.poll_inbox()');
