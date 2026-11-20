-- Business, réunion avec Ibé du 18/11/2026 (1:09:26 à 1:17:19) and his ticket
-- PDSBIZ (10/11/2026, « Moteur commun, dossiers typés », PDSBIZ-002): a deal
-- is opened with an organization, not only on an artist — « un deal maison de
-- disques, nouvelle opportunité de deal pour tel artiste ».
--
--   1. deals.counterpart_contact_id: the organization PDS negotiates with
--      (a label, a brand, an agency), an organization of the Réseau, linked
--      by its id (never a name typed). A contact still named by a deal is
--      never deleted (delete_records reads the key as « contact_in_use »).
--   2. The kinds « label » (licence, distribution, catalogue, accord maison
--      de disques) and « brand_partnership » (partenariat de marque; never
--      « influence », the word of the influence PDS buys) are created now,
--      always with their counterpart; a participation stays a music deal's.
--      The artist (the talent) and a project are optional beside it.
--   3. create_deal takes the counterpart. Who may open a deal is unchanged:
--      the direction, the owner of its project, or the business manager for
--      a deal without a project (his own).

-- 1 ------------------------------------------------------------------------------------------
alter table public.deals
  add column counterpart_contact_id uuid,
  add constraint deals_counterpart_same_org
    foreign key (counterpart_contact_id, organization_id)
    references public.network_contacts (id, organization_id);

create index deals_counterpart_idx on public.deals (counterpart_contact_id)
  where counterpart_contact_id is not null;

comment on column public.deals.counterpart_contact_id is
  'The organization of the Réseau PDS negotiates with (label, brand): required for a label or brand_partnership deal (Ibé 18/11/2026).';

-- 2 ------------------------------------------------------------------------------------------
alter table public.deals
  drop constraint deals_subject_check,
  add constraint deals_subject_check
    check (participation_id is not null or project_id is not null or artist_id is not null
           or counterpart_contact_id is not null),
  -- A label or a brand deal names who PDS negotiates with.
  add constraint deals_counterpart_check
    check (kind = 'music' or counterpart_contact_id is not null),
  -- A participation of a collective is negotiated as a music deal.
  add constraint deals_participation_kind_check
    check (participation_id is null or kind = 'music');

-- 3 ------------------------------------------------------------------------------------------
drop function public.create_deal(uuid, uuid, uuid, uuid, text, text, date);

create function public.create_deal(
  p_participation_id uuid default null,
  p_project_id uuid default null,
  p_artist_id uuid default null,
  p_assignee_person_id uuid default null,
  p_kind text default 'music',
  p_next_action text default null,
  p_next_action_on date default null,
  p_counterpart_contact_id uuid default null)
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
  v_counterpart_org uuid;
  v public.deals%rowtype;
begin
  if p_kind is null or p_kind not in ('music', 'brand_partnership', 'label') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_kind <> 'music' then
    if p_participation_id is not null then
      raise exception 'participation_music_only' using errcode = '22023';
    end if;
    if p_counterpart_contact_id is null then
      raise exception 'counterpart_required' using errcode = '22023';
    end if;
  end if;

  -- The counterpart: an organization of the Réseau, not archived, that the
  -- reader sees (its policy: a member of its organization).
  if p_counterpart_contact_id is not null then
    select c.organization_id into v_counterpart_org
      from public.network_contacts c
     where c.id = p_counterpart_contact_id
       and c.kind = 'organization'
       and c.archived_at is null
       and public.is_active_member(c.organization_id);
    if v_counterpart_org is null then
      raise exception 'counterpart_not_found' using errcode = 'P0002';
    end if;
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
    -- Out of play: declined, withdrawn, or its title abandoned.
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
    -- A collective's music deal goes through a participation
    -- (20261112130101). A label or brand deal is not an artist's
    -- participation: it may name a collective.
    if p_kind = 'music'
       and exists (select 1 from public.projects p where p.id = v_project and p.collective) then
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
  elsif v_counterpart_org is not null then
    v_org := v_counterpart_org;
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
  if v_counterpart_org is not null and v_counterpart_org <> v_org then
    raise exception 'counterpart_not_found' using errcode = 'P0002';
  end if;

  if public.has_permission(v_org, 'validate')
     or (v_project is not null and public.is_project_owner(v_project)) then
    null;
  -- The business manager opens a deal without a project (Ibé 12/11/2026):
  -- his own, so he reads it (can_read_deal); a project's or a collective's
  -- music deal is opened by the direction or its manager, then given to him.
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
      (organization_id, kind, stage, participation_id, project_id, artist_id,
       counterpart_contact_id, assignee_person_id, next_action, next_action_on,
       stage_changed_by, created_by)
    values (v_org, p_kind, v_stage, p_participation_id, v_project, v_artist,
            p_counterpart_contact_id, v_assignee, v_next,
            case when v_next is null then null else p_next_action_on end,
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
revoke execute on function public.create_deal(uuid, uuid, uuid, uuid, text, text, date, uuid)
  from public, anon;
grant execute on function public.create_deal(uuid, uuid, uuid, uuid, text, text, date, uuid)
  to authenticated;
