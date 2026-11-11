-- Projet collectif, lot 5 (docs/pds-mic-plan.md § 3.1, « Les sélections
-- d'artistes »; § 8, lot 5): creating a collective project, from the « Nouveau
-- projet » form or from a selection of artists.
--
--   1. create_collective_project: one call creates the project already
--      collective (projects.collective = true from its first row), its main
--      artist (projects.artist_id, PDS proposed by the form), the masters
--      chosen for a music release (each becomes a title, lot 2), the
--      transmission and the creative directors, as create_project does for
--      any other project. Given a selection, each of its live artists gets a
--      title without a name (planned, named later) and a participation on it
--      (featuring, proposed), through add_project_title and
--      add_title_participation (their checks and their history). A copy: no
--      link is kept with the selection, which can change afterwards without
--      touching the project. The main artist, when in the selection, is not
--      made a guest of their own project (main_artist_not_participant). The
--      framing (Cadrage) stays the project's own: nothing is made per title.
--   2. Who: who creates projects (create_projects, the direction), and, for
--      the conversion of a selection only, its holder when they manage the
--      Catalogue (the project manager it was handed to), without giving
--      create_projects to the project managers for anything else. The holder
--      runs the project they convert: they are its manager (no one else:
--      they cannot transmit a project), and the project is accepted at once
--      (launched), the transmission kept in its history like any other.
--   3. update_project (the edit form, before launch): a collective's main
--      artist is no longer written by the form's « Artiste » field (emptied,
--      it erased it, found at lot 1); it changes through
--      set_project_main_artist, and none given keeps it (never erased; the
--      form asks for it).
--   4. set_project_main_artist refuses an artist already a guest of a title
--      of the project (main_artist_is_guest): main and guest at once, never.
--      A guest is a participation neither declined nor withdrawn, whatever
--      its title's status (an abandoned title can come back). One declined
--      or withdrawn does not block: it stays, never deleted, and the artist
--      is no longer invited (« les artistes du projet » leave it out too).
--      Same rule as add_title_participation the other way round (lot 3:
--      main_artist_not_participant), and set_title_participation_status
--      does not bring such a participation back (proposed, invited or
--      confirmed) while its artist is the main one: the same refusal.
--
-- Any other project: create_project and update_project unchanged for it; no
-- table added (delete_project_row unchanged).

-- 1 and 2. Creating a collective ---------------------------------------------------

