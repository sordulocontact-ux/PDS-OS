-- pg_health.sql — diagnostic Postgres en une passe (PG 14+ ; certains champs PG 16+/18+).
-- Colle dans psql / l'éditeur SQL Supabase. Chaque bloc est indépendant.
-- Lecture seule. Les blocs pg_stat_statements exigent l'extension (activée par défaut sur Supabase/Neon).

\echo '== 1. Tables du schéma public SANS Row Level Security (exposées via PostgREST/Supabase) =='
select n.nspname as schema, c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname = 'public' and not c.relrowsecurity
order by 2;

\echo '== 2. Tables avec RLS activée mais AUCUNE policy (tout est bloqué → tentation de désactiver RLS) =='
select c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname = 'public' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
order by 1;

\echo '== 3. Policies permissives suspectes (USING/WITH CHECK = true) =='
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where (qual = 'true' or with_check = 'true')
order by 2, 3;

\echo '== 4. Vues du schéma public sans security_invoker (ignorent RLS) =='
select c.relname as view
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v' and n.nspname = 'public'
  and coalesce((select true from unnest(c.reloptions) o where o = 'security_invoker=true'), false) = false
order by 1;

\echo '== 5. Clés étrangères SANS index (chaque delete/update parent = seq scan enfant, chaque join lent) =='
select c.conrelid::regclass as table,
       c.conname as constraint,
       array_agg(a.attname order by x.n) as columns
from pg_constraint c
cross join lateral unnest(c.conkey) with ordinality as x(attnum, n)
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = x.attnum
where c.contype = 'f'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid
      and (i.indkey::int2[])[0:array_length(c.conkey,1)-1] = c.conkey
  )
group by 1, 2
order by 1;

\echo '== 6. Index jamais utilisés (candidats à suppression ; attention aux index d''unicité) =='
select s.schemaname, s.relname as table, s.indexrelname as index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) as size, s.idx_scan
from pg_stat_user_indexes s
join pg_index i on i.indexrelid = s.indexrelid
where s.idx_scan = 0 and not i.indisunique and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc
limit 30;

\echo '== 7. Index INVALIDES (CREATE INDEX CONCURRENTLY échoué : à drop puis recréer) =='
select indexrelid::regclass as index, indrelid::regclass as table
from pg_index
where not indisvalid;

\echo '== 8. Top 20 requêtes par temps total (pg_stat_statements) =='
select round(total_exec_time::numeric, 0) as total_ms,
       calls,
       round(mean_exec_time::numeric, 2) as mean_ms,
       round((100 * total_exec_time / nullif(sum(total_exec_time) over (), 0))::numeric, 1) as pct,
       rows,
       left(regexp_replace(query, '\s+', ' ', 'g'), 120) as query
from pg_stat_statements
order by total_exec_time desc
limit 20;

\echo '== 9. Requêtes appelées très souvent (suspicion de N+1) =='
select calls, round(mean_exec_time::numeric, 2) as mean_ms,
       left(regexp_replace(query, '\s+', ' ', 'g'), 120) as query
from pg_stat_statements
where calls > 1000
order by calls desc
limit 20;

\echo '== 10. Tables : taille, lignes estimées, ratio tuples morts (bloat), dernier vacuum/analyze =='
select relname as table,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       n_live_tup, n_dead_tup,
       case when n_live_tup > 0 then round(100.0 * n_dead_tup / n_live_tup, 1) else 0 end as dead_pct,
       seq_scan, idx_scan,
       last_autovacuum, last_autoanalyze
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 25;

\echo '== 11. Grosses tables lues surtout en seq scan (index manquant probable) =='
select relname as table, seq_scan, idx_scan, n_live_tup
from pg_stat_user_tables
where n_live_tup > 10000 and seq_scan > coalesce(idx_scan, 0)
order by seq_scan desc
limit 20;

\echo '== 12. Cache hit ratio (attendu > 0.99 ; sinon shared_buffers/RAM ou requêtes trop larges) =='
select round(sum(heap_blks_hit)::numeric / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 4) as heap_hit_ratio
from pg_statio_user_tables;

\echo '== 13. Connexions par état et par application (saturation du pool ?) =='
select state, application_name, count(*)
from pg_stat_activity
where datname = current_database()
group by 1, 2
order by 3 desc;

\echo '== 14. Transactions "idle in transaction" > 30 s (verrous tenus pour rien) =='
select pid, usename, application_name, now() - xact_start as duration, left(query, 100) as query
from pg_stat_activity
where state = 'idle in transaction' and now() - xact_start > interval '30 seconds'
order by 4 desc;

\echo '== 15. Requêtes en cours > 5 s =='
select pid, now() - query_start as duration, state, wait_event_type, left(query, 120) as query
from pg_stat_activity
where state <> 'idle' and now() - query_start > interval '5 seconds'
order by 2 desc;

\echo '== 16. Verrous en attente (qui bloque qui) =='
select blocked.pid as blocked_pid, left(blocked.query, 80) as blocked_query,
       blocking.pid as blocking_pid, left(blocking.query, 80) as blocking_query
from pg_stat_activity blocked
join pg_stat_activity blocking on blocking.pid = any(pg_blocking_pids(blocked.pid))
where cardinality(pg_blocking_pids(blocked.pid)) > 0;

\echo '== 17. Paramètres clés (timeouts, pooling, AIO PG18) =='
select name, setting, unit
from pg_settings
where name in ('statement_timeout','lock_timeout','idle_in_transaction_session_timeout',
               'max_connections','shared_buffers','work_mem','effective_cache_size',
               'io_method','jit','default_toast_compression','password_encryption')
order by name;

\echo '== 18. Colonnes timestamp SANS fuseau (préférer timestamptz) =='
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and data_type = 'timestamp without time zone'
order by 1, 2;

\echo '== 19. Extensions installées =='
select extname, extversion from pg_extension order by 1;

\echo '== 20. Version =='
select version();
