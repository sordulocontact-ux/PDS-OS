-- Production › equipment from the need to the return (Ibé's tests of
-- 13/10, PROD-015, PROD-022): « Sur place » joins the statuses (booked →
-- picked up → on site → to return → returned), each line says where it
-- comes from (rented, lent, owned — an owned item is never « to return »),
-- how many arrived (a gap with what was booked is flagged), and a return
-- problem says whether the item is missing or damaged.

alter table public.production_equipment
  drop constraint production_equipment_status_check,
  add constraint production_equipment_status_check check (status in (
    'need', 'quoted', 'to_verify', 'retained', 'booked', 'picked_up', 'on_site', 'to_return',
    'returned', 'incident')),
  add column source text not null default 'rental',
  add constraint production_equipment_source_check check (source in ('rental', 'loan', 'owned')),
  add column received_quantity integer,
  add constraint production_equipment_received_check
    check (received_quantity is null or received_quantity between 0 and 1000),
  add column return_issue text,
  add constraint production_equipment_return_issue_check
    check (return_issue is null or (return_issue in ('missing', 'damaged') and status = 'incident'));

grant insert (source, received_quantity, return_issue) on public.production_equipment to authenticated;
grant update (source, received_quantity, return_issue) on public.production_equipment to authenticated;

-- The equipment check counts « sur place » as booked.
create or replace function public.production_check_evidence(p_sheet_id uuid, p_key text, p_note text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    when 'call_sheet' then exists (
      select 1 from public.production_call_sheets c
       where c.sheet_id = s.id and btrim(coalesce(c.call_time, '')) <> '')
    when 'permits' then btrim(coalesce(p_note, '')) <> ''
    when 'backup' then btrim(coalesce(p_note, '')) <> ''
    else false
  end;
end;
$$;

-- A line booked or beyond takes its return due date from the end of its
-- rental period when nobody set one (PROD-022: « repris automatiquement »).
create function public.production_equipment_return_due()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.return_due is null and new.period_end is not null and new.source <> 'owned'
     and new.status in ('booked', 'picked_up', 'on_site', 'to_return') then
    new.return_due := new.period_end;
  end if;
  return new;
end;
$$;
create trigger c_return_due before insert or update on public.production_equipment
  for each row execute function public.production_equipment_return_due();
