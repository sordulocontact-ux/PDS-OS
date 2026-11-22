-- « La cheffe de projet doit aussi pouvoir tout changer, c'est elle qui fait la réunion » (Sacha
-- 21/11/2026), in place of Ibé's rule of the 18th (« vous n'êtes pas dans le call »). A deal's call is
-- now run, like its negotiator runs it, by the owner of the deal's project and by whoever planned it
-- while she reads the deal: she arranges it, records it, processes it. is_call_owner says so;
-- can_arrange_call (20261121120101) becomes the same rule, and its column guard goes.

create or replace function public.is_call_owner(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.calls c
      left join public.deals d on d.id = c.deal_id
     where c.id = p_call_id
       and case
             when c.deal_id is not null then
               public.can_write_deal(d.organization_id, d.assignee_person_id)
               or (public.is_active_member(c.organization_id)
                   and public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id)
                   and ((d.project_id is not null and public.is_project_owner(d.project_id))
                        or c.created_by = public.auth_person_id()))
             when c.project_id is not null then public.is_project_owner(c.project_id)
             else c.created_by = public.auth_person_id()
                  and public.is_active_member(c.organization_id)
           end
  );
$$;

create or replace function public.can_arrange_call(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_call_owner(p_call_id);
$$;

drop trigger a_guard_arranger on public.calls;
drop function public.calls_guard_arranger();
drop policy calls_update_arranger on public.calls;
