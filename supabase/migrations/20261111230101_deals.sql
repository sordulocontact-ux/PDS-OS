-- Business module, lot BIZ 2 (ticket « Module Business, négociations et
-- Business Manager », Ibé 10/11/2026; decisions of 11/11/2026): the Deal.
--
-- A deal is NOT a project: a commercial file of its own, with its own rights.
-- In a launched project only its owner writes; the business manager (Glen)
-- is not its owner, so he writes on the DEAL, never in the project.
--
--   1. deals: the kind (only « music » is created in V1; brand_partnership and
--      label later — never « influence », the word is the influence PDS buys),
--      what it is about (a participation of a collective, else a project
--      and/or an artist), who negotiates it (assignee: a member holding
--      « negotiate »), its stage, the next action (text and date) and the
--      follow-up date.
--   2. Stages: to_contact → call_planned → negotiation → agreement (accord de
--      principe) → contracting → signed; or abandoned (reason required, the
--      history stays). The agreement is a STAGE: the business manager
--      proposes it (agreement_status pending), the direction validates it
--      (« validate ») or sends it back to negotiation with a reason. Only
--      functions change a stage.
--   3. A participation's deal reads its contract on
--      title_participations.contract_id, never copied here; nothing is added
--      to title_participations (the key is on this side, docs/pds-mic-plan.md
--      § 0 ter).
--   4. Rights: the direction (« validate ») reads and writes every deal; the
--      assignee reads and writes his own while he holds « negotiate »; the
--      owner of the linked project reads it. Assigning: the direction or the
--      owner of the linked project. Creating: the same. Anyone else: the deal
--      does not exist (« deal_not_found »).
--   5. deal_events: the journal (author, date, transition, reason).
--   6. delete_project_row takes a project's deals; project_live follows them.

-- 1. The deals ----------------------------------------------------------------------

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  kind text not null default 'music',
  -- What it is about: a participation (its project and artist copied from it
  -- at creation, so every reading names them), else a project and/or an
  -- artist.
  participation_id uuid references public.title_participations (id),
  project_id uuid,
  artist_id uuid,
  assignee_person_id uuid references public.people (id),
  stage text not null default 'to_contact',
  -- The accord de principe: proposed (pending) then validated by the
  -- direction; null before it. Kept « validated » through contracting and
  -- signature.
  agreement_status text,
  agreement_decided_by uuid references public.people (id),
  agreement_decided_at timestamptz,
  abandon_reason text,
  abandoned_by uuid references public.people (id),
  abandoned_at timestamptz,
  -- The next action (« Appeler son manager ») and its date; the follow-up
  -- date (« relancer le … »): the daily job tells the assignee once (BIZ 4).
  next_action text,
  next_action_on date,
  follow_up_on date,
  follow_up_notified_on date,
  stage_changed_by uuid references public.people (id),
  stage_changed_at timestamptz not null default now(),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_id_org_key unique (id, organization_id),
  constraint deals_kind_check check (kind in ('music', 'brand_partnership', 'label')),
  constraint deals_stage_check
    check (stage in ('to_contact', 'call_planned', 'negotiation', 'agreement',
                     'contracting', 'signed', 'abandoned')),
  constraint deals_agreement_status_check
    check (agreement_status is null or agreement_status in ('pending', 'validated')),
  -- No agreement before its stage; a validated one to contract and sign.
  constraint deals_agreement_stage_check
    check (case stage
             when 'agreement' then agreement_status is not null
             when 'contracting' then agreement_status = 'validated'
             when 'signed' then agreement_status = 'validated'
             when 'abandoned' then true
             else agreement_status is null
           end),
  constraint deals_abandon_check
    check ((stage = 'abandoned') = (abandon_reason is not null)),
  constraint deals_abandon_reason_check
    check (abandon_reason is null
           or (btrim(abandon_reason) <> '' and char_length(abandon_reason) <= 2000)),
  constraint deals_subject_check
    check (participation_id is not null or project_id is not null or artist_id is not null),
  constraint deals_participation_project_check
    check (participation_id is null or project_id is not null),
  constraint deals_next_action_check
    check (next_action is null
           or (btrim(next_action) <> '' and char_length(next_action) <= 500)),
  constraint deals_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint deals_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

-- One live deal per participation (an abandoned one stays beside a new one).
create unique index deals_open_participation_key on public.deals (participation_id)
  where participation_id is not null and stage <> 'abandoned';
create index deals_assignee_idx on public.deals (assignee_person_id)
  where assignee_person_id is not null;
create index deals_project_idx on public.deals (project_id) where project_id is not null;
create index deals_artist_idx on public.deals (artist_id) where artist_id is not null;

