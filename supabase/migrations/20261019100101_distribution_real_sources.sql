-- Distribution, lot D0 (proto « Projet complet », docs/projet-complet/distribution.md
-- § 1.1 and § 1.10): the Préparation reads the real state of its sources, and the
-- release date has one source.
--
-- 1. distribution_legal_blockers: the borrowings of the project not secured yet
--    (legal_clearances not « cleared » nor « abandoned »), readable by whoever
--    sees the project, WITHOUT manage_legal. Only what the Distribution needs
--    (which element, not its terms or its rights holders): before it, a reader
--    without the Juridique saw « Accès restreint » and nothing blocked.
-- 2. distribution_cover: the cover of the release — the Fiche Livrable chosen in
--    the dossier's parameters, otherwise found by its title — and whether its
--    Production delivered it (deliverable_deliveries.delivered_at, with the
--    version delivered). One rule, read by the Préparation and by the
--    workflow's status. Security invoker: the RLS of each table applies.
-- 3. The release date: projects.due_date (entered at the Lancement, confirmed
--    by the Cadrage and validated with its Brief) is the only source.
--    releases.planned_release_date follows it (trigger) and is no longer typed
--    in the Distribution; a release without a project date keeps its own (an
--    older project).
-- 4. The release row is created by the code when the plan is launched (the
--    Distribution starts with the plan), and for the launched projects that
--    have none yet.

-- ------------------------------------------------------------ 1. borrowings

create or replace function public.distribution_legal_blockers(p_project_id uuid)
returns table (id uuid, work text, element text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.work, c.element, c.status
    from public.legal_clearances c
   where c.project_id = p_project_id
     and public.can_see_project(p_project_id)
     and c.status not in ('cleared', 'abandoned')
   order by c.created_at;
$$;

revoke execute on function public.distribution_legal_blockers(uuid) from public, anon;
grant execute on function public.distribution_legal_blockers(uuid) to authenticated;

-- ------------------------------------------------------------ 2. cover

create or replace function public.distribution_cover(p_project_id uuid)
returns table (
  sheet_id uuid,
  title text,
  chosen boolean,
  deliverable_id uuid,
  delivered_at timestamptz,
  version_number integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with dossier as (
    select d.cover_sheet_id from public.distribution_dossiers d
     where d.project_id = p_project_id
  ), candidates as (
    select s.id, s.title, s.created_at, dd.strategy_deliverable_id,
           s.id = (select cover_sheet_id from dossier) as chosen
      from public.design_sheets s
      join public.design_deliverables dd on dd.id = s.design_deliverable_id
     where s.project_id = p_project_id
       and (s.id = (select cover_sheet_id from dossier)
            or ((select cover_sheet_id from dossier) is null
                and s.title ~* '(pochette|cover|artwork)'))
  )
  select c.id, c.title, coalesce(c.chosen, false), c.strategy_deliverable_id,
         del.delivered_at, v.number
    from candidates c
    left join public.deliverable_deliveries del
      on del.deliverable_id = c.strategy_deliverable_id
    left join public.production_versions v on v.id = del.version_id
   order by coalesce(c.chosen, false) desc, (del.delivered_at is not null) desc, c.created_at
   limit 1;
$$;

revoke execute on function public.distribution_cover(uuid) from public, anon;
grant execute on function public.distribution_cover(uuid) to authenticated;

-- ------------------------------------------------------------ 3. release date

create or replace function public.release_date_from_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due date;
begin
  select p.due_date into v_due from public.projects p where p.id = new.project_id;
  if v_due is not null then
    new.planned_release_date := v_due;
  end if;
  return new;
end;
$$;

revoke execute on function public.release_date_from_project() from public, anon, authenticated;

drop trigger if exists b_release_date on public.releases;
create trigger b_release_date before insert or update on public.releases
  for each row execute function public.release_date_from_project();

create or replace function public.project_release_date_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.due_date is not null and new.due_date is distinct from old.due_date then
    update public.releases
       set planned_release_date = new.due_date
     where project_id = new.id
       and planned_release_date is distinct from new.due_date;
  end if;
  return null;
end;
$$;

revoke execute on function public.project_release_date_sync() from public, anon, authenticated;

drop trigger if exists z_release_date_sync on public.projects;
create trigger z_release_date_sync after update of due_date on public.projects
  for each row execute function public.project_release_date_sync();

-- ------------------------------------------------------------ 4. release row

create or replace function public.release_on_plan_launch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.releases (organization_id, project_id, title, planned_release_date, created_by)
  select p.organization_id, p.id, p.title, p.due_date, public.auth_person_id()
    from public.projects p
   where p.id = new.project_id
     and not exists (select 1 from public.releases r where r.project_id = p.id);
  return null;
end;
$$;

revoke execute on function public.release_on_plan_launch() from public, anon, authenticated;

drop trigger if exists z_release_on_launch on public.project_plans;
create trigger z_release_on_launch after insert on public.project_plans
  for each row execute function public.release_on_plan_launch();

-- The launched projects without a release, and the dates already there.
insert into public.releases (organization_id, project_id, title, planned_release_date, created_by)
select p.organization_id, p.id, p.title, p.due_date, pl.launched_by
  from public.projects p
  join public.project_plans pl on pl.project_id = p.id
 where not exists (select 1 from public.releases r where r.project_id = p.id);

update public.releases r
   set planned_release_date = p.due_date
  from public.projects p
 where p.id = r.project_id
   and p.due_date is not null
   and r.planned_release_date is distinct from p.due_date;
