-- Production › bugs of Ibé's test of 13/10 (BUG-001 to BUG-007).
--   * BUG-004: « Feuille de service » is confirmed only once the team can use
--     it — call time and emergencies written, a version published — never on
--     the call time alone. A check already confirmed without them reopens.

create or replace function public.production_check_evidence(p_sheet_id uuid, p_key text, p_note text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found then
    return false;
  end if;
  return case p_key
    when 'location' then s.location_status = 'confirmed'
    when 'team' then
      exists (select 1 from public.production_needs n where n.sheet_id = s.id)
      and not exists (
        select 1 from public.production_needs n
         where n.sheet_id = s.id
           and n.headcount > (select count(*) from public.production_assignments a
                               where a.need_id = n.id and a.availability <> 'unavailable'))
      and not exists (
        select 1 from public.production_assignments a
          join public.production_needs n on n.id = a.need_id
         where n.sheet_id = s.id and a.availability = 'to_confirm')
    when 'equipment' then
      exists (select 1 from public.production_equipment e where e.sheet_id = s.id)
      and not exists (
        select 1 from public.production_equipment e
         where e.sheet_id = s.id and e.source <> 'owned'
           and e.status not in ('booked', 'picked_up', 'on_site', 'to_return', 'returned', 'incident'))
    when 'schedule' then s.shoot_date is not null
    when 'budget' then
      s.budget_envelope_cents is not null
      and not exists (select 1 from public.production_budget_lines b
                       where b.sheet_id = s.id and b.status = 'to_decide')
      and coalesce((select sum(b.amount_cents) from public.production_budget_lines b
                     where b.sheet_id = s.id), 0) <= s.budget_envelope_cents
    -- The team got it: call time and emergencies written, one version
    -- published (BUG-004).
    when 'call_sheet' then exists (
      select 1 from public.production_call_sheets c
       where c.sheet_id = s.id and btrim(coalesce(c.call_time, '')) <> ''
         and btrim(coalesce(c.emergencies, '')) <> '')
      and exists (select 1 from public.production_call_sheet_versions v where v.sheet_id = s.id)
    when 'permits' then btrim(coalesce(p_note, '')) <> ''
    when 'backup' then btrim(coalesce(p_note, '')) <> ''
    else false
  end;
end;
$function$;

-- Checks confirmed under the former rule follow the new one.
select public.production_recheck(s.id) from public.production_sheets s
 where exists (select 1 from public.production_readiness_checks c
                where c.sheet_id = s.id and c.key = 'call_sheet' and c.confirmed_at is not null);

