-- Projet collectif, lot 6 (docs/pds-mic-plan.md; demande du 13/11/2026): a
-- change of a collective's main artist goes to the project's Activité, with
-- the artist before, the artist after and who changed it. The collective's
-- journal (project_title_events, lots 2-3) holds it, read by the Activité
-- (lib/overview/activity.ts): an event of the project, not of a title.
--
--   1. project_title_events.title_id may be null, for this event only.
--   2. set_project_main_artist writes « main_artist_changed » when the
--      artist really changes (from / to: the artists' names at the time,
--      as a participation's events name their artist). Every path goes
--      through it: « Changer l'artiste principal » once launched, the edit
--      form before (update_project calls it). Only a collective has a main
--      artist to change (not_collective otherwise): nothing changes for a
--      project with a single artist.
--
-- No table added: delete_project_row already empties project_title_events.

-- 1 ------------------------------------------------------------------------------------------
alter table public.project_title_events
  alter column title_id drop not null,
  drop constraint project_title_events_kind_check,
  add constraint project_title_events_kind_check
    check (kind in ('added', 'renamed', 'abandoned', 'reactivated',
                    'participation_added', 'participation_status',
                    'main_artist_changed')),
  add constraint project_title_events_title_check
    check ((title_id is null) = (kind = 'main_artist_changed'));

-- 2 ------------------------------------------------------------------------------------------
-- As 20261111235101, plus the event.
create or replace function public.set_project_main_artist(
  p_project_id uuid,
  p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if v_project.archived_at is not null
     or not (public.is_project_owner(p_project_id)
             or (public.has_permission(v_project.organization_id, 'create_projects')
                 and not public.is_project_launched(p_project_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if p_artist_id is null then
    raise exception 'artist_required' using errcode = '23514';
  end if;
  if not exists (select 1 from public.artists a
                  where a.id = p_artist_id
                    and a.organization_id = v_project.organization_id
                    and a.archived_at is null) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;
  if exists (select 1 from public.title_participations tp
              where tp.project_id = p_project_id
                and tp.artist_id = p_artist_id
                and tp.status not in ('declined', 'withdrawn')) then
    raise exception 'main_artist_is_guest' using errcode = '23514';
  end if;
  update public.projects set artist_id = p_artist_id where id = p_project_id;
  if v_project.artist_id is distinct from p_artist_id then
    insert into public.project_title_events
      (organization_id, project_id, title_id, kind, detail, actor_person_id)
    values (v_project.organization_id, p_project_id, null, 'main_artist_changed',
            jsonb_build_object(
              'from', (select a.name from public.artists a where a.id = v_project.artist_id),
              'to', (select a.name from public.artists a where a.id = p_artist_id)),
            public.auth_person_id());
  end if;
end;
$$;
revoke execute on function public.set_project_main_artist(uuid, uuid) from public, anon;
grant execute on function public.set_project_main_artist(uuid, uuid) to authenticated;
