-- Page loads audit of 28/10/2026 (docs/ARCHITECTURE.md § 3 bis, « Cache par
-- table »): project_live.version is the version of the whole project, so any
-- write (a constraint of the Cadrage) made the server compute every
-- workflow's journey and state again: 263 requests for the next page, 4 s on
-- a busy database. Each project now also says, per table, the version at
-- which that table last changed (`tables`, { "<table>": <version> }). The
-- server keeps each computed view with the tables it read
-- (lib/projects/version-cache.ts): a view is computed again only when one of
-- them changed.
--
-- 1. project_live.tables, stamped by project_live_bump with the table that
--    changed. Still one version and one Realtime signal per project and
--    transaction; a second table written in the same transaction is stamped
--    at that same version.
-- 2. live_rpc_tables(): the tables each function reads, itself and through
--    the functions it calls, from their bodies (every function has
--    `search_path = ''`, so every table is written `public.<name>`). A
--    function's reads are what the server records when a view calls it.

alter table public.project_live
  add column if not exists tables jsonb not null default '{}'::jsonb;

create or replace function public.project_live_bump(
  p_project_id uuid,
  p_table text default null,
  p_bump boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version bigint;
  v_changed_by uuid;
begin
  if not p_bump then
    -- Another table of the same transaction: stamped at the version the
    -- first one already took, no new version, no new signal.
    update public.project_live l
       set tables = l.tables || case when p_table is null then '{}'::jsonb
                                     else jsonb_build_object(p_table, l.version) end
     where l.project_id = p_project_id;
    return;
  end if;

  insert into public.project_live (project_id, organization_id, changed_by, tables)
  select p.id, p.organization_id, auth.uid(),
         case when p_table is null then '{}'::jsonb
              else jsonb_build_object(p_table, 1) end
    from public.projects p where p.id = p_project_id
  on conflict (project_id) do update
    set version = public.project_live.version + 1,
        changed_at = now(),
        changed_by = excluded.changed_by,
        tables = public.project_live.tables
          || case when p_table is null then '{}'::jsonb
                  else jsonb_build_object(p_table, public.project_live.version + 1) end
  returning version, changed_by into v_version, v_changed_by;
  -- A project being deleted (its row already gone) sends nothing.
  if v_version is not null then
    perform realtime.send(
      jsonb_build_object('version', v_version, 'changed_by', v_changed_by),
      'changed', 'project:' || p_project_id::text, true);
  end if;
end;
$$;
revoke execute on function public.project_live_bump(uuid, text, boolean)
  from public, anon, authenticated;

-- The former signature, kept for any caller outside the trigger.
drop function if exists public.project_live_bump(uuid);

create or replace function public.project_live_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_projects uuid[];
  v_project uuid;
  v_done text := coalesce(current_setting('pds.live_bumped', true), '');
  v_key text;
begin
  case tg_argv[0]
    when 'project' then
      v_project := (v_row ->> 'project_id')::uuid;
      if v_project is null and v_row ? 'contract_id' then
        select c.project_id into v_project from public.contracts c
         where c.id = (v_row ->> 'contract_id')::uuid;
      end if;
      v_projects := array[v_project];
    when 'self' then
      v_projects := array[(v_row ->> 'id')::uuid];
    when 'stage' then
      select array_agg(s.project_id) into v_projects from public.project_stages s
       where s.id = (v_row ->> 'project_stage_id')::uuid;
    when 'call' then
      select array_agg(c.project_id) into v_projects from public.calls c
       where c.id = (v_row ->> 'call_id')::uuid;
    when 'master' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'master_id')::uuid;
    when 'master_self' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'id')::uuid;
    when 'clearance' then
      select array_agg(c.project_id) into v_projects from public.legal_clearances c
       where c.id = (v_row ->> 'clearance_id')::uuid;
    when 'formality' then
      select array_agg(f.project_id) into v_projects from public.legal_formalities f
       where f.id = (v_row ->> 'formality_id')::uuid;
    when 'split_sheet' then
      select array_agg(s.project_id) into v_projects from public.legal_split_sheets s
       where s.id = (v_row ->> 'sheet_id')::uuid;
    when 'split_version' then
      select array_agg(s.project_id) into v_projects
        from public.legal_split_versions v
        join public.legal_split_sheets s on s.id = v.sheet_id
       where v.id = (v_row ->> 'version_id')::uuid;
    when 'contract' then
      select array_agg(c.project_id) into v_projects from public.contracts c
       where c.id = (v_row ->> 'contract_id')::uuid;
    else
      v_projects := null;
  end case;

  -- One version per project and transaction (`<project>,`), each table of
  -- it stamped once (`<project>:<table>,`).
  foreach v_project in array coalesce(v_projects, array[]::uuid[]) loop
    continue when v_project is null;
    v_key := v_project::text || ':' || tg_table_name || ',';
    continue when position(v_key in v_done) > 0;
    perform public.project_live_bump(
      v_project, tg_table_name::text,
      position(v_project::text || ',' in v_done) = 0);
    v_done := v_done || v_project::text || ',' || v_key;
    perform set_config('pds.live_bumped', v_done, true);
  end loop;
  return null;
end;
$$;
revoke execute on function public.project_live_tick() from public, anon, authenticated;

-- The tables the given functions read, directly or through the functions
-- they call: { "<function>": ["<table>", …] }. Asked by each server
-- instance for the functions its views call, once; nothing secret (names
-- only, which pg_proc already shows to every role).
create or replace function public.live_rpc_tables(p_names text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  with recursive
  fns as (
    select p.proname::text as name, p.prosrc
      from pg_catalog.pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  ),
  -- (root, function reached from it), following the calls.
  reach (root, name) as (
    select n collate "C", n collate "C" from unnest(p_names) n
    union
    select r.root, m[1] collate "C"
      from reach r
      join fns f on f.name = r.name
      cross join lateral regexp_matches(f.prosrc, 'public\."?([a-z_][a-z0-9_]*)\s*\(', 'g') m
     where exists (select 1 from fns g where g.name = m[1])
  ),
  reads as (
    select distinct r.root, m[1] as tbl
      from reach r
      join fns f on f.name = r.name
      cross join lateral regexp_matches(f.prosrc, 'public\."?([a-z_][a-z0-9_]*)', 'g') m
      join pg_catalog.pg_class c
        on c.relname = m[1] and c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'v', 'm')
  )
  select coalesce(jsonb_object_agg(n, coalesce(
           (select jsonb_agg(r.tbl order by r.tbl) from reads r where r.root = n),
           '[]'::jsonb)), '{}'::jsonb)
    from unnest(p_names) n
   where exists (select 1 from fns f where f.name = n);
$$;
grant execute on function public.live_rpc_tables(text[]) to authenticated;
