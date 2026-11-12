-- Business, retours d'Ibé du 12/11/2026 (19:15 et 19:17) :
--
--   1. « Les deals doivent pouvoir être ouverts par le business manager » :
--      a new permission « open_deals », his position's. He opens a deal on
--      an artist (no project): his own, so he reads it (can_read_deal); a
--      project's deal, and a collective's (through a participation), is
--      still opened by the direction or the project's manager, then given
--      to him. « business » (Thibault) does not get it: Ibé named the
--      business manager.
--   2. « Dans le cadre d'un PDS MIC, lorsque le BM reçoit une nouvelle
--      négociation de contrat à gérer, c'est un deal déjà à l'étape accepté,
--      donc en négociation » : the deal of a participation the artist has
--      accepted (confirmed) starts in negotiation; a deal opened before
--      moves to negotiation when its participation is confirmed (to_contact
--      or call_planned only: a deal further on is never sent back), with
--      its journal line, by whoever confirmed.

-- 1 ------------------------------------------------------------------------------------------
create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets',
            'manage_artist_budgets']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals']
    when 'business' then array['negotiate', 'manage_network']
    else array[]::text[]
  end;
$$;

-- 1 and 2 ------------------------------------------------------------------------------------
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
  v_assignee uuid := p_assignee_person_id;
  v_stage text := 'to_contact';
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
    -- The artist already accepted: the deal starts in negotiation (Ibé).
    if v_part.status = 'confirmed' then
      v_stage := 'negotiation';
    end if;
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

  if public.has_permission(v_org, 'validate')
     or (v_project is not null and public.is_project_owner(v_project)) then
    null;
  -- The business manager opens a deal on an artist (Ibé 12/11/2026): his
  -- own, so he reads it (can_read_deal); a project's or a collective's is
  -- opened by the direction or its manager, then given to him.
  elsif public.has_permission(v_org, 'open_deals') and v_project is null then
    if v_assignee is not null and v_assignee is distinct from public.auth_person_id() then
      raise exception 'assignee_not_self' using errcode = '42501';
    end if;
    v_assignee := public.auth_person_id();
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.check_deal_assignee(v_org, v_assignee);

  begin
    insert into public.deals
      (organization_id, kind, stage, participation_id, project_id, artist_id, assignee_person_id,
       next_action, next_action_on, stage_changed_by, created_by)
    values (v_org, p_kind, v_stage, p_participation_id, v_project, v_artist, v_assignee,
            v_next, case when v_next is null then null else p_next_action_on end,
            public.auth_person_id(), public.auth_person_id())
    returning * into v;
  exception when unique_violation then
    raise exception 'deal_exists' using errcode = '23505';
  end;

  perform public.log_deal_event(v, 'created', null, v_stage);
  if v_assignee is not null then
    perform public.log_deal_event(v, 'assigned', null, null, null,
      jsonb_build_object('assignee', v_assignee));
  end if;
  return v.id;
end;
$$;

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.deal_follows_participation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then
    return new;
  end if;
  for v in
    select * from public.deals
     where participation_id = new.id and stage in ('to_contact', 'call_planned')
     for update
  loop
    update public.deals
       set stage = 'negotiation', stage_changed_at = now(),
           stage_changed_by = public.auth_person_id()
     where id = v.id;
    perform public.log_deal_event(v, 'stage', v.stage, 'negotiation',
      null, jsonb_build_object('participation', 'confirmed'));
  end loop;
  return new;
end;
$$;
revoke execute on function public.deal_follows_participation() from public, anon, authenticated;
create trigger z_deal_follows after update of status on public.title_participations
  for each row execute function public.deal_follows_participation();
