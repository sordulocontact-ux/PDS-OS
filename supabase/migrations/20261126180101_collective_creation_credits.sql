-- Projet collectif, test de parcours du 26/11/2026 (docs/pds-mic-rapports/
-- test-parcours-26-11.md, M2, M3, M6; décisions de Maël du 26/11/2026, qui
-- remplacent celles du 23/11):
--
--   M2. At creation, a guest already credited on a title chosen (a master
--       of the Catalogue) gets their participation on that title, on each one
--       that credits them; no title without a name for them. A guest credited
--       on none keeps their title without a name, as before.
--   M3. At creation, each title chosen credits the project's main artist
--       in « main » at the head, and the guests of that title in
--       « featuring » (« PDS feat. Elio Danvers »): the credits missing are
--       added, a guest credited « main » becomes « featuring », the main
--       artist credited elsewhere than at the head moves up; no credit
--       twice (master_artists' key). A master also in a project that is not
--       collective is left as it is (décision 10: its single must not
--       change; « Crédits à vérifier au Catalogue »). After the creation,
--       credit_title_participations is unchanged (credits on confirmation,
--       adding only).
--   M6. A title's release is created dated by the project's due date (in
--       « Sorties individuelles », at the plan's launch or when a title gets
--       its master afterwards), still changed in « Sorties » and kept when
--       the due date moves. Replaces « en mode singles, l'échéance ne date
--       aucune sortie ». A release brought back keeps its date.

-- M3 -----------------------------------------------------------------------------------------
create or replace function public.credit_collective_title_at_creation(p_title_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_project uuid;
  v_master uuid;
  v_main uuid;
  v_changed integer := 0;
  v_rows integer;
begin
  select t.organization_id, t.project_id, t.master_id, p.artist_id
    into v_org, v_project, v_master, v_main
    from public.project_titles t
    join public.projects p on p.id = t.project_id and p.collective
   where t.id = p_title_id;
  if v_master is null or v_main is null
     or public.master_in_simple_project(v_master, v_project) then
    return 0;
  end if;
  -- One writer of the master's credits at a time.
  perform 1 from public.masters m where m.id = v_master and m.archived_at is null for update;
  if not found then
    return 0;
  end if;

  -- The main artist: credited « main » (added, or its role set).
  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select v_org, v_master, v_main, 'main',
         (select coalesce(max(ma.position), 0) + 1 from public.master_artists ma
           where ma.master_id = v_master)
   where not exists (select 1 from public.master_artists ma
                      where ma.master_id = v_master and ma.artist_id = v_main);
  get diagnostics v_rows = row_count;
  v_changed := v_changed + v_rows;
  update public.master_artists set role = 'main'
   where master_id = v_master and artist_id = v_main and role <> 'main';
  get diagnostics v_rows = row_count;
  v_changed := v_changed + v_rows;

  -- The title's guests: credited « featuring » (added after the others, or
  -- their role set).
  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select v_org, v_master, tp.artist_id, 'featuring',
         (select coalesce(max(ma.position), 0) from public.master_artists ma
           where ma.master_id = v_master)
           + row_number() over (order by tp.created_at, tp.id)::integer
    from public.title_participations tp
   where tp.title_id = p_title_id
     and tp.artist_id <> v_main
     and not exists (select 1 from public.master_artists ma
                      where ma.master_id = v_master and ma.artist_id = tp.artist_id);
  get diagnostics v_rows = row_count;
  v_changed := v_changed + v_rows;
  update public.master_artists ma set role = 'featuring'
   where ma.master_id = v_master and ma.role <> 'featuring'
     and ma.artist_id <> v_main
     and exists (select 1 from public.title_participations tp
                  where tp.title_id = p_title_id and tp.artist_id = ma.artist_id);
  get diagnostics v_rows = row_count;
  v_changed := v_changed + v_rows;

  -- The main artist at the head, the others in their order after it. In
  -- two steps, since (master_id, position) is checked row by row (and
  -- position >= 1).
  if exists (select 1 from public.master_artists ma
              where ma.master_id = v_master and ma.artist_id = v_main and ma.position <> 1) then
    update public.master_artists set position = position + 10000 where master_id = v_master;
    update public.master_artists ma set position = r.rank
      from (select artist_id,
                   row_number() over (order by (artist_id = v_main) desc, position)::integer as rank
              from public.master_artists where master_id = v_master) r
     where ma.master_id = v_master and ma.artist_id = r.artist_id;
  end if;
  return v_changed;
end;
$$;
revoke execute on function public.credit_collective_title_at_creation(uuid) from public, anon, authenticated;

-- M2, M3 -------------------------------------------------------------------------------------
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
  -- each gets a proposed participation, on the titles chosen that credit
  -- them, else on a title without a name.
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
  v_placed boolean;
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
    -- The holder: transmitted to themself and accepted at once (the launch,
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
  -- form in theirs, each once and never the main artist: a proposed
  -- participation on each title chosen that credits them (M2), else on a
  -- title without a name.
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
    v_placed := false;
    for v_title in
      select t.id from public.project_titles t
       where t.project_id = v_id
         and exists (select 1 from public.master_artists ma
                      where ma.master_id = t.master_id and ma.artist_id = v_artist)
       order by t.position
    loop
      perform public.add_title_participation(v_title, v_artist);
      v_placed := true;
    end loop;
    if not v_placed then
      v_title := public.add_project_title(v_id);
      perform public.add_title_participation(v_title, v_artist);
    end if;
  end loop;

  -- Each title chosen: the main artist at the head of its credits, its
  -- guests in featuring (M3).
  perform public.credit_collective_title_at_creation(t.id)
     from public.project_titles t
    where t.project_id = v_id and t.master_id is not null;

  return v_id;
end;
$$;

comment on function public.create_collective_project(uuid, text, text, uuid, uuid, uuid, uuid[], date, bigint, text, text, uuid[], text, uuid, uuid, uuid[]) is
  'Creates a collective project (docs/pds-mic-plan.md, lot 5): main artist, masters, transmission, creative directors; a selection''s artists and the guests named in the form, each once, as one proposed participation on each master chosen that credits them, else on one untitled title; each master chosen credits the main artist at the head and its guests in featuring (Maël 26/11/2026). By create_projects, or the selection''s holder with manage_catalog (then its manager, accepted at once).';

-- M6 -----------------------------------------------------------------------------------------
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
