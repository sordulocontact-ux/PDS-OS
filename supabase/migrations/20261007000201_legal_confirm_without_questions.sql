-- A project the Cadrage juridique has nothing to ask about (no title, a
-- contract already attached) never got a legal_intakes row, which only
-- record_legal_answer created: the Cadrage sent to the Confirmation, which
-- sent back to the Cadrage, and the dossier could never be confirmed nor
-- the plan built (audit of 07/10/2026). Confirming now opens the dossier
-- when it does not exist yet. The code still offers « Confirmer le dossier »
-- only once no question is open (lib/legal/confirmation/queries.ts).

create or replace function public.confirm_legal_intake(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_intake uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.legal_intakes (organization_id, project_id, created_by)
  values (v_org, p_project_id, v_person)
  on conflict (project_id) do nothing;
  select id into v_intake from public.legal_intakes where project_id = p_project_id;

  update public.legal_facts
     set status = 'confirmed', confirmed_by = v_person
   where intake_id = v_intake
     and superseded_by_answer_id is null
     and status = 'declared';
  update public.legal_intakes
     set status = 'confirmed', confirmed_by = v_person, confirmed_at = now()
   where id = v_intake;
end;
$$;

revoke execute on function public.confirm_legal_intake(uuid) from public, anon;
grant execute on function public.confirm_legal_intake(uuid) to authenticated;
