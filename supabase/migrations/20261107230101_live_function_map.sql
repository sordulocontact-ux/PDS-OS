-- Page loads audit of 07/11/2026 (docs/ARCHITECTURE.md § 3 bis, « Cache par
-- table »). The server keeps a computed view of a project while none of the
-- tables it read changed; for a function it calls, it asked the database
-- which tables the function reads (live_rpc_reads, 20261028000201). That
-- question read and scanned with regular expressions the body of every
-- function of the schema, recursively, at each call: 6 to 12 s on the first
-- call of a connection on the pre-production database, up to 10.9 s locally
-- under load, called 120 times in one session, and the most expensive query
-- of the database since 04/11 (628 s). While it ran, no answer of the
-- request cache was served.
--
-- live_function_map() now answers in one read, for every function of the
-- schema at once:
--   fns.<name>  = { t: tables and views it names, c: functions it calls,
--                   ro: read-only (STABLE or IMMUTABLE, every overload) }
--   views.<v>   = the tables a view reads (pg_depend), so a function or a
--                 request reading a view depends on its tables
-- The server follows the calls itself (lib/projects/function-map.ts). The
-- map is computed once and kept in live_function_maps, with a signature of
-- the schema's functions (how many, and the newest row version of pg_proc):
-- a migration that creates, replaces or drops a function changes it, and
-- the next call computes the map again, once. `p_known`: the signature the
-- caller already holds; the map is then not sent again.

create table if not exists public.live_function_maps (
  id boolean primary key default true check (id),
  signature text not null,
  map jsonb not null,
  computed_at timestamptz not null default now()
);
alter table public.live_function_maps enable row level security;
alter table public.live_function_maps force row level security;
-- Read and written only by live_function_map() (security definer).
revoke all on public.live_function_maps from public, anon, authenticated;

create or replace function public.live_function_map(p_known text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_signature text;
  v_kept public.live_function_maps%rowtype;
  v_map jsonb;
begin
  select count(*)::text || ':' || coalesce(max(p.xmin::text::bigint), 0)::text
    into v_signature
    from pg_catalog.pg_proc p
   where p.pronamespace = 'public'::regnamespace;

  if p_known is not null and p_known = v_signature then
    return jsonb_build_object('signature', v_signature);
  end if;

  select * into v_kept from public.live_function_maps where id;
  if found and v_kept.signature = v_signature then
    return jsonb_build_object('signature', v_signature, 'map', v_kept.map);
  end if;

  -- One computation at a time; whoever waited reads its result.
  perform pg_catalog.pg_advisory_xact_lock(hashtext('live_function_map'));
  select * into v_kept from public.live_function_maps where id;
  if found and v_kept.signature = v_signature then
    return jsonb_build_object('signature', v_signature, 'map', v_kept.map);
  end if;

  with
  fns as (
    select p.proname::text as name,
           bool_and(p.provolatile in ('s', 'i')) as ro,
           string_agg(p.prosrc, E'\n') as src
      from pg_catalog.pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
     group by p.proname
  ),
  rels as (
    select c.relname::text as name
      from pg_catalog.pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'v', 'm', 'p')
  ),
  named as (
    select f.name, m[1] as ref
      from fns f
      cross join lateral regexp_matches(f.src, 'public\."?([a-z_][a-z0-9_]*)', 'g') m
     group by f.name, m[1]
  ),
  called as (
    select f.name, m[1] as ref
      from fns f
      cross join lateral regexp_matches(f.src, 'public\."?([a-z_][a-z0-9_]*)"?\s*\(', 'g') m
     group by f.name, m[1]
  ),
  per_fn as (
    select f.name, f.ro,
           coalesce((select jsonb_agg(n.ref order by n.ref) from named n
                      join rels r on r.name = n.ref where n.name = f.name),
                    '[]'::jsonb) as t,
           coalesce((select jsonb_agg(c.ref order by c.ref) from called c
                      join fns g on g.name = c.ref
                     where c.name = f.name and c.ref <> f.name),
                    '[]'::jsonb) as c
      from fns f
  ),
  view_tables as (
    select v.relname::text as view, t.relname::text as tbl
      from pg_catalog.pg_class v
      join pg_catalog.pg_rewrite rw on rw.ev_class = v.oid
      join pg_catalog.pg_depend d on d.objid = rw.oid and d.classid = 'pg_catalog.pg_rewrite'::regclass
      join pg_catalog.pg_class t on t.oid = d.refobjid
     where v.relnamespace = 'public'::regnamespace and v.relkind in ('v', 'm')
       and t.relnamespace = 'public'::regnamespace and t.relkind in ('r', 'p')
       and t.oid <> v.oid
     group by v.relname, t.relname
  )
  select jsonb_build_object(
           'fns', coalesce((select jsonb_object_agg(name,
                     jsonb_build_object('t', t, 'c', c, 'ro', ro)) from per_fn), '{}'::jsonb),
           'views', coalesce((select jsonb_object_agg(view, tbls) from (
                     select view, jsonb_agg(tbl order by tbl) as tbls
                       from view_tables group by view) s), '{}'::jsonb))
    into v_map;

  insert into public.live_function_maps (id, signature, map, computed_at)
  values (true, v_signature, v_map, now())
  on conflict (id) do update
    set signature = excluded.signature, map = excluded.map,
        computed_at = excluded.computed_at;

  return jsonb_build_object('signature', v_signature, 'map', v_map);
end;
$$;
revoke execute on function public.live_function_map(text) from public, anon;
grant execute on function public.live_function_map(text) to authenticated;