create or replace function public.create_collective_project(
  p_organization_id uuid,
  p_title text,
  p_type text,
  p_main_artist_id uuid,
  -- Transmitted to this manager (the direction); the holder of the selection
  -- converted names themself.
  p_assignee_person_id uuid,
  -- The selection whose artists are copied; null: none (artists added later).
  p_selection_id uuid default null,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  p_creative_person_ids uuid[] default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_master_validator_person_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.auth_person_id();
  v_direction boolean;
  v_selection public.artist_selections%rowtype;
  v_id uuid;
  v_assignment uuid;
  v_creative uuid;
  v_artist uuid;
  v_title uuid;
begin
  if v_me is null or not public.is_active_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_direction := public.has_permission(p_organization_id, 'create_projects');

  if p_selection_id is not null then
    -- Read once: its artists are copied as they are now (no live link).
    select * into v_selection from public.artist_selections
     where id = p_selection_id
       and organization_id = p_organization_id
       and archived_at is null
     for share;
    if not found then
      raise exception 'selection_not_found' using errcode = 'P0002';
    end if;
  end if;

  -- Who creates projects, or the holder of the selection converted.
  if not v_direction
     and not (p_selection_id is not null
              and v_selection.owner_person_id = v_me
              and public.has_permission(p_organization_id, 'manage_catalog')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- The holder runs the project: its manager is no one else.
  if not v_direction and p_assignee_person_id is distinct from v_me then
    raise exception 'assignee_not_self' using errcode = '42501';
  end if;
  if p_assignee_person_id is null
     or not public.person_has_permission(p_organization_id, p_assignee_person_id, 'pilot_projects') then
    raise exception 'invalid_assignee';
  end if;

  -- Same shape rules as any project (the event branch closed in V1).
  if p_type = 'event' then
    raise exception 'project_type_unavailable';
  end if;
  perform public.check_project_shape(p_type, p_master_ids, p_music_format);
  if p_main_artist_id is null then
    raise exception 'artist_required' using errcode = '23514';
  end if;
  if not exists (select 1 from public.artists a
                  where a.id = p_main_artist_id
                    and a.organization_id = p_organization_id
                    and a.archived_at is null) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;

  insert into public.projects (organization_id, title, type, due_date, budget_cents, priority,
                               initial_context, music_format, content_format_id, artist_id,
                               master_validator_person_id, collective)
  values (p_organization_id, btrim(p_title), p_type, p_due_date, p_budget_cents, p_priority,
          nullif(btrim(p_initial_context), ''),
          case when p_type = 'music_release' then p_music_format end,
          case when p_type = 'content' then p_content_format_id end,
          p_main_artist_id,
          case when p_type = 'music_release' then p_master_validator_person_id end,
          true)
  returning id into v_id;

  -- A music release links the masters chosen: each becomes a title (trigger
  -- of lot 2, with its history line).
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select p_organization_id, v_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;

  if v_direction then
    perform public.transmit_project(v_id, p_assignee_person_id, null);
  else
    -- The holder: transmitted to himself and accepted at once (the launch,
    -- respond_to_assignment), so the history says who took it and when.
    insert into public.project_assignments (organization_id, project_id, assignee_person_id, assigned_by)
    values (p_organization_id, v_id, v_me, v_me)
    returning id into v_assignment;
    perform public.respond_to_assignment(v_assignment, 'accepted');
  end if;

  -- Its owner once accepted, the direction otherwise (can_manage_creatives).
  foreach v_creative in array coalesce(p_creative_person_ids, array[]::uuid[])
  loop
    perform public.add_project_creative(v_id, v_creative);
  end loop;

  -- The selection's live artists, in its order: a title without a name and a
  -- proposed participation each.
  if p_selection_id is not null then
    for v_artist in
      select i.artist_id
        from public.artist_selection_items i
        join public.artists a on a.id = i.artist_id
       where i.selection_id = p_selection_id
         and a.archived_at is null
         and i.artist_id <> p_main_artist_id
       order by i.position
    loop
      v_title := public.add_project_title(v_id);
      perform public.add_title_participation(v_title, v_artist);
    end loop;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid)
  from public, anon;
grant execute on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid)
  to authenticated;

comment on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid) is
  'Creates a collective project (docs/pds-mic-plan.md, lot 5): main artist, masters, transmission, creative directors; a selection''s artists copied as one untitled title and one proposed participation each. By create_projects, or the selection''s holder with manage_catalog (then its manager, accepted at once).';

-- 3. update_project keeps a collective's main artist -------------------------------

