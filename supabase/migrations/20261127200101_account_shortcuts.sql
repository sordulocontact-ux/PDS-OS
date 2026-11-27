-- Keyboard shortcuts chosen by each account (Paramètres › Raccourcis clavier,
-- 27/11/2026). Only the shortcuts changed from the default are kept, as
-- { action: { key, mod, double } }; the app checks their shape (zod,
-- lib/shortcuts/). A preference of the person, not business data: read and
-- written by its own account only.

create table public.account_shortcuts (
  account_id uuid primary key default auth.uid()
    references public.accounts (id) on delete cascade,
  shortcuts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint account_shortcuts_object check (jsonb_typeof(shortcuts) = 'object'),
  -- A handful of entries: never a store for anything else.
  constraint account_shortcuts_small check (pg_column_size(shortcuts) < 4096)
);

alter table public.account_shortcuts enable row level security;
alter table public.account_shortcuts force row level security;
revoke all on table public.account_shortcuts from anon, authenticated;
grant select, delete on table public.account_shortcuts to authenticated;
grant insert (account_id, shortcuts, updated_at) on table public.account_shortcuts to authenticated;
-- account_id too: an upsert names it in its update (the policy keeps it the reader's).
grant update (account_id, shortcuts, updated_at) on table public.account_shortcuts to authenticated;

create policy account_shortcuts_select_own on public.account_shortcuts
  for select to authenticated using (account_id = (select auth.uid()));
create policy account_shortcuts_insert_own on public.account_shortcuts
  for insert to authenticated with check (account_id = (select auth.uid()));
create policy account_shortcuts_update_own on public.account_shortcuts
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));
create policy account_shortcuts_delete_own on public.account_shortcuts
  for delete to authenticated using (account_id = (select auth.uid()));
