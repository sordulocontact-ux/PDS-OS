-- Page loads audit (27/10/2026, docs/ARCHITECTURE.md § 3 bis): the
-- Distribution's state (lib/workflow-status/load.ts, distributionFacts) read
-- six tables in six round trips on every computation of a project's
-- workflow states. The same rows, with the same filters, now come in one
-- call. Raw rows only: the state is still decided by the code
-- (distributionState). SECURITY INVOKER: RLS applies to each read as before.

create or replace function public.distribution_status_rows(
  p_project_id uuid,
  p_reference_platforms text[]
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'release', (
      select jsonb_build_object('isrc', r.isrc,
                                'planned_release_date', r.planned_release_date)
        from public.releases r
       where r.project_id = p_project_id
       order by r.created_at asc
       limit 1),
    'version', (
      select jsonb_build_object('number', v.number, 'status', v.status)
        from public.distribution_versions v
       where v.project_id = p_project_id and v.superseded_at is null
       order by v.number desc
       limit 1),
    'declarations', coalesce((
      select jsonb_agg(jsonb_build_object('version_number', d.version_number,
                                          'kind', d.kind,
                                          'declared_at', d.declared_at)
                       order by d.declared_at desc)
        from public.distribution_declarations d
       where d.project_id = p_project_id and d.withdrawn_at is null), '[]'::jsonb),
    'verified_platforms', (
      select count(*)
        from public.distribution_platforms p
       where p.project_id = p_project_id
         and p.verification = 'verified'
         and p.platform = any (p_reference_platforms)),
    'closure', (
      select jsonb_build_object('kind', c.kind, 'status', c.status,
                                'reserves', c.reserves,
                                'proposed_at', c.proposed_at,
                                'decided_at', c.decided_at)
        from public.distribution_closures c
       where c.project_id = p_project_id
         and c.reopened_at is null
         and c.status in ('pending', 'closed')
       limit 1),
    'params_confirmed_at', (
      select d.params_confirmed_at
        from public.distribution_dossiers d
       where d.project_id = p_project_id)
  );
$$;
revoke execute on function public.distribution_status_rows(uuid, text[]) from public, anon;
grant execute on function public.distribution_status_rows(uuid, text[]) to authenticated;
