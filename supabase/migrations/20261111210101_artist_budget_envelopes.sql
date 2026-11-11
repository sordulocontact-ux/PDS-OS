-- Budget, lot BUD 2 (Ibé, 11/11/2026: « Mon artiste signé Morris a 60 000 de
-- budget : on rentre l'enveloppe, répartie en catégories (30 000 production,
-- 20 000 marketing, 10 000 transport) »; docs/ARCHITECTURE.md § 8 ter).
--
-- The envelope of an artist: an amount, its split by poste (the 16 postes of
-- budget_lines.family), a first day and an optional last day. One open
-- envelope per artist: opening another closes it, kept as history. What it
-- consumed is computed at each reading (artist_budget_usage), never stored:
-- the artist's direct spends plus the lines of the artist's projects
-- (project_artist_id: a collective's main artist), dated in the period.
-- The postes may add up to less than the amount (the rest is « non
-- réparti »), never more. Opened and changed by the direction alone
-- (« manage_artist_budgets »), each change journaled; read by whoever reads
-- the artists' budgets (read_artist_budgets, BUD 1).

-- 1. Permission ------------------------------------------------------------------

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
            'manage_artist_budgets']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets']
    when 'business' then array['negotiate', 'manage_network']
    else array[]::text[]
  end;
$$;

-- 2. Tables ----------------------------------------------------------------------

create table public.artist_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  artist_id uuid not null,
  amount_cents bigint not null,
  starts_on date not null,
  ends_on date,
  -- Set when another envelope was opened: history from then on.
  closed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_budgets_amount_check check (amount_cents > 0),
  constraint artist_budgets_period_check check (ends_on is null or ends_on >= starts_on),
  constraint artist_budgets_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id),
  constraint artist_budgets_id_org_key unique (id, organization_id)
);

create unique index artist_budgets_one_open on public.artist_budgets (artist_id)
  where closed_at is null;
create index artist_budgets_artist_idx on public.artist_budgets (artist_id, starts_on desc);

create table public.artist_budget_posts (
  budget_id uuid not null references public.artist_budgets (id) on delete cascade,
  family text not null,
  amount_cents bigint not null,
  primary key (budget_id, family),
  constraint artist_budget_posts_amount_check check (amount_cents > 0),
  constraint artist_budget_posts_family_check check (family in (
    'content_production', 'photo_video', 'image',
    'advertising', 'events',
    'studio', 'services', 'coaching', 'equipment',
    'transport', 'lodging', 'per_diem',
    'food', 'food_delivery',
    'misc', 'other'))
);

-- Every opening, change and closing, with what the envelope was after it
-- (and before it, for a change).
create table public.artist_budget_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  artist_id uuid not null,
  budget_id uuid not null references public.artist_budgets (id) on delete cascade,
  kind text not null,
  actor_person_id uuid references public.people (id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  seq bigint generated always as identity,
  constraint artist_budget_events_kind_check check (kind in ('opened', 'changed', 'closed'))
);

create index artist_budget_events_artist_idx
  on public.artist_budget_events (artist_id, created_at desc, seq desc);

create trigger a_set_created_by before insert on public.artist_budgets
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.artist_budgets
  for each row execute function public.set_updated_at();

-- Read by the budget's readers; written by the functions below only.
alter table public.artist_budgets enable row level security;
alter table public.artist_budgets force row level security;
alter table public.artist_budget_posts enable row level security;
alter table public.artist_budget_posts force row level security;
alter table public.artist_budget_events enable row level security;
alter table public.artist_budget_events force row level security;
revoke all on public.artist_budgets, public.artist_budget_posts, public.artist_budget_events
  from anon, authenticated;
grant select on public.artist_budgets, public.artist_budget_posts, public.artist_budget_events
  to authenticated;

create policy artist_budgets_select_readers on public.artist_budgets
  for select to authenticated
  using (public.has_permission(organization_id, 'read_artist_budgets'));

create policy artist_budget_posts_select_readers on public.artist_budget_posts
  for select to authenticated
  using (exists (select 1 from public.artist_budgets b
                  where b.id = budget_id
                    and public.has_permission(b.organization_id, 'read_artist_budgets')));

