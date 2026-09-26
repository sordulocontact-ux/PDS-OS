-- Search used by the assistant (docs/ASSISTANT.md § 2): typo-tolerant lookup of
-- projects and artists, French full-text search in call reports and transcripts.
-- Both functions are SECURITY INVOKER: RLS applies, a user only finds what they
-- can already read. No vector index (docs/CONTEXTE-PROJET.md § 7).

create extension if not exists pg_trgm with schema extensions;

create index projects_title_trgm on public.projects using gin (title extensions.gin_trgm_ops);
create index artists_name_trgm on public.artists using gin (name extensions.gin_trgm_ops);

alter table public.report_items
  add column search tsvector
  generated always as (to_tsvector('french'::regconfig, what || ' ' || quote)) stored;
create index report_items_search_idx on public.report_items using gin (search);

alter table public.transcripts
  add column search tsvector
  generated always as (to_tsvector('french'::regconfig, text)) stored;
create index transcripts_search_idx on public.transcripts using gin (search);

create or replace function public.search_projects(p_query text)
returns table (id uuid, title text, artist text, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, a.name,
         greatest(extensions.word_similarity(lower(p_query), lower(p.title)),
                  extensions.word_similarity(lower(p_query), lower(a.name))) as score
  from public.projects p
  join public.artists a on a.id = p.artist_id
  where p.archived_at is null
    and (btrim(coalesce(p_query, '')) = ''
         or extensions.word_similarity(lower(p_query), lower(p.title)) > 0.3
         or extensions.word_similarity(lower(p_query), lower(a.name)) > 0.3)
  order by score desc, p.created_at desc
  limit 10;
$$;

-- Latest report of each call, plus transcript excerpts.
create or replace function public.search_calls(p_query text, p_project_id uuid default null)
returns table (
  source text, call_id uuid, call_title text, project_id uuid, project_title text,
  kind text, excerpt text, quote text, start_seconds numeric, rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select websearch_to_tsquery('french'::regconfig, p_query) as query),
  latest as (
    select distinct on (cr.call_id) cr.id, cr.call_id
    from public.call_reports cr
    order by cr.call_id, cr.created_at desc
  ),
  latest_transcript as (
    select distinct on (t.call_id) t.id, t.call_id, t.text, t.search
    from public.transcripts t
    order by t.call_id, t.created_at desc
  )
  (select 'report', c.id, c.title, p.id, p.title, ri.kind, ri.what, ri.quote,
          ri.start_seconds, ts_rank(ri.search, q.query)
   from q, public.report_items ri
   join latest l on l.id = ri.report_id
   join public.calls c on c.id = l.call_id
   join public.projects p on p.id = c.project_id
   where ri.search @@ q.query
     and (p_project_id is null or p.id = p_project_id)
   order by 10 desc
   limit 8)
  union all
  (select 'transcript', c.id, c.title, p.id, p.title, null,
          ts_headline('french'::regconfig, lt.text, q.query,
                      'StartSel=«,StopSel=»,MaxWords=35,MinWords=15,MaxFragments=1'),
          null, null, ts_rank(lt.search, q.query)
   from q, latest_transcript lt
   join public.calls c on c.id = lt.call_id
   join public.projects p on p.id = c.project_id
   where lt.search @@ q.query
     and (p_project_id is null or p.id = p_project_id)
   order by 10 desc
   limit 4);
$$;

revoke execute on function public.search_projects(text) from public, anon;
revoke execute on function public.search_calls(text, uuid) from public, anon;
grant execute on function public.search_projects(text) to authenticated;
grant execute on function public.search_calls(text, uuid) to authenticated;
