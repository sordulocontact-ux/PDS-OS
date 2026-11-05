-- Juridique, État des lieux (Sacha, 05/11/2026: « comme le master, quand on
-- clique sur quelque chose, on puisse la modifier directement »): the role of
-- an intervenant non crédité changes on its row, without removing and adding
-- the person again. Same guard as add / remove (manage_legal on a visible
-- project); refused once a contract was mapped for the person, as removing
-- is: the contract's template was chosen for that role.

create or replace function public.set_legal_project_contact_role(
  p_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.legal_project_contacts%rowtype;
begin
  select * into v_row from public.legal_project_contacts where id = p_id;
  if not found or public.auth_person_id() is null
     or not public.has_permission(v_row.organization_id, 'manage_legal')
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.role = p_role then
    return;
  end if;
  if exists (select 1 from public.legal_agreement_needs
              where project_id = v_row.project_id and contact_id = v_row.contact_id) then
    raise exception 'legal_contact_in_use' using errcode = 'P0001';
  end if;
  -- The role list itself is the table's check constraint.
  update public.legal_project_contacts set role = p_role where id = p_id;
end;
$$;

revoke execute on function public.set_legal_project_contact_role(uuid, text) from public, anon;
grant execute on function public.set_legal_project_contact_role(uuid, text) to authenticated;
