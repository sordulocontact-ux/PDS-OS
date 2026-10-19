-- Marketing › Activations as the proto « Projet complet » shows them (18/10/2026,
-- docs/projet-complet/activations.md, docs/ARCHITECTURE.md § 8 duodecies):
--
--   1. « Suspendre » / « Reprendre » come back (proto 18/10, after the merge of
--      11/10 into « Bloquée »): a suspension keeps the status it interrupted
--      and « Reprendre » returns to it, nothing lost; a reason is written.
--   2. « Déclarer réalisée » needs the campaign to have started for real: an
--      influence campaign in house needs a first publication of a creator, an
--      RP campaign in house a first message declared sent (proto
--      « Aucun créateur n'a encore publié : la campagne n'est pas réalisée. »).
--   3. A lever of the Brief de sortie may wait (« Plus tard »): the choice is
--      recorded by lever; the activation is created from Activations, one at
--      a time, by the project's owner (the Stratégie no longer creates them).
--   4. « Marquer comme transmis »: the framing and the press kit sent to the
--      agency outside PDS OS, declared by a person (journal only).
--   5. Notifications: the owner of an activation is told when it is given to
--      them or suspended.

-- 1. Statuses ------------------------------------------------------------------------------

alter table public.marketing_activations
  add column status_before_suspension text;

alter table public.marketing_activations
  drop constraint marketing_activations_status_check,
  drop constraint marketing_activations_reason_check;

alter table public.marketing_activations
  add constraint marketing_activations_status_check check (status in (
    'to_prepare', 'in_progress', 'done_declared', 'closed', 'cancelled', 'blocked',
    'suspended')),
  add constraint marketing_activations_reason_check check (
    (status in ('cancelled', 'blocked', 'suspended'))
      = (status_reason is not null and btrim(status_reason) <> '')
    and (status_reason is null or char_length(status_reason) <= 1000)),
  add constraint marketing_activations_suspension_check check (
    (status = 'suspended') = (status_before_suspension is not null)
    and (status_before_suspension is null or status_before_suspension in (
      'to_prepare', 'in_progress', 'done_declared', 'blocked')));

-- 2. The row check: the one of 20261011300101, plus the suspension and what
--    « Réalisée déclarée » needs from the module.
create or replace function public.marketing_activations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text[];
  v_resumed boolean := false;
begin
  if new.lever_id is not null and not exists (
       select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id)
     or new.deliverable_id is not null and not exists (
       select 1 from public.strategy_deliverables d
        where d.id = new.deliverable_id and d.project_id = new.project_id)
     or new.handoff_id is not null and not exists (
       select 1 from public.production_activation_handoffs h
        where h.id = new.handoff_id and h.project_id = new.project_id) then
    raise exception 'source_not_in_project' using errcode = '23514';
  end if;
  if new.owner_person_id is not null
     and not public.production_person_is_member(new.owner_person_id, new.organization_id) then
    raise exception 'owner_not_member' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'to_prepare' or new.closure_kind is not null
       or new.status_before_suspension is not null then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    return new;
  end if;
  if current_setting('pds.activation_closure', true) is distinct from 'on'
     and (new.closure_kind is distinct from old.closure_kind
          or new.closed_at is distinct from old.closed_at
          or new.closure_reserves is distinct from old.closure_reserves
          or (new.status = 'closed') <> (old.status = 'closed')) then
    raise exception 'use_close_activation' using errcode = '42501';
  end if;

  -- « Suspendre »: from a live status only; the interrupted one is kept.
  if new.status = 'suspended' and old.status <> 'suspended' then
    if old.status not in ('to_prepare', 'in_progress', 'done_declared', 'blocked') then
      raise exception 'invalid_transition' using errcode = '23514';
    end if;
    new.status_before_suspension := old.status;
  elsif old.status = 'suspended' and new.status <> 'suspended' then
    -- « Reprendre » returns where it was; cancelling stays possible.
    if new.status <> 'cancelled' and new.status <> old.status_before_suspension then
      raise exception 'invalid_transition' using errcode = '23514';
    end if;
    v_resumed := new.status <> 'cancelled';
    new.status_before_suspension := null;
    if new.status in ('to_prepare', 'in_progress', 'done_declared') then
      new.status_reason := null;
    end if;
  elsif new.status = 'suspended' then
    new.status_before_suspension := old.status_before_suspension;
  else
    new.status_before_suspension := null;
  end if;

  -- Starting : from À préparer or Bloquée to En cours or Réalisée déclarée.
  -- Read on the new row (an owner and a due date given in the same update
  -- count), blockers and dependencies as they are now.
  if old.status in ('to_prepare', 'blocked')
     and new.status in ('in_progress', 'done_declared') then
    v_missing := array_remove(array[
      case when new.owner_person_id is null then 'owner' end,
      case when new.due_on is null then 'due' end], null)
      || coalesce((select array_agg(m) from unnest(public.activation_launch_gaps(new.id)) m
                    where m in ('blocker', 'dependency')), '{}');
    if cardinality(v_missing) > 0 then
      raise exception 'activation_not_ready:%', array_to_string(v_missing, ',')
        using errcode = '23514';
    end if;
  end if;

  -- « Déclarer réalisée » (not a resumption): a campaign in house is done
  -- once it has really begun. Proof and statistics are read apart.
  if new.status = 'done_declared' and old.status <> 'done_declared' and not v_resumed
     and new.mode = 'internal' then
    if new.kind = 'influence' and not exists (
         select 1 from public.activation_evidence e
          where e.activation_id = new.id and e.target_id is not null
            and e.kind = 'publication' and e.withdrawn_at is null) then
      raise exception 'activation_not_done:no_publication' using errcode = '23514';
    end if;
    if new.kind = 'press' and not exists (
         select 1 from public.activation_messages m
          where m.activation_id = new.id and m.target_id is not null
            and m.status = 'sent_declared') then
      raise exception 'activation_not_done:no_message' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_activations_check() from public, anon, authenticated;

