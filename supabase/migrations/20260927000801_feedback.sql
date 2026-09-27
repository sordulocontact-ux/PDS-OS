-- Feedback sent by the team about the app itself (a bug, an idea, anything
-- else), read by whoever builds it. Written once, never edited nor deleted.
-- Read: the author their own, and whoever holds `administer` all of their
-- organization's. Write: any active member, for themself.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  kind text not null,
  message text not null,
  -- The app page the feedback was sent from, when known.
  page_path text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint feedback_kind_check check (kind in ('bug', 'idea', 'other')),
  constraint feedback_message_not_blank check (btrim(message) <> ''),
  constraint feedback_message_length check (char_length(message) <= 4000),
  constraint feedback_page_path_format check (
    page_path is null or (page_path like '/app%' and char_length(page_path) <= 500))
);

create index feedback_organization_idx on public.feedback (organization_id, created_at desc);
create index feedback_created_by_idx on public.feedback (created_by, created_at desc);

-- Authorship is set by the database, never by the client.
create trigger a_set_created_by before insert on public.feedback
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.feedback enable row level security;
alter table public.feedback force row level security;
revoke all on table public.feedback from anon, authenticated;
grant select on table public.feedback to authenticated;
grant insert (organization_id, kind, message, page_path) on public.feedback to authenticated;

create policy feedback_select_own_or_admin on public.feedback
  for select to authenticated
  using (created_by = public.auth_person_id()
         or public.has_permission(organization_id, 'administer'));

create policy feedback_insert_member on public.feedback
  for insert to authenticated
  with check (public.is_active_member(organization_id));
