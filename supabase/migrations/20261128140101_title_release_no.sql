-- « Sortie : Non » of a collective's title (Ibé, 18/11/2026: the recap's « Sortie »
-- column), decided 28/11/2026 for want of a rule (docs/pds-mic-resume.md): until now
-- nothing followed from it. The title does not come out on its own:
--   1. ensure_title_release archives its release (kept, read only, like a release
--      left out by a change of mode) and creates none; « Oui » or « À décider »
--      brings it back (the same function, through the trigger);
--   2. set_project_title_release refuses « Non » once a version of its release was
--      submitted to the distributor (« release_started »): what left PDS is not
--      taken back silently;
--   3. the trigger follows release_decision too;
--   4. the compilation's tracks leave out a title that does not come out;
--   5. the titles already « Non » lose their release now.

-- 1 ------------------------------------------------------------------------------------------
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
  -- « Sortie : Non » (Ibé 18/11, decided 28/11/2026): the title does not
  -- come out on its own; its release, kept, is archived (read only), and
  -- comes back with « Oui » or « À décider ».
  if v_project.collective and v_title.release_decision is false then
    -- A release already submitted to the distributor stays (refused by
    -- set_project_title_release since; never archived behind its back).
    update public.releases
       set archived_at = now(), archived_by = public.auth_person_id()
     where id = v_id and archived_at is null
       and not exists (select 1 from public.distribution_versions v
                        where v.release_id = v_id);
    return v_id;
  end if;
  if not v_project.collective
     or v_project.collective_release_mode not in ('singles', 'singles_then_compilation')
     or v_title.status <> 'active' or v_title.master_id is null
     or not exists (select 1 from public.project_plans pl where pl.project_id = v_project.id) then
    return v_id;
  end if;
  if v_id is null then
    -- Dated by the project's due date when it is created (M6); its own date
    -- afterwards (« Sorties »), kept when the due date moves.
    insert into public.releases (organization_id, project_id, project_title_id, title,
                                 planned_release_date, created_by)
    values (v_project.organization_id, v_project.id, p_title_id,
            public.title_release_name(p_title_id), v_project.due_date, public.auth_person_id())
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

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.set_project_title_release(
  p_title_id uuid,
  p_release boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if p_release is not distinct from v_title.release_decision then
    raise exception 'release_unchanged' using errcode = 'P0001';
  end if;
  if p_release is false and exists (
       select 1 from public.releases r
         join public.distribution_versions v on v.release_id = r.id
        where r.project_title_id = p_title_id and r.archived_at is null) then
    raise exception 'release_started' using errcode = 'P0001';
  end if;
  update public.project_titles set release_decision = p_release where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'release_decided',
    jsonb_build_object('from', v_title.release_decision, 'to', p_release));
end;
$$;
revoke execute on function public.set_project_title_release(uuid, boolean) from public, anon;
grant execute on function public.set_project_title_release(uuid, boolean) to authenticated;

comment on column public.project_titles.release_decision is
  'Ibé 18/11: does the title come out (true / false); null = not decided. Written by set_project_title_release only. False: no release of its own (archived), out of the compilation (28/11/2026).';

-- 3 ------------------------------------------------------------------------------------------
drop trigger if exists z_title_release on public.project_titles;
create trigger z_title_release after insert or update of status, master_id, working_title, release_decision
  on public.project_titles
  for each row execute function public.project_titles_release();

-- 4 ------------------------------------------------------------------------------------------
create or replace function public.release_titles(p_release_id uuid)
returns table (title_id uuid, title_position integer, master_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.position, t.master_id
    from public.releases r
    join public.project_titles t on t.project_id = r.project_id
   where r.id = p_release_id
     and (t.id = r.project_title_id
          or (r.project_title_id is null and t.status <> 'abandoned'
              and t.release_decision is not false))
   order by t.position;
$$;
revoke execute on function public.release_titles(uuid) from public, anon, authenticated;

-- 5 ------------------------------------------------------------------------------------------
select public.ensure_title_release(t.id)
  from public.project_titles t
 where t.release_decision is false;