-- 3. Levers kept for later -------------------------------------------------------------------

create table public.activation_lever_choices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  lever_id uuid not null,
  -- « Plus tard »: the lever waits; creating its activation ends the wait.
  state text not null default 'later',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint activation_lever_choices_state_check check (state in ('later')),
  constraint activation_lever_choices_key unique (project_id, lever_id),
  constraint activation_lever_choices_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint activation_lever_choices_lever_same_org foreign key (lever_id, organization_id)
    references public.levers (id, organization_id) on delete cascade
);
create index activation_lever_choices_lever_idx on public.activation_lever_choices (lever_id);

create trigger a_set_created_by before insert on public.activation_lever_choices
  for each row execute function public.set_created_by();

alter table public.activation_lever_choices enable row level security;
alter table public.activation_lever_choices force row level security;
revoke all on table public.activation_lever_choices from anon, authenticated;
grant select, delete on public.activation_lever_choices to authenticated;
grant insert (organization_id, project_id, lever_id) on public.activation_lever_choices
  to authenticated;
create policy activation_lever_choices_select on public.activation_lever_choices
  for select to authenticated using (public.can_see_project(project_id));
-- The project's owner, on a lever of the same project.
create policy activation_lever_choices_insert on public.activation_lever_choices
  for insert to authenticated
  with check (public.is_project_owner(project_id)
              and exists (select 1 from public.levers l
                           where l.id = lever_id and l.project_id = project_id));
create policy activation_lever_choices_delete on public.activation_lever_choices
  for delete to authenticated using (public.is_project_owner(project_id));

-- 4. « Marquer comme transmis » ------------------------------------------------------------

-- The agency has no account: the framing (and for RP the press kit) leave
-- PDS OS by hand; a person declares it. What was sent is named in the
-- journal: the validated framing's version and the approved press kit.
create or replace function public.declare_activation_transmission(p_activation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_activations%rowtype;
  v_framing integer;
  v_kit uuid;
begin
  select * into v from public.marketing_activations where id = p_activation_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(v.id) or v.status in ('closed', 'cancelled') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.mode is distinct from 'agency' then
    raise exception 'activation_not_agency' using errcode = '23514';
  end if;
  select max(s.version) into v_framing from public.activation_sheets s
   where s.activation_id = v.id and s.kind = 'framing' and s.status = 'validated';
  if v_framing is null then
    raise exception 'framing_not_validated' using errcode = '23514';
  end if;
  select d.id into v_kit from public.strategy_documents d
   where d.project_id = v.project_id and d.kind = 'press_kit' and d.state = 'approved'
   order by d.version desc limit 1;
  if v.kind = 'press' and v_kit is null then
    raise exception 'press_kit_not_validated' using errcode = '23514';
  end if;
  perform public.log_activation_event(v.id, 'agency.transmitted', null, null,
    jsonb_build_object('framing_version', v_framing, 'press_kit', v_kit), null);
end;
$$;
revoke execute on function public.declare_activation_transmission(uuid) from public, anon;
grant execute on function public.declare_activation_transmission(uuid) to authenticated;

-- 5. Notifications ---------------------------------------------------------------------------

select public.add_notification_kinds(array[
  'activation_owner_assigned', 'activation_suspended', 'activation_creator_acted']);

create or replace function public.marketing_activations_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.auth_person_id();
begin
  if new.owner_person_id is not null
     and new.owner_person_id is distinct from v_actor
     and (tg_op = 'INSERT' or new.owner_person_id is distinct from old.owner_person_id) then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, new.owner_person_id, v_actor, 'activation_owner_assigned',
            new.project_id, new.id);
  end if;
  if tg_op = 'UPDATE' and new.status = 'suspended' and old.status <> 'suspended'
     and new.owner_person_id is not null and new.owner_person_id is distinct from v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (new.organization_id, new.owner_person_id, v_actor, 'activation_suspended',
            new.project_id, new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.marketing_activations_notify() from public, anon, authenticated;
drop trigger if exists z_notify on public.marketing_activations;
create trigger z_notify after insert or update of owner_person_id, status
  on public.marketing_activations
  for each row execute function public.marketing_activations_notify();
