-- Audit des parcours d'un collectif (28/11/2026, Distribution n° 1): a title
-- already named whose master was created provisional (« Sans titre · … ») could
-- never go out (title_provisional) and « Renommer » with the same name did
-- nothing. Its master now takes the title's name at its creation, the same name
-- given again names a provisional master, and the masters already created so
-- take their title's name.

-- 1 ------------------------------------------------------------------------------------------
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

  -- A title already named gives its name to its master, which is then not
  -- provisional (« Néons » created as « Sans titre · … » could never go out:
  -- audit du 28/11/2026).
  v_name := coalesce(v_title.working_title, public.provisional_title_name(p_title_id));
  insert into public.masters (organization_id, title, demo_status, title_is_provisional)
  values (v_project.organization_id, v_name, 'draft', v_title.working_title is null)
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

-- 2 ------------------------------------------------------------------------------------------
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
  -- The same name again still names a master left provisional (« Renommer »
  -- promised it, audit du 28/11/2026); otherwise nothing changes.
  if v_name is not distinct from v_title.working_title
     and (v_name is null or v_title.master_id is null
          or not exists (select 1 from public.masters m
                          where m.id = v_title.master_id and m.title_is_provisional)) then
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

-- 3 ------------------------------------------------------------------------------------------
-- The masters already created provisional for a named title: named after it.
update public.masters m
   set title = t.working_title,
       title_is_provisional = false
  from public.project_titles t
 where t.master_id = m.id
   and t.working_title is not null
   and m.title_is_provisional
   and m.archived_at is null;
