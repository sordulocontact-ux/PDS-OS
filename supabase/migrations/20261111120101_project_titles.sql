-- Projet collectif, lot 2 (docs/pds-mic-plan.md § 3, décisions 3 et 8; § 8,
-- lot 2): the titles of a collective project.
--
--   1. project_titles: a title of the collective, possibly before it has a
--      name (working_title null, said « Titre 3 · sans nom » by the code) or
--      a master in the Catalogue (master_id null). Its master goes through
--      the project's link (project_masters), on delete restrict: the link
--      its Master history cascades from (mix versions, confirmed sources,
--      deliverables received) can no longer be removed.
--   2. A collective only: every link of the project has its title (sync
--      trigger; the projects already collective are filled here, and a
--      project that becomes one is filled then). A title is added after the
--      launch too (add_project_title: adding only), never removed: it is
--      abandoned (reason required) and reactivated.
--   3. Abandoning changes the title's status, and its maquette's status when
--      its master is a maquette in draft or in development (that status kept
--      for the reactivation). A validated maquette is never touched: only the
--      title is abandoned (décision 8, 11/11/2026). Nothing else moves:
--      project_masters, Master versions, splits, legal, contracts stay as
--      they are, and the reactivation finds them again.
--   4. project_title_events: the history (added, renamed, abandoned with its
--      reason, reactivated), append only, read in the project's Activité.
--   5. update_project keeps a collective's titles (a title is abandoned, not
--      unlinked); delete_project_row empties both tables before the project.
--   6. Both tables stamp their project (zz_project_live), like every table of
--      a project: the page caches and the open pages follow their changes.
--
-- Any other project: no title row, nothing changes (rules above all start
-- from projects.collective).

-- 1. The titles -------------------------------------------------------------

create table public.project_titles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- Its number in the project (« Titre 3 »), kept when it is abandoned.
  position integer not null,
  -- Null: no name yet; the master's title is shown when there is one.
  working_title text,
  -- Null until the title exists in the Catalogue (voie A, décision 3: lot 7).
  master_id uuid,
  -- A human decision; where the title stands is computed by the code.
  status text not null default 'planned',
  abandoned_at timestamptz,
  abandoned_by uuid references public.people (id),
  abandon_reason text,
  -- The maquette's status when the abandonment turned it « abandonnée »
  -- (draft or developing only), restored when the title is reactivated; null
  -- when the abandonment left the master as it was (no maquette, validated,
  -- already abandoned).
  demo_status_before_abandon text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_titles_status_check
    check (status in ('planned', 'active', 'abandoned')),
  constraint project_titles_position_positive check (position >= 1),
  constraint project_titles_position_unique unique (project_id, position),
  constraint project_titles_master_unique unique (project_id, master_id),
  constraint project_titles_working_title_check
    check (working_title is null
           or (btrim(working_title) <> '' and char_length(working_title) <= 200)),
  -- Abandoned: when, by whom, why; otherwise none of it (the history keeps
  -- the former abandonments).
  constraint project_titles_abandon_check check (
    case when status = 'abandoned'
         then abandoned_at is not null and abandoned_by is not null
              and abandon_reason is not null and btrim(abandon_reason) <> ''
              and char_length(abandon_reason) <= 2000
         else abandoned_at is null and abandoned_by is null and abandon_reason is null
              and demo_status_before_abandon is null
    end),
  constraint project_titles_demo_status_check
    check (demo_status_before_abandon is null
           or demo_status_before_abandon in ('draft', 'developing')),
  constraint project_titles_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  -- The title's master is one the project links. Restrict: deleting the link
  -- would take the title's Master versions with it (cascade), so it is
  -- refused while the title holds it. Deferrable only so that a title and
  -- its link are written in either order within add_project_title; the
  -- restriction on delete is never deferred.
  constraint project_titles_link
    foreign key (project_id, master_id) references public.project_masters (project_id, master_id)
    on delete restrict
    deferrable initially immediate
);

create index project_titles_master_idx on public.project_titles (master_id)
  where master_id is not null;

comment on table public.project_titles is
  'Titles of a collective project (docs/pds-mic-plan.md § 3): working title, master once in the Catalogue, planned / active / abandoned. Written through add/rename/abandon/reactivate_project_title only.';

create trigger a_set_updated_at before update on public.project_titles
  for each row execute function public.set_updated_at();

-- A collective only, whoever writes.
create or replace function public.project_titles_check_collective()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.projects p
                  where p.id = new.project_id and p.collective) then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.project_titles_check_collective() from public, anon, authenticated;

create trigger a_check_collective before insert on public.project_titles
  for each row execute function public.project_titles_check_collective();