create policy artist_budget_events_select_readers on public.artist_budget_events
  for select to authenticated
  using (public.has_permission(organization_id, 'read_artist_budgets'));

-- 3. The projects of an artist -----------------------------------------------------

-- The projects whose artist this is, by the rule every page reads
-- (project_artist_id: a collective's main artist, else the first credit of
-- its first title, else the artist it names). Ids only: what is read of
-- them stays under their own rules.
create or replace function public.artist_project_ids(p_artist_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.id), '{}')
    from public.projects p
    join public.artists a on a.id = p_artist_id and a.organization_id = p.organization_id
   where public.is_active_member(p.organization_id)
     and public.project_artist_id(p.id) = p_artist_id;
$$;
revoke execute on function public.artist_project_ids(uuid) from public, anon;
grant execute on function public.artist_project_ids(uuid) to authenticated;

-- 4. What an envelope consumed ----------------------------------------------------

-- Per poste (null: the lines without one): the amount given to it, what is
-- spent (engaged, invoiced or paid: what the artist is bound to pay), what
-- is still estimated or quoted, split between the artist's direct spends and
-- its projects'. Lines dated in the envelope's period. Nothing for whoever
-- does not read the artists' budgets.
create or replace function public.artist_budget_usage(p_budget_id uuid)
returns table (
  family text,
  allocated_cents bigint,
  spent_cents bigint,
  pending_cents bigint,
  direct_cents bigint,
  project_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select * from public.artist_budgets
     where id = p_budget_id
       and public.has_permission(organization_id, 'read_artist_budgets')
  ),
  projects as (
    select public.artist_project_ids(b.artist_id) as ids from b
  ),
  lines as (
    select l.family, l.amount_cents, l.status, (l.artist_id is not null) as direct
      from public.budget_lines l, b, projects
     where l.organization_id = b.organization_id
       and (l.artist_id = b.artist_id or l.project_id = any (projects.ids))
       and l.spent_on >= b.starts_on
       and (b.ends_on is null or l.spent_on <= b.ends_on)
  ),
  spent as (
    select family,
           coalesce(sum(amount_cents) filter (where status in ('committed', 'invoiced', 'paid')), 0)::bigint as spent_cents,
           coalesce(sum(amount_cents) filter (where status in ('planned', 'proposed')), 0)::bigint as pending_cents,
           coalesce(sum(amount_cents) filter (where direct and status in ('committed', 'invoiced', 'paid')), 0)::bigint as direct_cents,
           coalesce(sum(amount_cents) filter (where not direct and status in ('committed', 'invoiced', 'paid')), 0)::bigint as project_cents
      from lines
     group by family
  ),
  posts as (
    select p.family, p.amount_cents
      from public.artist_budget_posts p, b
     where p.budget_id = b.id
  )
  select coalesce(p.family, s.family),
         coalesce(p.amount_cents, 0)::bigint,
         coalesce(s.spent_cents, 0)::bigint,
         coalesce(s.pending_cents, 0)::bigint,
         coalesce(s.direct_cents, 0)::bigint,
         coalesce(s.project_cents, 0)::bigint
    from posts p
    full join spent s on s.family = p.family;
$$;
revoke execute on function public.artist_budget_usage(uuid) from public, anon;
grant execute on function public.artist_budget_usage(uuid) to authenticated;

