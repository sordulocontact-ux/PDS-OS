-- Marketing › Activations : fewer statuses, each with a meaning (Sacha,
-- 11/10/2026 ; docs/ARCHITECTURE.md § 8 duodecies, « Statuts »).
--
-- The ticket lists Brouillon → À préparer → Prête → En cours → Réalisée
-- déclarée → Clôturée, plus Annulée, Suspendue, Bloquée. On screen, the first
-- three only sorted the list : nothing read them. They become one status,
-- « À préparer » ; « Prête » is no longer ticked by hand but computed, as the
-- ticket's flow says (« Préparation : le responsable vérifie les
-- dépendances […]. Les contrôles n'empêchent pas une préparation partielle,
-- mais signalent ce qui bloque le passage à l'état suivant ») : an activation
-- starts (En cours or Réalisée déclarée, from À préparer or Bloquée) only with
-- an owner, a due date (« calendrier »), no open blocker and no blocking
-- dependency left unresolved. « Suspendue » had the same effect as
-- « Bloquée » : its rows become « Bloquée », their reason kept.

-- 1. The existing rows, without journal entries (not a person's decision) nor
--    the Marketing closure guard.
alter table public.marketing_activations
  drop constraint marketing_activations_status_check,
  drop constraint marketing_activations_reason_check;

set local session_replication_role = replica;
update public.marketing_activations set status = 'to_prepare' where status in ('draft', 'ready');
update public.marketing_activations set status = 'blocked' where status = 'suspended';
set local session_replication_role = origin;

alter table public.marketing_activations
  alter column status set default 'to_prepare',
  add constraint marketing_activations_status_check check (status in (
    'to_prepare', 'in_progress', 'done_declared', 'closed', 'cancelled', 'blocked')),
  add constraint marketing_activations_reason_check check (
    (status in ('cancelled', 'blocked'))
      = (status_reason is not null and btrim(status_reason) <> '')
    and (status_reason is null or char_length(status_reason) <= 1000));

-- 2. What an activation still lacks to start, in a fixed order : owner, due,
--    blocker, dependency. A dependency is resolved when its deliverable is
--    delivered, its contract signed, its borrowing cleared, its task done
--    (same rules as lib/activations/dependencies.ts).
create or replace function public.activation_launch_gaps(p_activation_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
      case when a.owner_person_id is null then 'owner' end,
      case when a.due_on is null then 'due' end,
      case when exists (select 1 from public.activation_blockers b
                         where b.activation_id = a.id and b.status = 'open')
           then 'blocker' end,
      case when exists (
             select 1 from public.activation_dependencies d
              where d.activation_id = a.id and d.blocking
                and not case d.kind
                  when 'deliverable' then exists (
                    select 1 from public.deliverable_deliveries dd
                     where dd.deliverable_id = d.deliverable_id and dd.delivered_at is not null)
                  when 'contract' then exists (
                    select 1 from public.contracts k where k.id = d.contract_id and k.status = 'signed')
                  when 'clearance' then exists (
                    select 1 from public.legal_clearances c
                     where c.id = d.clearance_id and c.status = 'cleared')
                  when 'task' then exists (
                    select 1 from public.tasks t where t.id = d.task_id and t.status = 'done')
                  else false
                end)
           then 'dependency' end
    ], null)
    from public.marketing_activations a
   where a.id = p_activation_id;
$$;
revoke execute on function public.activation_launch_gaps(uuid) from public, anon, authenticated;

-- 3. The row check, as before, plus the start gate. The refusal names what is
--    missing (« activation_not_ready:owner,due ») for the screen to say it.
create or replace function public.marketing_activations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text[];
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
    if new.status <> 'to_prepare' or new.closure_kind is not null then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
  elsif current_setting('pds.activation_closure', true) is distinct from 'on'
        and (new.closure_kind is distinct from old.closure_kind
             or new.closed_at is distinct from old.closed_at
             or new.closure_reserves is distinct from old.closure_reserves
             or (new.status = 'closed') <> (old.status = 'closed')) then
    raise exception 'use_close_activation' using errcode = '42501';
  end if;
  -- Starting : from À préparer or Bloquée to En cours or Réalisée déclarée.
  -- Read on the new row (an owner and a due date given in the same update
  -- count), blockers and dependencies as they are now.
  if tg_op = 'UPDATE' and old.status in ('to_prepare', 'blocked')
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
  return new;
end;
$$;
revoke execute on function public.marketing_activations_check() from public, anon, authenticated;
