-- Paramètres › Connexions (docs/ARCHITECTURE.md § 4 quater): each member's
-- Google accounts read by PDS OS, read-only.
--   * the work account (@pdsrecords.com) through the domain's delegation, with
--     no click: the member's login address, or the one the direction wrote in
--     Équipe (memberships.google_work_email);
--   * any other Google account the member connected themselves (OAuth): its
--     refresh token, sealed by the server (AES-256-GCM, key never in the base);
--   * the services a member turned off, per account.
-- All private: nobody else reads them, not even the direction.

-- ---------------------------------------------------------------------------
-- Work address written by the direction (a member who signs in with another
-- address). One member per address: two members can never read the same
-- mailbox. The domain itself is checked by the code (GOOGLE_WORKSPACE_DOMAIN).
-- ---------------------------------------------------------------------------

alter table public.memberships
  add column google_work_email text,
  add constraint memberships_google_work_email_check
    check (google_work_email = lower(btrim(google_work_email))
           and google_work_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create unique index memberships_google_work_email_key
  on public.memberships (google_work_email)
  where google_work_email is not null;

-- Through the existing policy memberships_update_admin: the direction only.
grant update (google_work_email) on table public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- Accounts connected by the member (« Connecter un compte Google »)
-- ---------------------------------------------------------------------------

create table public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null default public.auth_person_id()
    references public.people (id) on delete cascade,
  email text not null,
  -- Sealed by lib/google/token-seal.ts: useless without the server's key.
  refresh_token_sealed text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_accounts_person_email_key unique (person_id, email),
  constraint google_accounts_email_check
    check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table public.google_accounts enable row level security;
alter table public.google_accounts force row level security;
revoke all on table public.google_accounts from anon, authenticated;
grant select, delete on table public.google_accounts to authenticated;
-- The person is the caller (column default), never sent by the client.
grant insert (email, refresh_token_sealed, scopes) on public.google_accounts to authenticated;
grant update (refresh_token_sealed, scopes, updated_at) on public.google_accounts to authenticated;

create policy google_accounts_select_own on public.google_accounts
  for select to authenticated using (person_id = public.auth_person_id());
create policy google_accounts_insert_own on public.google_accounts
  for insert to authenticated with check (person_id = public.auth_person_id());
create policy google_accounts_update_own on public.google_accounts
  for update to authenticated
  using (person_id = public.auth_person_id())
  with check (person_id = public.auth_person_id());
create policy google_accounts_delete_own on public.google_accounts
  for delete to authenticated using (person_id = public.auth_person_id());

-- ---------------------------------------------------------------------------
-- Services turned off: on by default, a row = one service of one account off
-- ---------------------------------------------------------------------------

create table public.google_service_opt_outs (
  person_id uuid not null default public.auth_person_id()
    references public.people (id) on delete cascade,
  account_email text not null,
  service text not null,
  created_at timestamptz not null default now(),
  primary key (person_id, account_email, service),
  constraint google_service_opt_outs_service_check
    check (service in ('calendar', 'gmail', 'drive')),
  constraint google_service_opt_outs_email_check
    check (account_email = lower(btrim(account_email)))
);

alter table public.google_service_opt_outs enable row level security;
alter table public.google_service_opt_outs force row level security;
revoke all on table public.google_service_opt_outs from anon, authenticated;
grant select, delete on table public.google_service_opt_outs to authenticated;
grant insert (account_email, service) on public.google_service_opt_outs to authenticated;

create policy google_service_opt_outs_select_own on public.google_service_opt_outs
  for select to authenticated using (person_id = public.auth_person_id());
create policy google_service_opt_outs_insert_own on public.google_service_opt_outs
  for insert to authenticated with check (person_id = public.auth_person_id());
create policy google_service_opt_outs_delete_own on public.google_service_opt_outs
  for delete to authenticated using (person_id = public.auth_person_id());