-- The part of its artist's open envelope a project consumes (its Budget
-- page): for whoever reads the project's budget and the artists' budgets.
create or replace function public.project_artist_budget_share(p_project_id uuid)
returns table (
  artist_id uuid,
  artist_name text,
  budget_id uuid,
  amount_cents bigint,
  starts_on date,
  ends_on date,
  project_spent_cents bigint,
  total_spent_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select ab.*, a.name as artist_name
      from public.projects p
      join public.artist_budgets ab
        on ab.artist_id = public.project_artist_id(p.id) and ab.closed_at is null
      join public.artists a on a.id = ab.artist_id
     where p.id = p_project_id
       and public.can_read_project_budget(p.id)
       and public.has_permission(p.organization_id, 'read_artist_budgets')
  )
  select b.artist_id, b.artist_name, b.id, b.amount_cents, b.starts_on, b.ends_on,
         coalesce((select sum(l.amount_cents) from public.budget_lines l
                    where l.project_id = p_project_id
                      and l.status in ('committed', 'invoiced', 'paid')
                      and l.spent_on >= b.starts_on
                      and (b.ends_on is null or l.spent_on <= b.ends_on)), 0)::bigint,
         coalesce((select sum(u.spent_cents) from public.artist_budget_usage(b.id) u), 0)::bigint
    from b;
$$;
revoke execute on function public.project_artist_budget_share(uuid) from public, anon;
grant execute on function public.project_artist_budget_share(uuid) to authenticated;

-- 5. Opening and changing an envelope ---------------------------------------------

-- What an envelope is, as the journal keeps it.
create or replace function public.artist_budget_snapshot(p_budget_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'amount_cents', b.amount_cents,
    'starts_on', b.starts_on,
    'ends_on', b.ends_on,
    'posts', coalesce((select jsonb_object_agg(p.family, p.amount_cents)
                         from public.artist_budget_posts p where p.budget_id = b.id),
                      '{}'::jsonb))
    from public.artist_budgets b where b.id = p_budget_id;
$$;
revoke execute on function public.artist_budget_snapshot(uuid) from public, anon, authenticated;

