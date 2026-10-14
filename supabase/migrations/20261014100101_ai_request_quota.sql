-- Daily quota of LLM requests per member (Sacha, 14/10/2026).
--
-- Every call to the language model made for a member (a message to PO, an
-- analysis, an extraction) is one request. Each member has a daily limit,
-- 200 by default, that the general director changes from the team screen.
-- The day is the Paris day: the counter starts again at midnight.
--
-- The count is a fact computed here, never by the model (CLAUDE.md, rule 6).
-- Requests are only written by consume_ai_request(), which checks the limit
-- and records the request in one locked step: two calls at the same time can
-- never both take the last request.

-- ---------------------------------------------------------------------------
-- The limit, on the membership (its update is reserved to administrators by
-- the existing policy memberships_update_admin)
-- ---------------------------------------------------------------------------

alter table public.memberships
  add column ai_daily_limit integer not null default 200,
  add constraint memberships_ai_daily_limit_check
    check (ai_daily_limit between 0 and 10000);

grant update (ai_daily_limit) on table public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- The requests
-- ---------------------------------------------------------------------------

create table public.ai_requests (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id),
  person_id uuid not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_requests_person_created_idx
  on public.ai_requests (organization_id, person_id, created_at desc);

alter table public.ai_requests enable row level security;
alter table public.ai_requests force row level security;

revoke all on table public.ai_requests from anon, authenticated;
grant select on table public.ai_requests to authenticated;

-- One's own requests; every request of the organization for an administrator.
-- No write policy: only consume_ai_request() writes.
create policy ai_requests_select
  on public.ai_requests for select to authenticated
  using (
    person_id = public.auth_person_id()
    or public.is_org_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- The Paris day
-- ---------------------------------------------------------------------------

create or replace function public.ai_quota_day_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('day', now() at time zone 'Europe/Paris')
    at time zone 'Europe/Paris';
$$;

-- Next midnight in Paris (a day of 23 or 25 hours on a time change).
create or replace function public.ai_quota_resets_at()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day')
    at time zone 'Europe/Paris';
$$;

revoke execute on function public.ai_quota_day_start() from public, anon;
revoke execute on function public.ai_quota_resets_at() from public, anon;
grant execute on function public.ai_quota_day_start() to authenticated;
grant execute on function public.ai_quota_resets_at() to authenticated;

-- ---------------------------------------------------------------------------
-- Taking one request
-- ---------------------------------------------------------------------------

-- Called by lib/ai/quota.ts before every call to the model, with the
-- member's session. allowed = false: the limit is reached, nothing is
-- recorded and the model is not called.
create or replace function public.consume_ai_request(p_organization_id uuid)
returns table (
  allowed boolean,
  used integer,
  daily_limit integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_limit integer;
  v_used integer;
begin
  -- Same access rule as is_active_member; the row lock serializes the
  -- requests of one member.
  select m.person_id, m.ai_daily_limit
    into v_person_id, v_limit
  from public.memberships m
  join public.accounts a on a.id = m.approved_account_id
  where a.id = auth.uid()
    and a.disabled_at is null
    and m.organization_id = p_organization_id
    and m.status = 'approved'
  for update of m;

  if v_person_id is null then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select count(*)::integer into v_used
  from public.ai_requests r
  where r.organization_id = p_organization_id
    and r.person_id = v_person_id
    and r.created_at >= public.ai_quota_day_start();

  if v_used >= v_limit then
    return query select false, v_used, v_limit, public.ai_quota_resets_at();
    return;
  end if;

  insert into public.ai_requests (organization_id, person_id)
  values (p_organization_id, v_person_id);

  return query select true, v_used + 1, v_limit, public.ai_quota_resets_at();
end;
$$;

revoke execute on function public.consume_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reading today's usage
-- ---------------------------------------------------------------------------

-- Security invoker: RLS decides what comes back. A member reads their own
-- line (settings page); the general director reads every member (team screen).
create or replace function public.ai_usage_today(p_organization_id uuid)
returns table (
  person_id uuid,
  used integer,
  daily_limit integer,
  resets_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m.person_id,
    (
      select count(*)::integer
      from public.ai_requests r
      where r.organization_id = m.organization_id
        and r.person_id = m.person_id
        and r.created_at >= public.ai_quota_day_start()
    ),
    m.ai_daily_limit,
    public.ai_quota_resets_at()
  from public.memberships m
  where m.organization_id = p_organization_id;
$$;

revoke execute on function public.ai_usage_today(uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_today(uuid) to authenticated;
