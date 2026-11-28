-- Audit des parcours d'un collectif (28/11/2026, Distribution n° 5): a closure
-- with reserves still open read « Clôturée » (Sorties), « Terminé » (navigation,
-- Vue d'ensemble) and « En cours » (the module). Both reads now say the open
-- reserves: `open_reserves` in the closure of distribution_status_rows, and
-- « closed_open » as the closure status of release_distribution_states (same
-- return types).

-- 1 ------------------------------------------------------------------------------------------
create or replace function public.distribution_status_rows(p_project_id uuid, p_reference_platforms text[],
  p_release_id uuid default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'release', (
      select jsonb_build_object('isrc', r.isrc,
                                'planned_release_date', r.planned_release_date)
        from public.releases r
       where r.project_id = p_project_id
         and (p_release_id is null or r.id = p_release_id)
       order by r.created_at asc
       limit 1),
    'version', (
      select jsonb_build_object('number', v.number, 'status', v.status)
        from public.distribution_versions v
       where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
         and v.superseded_at is null
       order by v.number desc
       limit 1),
    'declarations', coalesce((
      select jsonb_agg(jsonb_build_object('version_number', d.version_number,
                                          'kind', d.kind,
                                          'declared_at', d.declared_at)
                       order by d.declared_at desc)
        from public.distribution_declarations d
       where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
         and d.withdrawn_at is null), '[]'::jsonb),
    'verified_platforms', (
      select count(*)
        from public.distribution_platforms p
       where p.project_id = p_project_id and p.release_id is not distinct from p_release_id
         and p.verification = 'verified'
         and p.platform = any (p_reference_platforms)),
    'closure', (
      select jsonb_build_object('kind', c.kind, 'status', c.status,
                                'reserves', c.reserves,
                                'open_reserves', (select count(*) from public.distribution_reserves x
                                                   where x.closure_id = c.id and x.status = 'open'),
                                'proposed_at', c.proposed_at,
                                'decided_at', c.decided_at)
        from public.distribution_closures c
       where c.project_id = p_project_id and c.release_id is not distinct from p_release_id
         and c.reopened_at is null
         and c.status in ('pending', 'closed')
       limit 1),
    'params_confirmed_at', (
      select d.params_confirmed_at
        from public.distribution_dossiers d
       where d.project_id = p_project_id and d.release_id is not distinct from p_release_id)
  );
$$;
revoke execute on function public.distribution_status_rows(uuid, text[], uuid) from public, anon;
grant execute on function public.distribution_status_rows(uuid, text[], uuid) to authenticated;

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.release_distribution_states(p_project_id uuid)
returns table (release_id uuid, version_number integer, version_status text,
  superseded boolean, deposited boolean, accepted boolean, closure_status text,
  params_confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         v.number, v.status, v.superseded_at is not null,
         exists (select 1 from public.distribution_declarations d
                  where d.release_id = r.id and d.version_number = v.number
                    and d.kind = 'deposit' and d.withdrawn_at is null),
         public.distribution_accepted(r.project_id, r.id),
         -- Closed with reserves still open: not closed yet for the lists
         -- (recette DIST-007, audit du 28/11/2026), « closed_open ».
         (select case when c.status = 'closed'
                           and exists (select 1 from public.distribution_reserves x
                                        where x.closure_id = c.id and x.status = 'open')
                      then 'closed_open' else c.status end
            from public.distribution_closures c
           where c.release_id = r.id and c.reopened_at is null
             and c.status in ('pending', 'closed')
           order by c.proposed_at desc limit 1),
         coalesce((select d.params_confirmed_at is not null from public.distribution_dossiers d
                    where d.release_id = r.id), false)
    from public.releases r
    left join lateral (
      select x.number, x.status, x.superseded_at from public.distribution_versions x
       where x.release_id = r.id order by x.number desc limit 1) v on true
   where r.project_id = p_project_id
     and public.can_see_project(p_project_id)
     and exists (select 1 from public.projects p where p.id = p_project_id and p.collective);
$$;
revoke execute on function public.release_distribution_states(uuid) from public, anon;
grant execute on function public.release_distribution_states(uuid) to authenticated;
