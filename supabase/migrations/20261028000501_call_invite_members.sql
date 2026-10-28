-- A project's call invites the members who work on it, not only its team
-- (Sacha 28/10/2026: « je peux pas inviter des mecs de mon équipe (DG, DC) »,
-- « si on a oublié de mettre le DC dans le formulaire de création je
-- voudrais aussi l'inviter »).
--
-- Before: the owner and the project's creative directors only. Now, as a
-- Conception designation already does (design_person_check, 20261010005001):
-- the owner, the creative team, the direction (it sees every project), and a
-- creative director not yet on the project, who joins its creative team by
-- the invitation (else their notification would open a page they cannot
-- see). A project manager on another project still cannot be invited in the
-- app: the Réseau invites them by e-mail.

create or replace function public.call_attendees_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select c.project_id into v_project from public.calls c where c.id = new.call_id;
  if not exists (
    select 1 from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = new.organization_id and m.person_id = new.person_id
       and m.status = 'approved' and a.disabled_at is null
  ) then
    raise exception 'attendee_not_member' using errcode = '23514';
  end if;
  -- A project call: whoever sees the project, or a creative director who
  -- joins it now.
  if v_project is not null then
    perform public.design_person_check(v_project, new.person_id);
  end if;
  return new;
end;
$$;

-- Who a project call may invite in the app, the same rule as above: the
-- owner, the creative team, the direction, then the creative directors who
-- would join it. A member reads only their own membership (RLS), hence this
-- listing, names only, for whoever sees the project.
create or replace function public.list_project_call_people(p_project_id uuid)
returns table (person_id uuid, first_name text, last_name text, place text)
language sql
stable
security definer
set search_path = ''
as $$
  with project as (
    select p.id, p.organization_id, p.owner_person_id
      from public.projects p
     where p.id = p_project_id and public.can_see_project(p.id)
  ),
  members as (
    select pe.id, pe.first_name, pe.last_name,
           case
             when pe.id = pr.owner_person_id then 'owner'
             when exists (select 1 from public.project_creatives pc
                           where pc.project_id = pr.id and pc.person_id = pe.id) then 'team'
             when 'view_all_projects' = any (public.role_permissions(m.role)) then 'direction'
             when 'creative_work' = any (public.role_permissions(m.role)) then 'creative'
           end as place
      from project pr
      join public.memberships m
        on m.organization_id = pr.organization_id and m.status = 'approved'
      join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
      join public.people pe on pe.id = m.person_id
  )
  select id, first_name, last_name, place
    from members
   where place is not null
   order by array_position(array['owner', 'team', 'direction', 'creative'], place),
            first_name, last_name;
$$;
revoke execute on function public.list_project_call_people(uuid) from public, anon;
grant execute on function public.list_project_call_people(uuid) to authenticated;
