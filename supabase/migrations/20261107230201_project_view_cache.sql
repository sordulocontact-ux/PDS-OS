-- Page loads audit of 07/11/2026 (docs/ARCHITECTURE.md § 3 bis, « Cache des
-- vues en base »). The server keeps a project's computed views (journeys,
-- workflow states, each module's context) while none of the tables they read
-- changed (lib/projects/version-cache.ts), but only in its own memory: every
-- new server instance (Vercel starts them all the time, a restarted
-- `pnpm dev`) computed every project again. The Accueil then sent 1 688
-- reads for 13 projects (20 s), the Projects list 1 012 (15 s).
--
-- Each view a reader computed is now also kept here, one row per reader,
-- view and project, and read back by a new instance in one request for all
-- the projects of a page. It is served under the very rules of the memory
-- cache: the project's stamps (project_live) are read first and the row is
-- served only while none of the tables it read changed; `reader` is a hash
-- of who reads (account, position, permissions) and the day in Paris, so a
-- change of permissions or a new day never serves an older row.
--
-- A row holds what its reader already read under their own RLS: only that
-- reader may read or write it (account_id = auth.uid()). Writing it must
-- never bump the project (it is no data of the project): the column is
-- `project`, not `project_id`, and attach_project_live leaves the table out.

create table if not exists public.project_view_cache (
  account_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  view text not null check (char_length(view) between 1 and 80),
  project uuid not null references public.projects (id) on delete cascade,
  reader text not null check (char_length(reader) = 64),
  computed_at timestamptz not null,
  seen jsonb not null,
  deps text[] not null default '{}',
  tables jsonb not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, view, project)
);

create index if not exists project_view_cache_project_idx
  on public.project_view_cache (project);

alter table public.project_view_cache enable row level security;
alter table public.project_view_cache force row level security;

drop policy if exists project_view_cache_own_select on public.project_view_cache;
create policy project_view_cache_own_select on public.project_view_cache
  for select to authenticated
  using (account_id = (select auth.uid()));

drop policy if exists project_view_cache_own_insert on public.project_view_cache;
create policy project_view_cache_own_insert on public.project_view_cache
  for insert to authenticated
  with check (account_id = (select auth.uid()));

drop policy if exists project_view_cache_own_update on public.project_view_cache;
create policy project_view_cache_own_update on public.project_view_cache
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

drop policy if exists project_view_cache_own_delete on public.project_view_cache;
create policy project_view_cache_own_delete on public.project_view_cache
  for delete to authenticated
  using (account_id = (select auth.uid()));

revoke all on public.project_view_cache from public, anon;
grant select, insert, update, delete on public.project_view_cache to authenticated;

-- Never a project's data: its writes do not bump project_live (a kept view
-- would otherwise make every view of the project out of date).
create or replace function public.attach_project_live()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  t record;
  v_count integer := 0;
begin
  for t in
    select c.relname as tbl,
      case
        when c.relname = 'projects' then 'self'
        when c.relname = 'masters' then 'master_self'
        when cols.names @> array['project_id'] then 'project'
        when cols.names @> array['project_stage_id'] then 'stage'
        when cols.names @> array['call_id'] then 'call'
        when cols.names @> array['master_id'] then 'master'
      end as mode
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral (
      select array_agg(a.attname::text) as names from pg_attribute a
       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    ) cols
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('project_live', 'notifications',
                            'call_recording_takes', 'call_recording_pieces',
                            'project_view_cache', 'live_function_maps')
      and not exists (
        select 1 from pg_trigger tg
         where tg.tgrelid = c.oid and tg.tgname = 'zz_project_live')
  loop
    continue when t.mode is null;
    execute format(
      'create trigger zz_project_live after insert or update or delete on public.%I '
      'for each row execute function public.project_live_tick(%L)', t.tbl, t.mode);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.attach_project_live() from public, anon, authenticated;