comment on table public.deals is
  'Business module (BIZ 2): a negotiation file, not a project. Written through create_deal, assign_deal, set_deal_stage, decide_deal_agreement, abandon_deal, set_deal_next_action only. A participation''s contract is read on title_participations.contract_id, never copied here.';

create trigger a_set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

-- 2. The journal -----------------------------------------------------------------------

create table public.deal_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid not null,
  kind text not null,
  from_stage text,
  to_stage text,
  reason text,
  detail jsonb not null default '{}'::jsonb,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint deal_events_kind_check
    check (kind in ('created', 'assigned', 'stage', 'agreement_validated',
                    'agreement_refused', 'abandoned', 'next_action', 'term')),
  constraint deal_events_reason_check check (reason is null or char_length(reason) <= 2000),
  constraint deal_events_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade
);

create index deal_events_deal_idx on public.deal_events (deal_id, created_at);

-- 3. Who reads, who writes ------------------------------------------------------------

-- The direction reads every deal; the assignee his own while he negotiates;
-- the owner of the linked project reads it.
create or replace function public.can_read_deal(p_org uuid, p_assignee uuid, p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(p_org, 'validate')
      or (p_assignee is not null and p_assignee = public.auth_person_id()
          and public.has_permission(p_org, 'negotiate'))
      or (p_project is not null and public.is_project_owner(p_project));
$$;
revoke execute on function public.can_read_deal(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_read_deal(uuid, uuid, uuid) to authenticated;

-- Writes on a deal (stage, next action, terms): the direction and its
-- assignee. The project's owner reads only.
create or replace function public.can_write_deal(p_org uuid, p_assignee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission(p_org, 'validate')
      or (p_assignee is not null and p_assignee = public.auth_person_id()
          and public.has_permission(p_org, 'negotiate'));
$$;
revoke execute on function public.can_write_deal(uuid, uuid) from public, anon;
grant execute on function public.can_write_deal(uuid, uuid) to authenticated;

alter table public.deals enable row level security;
alter table public.deals force row level security;
revoke all on table public.deals from anon, authenticated;
grant select on table public.deals to authenticated;
create policy deals_select on public.deals
  for select to authenticated
  using (public.can_read_deal(organization_id, assignee_person_id, project_id));

alter table public.deal_events enable row level security;
alter table public.deal_events force row level security;
revoke all on table public.deal_events from anon, authenticated;
grant select on table public.deal_events to authenticated;
-- Whoever reads the deal reads its journal (the deals policy applies).
create policy deal_events_select on public.deal_events
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

-- 4. Gestures ---------------------------------------------------------------------

create or replace function public.clean_deal_text(p_text text, p_max integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := nullif(btrim(p_text), '');
begin
  if char_length(v) > p_max then
    raise exception 'text_too_long' using errcode = '22023';
  end if;
  return v;
end;
$$;
revoke execute on function public.clean_deal_text(text, integer) from public, anon, authenticated;

create or replace function public.log_deal_event(
  p_deal public.deals,
  p_kind text,
  p_from text default null,
  p_to text default null,
  p_reason text default null,
  p_detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.deal_events
    (organization_id, deal_id, kind, from_stage, to_stage, reason, detail, actor_person_id)
  values (p_deal.organization_id, p_deal.id, p_kind, p_from, p_to, p_reason,
          coalesce(p_detail, '{}'::jsonb), public.auth_person_id());
$$;
revoke execute on function public.log_deal_event(public.deals, text, text, text, text, jsonb)
  from public, anon, authenticated;

-- The deal, locked, for a gesture: « deal_not_found » to whoever does not
-- read it (it does not exist for him), « forbidden » to a reader who does
-- not write it, « deal_closed » once signed or abandoned.
create or replace function public.lock_deal_for_write(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  select * into v from public.deals where id = p_deal_id for update;
  if not found or not public.can_read_deal(v.organization_id, v.assignee_person_id, v.project_id) then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if not public.can_write_deal(v.organization_id, v.assignee_person_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.stage in ('signed', 'abandoned') then
    raise exception 'deal_closed' using errcode = 'P0001';
  end if;
  return v;
end;
$$;
revoke execute on function public.lock_deal_for_write(uuid) from public, anon, authenticated;

-- Who may be given a deal: an active member holding « negotiate ».
create or replace function public.check_deal_assignee(p_org uuid, p_person_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_person_id is not null
     and not public.person_has_permission(p_org, p_person_id, 'negotiate') then
    raise exception 'assignee_cannot_negotiate' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.check_deal_assignee(uuid, uuid) from public, anon, authenticated;

-- « Nouveau deal »: by the direction, or by the owner of the linked project.
-- A participation names its project and artist (a project or an artist
-- given beside it must be the same). Only « music » in V1. Returns the deal.
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
    v_org := v_part.organization_id;
    v_project := v_part.project_id;
    v_artist := v_part.artist_id;
  elsif v_project is not null then
    select p.organization_id into v_org from public.projects p where p.id = v_project;
    if v_org is null or not public.can_see_project(v_project) then
      raise exception 'project_not_found' using errcode = 'P0002';
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
revoke execute on function public.create_deal(uuid, uuid, uuid, uuid, text, text, date) from public, anon;
grant execute on function public.create_deal(uuid, uuid, uuid, uuid, text, text, date) to authenticated;

-- « Affecter »: the direction or the owner of the linked project; to a
-- member who negotiates (null takes it back). An open deal only.
create or replace function public.assign_deal(
  p_deal_id uuid,
  p_assignee_person_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  select * into v from public.deals where id = p_deal_id for update;
  if not found or not public.can_read_deal(v.organization_id, v.assignee_person_id, v.project_id) then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if not (public.has_permission(v.organization_id, 'validate')
          or (v.project_id is not null and public.is_project_owner(v.project_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.stage in ('signed', 'abandoned') then
    raise exception 'deal_closed' using errcode = 'P0001';
  end if;
  if v.assignee_person_id is not distinct from p_assignee_person_id then
    raise exception 'assignee_unchanged' using errcode = 'P0001';
  end if;
  perform public.check_deal_assignee(v.organization_id, p_assignee_person_id);

  update public.deals set assignee_person_id = p_assignee_person_id
   where id = p_deal_id returning * into v;
  perform public.log_deal_event(v, 'assigned', null, null, null,
    jsonb_build_object('assignee', p_assignee_person_id));
end;
$$;
revoke execute on function public.assign_deal(uuid, uuid) from public, anon;
grant execute on function public.assign_deal(uuid, uuid) to authenticated;

-- « Passer à l'étape … »: the direction or the assignee, an open deal, any
-- open stage forward or back, then « signed » from contracting only.
-- Contracting asks a validated agreement. Moving to « agreement » proposes
-- it (pending); the direction proposing it validates it at once. Going back
-- before it forgets it. Abandoning has its own gesture (a reason).
create or replace function public.set_deal_stage(
  p_deal_id uuid,
  p_stage text,
  p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_from text;
  v_note text := public.clean_deal_text(p_note, 2000);
  v_director boolean;
  v_agreement text;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if p_stage is null
     or p_stage not in ('to_contact', 'call_planned', 'negotiation', 'agreement',
                        'contracting', 'signed') then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  if p_stage = v.stage then
    raise exception 'stage_unchanged' using errcode = 'P0001';
  end if;
  v_from := v.stage;
  v_director := public.has_permission(v.organization_id, 'validate');

  v_agreement := case p_stage
    when 'agreement' then case when v_director then 'validated' else 'pending' end
    when 'contracting' then v.agreement_status
    when 'signed' then v.agreement_status
    else null
  end;
  if p_stage = 'contracting' and v.agreement_status is distinct from 'validated' then
    raise exception 'agreement_not_validated' using errcode = 'P0001';
  end if;
  if p_stage = 'signed' and v_from <> 'contracting' then
    raise exception 'not_contracting' using errcode = 'P0001';
  end if;

  update public.deals
     set stage = p_stage,
         agreement_status = v_agreement,
         agreement_decided_by = case when p_stage = 'agreement' and v_director
                                     then public.auth_person_id()
                                     when v_agreement is null then null
                                     else agreement_decided_by end,
         agreement_decided_at = case when p_stage = 'agreement' and v_director then now()
                                     when v_agreement is null then null
                                     else agreement_decided_at end,
         stage_changed_by = public.auth_person_id(),
         stage_changed_at = now()
   where id = p_deal_id
  returning * into v;
  perform public.log_deal_event(v, 'stage', v_from, p_stage, v_note,
    case when p_stage = 'agreement' then jsonb_build_object('agreement', v_agreement)
         else '{}'::jsonb end);
end;
$$;
revoke execute on function public.set_deal_stage(uuid, text, text) from public, anon;
grant execute on function public.set_deal_stage(uuid, text, text) to authenticated;

-- The direction decides a proposed accord de principe: validated, or sent
-- back to negotiation with a reason.
create or replace function public.decide_deal_agreement(
  p_deal_id uuid,
  p_approve boolean,
  p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_reason text := public.clean_deal_text(p_reason, 2000);
begin
  select * into v from public.deals where id = p_deal_id for update;
  if not found or not public.can_read_deal(v.organization_id, v.assignee_person_id, v.project_id) then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.stage <> 'agreement' or v.agreement_status is distinct from 'pending' then
    raise exception 'no_agreement_pending' using errcode = 'P0001';
  end if;
  if p_approve is null then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  if p_approve then
    update public.deals
       set agreement_status = 'validated',
           agreement_decided_by = public.auth_person_id(),
           agreement_decided_at = now()
     where id = p_deal_id returning * into v;
    perform public.log_deal_event(v, 'agreement_validated', null, null, v_reason);
  else
    if v_reason is null then
      raise exception 'reason_required' using errcode = '22023';
    end if;
    update public.deals
       set stage = 'negotiation',
           agreement_status = null,
           agreement_decided_by = null,
           agreement_decided_at = null,
           stage_changed_by = public.auth_person_id(),
           stage_changed_at = now()
     where id = p_deal_id returning * into v;
    perform public.log_deal_event(v, 'agreement_refused', 'agreement', 'negotiation', v_reason);
  end if;
end;
$$;
revoke execute on function public.decide_deal_agreement(uuid, boolean, text) from public, anon;
grant execute on function public.decide_deal_agreement(uuid, boolean, text) to authenticated;

-- « Abandonner »: the direction or the assignee, a reason always; the deal
-- and its history stay.
create or replace function public.abandon_deal(p_deal_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_from text;
  v_reason text := public.clean_deal_text(p_reason, 2000);
begin
  v := public.lock_deal_for_write(p_deal_id);
  if v_reason is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  v_from := v.stage;
  update public.deals
     set stage = 'abandoned',
         abandon_reason = v_reason,
         abandoned_by = public.auth_person_id(),
         abandoned_at = now(),
         stage_changed_by = public.auth_person_id(),
         stage_changed_at = now()
   where id = p_deal_id returning * into v;
  perform public.log_deal_event(v, 'abandoned', v_from, 'abandoned', v_reason);
end;
$$;
revoke execute on function public.abandon_deal(uuid, text) from public, anon;
grant execute on function public.abandon_deal(uuid, text) to authenticated;

-- « Prochaine action » and « Relancer le »: the direction or the assignee.
-- A date without its action is dropped; a new follow-up date is told again.
create or replace function public.set_deal_next_action(
  p_deal_id uuid,
  p_next_action text default null,
  p_next_action_on date default null,
  p_follow_up_on date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_next text := public.clean_deal_text(p_next_action, 500);
  v_on date := case when v_next is null then null else p_next_action_on end;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if v.next_action is not distinct from v_next
     and v.next_action_on is not distinct from v_on
     and v.follow_up_on is not distinct from p_follow_up_on then
    raise exception 'next_action_unchanged' using errcode = 'P0001';
  end if;
  update public.deals
     set next_action = v_next,
         next_action_on = v_on,
         follow_up_on = p_follow_up_on,
         follow_up_notified_on = case when follow_up_on is not distinct from p_follow_up_on
                                      then follow_up_notified_on end
   where id = p_deal_id returning * into v;
  perform public.log_deal_event(v, 'next_action', null, null, null,
    jsonb_build_object('next_action', v_next, 'next_action_on', v_on,
                       'follow_up_on', p_follow_up_on));
end;
$$;
revoke execute on function public.set_deal_next_action(uuid, text, date, date) from public, anon;
grant execute on function public.set_deal_next_action(uuid, text, date, date) to authenticated;

-- 4 bis. Reading a deal's context ------------------------------------------------------

-- The members a deal may be given to (active, holding « negotiate »), for
-- who assigns: the direction and the project managers.
create or replace function public.list_deal_negotiators()
returns table (person_id uuid, first_name text, last_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name, m.role
    from public.memberships m
    join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
    join public.people p on p.id = m.person_id
   where m.status = 'approved'
     and 'negotiate' = any (public.role_permissions(m.role))
     and (public.has_permission(m.organization_id, 'validate')
          or public.has_permission(m.organization_id, 'pilot_projects'))
   order by p.first_name, p.last_name;
$$;
revoke execute on function public.list_deal_negotiators() from public, anon;
grant execute on function public.list_deal_negotiators() to authenticated;

-- What a deal is about, for whoever reads it, even without seeing its
-- project (the business manager sees no project): the project's name and
-- whether the reader may open it, the participation's title, status and
-- contract status (the contract is the participation's, décision 3). Never
-- a contact (docs/pds-mic-plan.md décision 5).
create or replace function public.read_deal_context(p_deal_ids uuid[])
returns table (
  deal_id uuid,
  project_title text,
  project_visible boolean,
  project_owner_id uuid,
  title_id uuid,
  title_label text,
  title_position integer,
  participation_status text,
  contract_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, p.title, coalesce(public.can_see_project(p.id), false), p.owner_person_id,
         t.id, coalesce(m.title, t.working_title), t.position,
         tp.status, c.status
    from public.deals d
    left join public.projects p on p.id = d.project_id
    left join public.title_participations tp on tp.id = d.participation_id
    left join public.project_titles t on t.id = tp.title_id
    left join public.masters m on m.id = t.master_id
    left join public.contracts c on c.id = tp.contract_id
   where d.id = any (p_deal_ids)
     and public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id);
$$;
revoke execute on function public.read_deal_context(uuid[]) from public, anon;
grant execute on function public.read_deal_context(uuid[]) to authenticated;

-- 5. delete_project_row: a project's deals before its participations -----------------

-- Unchanged from 20261111140101 but for the line « deals ».
create or replace function public.delete_project_row(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls where project_id = p_project_id;
  select coalesce(array_agg(id), '{}') into v_contracts
    from public.contracts where project_id = p_project_id;

  -- Tables of the abandoned "Cadrage intelligent" branch (04/10/2026), not
  -- created by these migrations but still present in some local databases:
  -- emptied for the project when they exist, children first.
  foreach v_table in array array['master_versions', 'master_workflows', 'brief_change_requests',
                                 'brief_versions'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where project_id = $1', v_table) using p_project_id;
    end if;
  end loop;

  -- Cadrage intelligent (20261006000101, 20261006000201): the plan names the
  -- brief (its items cascade), a deadline names a report item, a brief names
  -- its validation, so they go before those. framing_calls cascades with calls.
  delete from public.project_plans where project_id = p_project_id;
  delete from public.framing_deadlines where project_id = p_project_id;
  delete from public.framing_briefs where project_id = p_project_id;

  -- Children before parents: a NO ACTION key is checked after each
  -- statement. ON DELETE CASCADE children are left to their parent.
  delete from public.activity_events where project_id = p_project_id;
  delete from public.tasks where project_id = p_project_id;
  delete from public.budget_lines where project_id = p_project_id;
  delete from public.design_versions where project_id = p_project_id;
  delete from public.milestones where project_id = p_project_id;
  delete from public.strategy_deliverables where project_id = p_project_id;
  delete from public.levers where project_id = p_project_id;
  delete from public.needs where project_id = p_project_id;
  delete from public.field_values where project_id = p_project_id;
  delete from public.framing_constraints where project_id = p_project_id;
  delete from public.open_points where project_id = p_project_id;
  delete from public.project_team_members where project_id = p_project_id;

  delete from public.report_items
   where report_id in (select id from public.call_reports where call_id = any (v_calls));
  delete from public.call_reports where call_id = any (v_calls);
  delete from public.transcripts where call_id = any (v_calls);
  delete from public.calls where id = any (v_calls);

  delete from public.validations
   where project_stage_id in (select id from public.project_stages
                               where project_id = p_project_id);
  delete from public.project_stages where project_id = p_project_id;

  delete from public.legal_clearances where project_id = p_project_id;
  delete from public.legal_facts where project_id = p_project_id;
  delete from public.legal_answers where project_id = p_project_id;
  delete from public.legal_intakes where project_id = p_project_id;
  delete from public.legal_plan_events where project_id = p_project_id;
  delete from public.legal_plan_items where project_id = p_project_id;
  delete from public.legal_plans where project_id = p_project_id;
  delete from public.legal_form_submissions where project_id = p_project_id;
  delete from public.legal_forms where project_id = p_project_id;
  delete from public.legal_agreement_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.legal_split_sheets where project_id = p_project_id;
  delete from public.legal_formalities where project_id = p_project_id;

  delete from public.legal_clearance_contracts where contract_id = any (v_contracts);
  delete from public.financial_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contract_files where contract_id = any (v_contracts);
  delete from public.contract_events
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contracts where id = any (v_contracts);

  delete from public.project_files where project_id = p_project_id;
  delete from public.releases where project_id = p_project_id;
  delete from public.share_links where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
  -- Business module (20261111230101): a project's deals (their journal and
  -- terms cascade) name its participations, so they go first.
  delete from public.deals where project_id = p_project_id;
  -- Projet collectif (20261111120101, 20261111140101): the participations
  -- name their titles, the titles hold their links (on delete restrict), so
  -- they go before the cascade takes the links.
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;

-- 6. The project's pages follow its deals -----------------------------------------------

select public.attach_project_live();
