-- Conception › Intentions: « Confirmer les n » at the foot of each section (Sacha, 10/11/2026, as
-- the Cadrage and the Stratégie): every proposal of one target — the release's direction
-- (p_deliverable_id null) or one deliverable — confirmed in one transaction, each through
-- review_design_intention: same rights (design_can_write), same replacement of the intention
-- already confirmed on its topic. The oldest first, so the latest said on a topic wins, as when
-- they are confirmed one by one. Proposals still to attach have no section: confirmed one by one.

create function public.confirm_design_target_proposals(p_project_id uuid, p_deliverable_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  if not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if not public.design_can_write(p_project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  for v_id in
    select i.id from public.design_intentions i
     where i.project_id = p_project_id and i.status = 'proposed'
       and case when p_deliverable_id is null then i.target = 'direction'
                else i.target = 'deliverable' and i.design_deliverable_id = p_deliverable_id end
     order by i.created_at, i.id
  loop
    perform public.review_design_intention(v_id, true);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.confirm_design_target_proposals(uuid, uuid) from public, anon;
grant execute on function public.confirm_design_target_proposals(uuid, uuid) to authenticated;