-- The split by poste: { "<poste>": cents > 0 }, adding up to the amount at
-- most (the rest is not allotted). Written in place of the former split.
create or replace function public.write_artist_budget_posts(
  p_budget_id uuid,
  p_amount_cents bigint,
  p_posts jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint := 0;
  v_key text;
  v_value jsonb;
begin
  if p_posts is null or jsonb_typeof(p_posts) <> 'object' then
    raise exception 'invalid_posts' using errcode = '23514';
  end if;
  for v_key, v_value in select * from jsonb_each(p_posts) loop
    if jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric <= 0
       or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) then
      raise exception 'invalid_posts' using errcode = '23514';
    end if;
    v_total := v_total + (v_value #>> '{}')::bigint;
  end loop;
  if v_total > p_amount_cents then
    raise exception 'posts_over_total' using errcode = '23514';
  end if;
  delete from public.artist_budget_posts where budget_id = p_budget_id;
  -- An unknown poste is refused by the table's check.
  insert into public.artist_budget_posts (budget_id, family, amount_cents)
  select p_budget_id, key, (value #>> '{}')::bigint from jsonb_each(p_posts);
end;
$$;
revoke execute on function public.write_artist_budget_posts(uuid, bigint, jsonb)
  from public, anon, authenticated;

-- Opens the artist's envelope; the open one, if any, is closed the day
-- before (and kept). The direction alone.
create or replace function public.open_artist_budget(
  p_artist_id uuid,
  p_amount_cents bigint,
  p_starts_on date,
  p_ends_on date,
  p_posts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_open public.artist_budgets%rowtype;
  v_id uuid;
begin
  select a.organization_id into v_org from public.artists a
   where a.id = p_artist_id and a.archived_at is null
   for update;
  if v_org is null or not public.has_permission(v_org, 'manage_artist_budgets') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_starts_on is null
     or (p_ends_on is not null and p_ends_on < p_starts_on) then
    raise exception 'invalid_budget' using errcode = '23514';
  end if;

  select * into v_open from public.artist_budgets
   where artist_id = p_artist_id and closed_at is null;
  if found then
    if p_starts_on <= v_open.starts_on then
      raise exception 'budget_starts_before_previous' using errcode = '23514';
    end if;
    update public.artist_budgets
       set closed_at = now(),
           ends_on = least(coalesce(ends_on, p_starts_on - 1), p_starts_on - 1)
     where id = v_open.id;
    insert into public.artist_budget_events
      (organization_id, artist_id, budget_id, kind, actor_person_id, detail)
    values (v_org, p_artist_id, v_open.id, 'closed', public.auth_person_id(),
            public.artist_budget_snapshot(v_open.id));
  elsif exists (select 1 from public.artist_budgets
                 where artist_id = p_artist_id and ends_on >= p_starts_on) then
    raise exception 'budget_starts_before_previous' using errcode = '23514';
  end if;

  insert into public.artist_budgets (organization_id, artist_id, amount_cents, starts_on, ends_on)
  values (v_org, p_artist_id, p_amount_cents, p_starts_on, p_ends_on)
  returning id into v_id;
  perform public.write_artist_budget_posts(v_id, p_amount_cents, coalesce(p_posts, '{}'::jsonb));
  insert into public.artist_budget_events
    (organization_id, artist_id, budget_id, kind, actor_person_id, detail)
  values (v_org, p_artist_id, v_id, 'opened', public.auth_person_id(),
          public.artist_budget_snapshot(v_id));
  return v_id;
end;
$$;
revoke execute on function public.open_artist_budget(uuid, bigint, date, date, jsonb)
  from public, anon;
grant execute on function public.open_artist_budget(uuid, bigint, date, date, jsonb)
  to authenticated;

-- Changes the open envelope (a closed one is history). The direction alone.
create or replace function public.update_artist_budget(
  p_budget_id uuid,
  p_amount_cents bigint,
  p_starts_on date,
  p_ends_on date,
  p_posts jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.artist_budgets%rowtype;
  v_before jsonb;
begin
  select * into v_budget from public.artist_budgets where id = p_budget_id for update;
  if not found or not public.has_permission(v_budget.organization_id, 'manage_artist_budgets') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_budget.closed_at is not null then
    raise exception 'budget_closed' using errcode = 'P0001';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_starts_on is null
     or (p_ends_on is not null and p_ends_on < p_starts_on) then
    raise exception 'invalid_budget' using errcode = '23514';
  end if;
  if exists (select 1 from public.artist_budgets
              where artist_id = v_budget.artist_id and id <> v_budget.id
                and ends_on >= p_starts_on) then
    raise exception 'budget_starts_before_previous' using errcode = '23514';
  end if;

  v_before := public.artist_budget_snapshot(p_budget_id);
  update public.artist_budgets
     set amount_cents = p_amount_cents, starts_on = p_starts_on, ends_on = p_ends_on
   where id = p_budget_id;
  perform public.write_artist_budget_posts(p_budget_id, p_amount_cents,
                                           coalesce(p_posts, '{}'::jsonb));
  if public.artist_budget_snapshot(p_budget_id) is distinct from v_before then
    insert into public.artist_budget_events
      (organization_id, artist_id, budget_id, kind, actor_person_id, detail)
    values (v_budget.organization_id, v_budget.artist_id, p_budget_id, 'changed',
            public.auth_person_id(),
            public.artist_budget_snapshot(p_budget_id) || jsonb_build_object('before', v_before));
  end if;
end;
$$;
revoke execute on function public.update_artist_budget(uuid, bigint, date, date, jsonb)
  from public, anon;
grant execute on function public.update_artist_budget(uuid, bigint, date, date, jsonb)
  to authenticated;

-- 6. An artist with a budget stays --------------------------------------------------

create or replace function public.delete_artist_row(p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.master_artists where artist_id = p_artist_id)
     or exists (select 1 from public.projects where artist_id = p_artist_id)
     or exists (select 1 from public.contracts where artist_id = p_artist_id)
     or exists (select 1 from public.budget_lines where artist_id = p_artist_id)
     or exists (select 1 from public.artist_budgets where artist_id = p_artist_id) then
    raise exception 'artist_in_use';
  end if;
  update public.master_splits set artist_id = null where artist_id = p_artist_id;
  update public.network_contacts set artist_id = null where artist_id = p_artist_id;
  delete from public.artist_contacts where artist_id = p_artist_id;
  delete from public.artist_files where artist_id = p_artist_id;
  delete from public.activity_events where artist_id = p_artist_id;
  delete from public.artists where id = p_artist_id;
end;
$$;
