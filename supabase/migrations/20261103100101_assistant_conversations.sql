-- History of the conversations with PO (Sacha, 03/11/2026: « je veux l'IA
-- dans la barre latérale pour sauvegarder l'historique »).
--
-- One row per conversation: its turns as the AI SDK's UI messages (what the
-- page shows again when it is reopened), its title (the first question, as
-- asked: written by code, never by the model), the page it was started
-- from. Saved by /api/assistant at the end of every answer, with the
-- member's session.
--
-- Private: a conversation is read, continued and deleted by the person who
-- had it, nobody else, not even an administrator (what one asks PO is one's
-- own working notes). Kept until that person deletes it; gone with the
-- person.
--
-- The id comes from the tab (the AI SDK chat's id, a uuid), so the first
-- answer can save it without a round trip. Another person's id cannot be
-- taken over: the update policy only reaches one's own rows, and an insert
-- on an existing id fails.

create table public.assistant_conversations (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id),
  person_id uuid not null default public.auth_person_id()
    references public.people (id) on delete cascade,
  title text not null,
  -- The app page an Espace Espace conversation was opened from.
  page_path text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_conversations_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint assistant_conversations_page_path_check check (
    page_path is null or (page_path like '/app%' and char_length(page_path) <= 300)),
  constraint assistant_conversations_messages_check check (
    jsonb_typeof(messages) = 'array'
    and jsonb_array_length(messages) <= 60
    and octet_length(messages::text) <= 2000000)
);

create index assistant_conversations_person_idx
  on public.assistant_conversations (person_id, updated_at desc);

create trigger a_set_updated_at before update on public.assistant_conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.assistant_conversations enable row level security;
alter table public.assistant_conversations force row level security;

revoke all on table public.assistant_conversations from anon, authenticated;
grant select, delete on table public.assistant_conversations to authenticated;
grant insert (id, organization_id, title, page_path, messages)
  on table public.assistant_conversations to authenticated;
-- The title and the page are those of the first question: only the turns move.
grant update (messages) on table public.assistant_conversations to authenticated;

create policy assistant_conversations_select_own
  on public.assistant_conversations for select to authenticated
  using (person_id = public.auth_person_id());

create policy assistant_conversations_insert_own
  on public.assistant_conversations for insert to authenticated
  with check (
    person_id = public.auth_person_id()
    and public.is_active_member(organization_id)
  );

create policy assistant_conversations_update_own
  on public.assistant_conversations for update to authenticated
  using (person_id = public.auth_person_id())
  with check (
    person_id = public.auth_person_id()
    and public.is_active_member(organization_id)
  );

create policy assistant_conversations_delete_own
  on public.assistant_conversations for delete to authenticated
  using (person_id = public.auth_person_id());
