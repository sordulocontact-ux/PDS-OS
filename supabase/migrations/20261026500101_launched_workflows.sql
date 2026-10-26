-- Page loads audit (26/10/2026, docs/ARCHITECTURE.md § 3 bis): a page of a
-- project asked workflow_is_launched once per workflow, the costliest call
-- of a render (≈ 2.5 ms each, up to 70 ms on a fresh connection, and one
-- slot of the API's small connection pool every time). The launched
-- workflows of a project now come in one call, by the very same rule.

create or replace function public.launched_workflows(p_project_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(w order by w), '{}'::text[])
    from unnest(array['strategy', 'master', 'legal', 'design', 'production',
                      'activations', 'distribution', 'review']) as w
   where public.workflow_is_launched(p_project_id, w);
$$;
revoke execute on function public.launched_workflows(uuid) from public, anon;
grant execute on function public.launched_workflows(uuid) to authenticated, service_role;

-- Tables created since the signal became the project's whole version
-- (20261026100201) get it too.
select public.attach_project_live();
