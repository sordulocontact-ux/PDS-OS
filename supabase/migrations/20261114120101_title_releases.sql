-- Projet collectif, lot 13 (docs/pds-mic-plan.md décision 7, § 3 bis points 1
-- to 6 and 8): a collective's releases, one per title and/or a compilation.
--
--   1. projects.collective_release_mode: « singles » (one release per live
--      title that has a master), « compilation » (one release of the
--      project), « singles_then_compilation » (both). Set on a collective
--      only, « singles » by default; the collectives already launched with
--      their project's release keep it as their compilation.
--   2. releases.project_title_id (null = the project's release: every simple
--      project, and a collective's compilation; set = a title's release, one
--      per title) and releases.archived_at / archived_by (a line a new mode
--      no longer uses is archived, never deleted; the mode back brings it
--      back). Read by whoever reads the release; written by functions only.
--   3. ensure_title_release (idempotent): a collective in a mode with
--      singles, its plan launched, a live title with a master gets its
--      release (created, or brought back); called when a title becomes live
--      or gets its master, when the plan is launched, when the mode changes.
--      A title abandoned keeps its release (history), out of the counts.
--   4. The dates: b_release_date and z_release_date_sync only touch the
--      project's release (a simple project's, a collective's compilation):
--      a title's release keeps its own date. release_on_plan_launch creates
--      a collective's compilation only in a mode that has one.
--   5. set_collective_release_mode: who writes the titles (the owner once
--      launched, create_projects before); refused when it would take away a
--      release already out (a compilation submitted to the Distribution, a
--      title's release delivered or confirmed online); journal of the
--      collective (« release_mode_changed »).
--   6. next_release_date: the earliest planned date of a project's live
--      releases (a simple project's single release), for the pages that
--      need « the » date (Stratégie, Conception, Plan du projet, delay of
--      the engineer, SACEM's first exploitation).
--   7. The release lock of lot 12 for the new releases: a collective's
--      release recorded delivered or confirmed online needs the contracts
--      of its title (a title's release) or of every live title (the
--      compilation) signed, or an open waiver of the release.
--
-- Any other project: one release of the project, its date the project's due
-- date, unchanged.

-- 1 ------------------------------------------------------------------------------------------
alter table public.projects add column collective_release_mode text;
alter table public.projects add constraint projects_collective_release_mode_check
  check (collective_release_mode is null
         or collective_release_mode in ('singles', 'compilation', 'singles_then_compilation'));

-- A collective always has a mode (« singles » unless said otherwise).
create or replace function public.projects_collective_release_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.collective and new.collective_release_mode is null then
    new.collective_release_mode := 'singles';
  end if;
  return new;
end;
$$;
create trigger a_collective_release_mode before insert or update of collective on public.projects
  for each row execute function public.projects_collective_release_mode();

-- 2 ------------------------------------------------------------------------------------------
alter table public.releases
  add column project_title_id uuid references public.project_titles (id) on delete cascade,
  add column archived_at timestamptz,
  add column archived_by uuid references public.people (id);
create unique index releases_project_title_key on public.releases (project_title_id)
  where project_title_id is not null;
grant select (project_title_id, archived_at, archived_by) on public.releases to authenticated;

-- The collectives already there: those launched with their project's release
-- keep it as their compilation; the others release title by title.
update public.projects p
   set collective_release_mode = case
         when exists (select 1 from public.releases r where r.project_id = p.id)
           then 'singles_then_compilation'
         else 'singles'
       end
 where p.collective;

-- 3 ------------------------------------------------------------------------------------------
create or replace function public.title_release_name(p_title_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(t.working_title,
                  case when coalesce(m.title_is_provisional, false) then null else m.title end,
                  'Titre ' || t.position || ' · sans nom')
    from public.project_titles t
    left join public.masters m on m.id = t.master_id
   where t.id = p_title_id;
$$;
revoke execute on function public.title_release_name(uuid) from public, anon, authenticated;

create or replace function public.ensure_title_release(p_title_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_project public.projects%rowtype;
  v_id uuid;
begin
  select * into v_title from public.project_titles where id = p_title_id;
  if not found then
    return null;
  end if;
  select * into v_project from public.projects where id = v_title.project_id;
  select id into v_id from public.releases where project_title_id = p_title_id;
  if not v_project.collective
     or v_project.collective_release_mode not in ('singles', 'singles_then_compilation')
     or v_title.status <> 'active' or v_title.master_id is null
     or not exists (select 1 from public.project_plans pl where pl.project_id = v_project.id) then
    return v_id;
  end if;
  if v_id is null then
    insert into public.releases (organization_id, project_id, project_title_id, title, created_by)
    values (v_project.organization_id, v_project.id, p_title_id,
            public.title_release_name(p_title_id), public.auth_person_id())
    returning id into v_id;
  else
    update public.releases
       set archived_at = null, archived_by = null,
           title = public.title_release_name(p_title_id)
     where id = v_id
       and (archived_at is not null or title is distinct from public.title_release_name(p_title_id));
  end if;
  return v_id;
end;
$$;
revoke execute on function public.ensure_title_release(uuid) from public, anon, authenticated;

-- A title becomes live, gets its master, is renamed: its release follows.
create or replace function public.project_titles_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_title_release(new.id);
  return null;
end;
$$;
revoke execute on function public.project_titles_release() from public, anon, authenticated;
create trigger z_title_release after insert or update of status, master_id, working_title
  on public.project_titles
  for each row execute function public.project_titles_release();

-- The compilation of a collective in a mode that has one (created, or
-- brought back), its name and date the project's.
create or replace function public.ensure_compilation_release(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_id uuid;
begin
  select * into v_project from public.projects where id = p_project_id;
  select id into v_id from public.releases
   where project_id = p_project_id and project_title_id is null
   order by archived_at nulls first, created_at
   limit 1;
  if not v_project.collective
     or v_project.collective_release_mode not in ('compilation', 'singles_then_compilation')
     or not exists (select 1 from public.project_plans pl where pl.project_id = p_project_id) then
    return v_id;
  end if;
  if v_id is null then
    insert into public.releases (organization_id, project_id, title, planned_release_date, created_by)
    values (v_project.organization_id, v_project.id, v_project.title, v_project.due_date,
            public.auth_person_id())
    returning id into v_id;
  else
    update public.releases set archived_at = null, archived_by = null
     where id = v_id and archived_at is not null;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.ensure_compilation_release(uuid) from public, anon, authenticated;

-- 4 ------------------------------------------------------------------------------------------
create or replace function public.release_date_from_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due date;
begin
  -- A title's release keeps its own date (lot 13).
  if new.project_title_id is not null then
    return new;
  end if;
  select p.due_date into v_due from public.projects p where p.id = new.project_id;
  if v_due is not null then
    new.planned_release_date := v_due;
  end if;
  return new;
end;
$$;

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
       and project_title_id is null
       and planned_release_date is distinct from new.due_date;
  end if;
  return null;
end;
$$;

create or replace function public.release_on_plan_launch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_title uuid;
begin
  select * into v_project from public.projects where id = new.project_id;
  if not v_project.collective then
    insert into public.releases (organization_id, project_id, title, planned_release_date, created_by)
    select p.organization_id, p.id, p.title, p.due_date, public.auth_person_id()
      from public.projects p
     where p.id = new.project_id
       and not exists (select 1 from public.releases r where r.project_id = p.id);
    return null;
  end if;
  -- A collective (lot 13): its releases by its mode.
  perform public.ensure_compilation_release(v_project.id);
  for v_title in select id from public.project_titles where project_id = v_project.id loop
    perform public.ensure_title_release(v_title);
  end loop;
  return null;
end;
$$;

-- The collectives already launched get their titles' releases now.
do $$
declare
  v_title uuid;
begin
  for v_title in
    select t.id from public.project_titles t
      join public.projects p on p.id = t.project_id and p.collective
  loop
    perform public.ensure_title_release(v_title);
  end loop;
end $$;

-- 5 ------------------------------------------------------------------------------------------
alter table public.project_title_events drop constraint project_title_events_title_check;
alter table public.project_title_events add constraint project_title_events_title_check
  check ((title_id is null) = (kind in ('main_artist_changed', 'release_mode_changed')));
alter table public.project_title_events drop constraint project_title_events_kind_check;
alter table public.project_title_events add constraint project_title_events_kind_check
  check (kind in ('added', 'renamed', 'abandoned', 'reactivated', 'participation_added',
                  'participation_status', 'main_artist_changed', 'cataloged',
                  'master_attached', 'waiver_granted', 'waiver_revoked',
                  'release_mode_changed'));

create or replace function public.set_collective_release_mode(p_project_id uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_title uuid;
  v_singles boolean := p_mode in ('singles', 'singles_then_compilation');
  v_compilation boolean := p_mode in ('compilation', 'singles_then_compilation');
begin
  v_project := public.lock_project_titles(p_project_id);
  if p_mode is null or p_mode not in ('singles', 'compilation', 'singles_then_compilation') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;
  if p_mode = v_project.collective_release_mode then
    raise exception 'mode_unchanged' using errcode = 'P0001';
  end if;
  -- What the new mode takes away must not be out already.
  if not v_compilation
     and exists (select 1 from public.distribution_versions v where v.project_id = p_project_id) then
    raise exception 'compilation_submitted' using errcode = 'P0001';
  end if;
  if not v_singles
     and exists (select 1 from public.releases r
                  where r.project_id = p_project_id and r.project_title_id is not null
                    and r.archived_at is null
                    and (r.delivered_on is not null or r.online_confirmed_on is not null
                         or r.online_detected_at is not null)) then
    raise exception 'single_released' using errcode = 'P0001';
  end if;

  update public.projects set collective_release_mode = p_mode where id = p_project_id;
  if not v_compilation then
    update public.releases
       set archived_at = now(), archived_by = public.auth_person_id()
     where project_id = p_project_id and project_title_id is null and archived_at is null;
  end if;
  if not v_singles then
    update public.releases
       set archived_at = now(), archived_by = public.auth_person_id()
     where project_id = p_project_id and project_title_id is not null and archived_at is null;
  end if;
  perform public.ensure_compilation_release(p_project_id);
  for v_title in select id from public.project_titles where project_id = p_project_id loop
    perform public.ensure_title_release(v_title);
  end loop;

  insert into public.project_title_events
    (organization_id, project_id, title_id, kind, detail, actor_person_id)
  values (v_project.organization_id, p_project_id, null, 'release_mode_changed',
          jsonb_build_object('from', v_project.collective_release_mode, 'to', p_mode),
          public.auth_person_id());
end;
$$;
revoke execute on function public.set_collective_release_mode(uuid, text) from public, anon;
grant execute on function public.set_collective_release_mode(uuid, text) to authenticated;

-- 6 ------------------------------------------------------------------------------------------
create or replace function public.next_release_date(p_project_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select min(r.planned_release_date)
    from public.releases r
    left join public.project_titles t on t.id = r.project_title_id
   where r.project_id = p_project_id
     and public.can_see_project(p_project_id)
     and r.archived_at is null
     and (t.id is null or t.status <> 'abandoned');
$$;
revoke execute on function public.next_release_date(uuid) from public, anon;
grant execute on function public.next_release_date(uuid) to authenticated;

-- 7 ------------------------------------------------------------------------------------------
-- The contracts a collective's release needs (lot 12's rule): its title's
-- (a title's release), every live title's (the compilation).
create or replace function public.release_contract_gaps_text(p_release_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(g.artist_name || ' (' ||
           coalesce(g.working_title, g.master_title, 'Titre ' || g.title_position || ' · sans nom')
           || ')', ', ' order by g.title_position, g.artist_name)
    from public.releases r
    cross join lateral public.contract_gaps(r.project_id, 'release') g
   where r.id = p_release_id
     and (r.project_title_id is null or g.title_id = r.project_title_id);
$$;
revoke execute on function public.release_contract_gaps_text(uuid) from public, anon, authenticated;

create or replace function public.releases_contract_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text;
begin
  if ((old.delivered_on is null and new.delivered_on is not null)
      or (old.online_confirmed_on is null and new.online_confirmed_on is not null))
     and exists (select 1 from public.projects p where p.id = new.project_id and p.collective) then
    v_missing := public.release_contract_gaps_text(new.id);
    if v_missing is not null then
      raise exception 'contract_missing' using errcode = '23514', detail = v_missing;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.releases_contract_check() from public, anon, authenticated;
create trigger c_contract_check before update on public.releases
  for each row execute function public.releases_contract_check();
