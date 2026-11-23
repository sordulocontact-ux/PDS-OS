-- « Mails » (Sacha 23/11/2026: « une nouvelle page inbox ou mail qui me permet de récupérer tous
-- les mails que PDS OS reçoit, les signatures, les devis, voir les mails envoyés »): PO's mailbox
-- (po@…, the Google account every e-mail of PDS OS leaves from, lib/email/send.ts) read in the app.
--
--   - The messages are copied here by the cron /api/cron/inbox (service role, every 10 minutes,
--     lib/mailbox/sync.ts), from Gmail's Inbox and its Sent folder (Gmail keeps there what its SMTP
--     sends, so every e-mail PDS OS sent and every one written from po@ by hand). A message is known
--     by its Message-ID within its folder: copied once, never rewritten.
--   - What a message is (a signature, a quote, an invoice, a contract, a proof, a deal memo, an
--     authorisation reply) is computed by code at each reading (lib/mailbox/kinds.ts), never stored.
--   - The attachments are not copied: their place in the message (`part`) is kept, and the file is
--     read from the mailbox when a reader asks for it (/api/mailbox/[id]/attachments/[part]).
--   - Who reads what (Sacha 23/11/2026: « je veux que tout le monde puisse voir les mails qu'il a
--     reçus ; la direction peut voir tous les mails »): each message names the members it belongs to
--     (`person_ids`, decided by code at the copy, lib/mailbox/owners.ts: who sent it from PDS OS,
--     who it answers in the thread, the request or the deal of a po+…@ address, a member in To/Cc
--     or as the sender). A member reads those; the direction reads all (read_mailbox, a new
--     permission held by the direction only).
--   - Written from the app (« écrire / répondre à un mail depuis l'app »): the member records the
--     e-mail they just sent through PDS OS (folder sent, theirs only), so it shows at once; the
--     cron then knows it by its Message-ID and never copies it twice. Nothing else is written from
--     the app: no update or delete.
--
-- Not linked to a project: not in delete_project_row, no project_live.

-- 1. The permission --------------------------------------------------------------------------------
-- Everything else unchanged from 20261122130101.
create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets',
            'manage_artist_budgets', 'read_finance', 'manage_finance', 'validate_contracts',
            'read_mailbox']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals', 'read_finance', 'manage_finance',
                                        'validate_contracts', 'manage_contracts']
    when 'business' then array['negotiate', 'manage_network', 'read_finance', 'manage_finance',
                               'manage_contracts']
    else array[]::text[]
  end;
$$;

-- 2. The messages ----------------------------------------------------------------------------------
create table public.mailbox_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Gmail's Inbox, or its Sent folder.
  folder text not null,
  message_id text not null,
  -- Its UID in the folder when copied: where its attachments are read first. None for an e-mail
  -- recorded by its sender from the app (its attachments, if any, are found by Message-ID).
  imap_uid bigint,
  -- The members it belongs to (lib/mailbox/owners.ts): what a member reads.
  person_ids uuid[] not null default '{}',
  -- The thread: In-Reply-To then References, for the owners of a reply and to answer it.
  thread_ids text[] not null default '{}',
  from_name text,
  from_address text,
  -- « À » and « Cc », lowercased addresses.
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  -- The recipients' names, as written in the message (address → name).
  names jsonb not null default '{}'::jsonb,
  subject text not null default '',
  sent_at timestamptz not null,
  -- The start of the text, for the list; the whole text, for the message opened.
  snippet text not null default '',
  body_text text not null default '',
  -- [{ part, name, type, size }]: the files joined, read from the mailbox on demand.
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint mailbox_messages_folder_check check (folder in ('inbox', 'sent')),
  constraint mailbox_messages_message_key unique (organization_id, folder, message_id),
  constraint mailbox_messages_sizes_check check (
    char_length(message_id) <= 300
    and char_length(subject) <= 500
    and char_length(snippet) <= 300
    and char_length(body_text) <= 100000
    and coalesce(char_length(from_name), 0) <= 200
    and coalesce(char_length(from_address), 0) <= 320
  ),
  constraint mailbox_messages_attachments_check check (jsonb_typeof(attachments) = 'array'),
  constraint mailbox_messages_names_check check (jsonb_typeof(names) = 'object')
);

create index mailbox_messages_org_sent_idx
  on public.mailbox_messages (organization_id, sent_at desc);
create index mailbox_messages_people_idx on public.mailbox_messages using gin (person_ids);
create index mailbox_messages_thread_idx on public.mailbox_messages using gin (thread_ids);

alter table public.mailbox_messages enable row level security;
alter table public.mailbox_messages force row level security;
revoke all on public.mailbox_messages from anon, authenticated;
grant select on public.mailbox_messages to authenticated;
grant insert (organization_id, folder, message_id, person_ids, thread_ids, from_name,
              from_address, to_addresses, cc_addresses, names, subject, sent_at, snippet,
              body_text)
  on public.mailbox_messages to authenticated;

create policy mailbox_messages_select on public.mailbox_messages
  for select to authenticated
  using (public.has_permission(organization_id, 'read_mailbox')
         or (public.is_active_member(organization_id)
             and public.auth_person_id() = any (person_ids)));

-- What its sender just sent from the app: theirs only, now, no attachment.
create policy mailbox_messages_insert on public.mailbox_messages
  for insert to authenticated
  with check (folder = 'sent'
              and public.is_active_member(organization_id)
              and person_ids = array[public.auth_person_id()]
              and sent_at between now() - interval '5 minutes' and now() + interval '1 minute');
