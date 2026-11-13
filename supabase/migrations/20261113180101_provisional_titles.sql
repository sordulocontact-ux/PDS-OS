-- Projet collectif, lot 7 (docs/pds-mic-plan.md § 3.3, décision 3, voie A):
-- a title of a collective without a name gets its title in the Catalogue
-- when its work starts, under a provisional name.
--
--   1. masters.title_is_provisional: a name given by PDS OS while waiting
--      for the real one (never written by the browser: no column grant).
--      Any rename of the master ends it (trigger), whoever renames it: the
--      title named in the project, the Catalogue's form, « Passer au
--      catalogue des masters » (promote_demo).
--   2. ensure_project_title_master: a title of the project without a master
--      gets one at its first audio or its first session, a maquette in
--      draft (« Sans titre · Artiste · PDS MIC #12 », the title's first
--      artist in play, else the project's main artist), credited to the
--      main artist in « main » (master_requires_artist); its confirmed
--      guests follow in « featuring » (c_credit_participations, lot 3). The
--      title links it (project_masters, so its Master history is kept) and
--      becomes active. Returns the master, the one it already had if any.
--   3. rename_project_title: naming the title names its provisional master.
--   4. attach_master_to_project_title: a title of the Catalogue for a title
--      of the project that has none yet (gap found at lot 2), same checks as
--      add_project_title.
--   5. Two more kinds of history (cataloged, master_attached) and the
--      provisional mark in each event's snapshot, so the Activité keeps
--      saying « Titre 3 · sans nom » rather than the provisional name.
--
-- Any other project: no title row, nothing here applies (every gesture
-- starts from projects.collective). No table added: delete_project_row
-- unchanged.

-- 1 ------------------------------------------------------------------------------------------
alter table public.masters
  add column title_is_provisional boolean not null default false;

create or replace function public.masters_provisional_named()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.title_is_provisional and new.title is distinct from old.title then
    new.title_is_provisional := false;
  end if;
  return new;
end;
$$;
revoke execute on function public.masters_provisional_named() from public, anon, authenticated;

create trigger b_provisional_named before update of title on public.masters
  for each row execute function public.masters_provisional_named();

-- 5 (the snapshot first: the functions below log with it) ---------------------------------
create or replace function public.project_title_snapshot(p_title_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'position', t.position,
           'working_title', t.working_title,
           'master_title', m.title,
           'master_provisional', coalesce(m.title_is_provisional, false))
    from public.project_titles t
    left join public.masters m on m.id = t.master_id
   where t.id = p_title_id;
$$;
revoke execute on function public.project_title_snapshot(uuid) from public, anon, authenticated;

alter table public.project_title_events
  drop constraint project_title_events_kind_check,
  add constraint project_title_events_kind_check
    check (kind in ('added', 'renamed', 'abandoned', 'reactivated',
                    'participation_added', 'participation_status',
                    'main_artist_changed', 'cataloged', 'master_attached'));

-- 2 ------------------------------------------------------------------------------------------
-- « Sans titre · Nadia Sel · PDS MIC #5 »: the title's first artist in play
-- (a participation neither declined nor withdrawn), else the main artist.
create or replace function public.provisional_title_name(p_title_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(concat_ws(' · ', 'Sans titre',
           coalesce(
             (select a.name
                from public.title_participations tp
                join public.artists a on a.id = tp.artist_id
               where tp.title_id = t.id and tp.status not in ('declined', 'withdrawn')
               order by tp.created_at, tp.id
               limit 1),
             (select a.name from public.artists a where a.id = p.artist_id)),
           p.title), 200)
    from public.project_titles t
    join public.projects p on p.id = t.project_id
   where t.id = p_title_id;
$$;
revoke execute on function public.provisional_title_name(uuid) from public, anon, authenticated;

-- Who starts a title's work: who writes the collective's titles (its owner
-- once launched, who creates projects before), or who runs studio sessions
-- (manage_sessions: a session can be planned for any project).
create or replace function public.ensure_project_title_master(p_title_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_project public.projects%rowtype;
  v_title public.project_titles%rowtype;
  v_name text;
  v_master uuid;
begin
  select t.project_id into v_project_id from public.project_titles t where t.id = p_title_id;
  if v_project_id is null or not public.can_see_project(v_project_id) then
    raise exception 'title_not_found' using errcode = 'P0002';
  end if;
  -- One numbering of the project's links at a time (as add_project_title).
  select * into v_project from public.projects where id = v_project_id for update;
  if v_project.archived_at is not null
     or not (public.is_project_owner(v_project_id)
             or (public.has_permission(v_project.organization_id, 'create_projects')
                 and not public.is_project_launched(v_project_id))
             or public.has_permission(v_project.organization_id, 'manage_sessions')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  select * into v_title from public.project_titles where id = p_title_id for update;
  if v_title.master_id is not null then
    return v_title.master_id;
  end if;
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_project.artist_id is null then
    raise exception 'main_artist_required' using errcode = '23514';
  end if;

  v_name := public.provisional_title_name(p_title_id);
  insert into public.masters (organization_id, title, demo_status, title_is_provisional)
  values (v_project.organization_id, v_name, 'draft', true)
  returning id into v_master;
  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  values (v_project.organization_id, v_master, v_project.artist_id, 'main', 1);

  -- The title first, then its link (as add_project_title): the link's check
  -- waits for both, within this call only. Its confirmed guests are credited
  -- by c_credit_participations.
  set constraints public.project_titles_link deferred;
  update public.project_titles
     set master_id = v_master,
         status = case when status = 'planned' then 'active' else status end
   where id = p_title_id;
  insert into public.project_masters (organization_id, project_id, master_id, position)
  values (v_project.organization_id, v_project_id, v_master,
          (select coalesce(max(pm.position), 0) + 1 from public.project_masters pm
            where pm.project_id = v_project_id));
  set constraints public.project_titles_link immediate;

  perform public.log_project_title_event(p_title_id, 'cataloged');
  return v_master;
end;
$$;
revoke execute on function public.ensure_project_title_master(uuid) from public, anon;
grant execute on function public.ensure_project_title_master(uuid) to authenticated;

-- 3 ------------------------------------------------------------------------------------------
-- As 20261111120101, plus: a name given to a title whose master is
-- provisional names the master too (no longer provisional). Back to « sans
-- nom » leaves the master's name as it is.
create or replace function public.rename_project_title(
  p_title_id uuid,
  p_working_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_name text := public.clean_title_name(p_working_title);
  v_named boolean := false;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_name is not distinct from v_title.working_title then
    return;
  end if;
  update public.project_titles set working_title = v_name where id = p_title_id;
  if v_name is not null and v_title.master_id is not null then
    update public.masters
       set title = v_name
     where id = v_title.master_id and title_is_provisional and archived_at is null;
    v_named := found;
  end if;
  perform public.log_project_title_event(p_title_id, 'renamed',
    jsonb_build_object('from', v_title.working_title, 'to', v_name, 'master_named', v_named));
end;
$$;
revoke execute on function public.rename_project_title(uuid, text) from public, anon;
grant execute on function public.rename_project_title(uuid, text) to authenticated;

-- 4 ------------------------------------------------------------------------------------------
-- « Rattacher un titre du Catalogue »: a title of the project without a
-- master takes one of the Catalogue (who writes the titles, as
-- add_project_title; never a title that has one, never an abandoned one).
create or replace function public.attach_master_to_project_title(
  p_title_id uuid,
  p_master_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_project public.projects%rowtype;
  v_linked boolean;
begin
  v_title := public.lock_project_title(p_title_id);
  select * into v_project from public.projects where id = v_title.project_id;
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_title.master_id is not null then
    raise exception 'title_has_master' using errcode = 'P0001';
  end if;
  if p_master_id is null
     or not exists (select 1 from public.masters m
                     where m.id = p_master_id
                       and m.organization_id = v_project.organization_id
                       and m.archived_at is null) then
    raise exception 'master_not_found' using errcode = '23503';
  end if;
  if exists (select 1 from public.project_titles t
              where t.project_id = v_project.id and t.master_id = p_master_id) then
    raise exception 'title_already_in_project' using errcode = '23505';
  end if;
  v_linked := exists (select 1 from public.project_masters pm
                       where pm.project_id = v_project.id and pm.master_id = p_master_id);
  if not v_linked then
    perform public.check_project_shape(
      v_project.type,
      array(select pm.master_id from public.project_masters pm
             where pm.project_id = v_project.id) || p_master_id,
      v_project.music_format);
  end if;

  set constraints public.project_titles_link deferred;
  update public.project_titles
     set master_id = p_master_id,
         status = case when status = 'planned' then 'active' else status end
   where id = p_title_id;
  if not v_linked then
    insert into public.project_masters (organization_id, project_id, master_id, position)
    values (v_project.organization_id, v_project.id, p_master_id,
            (select coalesce(max(pm.position), 0) + 1 from public.project_masters pm
              where pm.project_id = v_project.id));
  end if;
  set constraints public.project_titles_link immediate;

  perform public.log_project_title_event(p_title_id, 'master_attached');
end;
$$;
revoke execute on function public.attach_master_to_project_title(uuid, uuid) from public, anon;
grant execute on function public.attach_master_to_project_title(uuid, uuid) to authenticated;
