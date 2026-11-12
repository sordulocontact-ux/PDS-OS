-- Business × projets collectifs (audit du 12/11/2026 : les lots BIZ et les
-- lots PDS MIC de Maël, codés en parallèle). Four fixes, no new table:
--
--   1. A deal tied to one of its project's contracts (deal_memos, BIZ 7)
--      blocked the project's deletion: delete_project_row deletes the
--      contracts before the deals and the key had no action. The contract
--      leaving clears the deal's link (on delete set null), as
--      title_participations does for its own.
--   2. A guest of a collective got a deal through « projet + artiste »,
--      outside his participation: no « one live deal per participation »,
--      and a contract of his own beside his participation's
--      (docs/pds-mic-plan.md § 0 ter, point 2: one source). An artist with
--      a participation still in play on the project goes through it.
--   3. A participation declined or withdrawn, or whose title is abandoned,
--      is out of play (Maël's « artistes du projet ») : no new deal on it.
--   4. attach_project_live() (deals, 20261111230101) also put zz_project_live
--      on personal_tasks, which Maël had left without it on purpose
--      (20261111120101, docs/ARCHITECTURE.md): removed again.

-- 1 ------------------------------------------------------------------------------------------
alter table public.deals drop constraint deals_contract_same_org;
alter table public.deals
  add constraint deals_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
    on delete set null (contract_id);

-- 2 and 3 ------------------------------------------------------------------------------------
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
    -- 2. An artist taking part in the project goes through his participation.
    if v_artist is not null
       and exists (select 1 from public.title_participations tp
                    join public.project_titles pt on pt.id = tp.title_id
                   where tp.project_id = v_project and tp.artist_id = v_artist
                     and tp.status not in ('declined', 'withdrawn')
                     and pt.status <> 'abandoned') then
      raise exception 'use_participation' using errcode = 'P0001';
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

-- 4 ------------------------------------------------------------------------------------------
drop trigger if exists zz_project_live on public.personal_tasks;
