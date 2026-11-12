-- Projet collectif × Business (test UX du 12/11/2026, « PDS MIC 5 »): a
-- collective was created without its guests unless they came from a
-- selection of artists, and the deal of a guest then went through « projet +
-- artiste », without his participation (no contract of the participation,
-- docs/pds-mic-plan.md § 0 ter point 2), without a word.
--
--   1. create_collective_project takes the guests named in the form
--      (p_guest_artist_ids, last, with a default: the code in production
--      keeps calling it as before), as a selection's artists: a title
--      without a name and a proposed participation each, through
--      add_project_title and add_title_participation (their checks and
--      history). Selection and guests together: each artist once, the main
--      artist never.
--   2. create_deal on a collective goes through a participation only:
--      « projet + artiste » or a project alone on a collective is refused
--      (collective_needs_participation); the guest is invited on a title
--      first. An artist alone (no project) is unchanged.

-- 1 ------------------------------------------------------------------------------------------
drop function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid);

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
  p_master_validator_person_id uuid default null,
  -- Guests named in the form (direction), beside or instead of a selection:
  -- each gets a title without a name and a proposed participation too.
  p_guest_artist_ids uuid[] default null
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

  -- The selection's live artists in its order, then the guests named in the
  -- form in theirs, each once and never the main artist: a title without a
  -- name and a proposed participation each.
  if exists (select 1 from unnest(coalesce(p_guest_artist_ids, '{}'::uuid[])) g (id)
              where not exists (select 1 from public.artists a
                                 where a.id = g.id and a.organization_id = p_organization_id
                                   and a.archived_at is null)) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;
  for v_artist in
    select artist_id from (
      select distinct on (artist_id) artist_id, rank
        from (
          select i.artist_id, i.position::bigint as rank
            from public.artist_selection_items i
            join public.artists a on a.id = i.artist_id
           where p_selection_id is not null
             and i.selection_id = p_selection_id
             and a.archived_at is null
          union all
          select g.id, 1000000 + g.ordinality
            from unnest(coalesce(p_guest_artist_ids, '{}'::uuid[])) with ordinality as g (id, ordinality)
        ) all_guests
       where artist_id <> p_main_artist_id
       order by artist_id, rank
    ) guests
    order by rank
  loop
    v_title := public.add_project_title(v_id);
    perform public.add_title_participation(v_title, v_artist);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid, uuid[])
  from public, anon;
grant execute on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid, uuid[])
  to authenticated;

comment on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid, uuid[]) is
  'Creates a collective project (docs/pds-mic-plan.md, lot 5): main artist, masters, transmission, creative directors; a selection''s artists and the guests named in the form, each once, as one untitled title and one proposed participation. By create_projects, or the selection''s holder with manage_catalog (then its manager, accepted at once).';

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.create_deal(
  p_participation_id uuid default null,
  p_project_id uuid default null,
  p_artist_id uuid default null,
  p_assignee_person_id uuid default null,
  p_kind text default 'music',
  p_next_action text default null,
  p_next_action_on date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_project uuid := p_project_id;
  v_artist uuid := p_artist_id;
  v_part public.title_participations%rowtype;
  v_next text := public.clean_deal_text(p_next_action, 500);
  v public.deals%rowtype;
begin
  if p_kind is null or p_kind not in ('music', 'brand_partnership', 'label') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_kind <> 'music' then
    raise exception 'deal_kind_unavailable' using errcode = '22023';
  end if;

  if p_participation_id is not null then
    select * into v_part from public.title_participations where id = p_participation_id;
    if not found or not public.can_see_project(v_part.project_id) then
      raise exception 'participation_not_found' using errcode = 'P0002';
    end if;
    if p_project_id is not null and p_project_id <> v_part.project_id then
      raise exception 'participation_other_project' using errcode = '23514';
    end if;
    if p_artist_id is not null and p_artist_id <> v_part.artist_id then
      raise exception 'participation_other_artist' using errcode = '23514';
    end if;
    -- 3. Out of play: declined, withdrawn, or its title abandoned.
    if v_part.status in ('declined', 'withdrawn')
       or exists (select 1 from public.project_titles pt
                   where pt.id = v_part.title_id and pt.status = 'abandoned') then
      raise exception 'participation_not_in_play' using errcode = 'P0001';
    end if;
    v_org := v_part.organization_id;
    v_project := v_part.project_id;
    v_artist := v_part.artist_id;
  elsif v_project is not null then
    select p.organization_id into v_org from public.projects p where p.id = v_project;
    if v_org is null or not public.can_see_project(v_project) then
      raise exception 'project_not_found' using errcode = 'P0002';
    end if;
    -- 2. A collective's deal goes through a participation (20261112130101):
    -- an artist already invited is sent to his (use_participation), any
    -- other to be invited on a title first.
    if exists (select 1 from public.projects p where p.id = v_project and p.collective) then
      if v_artist is not null
         and exists (select 1 from public.title_participations tp
                      join public.project_titles pt on pt.id = tp.title_id
                     where tp.project_id = v_project and tp.artist_id = v_artist
                       and tp.status not in ('declined', 'withdrawn')
                       and pt.status <> 'abandoned') then
        raise exception 'use_participation' using errcode = 'P0001';
      end if;
      raise exception 'collective_needs_participation' using errcode = 'P0001';
    end if;
  elsif v_artist is not null then
    select a.organization_id into v_org from public.artists a where a.id = v_artist;
  else
    raise exception 'deal_subject_required' using errcode = '22023';
  end if;

  if v_artist is not null
     and not exists (select 1 from public.artists a
                      where a.id = v_artist and a.archived_at is null
                        and (v_org is null or a.organization_id = v_org)) then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;
  if v_org is null then
    raise exception 'artist_not_found' using errcode = 'P0002';
  end if;

  if not (public.has_permission(v_org, 'validate')
          or (v_project is not null and public.is_project_owner(v_project))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.check_deal_assignee(v_org, p_assignee_person_id);

  begin
    insert into public.deals
      (organization_id, kind, participation_id, project_id, artist_id, assignee_person_id,
       next_action, next_action_on, stage_changed_by, created_by)
    values (v_org, p_kind, p_participation_id, v_project, v_artist, p_assignee_person_id,
            v_next, case when v_next is null then null else p_next_action_on end,
            public.auth_person_id(), public.auth_person_id())
    returning * into v;
  exception when unique_violation then
    raise exception 'deal_exists' using errcode = '23505';
  end;

  perform public.log_deal_event(v, 'created', null, 'to_contact');
  if p_assignee_person_id is not null then
    perform public.log_deal_event(v, 'assigned', null, null, null,
      jsonb_build_object('assignee', p_assignee_person_id));
  end if;
  return v.id;
end;
$$;