-- Read by whoever sees the project; written by the functions below only.
alter table public.project_titles enable row level security;
alter table public.project_titles force row level security;
revoke all on table public.project_titles from anon, authenticated;
grant select on table public.project_titles to authenticated;
-- Visibility computed once per statement (20261026000101_visible_project_ids).
create policy project_titles_select on public.project_titles
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

-- 4. The history (declared here: the functions below write it) ---------------

create table public.project_title_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title_id uuid not null references public.project_titles (id) on delete cascade,
  kind text not null,
  -- What to display, copied at the time: position, working_title,
  -- master_title; plus from / to (renamed), reason (abandoned), demo_status.
  detail jsonb not null default '{}'::jsonb,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  -- Insertion order: the events of one transaction share created_at.
  seq bigint generated always as identity,
  constraint project_title_events_kind_check
    check (kind in ('added', 'renamed', 'abandoned', 'reactivated')),
  constraint project_title_events_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index project_title_events_project_idx
  on public.project_title_events (project_id, created_at desc, seq desc);
create index project_title_events_title_idx on public.project_title_events (title_id);

alter table public.project_title_events enable row level security;
alter table public.project_title_events force row level security;
revoke all on table public.project_title_events from anon, authenticated;
grant select on table public.project_title_events to authenticated;
create policy project_title_events_select on public.project_title_events
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

-- Both tables stamp their project (project_live: the page caches, the open
-- pages of the project; docs/ARCHITECTURE.md § 3 bis, « Cache par table »).
-- Put here by name rather than by attach_project_live(), which would also
-- attach it to personal_tasks (20261108100101, left without it): not this
-- lot's decision.
create trigger zz_project_live after insert or update or delete on public.project_titles
  for each row execute function public.project_live_tick('project');
create trigger zz_project_live after insert or update or delete on public.project_title_events
  for each row execute function public.project_live_tick('project');

-- What an event says of its title, at the time.
create or replace function public.project_title_snapshot(p_title_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'position', t.position,
           'working_title', t.working_title,
           'master_title', m.title)
    from public.project_titles t
    left join public.masters m on m.id = t.master_id
   where t.id = p_title_id;
$$;
revoke execute on function public.project_title_snapshot(uuid) from public, anon, authenticated;

