-- Production, lot 4 bis: two guards of the technical check the screen relied
-- on alone (docs/ARCHITECTURE.md § 8 nonies).
--   1. « Exports contrôlés » refuses a line checked before the latest creative
--      validation or final file: it is to check again (« à revérifier »);
--   2. removing a line after the check reopens the check and the delivery, as
--      changing one does.

create or replace function public.advance_deliverable_delivery(p_deliverable_id uuid, p_step text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.deliverable_deliveries%rowtype;
  v_me uuid := public.auth_person_id();
  v_owner boolean;
  v_sheet uuid;
begin
  select * into v_row from public.deliverable_deliveries
   where deliverable_id = p_deliverable_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'not_found';
  end if;
  v_owner := public.is_project_owner(v_row.project_id);
  if not (v_owner or (p_step = 'approve' and exists (
            select 1 from public.project_creatives pc
             where pc.project_id = v_row.project_id and pc.person_id = v_me))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(v_row.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  select s.id into v_sheet from public.production_sheets s where s.deliverable_id = p_deliverable_id;
  case p_step
    when 'approve' then
      if v_sheet is not null then raise exception 'approve_on_version'; end if;
      if v_row.approved_at is not null then raise exception 'invalid_transition'; end if;
      update public.deliverable_deliveries set approved_by = v_me, approved_at = now()
       where id = v_row.id;
    when 'check' then
      if v_row.approved_at is null or v_row.checked_at is not null then
        raise exception 'invalid_transition';
      end if;
      if v_sheet is not null and (
           not exists (select 1 from public.production_export_checks c where c.sheet_id = v_sheet)
           or exists (select 1 from public.production_export_checks c
                       where c.sheet_id = v_sheet
                         and (c.result is distinct from 'ok'
                              or c.checked_at < greatest(v_row.approved_at, v_row.final_set_at)))) then
        raise exception 'exports_not_checked';
      end if;
      update public.deliverable_deliveries set checked_by = v_me, checked_at = now()
       where id = v_row.id;
    when 'deliver' then
      if v_row.checked_at is null or v_row.delivered_at is not null then
        raise exception 'invalid_transition';
      end if;
      update public.deliverable_deliveries set delivered_by = v_me, delivered_at = now()
       where id = v_row.id;
    when 'reopen' then
      -- With a sheet, the creative decision stays on its version.
      update public.deliverable_deliveries
         set approved_by = case when v_sheet is not null then approved_by end,
             approved_at = case when v_sheet is not null then approved_at end,
             checked_by = null, checked_at = null, delivered_by = null, delivered_at = null
       where id = v_row.id;
    else
      raise exception 'invalid_input' using errcode = '23514';
  end case;
end;
$$;

create function public.production_export_checks_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.deliverable_deliveries x
     set checked_by = null, checked_at = null, delivered_by = null, delivered_at = null
    from public.production_sheets s
   where s.id = old.sheet_id and x.deliverable_id = s.deliverable_id
     and x.checked_at is not null;
  return old;
end;
$$;
revoke execute on function public.production_export_checks_removed() from public, anon, authenticated;
create trigger z_removed after delete on public.production_export_checks
  for each row execute function public.production_export_checks_removed();
