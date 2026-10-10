-- The Plan d'action keeps what a person decided against (UX test of
-- 09/10/2026, docs/TEST-UX-2026-10-09-PARCOURS-COMPLET.md § 2):
--   * an action removed before « Lancer le plan » came back at once as
--     « apparue depuis le lancement », and « Ajouter au plan » re-created it
--     with its task: the removed keys are now remembered on the plan
--     (`dismissed_keys`), and never proposed again;
--   * a person unchecked in the contracts' cartography (« accord
--     nécessaire ») kept « Faire signer un contrat à … » in the Suivi and in
--     Travail: once the cartography says no agreement is needed, the action
--     is retired (obsolete) and its open task removed.
-- Both are written on a person's explicit decision (launch, cartography),
-- by the server action that took it; nothing is retired silently.

alter table public.legal_plans
  add column dismissed_keys text[] not null default '{}';

-- Who may decide on a project's legal plan (none yet: an empty row, so the
-- callers below change nothing).
create function public.legal_plan_for_decision(p_project_id uuid)
returns public.legal_plans
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan public.legal_plans%rowtype;
begin
  select * into v_plan from public.legal_plans where project_id = p_project_id;
  if not found then
    return v_plan;
  end if;
  if not public.has_permission(v_plan.organization_id, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_plan;
end;
$$;
revoke execute on function public.legal_plan_for_decision(uuid) from public, anon, authenticated;

-- « Lancer le plan » without some actions: remembered, never proposed again.
create function public.dismiss_legal_plan_keys(p_project_id uuid, p_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.legal_plans%rowtype := public.legal_plan_for_decision(p_project_id);
begin
  if coalesce(cardinality(p_keys), 0) = 0 then
    return;
  end if;
  if exists (select 1 from unnest(p_keys) k where char_length(k) not between 1 and 120) then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.legal_plans
     set dismissed_keys = array(
           select distinct k from unnest(dismissed_keys || p_keys) k order by k),
         updated_at = now()
   where id = v_plan.id;
end;
$$;

-- Actions no longer needed (an agreement unchecked in the cartography):
-- obsolete, and their open tasks removed from Travail.
create function public.retire_legal_plan_items(p_project_id uuid, p_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.legal_plans%rowtype := public.legal_plan_for_decision(p_project_id);
begin
  if coalesce(cardinality(p_keys), 0) = 0 then
    return;
  end if;
  delete from public.tasks t
   using public.legal_plan_items i
   where t.legal_plan_item_id = i.id and t.status = 'todo'
     and i.plan_id = v_plan.id and i.item_key = any (p_keys)
     and i.status <> 'done';
  update public.legal_plan_items
     set status = 'obsolete', updated_at = now()
   where plan_id = v_plan.id and item_key = any (p_keys) and status <> 'done';
  -- Never proposed again by « Ajouter au plan ».
  update public.legal_plans
     set dismissed_keys = array(
           select distinct k from unnest(dismissed_keys || p_keys) k order by k),
         updated_at = now()
   where id = v_plan.id;
end;
$$;

revoke execute on function public.dismiss_legal_plan_keys(uuid, text[]) from public, anon;
grant execute on function public.dismiss_legal_plan_keys(uuid, text[]) to authenticated;
revoke execute on function public.retire_legal_plan_items(uuid, text[]) from public, anon;
grant execute on function public.retire_legal_plan_items(uuid, text[]) to authenticated;