create or replace function public.log_project_title_event(
  p_title_id uuid,
  p_kind text,
  p_detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.project_title_events
    (organization_id, project_id, title_id, kind, detail, actor_person_id)
  select t.organization_id, t.project_id, t.id, p_kind,
         public.project_title_snapshot(t.id) || coalesce(p_detail, '{}'::jsonb),
         public.auth_person_id()
    from public.project_titles t
   where t.id = p_title_id;
$$;
revoke execute on function public.log_project_title_event(uuid, text, jsonb) from public, anon, authenticated;

-- 2. Every link of a collective has its title ----------------------------------

-- The links of a project without a title get one, active, numbered after the
-- titles it already has, in link order. Returns the titles created.
create or replace function public.fill_project_titles(p_project_id uuid)
returns setof uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.project_titles (organization_id, project_id, position, master_id, status, created_by)
  select pm.organization_id, pm.project_id,
         (select coalesce(max(t.position), 0) from public.project_titles t
           where t.project_id = p_project_id)
           + row_number() over (order by pm.position, pm.created_at, pm.master_id)::integer,
         pm.master_id, 'active', public.auth_person_id()
    from public.project_masters pm
    join public.projects p on p.id = pm.project_id and p.collective
   where pm.project_id = p_project_id
     and not exists (select 1 from public.project_titles t
                      where t.project_id = pm.project_id and t.master_id = pm.master_id)
  returning id;
$$;
revoke execute on function public.fill_project_titles(uuid) from public, anon, authenticated;

-- A master linked to a collective by any path (update_project, a direct
-- insert before launch…) becomes one of its titles. add_project_title writes
-- its title first: nothing to do then.
create or replace function public.project_masters_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title uuid;
begin
  -- One numbering at a time per project.
  perform 1 from public.projects p where p.id = new.project_id and p.collective for update;
  if not found then
    return null;
  end if;
  for v_title in select * from public.fill_project_titles(new.project_id) loop
    perform public.log_project_title_event(v_title, 'added', '{"source": "link"}'::jsonb);
  end loop;
  return null;
end;
$$;
revoke execute on function public.project_masters_title() from public, anon, authenticated;

create trigger b_title after insert on public.project_masters
  for each row execute function public.project_masters_title();

-- A project that becomes collective (by hand for now: no column grant): its
-- links become its titles, as they were.
create or replace function public.projects_collective_titles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.collective and not old.collective then
    perform public.fill_project_titles(new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.projects_collective_titles() from public, anon, authenticated;

create trigger z_collective_titles after update of collective on public.projects
  for each row execute function public.projects_collective_titles();

-- The projects already collective (lot 1): no history line, they were there.
select public.fill_project_titles(p.id) from public.projects p where p.collective;

-- 3. Gestures ---------------------------------------------------------------------

-- Who writes a collective's titles: its owner once launched, whoever creates
-- projects before (same rule as set_project_main_artist, lot 1). Locks the
-- project row: positions are numbered one gesture at a time.
create or replace function public.lock_project_titles(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  if v_project.archived_at is not null
     or not (public.is_project_owner(p_project_id)
             or (public.has_permission(v_project.organization_id, 'create_projects')
                 and not public.is_project_launched(p_project_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  return v_project;
end;
$$;
revoke execute on function public.lock_project_titles(uuid) from public, anon, authenticated;

-- The title, locked, once its project is (rights checked there).
create or replace function public.lock_project_title(p_title_id uuid)
returns public.project_titles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_title public.project_titles%rowtype;
begin
  select project_id into v_project_id from public.project_titles where id = p_title_id;
  if v_project_id is null or not public.can_see_project(v_project_id) then
    raise exception 'title_not_found' using errcode = 'P0002';
  end if;
  perform public.lock_project_titles(v_project_id);
  select * into v_title from public.project_titles where id = p_title_id for update;
  return v_title;
end;
$$;
revoke execute on function public.lock_project_title(uuid) from public, anon, authenticated;

create or replace function public.clean_title_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(p_name), '');
begin
  if char_length(v_name) > 200 then
    raise exception 'working_title_too_long' using errcode = '22023';
  end if;
  return v_name;
end;
$$;
revoke execute on function public.clean_title_name(text) from public, anon, authenticated;

-- « Ajouter un titre »: with a working title or none (« sans nom »), with a
-- master of the Catalogue or none yet. Before or after the launch: adding
-- only. A title with a master is active; without, planned. Its master is
-- linked to the project (same shape rules as at creation: a single keeps
-- one master).
create or replace function public.add_project_title(
  p_project_id uuid,
  p_working_title text default null,
  p_master_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_name text := public.clean_title_name(p_working_title);
  v_linked boolean;
  v_id uuid;
begin
  v_project := public.lock_project_titles(p_project_id);
  if p_master_id is not null then
    if not exists (select 1 from public.masters m
                    where m.id = p_master_id
                      and m.organization_id = v_project.organization_id
                      and m.archived_at is null) then
      raise exception 'master_not_found' using errcode = '23503';
    end if;
    if exists (select 1 from public.project_titles t
                where t.project_id = p_project_id and t.master_id = p_master_id) then
      raise exception 'title_already_in_project' using errcode = '23505';
    end if;
    v_linked := exists (select 1 from public.project_masters pm
                         where pm.project_id = p_project_id and pm.master_id = p_master_id);
    if not v_linked then
      perform public.check_project_shape(
        v_project.type,
        array(select pm.master_id from public.project_masters pm
               where pm.project_id = p_project_id) || p_master_id,
        v_project.music_format);
    end if;
  end if;

  -- The title first, then its link (the trigger then finds it): the link's
  -- check waits for both, within this call only.
  set constraints public.project_titles_link deferred;
  insert into public.project_titles
    (organization_id, project_id, position, working_title, master_id, status, created_by)
  values (v_project.organization_id, p_project_id,
          (select coalesce(max(t.position), 0) + 1 from public.project_titles t
            where t.project_id = p_project_id),
          v_name, p_master_id,
          case when p_master_id is null then 'planned' else 'active' end,
          public.auth_person_id())
  returning id into v_id;
  if p_master_id is not null and not v_linked then
    insert into public.project_masters (organization_id, project_id, master_id, position)
    values (v_project.organization_id, p_project_id, p_master_id,
            (select coalesce(max(pm.position), 0) + 1 from public.project_masters pm
              where pm.project_id = p_project_id));
  end if;
  set constraints public.project_titles_link immediate;

  perform public.log_project_title_event(v_id, 'added');
  return v_id;
end;
$$;
revoke execute on function public.add_project_title(uuid, text, uuid) from public, anon;
grant execute on function public.add_project_title(uuid, text, uuid) to authenticated;

-- « Renommer »: the working title (null or blank = back to « sans nom », or
-- to the master's title). An abandoned title is not edited: reactivate it.
create or replace function public.rename_project_title(
  p_title_id uuid,
  p_working_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_name text := public.clean_title_name(p_working_title);
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_name is not distinct from v_title.working_title then
    return;
  end if;
  update public.project_titles set working_title = v_name where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'renamed',
    jsonb_build_object('from', v_title.working_title, 'to', v_name));
end;
$$;
revoke execute on function public.rename_project_title(uuid, text) from public, anon;
grant execute on function public.rename_project_title(uuid, text) to authenticated;

-- « Abandonner »: the reason is required. The master stays in the Catalogue;
-- a maquette in draft or in development becomes « abandonnée ». A validated
-- maquette keeps its status (an artistic decision, never undone by a
-- project), and a promoted master is not a maquette any more: both are left
-- as they are, only the title is abandoned (décision 8). Nothing else is
-- touched.
create or replace function public.abandon_project_title(
  p_title_id uuid,
  p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_current text;
  -- The maquette's status this abandonment changes, if it changes one.
  v_demo text;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;
  if v_title.master_id is not null then
    select m.demo_status into v_current from public.masters m
     where m.id = v_title.master_id and m.archived_at is null
       for update;
    if v_current in ('draft', 'developing') then
      update public.masters set demo_status = 'abandoned' where id = v_title.master_id;
      v_demo := v_current;
    end if;
  end if;
  update public.project_titles
     set status = 'abandoned',
         abandoned_at = now(),
         abandoned_by = public.auth_person_id(),
         abandon_reason = v_reason,
         demo_status_before_abandon = v_demo
   where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'abandoned',
    jsonb_build_object('reason', v_reason, 'demo_status', v_demo));
end;
$$;
revoke execute on function public.abandon_project_title(uuid, text) from public, anon;
grant execute on function public.abandon_project_title(uuid, text) to authenticated;

-- « Réactiver »: the title comes back as it was (active with a master,
-- planned without). A maquette its abandonment turned « abandonnée » goes
-- back to draft or development, if nobody has changed it since; a maquette
-- the abandonment left alone (validated…) is left alone again. Everything
-- the title held was kept.
create or replace function public.reactivate_project_title(p_title_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_restored text;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status <> 'abandoned' then
    raise exception 'title_not_abandoned' using errcode = 'P0001';
  end if;
  if v_title.master_id is not null and v_title.demo_status_before_abandon is not null then
    update public.masters
       set demo_status = v_title.demo_status_before_abandon
     where id = v_title.master_id
       and demo_status = 'abandoned'
       and archived_at is null
    returning demo_status into v_restored;
  end if;
  update public.project_titles
     set status = case when master_id is null then 'planned' else 'active' end,
         abandoned_at = null,
         abandoned_by = null,
         abandon_reason = null,
         demo_status_before_abandon = null
   where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'reactivated',
    jsonb_build_object('demo_status', v_restored));
end;
$$;
revoke execute on function public.reactivate_project_title(uuid) from public, anon;
grant execute on function public.reactivate_project_title(uuid) to authenticated;

-- 5. update_project keeps a collective's titles ----------------------------------

-- Unchanged for any other project (20260927011001). A collective's links are
-- its titles: those the form leaves out are refused (abandon the title
-- instead), a content collective keeps them although the form has no list,
-- new ones are added after them (and become titles through the trigger).
create or replace function public.update_project(
  p_project_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_artist_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_current_type text;
  v_collective boolean;
  v_requested uuid[];
  v_kept uuid[];
  v_ids uuid[] := p_master_ids;
begin
  select type, collective into v_current_type, v_collective
    from public.projects where id = p_project_id;
  -- An existing event stays one; no project becomes an event in V1.
  if p_type = 'event' and v_current_type is distinct from 'event' then
    raise exception 'project_type_unavailable';
  end if;
  if coalesce(v_collective, false) then
    v_requested := case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                        else '{}'::uuid[] end;
    v_kept := array(select t.master_id from public.project_titles t
                     where t.project_id = p_project_id and t.master_id is not null
                     order by t.position);
    if p_type = 'music_release'
       and exists (select 1 from unnest(v_kept) k where not (k = any (v_requested))) then
      raise exception 'collective_title_kept' using errcode = 'P0001';
    end if;
    v_ids := v_requested || array(select k from unnest(v_kept) k where not (k = any (v_requested)));
  end if;
  perform public.check_project_shape(p_type, v_ids, p_music_format);

  update public.projects
     set title = btrim(p_title),
         type = p_type,
         due_date = p_due_date,
         budget_cents = p_budget_cents,
         priority = p_priority,
         initial_context = nullif(btrim(p_initial_context), ''),
         music_format = case when p_type = 'music_release' then p_music_format end,
         content_format_id = case when p_type = 'content' then p_content_format_id end,
         -- A project from before the catalogue keeps the artist it was made with.
         artist_id = case when p_type = 'content' then p_artist_id else artist_id end
   where id = p_project_id
  returning organization_id into v_org;

  -- RLS filtered the row out: launched, invisible, or no right.
  if v_org is null then
    raise exception 'project_not_editable';
  end if;

  if v_collective then
    delete from public.project_masters pm
     where pm.project_id = p_project_id and not (pm.master_id = any (v_ids));
    insert into public.project_masters (organization_id, project_id, master_id, position)
    select v_org, p_project_id, m.id,
           (select coalesce(max(pm.position), 0) from public.project_masters pm
             where pm.project_id = p_project_id)
             + row_number() over (order by m.first_seen)::integer
    from (
      select u.id, min(u.ordinality) as first_seen
      from unnest(v_ids) with ordinality as u (id, ordinality)
      group by u.id
    ) m
    where not exists (select 1 from public.project_masters pm
                       where pm.project_id = p_project_id and pm.master_id = m.id);
    return;
  end if;

  delete from public.project_masters where project_id = p_project_id;
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select v_org, p_project_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;
end;
$$;

-- 5. delete_project_row: the titles before the links they hold ------------------

-- Unchanged from 20261019110101 but for the two lines « Projet collectif ».
create or replace function public.delete_project_row(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls where project_id = p_project_id;
  select coalesce(array_agg(id), '{}') into v_contracts
    from public.contracts where project_id = p_project_id;

  -- Tables of the abandoned "Cadrage intelligent" branch (04/10/2026), not
  -- created by these migrations but still present in some local databases:
  -- emptied for the project when they exist, children first.
  foreach v_table in array array['master_versions', 'master_workflows', 'brief_change_requests',
                                 'brief_versions'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where project_id = $1', v_table) using p_project_id;
    end if;
  end loop;

  -- Cadrage intelligent (20261006000101, 20261006000201): the plan names the
  -- brief (its items cascade), a deadline names a report item, a brief names
  -- its validation, so they go before those. framing_calls cascades with calls.
  delete from public.project_plans where project_id = p_project_id;
  delete from public.framing_deadlines where project_id = p_project_id;
  delete from public.framing_briefs where project_id = p_project_id;

  -- Children before parents: a NO ACTION key is checked after each
  -- statement. ON DELETE CASCADE children are left to their parent.
  delete from public.activity_events where project_id = p_project_id;
  delete from public.tasks where project_id = p_project_id;
  delete from public.budget_lines where project_id = p_project_id;
  delete from public.design_versions where project_id = p_project_id;
  delete from public.milestones where project_id = p_project_id;
  delete from public.strategy_deliverables where project_id = p_project_id;
  delete from public.levers where project_id = p_project_id;
  delete from public.needs where project_id = p_project_id;
  delete from public.field_values where project_id = p_project_id;
  delete from public.framing_constraints where project_id = p_project_id;
  delete from public.open_points where project_id = p_project_id;
  delete from public.project_team_members where project_id = p_project_id;

  delete from public.report_items
   where report_id in (select id from public.call_reports where call_id = any (v_calls));
  delete from public.call_reports where call_id = any (v_calls);
  delete from public.transcripts where call_id = any (v_calls);
  delete from public.calls where id = any (v_calls);

  delete from public.validations
   where project_stage_id in (select id from public.project_stages
                               where project_id = p_project_id);
  delete from public.project_stages where project_id = p_project_id;

  delete from public.legal_clearances where project_id = p_project_id;
  delete from public.legal_facts where project_id = p_project_id;
  delete from public.legal_answers where project_id = p_project_id;
  delete from public.legal_intakes where project_id = p_project_id;
  delete from public.legal_plan_events where project_id = p_project_id;
  delete from public.legal_plan_items where project_id = p_project_id;
  delete from public.legal_plans where project_id = p_project_id;
  delete from public.legal_form_submissions where project_id = p_project_id;
  delete from public.legal_forms where project_id = p_project_id;
  delete from public.legal_agreement_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.legal_split_sheets where project_id = p_project_id;
  delete from public.legal_formalities where project_id = p_project_id;

  delete from public.legal_clearance_contracts where contract_id = any (v_contracts);
  delete from public.financial_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contract_files where contract_id = any (v_contracts);
  delete from public.contract_events
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contracts where id = any (v_contracts);

  delete from public.project_files where project_id = p_project_id;
  delete from public.releases where project_id = p_project_id;
  delete from public.share_links where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
  -- Projet collectif (20261111120101): the titles hold their links
  -- (on delete restrict), so they go before the cascade takes the links.
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
