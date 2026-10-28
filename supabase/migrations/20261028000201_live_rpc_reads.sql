-- Page loads audit of 28/10/2026, follow-up of 20261028000101: the server
-- now also keeps the answer of each read a computed view sends, with the
-- tables it read (lib/projects/request-cache.ts). A function's answer may
-- only be kept when the function cannot write: live_rpc_reads() says, for
-- each function asked, the tables it reads (as live_rpc_tables did) and
-- whether it is read-only (STABLE or IMMUTABLE).

create or replace function public.live_rpc_reads(p_names text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  with fns as (
    select f.proname::text as name,
           bool_and(f.provolatile in ('s', 'i')) as read_only
      from pg_catalog.pg_proc f
     where f.pronamespace = 'public'::regnamespace and f.prokind = 'f'
       and f.proname = any(p_names)
     group by f.proname
  ),
  tables as (
    select public.live_rpc_tables(array(select name from fns)) as map
  )
  select coalesce(jsonb_object_agg(fns.name, jsonb_build_object(
           'tables', coalesce(tables.map -> fns.name, '[]'::jsonb),
           'readOnly', fns.read_only)), '{}'::jsonb)
    from fns cross join tables;
$$;
grant execute on function public.live_rpc_reads(text[]) to authenticated;