-- As 20261111120101 but for the main artist of a collective: kept by the
-- update itself, changed through set_project_main_artist (empty refused).
create or replace function public.update_project(
  p_project_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_artist_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_current_type text;
  v_collective boolean;
  v_main_artist uuid;
  v_requested uuid[];
  v_kept uuid[];
  v_ids uuid[] := p_master_ids;
begin
  select type, collective, artist_id into v_current_type, v_collective, v_main_artist
    from public.projects where id = p_project_id;
  -- An existing event stays one; no project becomes an event in V1.
  if p_type = 'event' and v_current_type is distinct from 'event' then
    raise exception 'project_type_unavailable';
  end if;
  if coalesce(v_collective, false) then
    v_requested := case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                        else '{}'::uuid[] end;
    v_kept := array(select t.master_id from public.project_titles t
                     where t.project_id = p_project_id and t.master_id is not null
                     order by t.position);
    if p_type = 'music_release'
       and exists (select 1 from unnest(v_kept) k where not (k = any (v_requested))) then
      raise exception 'collective_title_kept' using errcode = 'P0001';
    end if;
    v_ids := v_requested || array(select k from unnest(v_kept) k where not (k = any (v_requested)));
  end if;
  perform public.check_project_shape(p_type, v_ids, p_music_format);

  update public.projects
     set title = btrim(p_title),
         type = p_type,
         due_date = p_due_date,
         budget_cents = p_budget_cents,
         priority = p_priority,
         initial_context = nullif(btrim(p_initial_context), ''),
         music_format = case when p_type = 'music_release' then p_music_format end,
         content_format_id = case when p_type = 'content' then p_content_format_id end,
         -- A collective keeps its main artist here (set_project_main_artist
         -- below); a project from before the catalogue keeps the artist it
         -- was made with.
         artist_id = case when collective then artist_id
                          when p_type = 'content' then p_artist_id
                          else artist_id end
   where id = p_project_id
  returning organization_id into v_org;

  -- RLS filtered the row out: launched, invisible, or no right.
  if v_org is null then
    raise exception 'project_not_editable';
  end if;

  if v_collective then
    -- The main artist changes by its own gesture (its rights and checks);
    -- none given (a caller without the field) or the same: kept. The form
    -- asks for it, so an emptied field is refused there.
    if p_artist_id is not null and p_artist_id is distinct from v_main_artist then
      perform public.set_project_main_artist(p_project_id, p_artist_id);
    end if;

    delete from public.project_masters pm
     where pm.project_id = p_project_id and not (pm.master_id = any (v_ids));
    insert into public.project_masters (organization_id, project_id, master_id, position)
    select v_org, p_project_id, m.id,
           (select coalesce(max(pm.position), 0) from public.project_masters pm
             where pm.project_id = p_project_id)
             + row_number() over (order by m.first_seen)::integer
    from (
      select u.id, min(u.ordinality) as first_seen
      from unnest(v_ids) with ordinality as u (id, ordinality)
      group by u.id
    ) m
    where not exists (select 1 from public.project_masters pm
                       where pm.project_id = p_project_id and pm.master_id = m.id);
    return;
  end if;

  delete from public.project_masters where project_id = p_project_id;
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select v_org, p_project_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;
end;
$$;

-- 4. The main artist is never a guest of the project -------------------------------

-- As 20261111100101, plus: an artist with a participation neither declined
-- nor withdrawn on a title of the project is refused.
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
end;
$$;
revoke execute on function public.set_project_main_artist(uuid, uuid) from public, anon;
grant execute on function public.set_project_main_artist(uuid, uuid) to authenticated;

-- As 20261111140101, plus: a participation of the main artist, declined or
-- withdrawn, is not brought back (main_artist_not_participant, as when it
-- is added).
create or replace function public.set_title_participation_status(
  p_participation_id uuid,
  p_status text,
  p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title_id uuid;
  v_project_id uuid;
  v_title public.project_titles%rowtype;
  v_from text;
  v_note text := public.clean_participation_note(p_note);
begin
  select tp.title_id, tp.project_id into v_title_id, v_project_id
    from public.title_participations tp where tp.id = p_participation_id;
  if v_title_id is null or not public.can_see_project(v_project_id) then
    raise exception 'participation_not_found' using errcode = 'P0002';
  end if;
  v_title := public.lock_project_title(v_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if p_status is null
     or p_status not in ('proposed', 'invited', 'confirmed', 'declined', 'withdrawn') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select tp.status into v_from from public.title_participations tp
   where tp.id = p_participation_id for update;
  if v_from = p_status then
    raise exception 'status_unchanged' using errcode = 'P0001';
  end if;
  if p_status not in ('declined', 'withdrawn')
     and exists (select 1 from public.title_participations tp
                   join public.projects p on p.id = tp.project_id
                  where tp.id = p_participation_id and p.artist_id = tp.artist_id) then
    raise exception 'main_artist_not_participant' using errcode = '23514';
  end if;

  update public.title_participations
     set status = p_status,
         decided_by = public.auth_person_id(),
         decided_at = now(),
         note = coalesce(v_note, note)
   where id = p_participation_id;
  perform public.log_project_title_event(v_title_id, 'participation_status',
    public.title_participation_snapshot(p_participation_id)
      || jsonb_build_object('from', v_from, 'to', p_status, 'note', v_note));
  if p_status = 'confirmed' then
    return public.credit_title_participations(v_title_id, p_participation_id);
  end if;
  return 0;
end;
$$;
revoke execute on function public.set_title_participation_status(uuid, text, text) from public, anon;
grant execute on function public.set_title_participation_status(uuid, text, text) to authenticated;
