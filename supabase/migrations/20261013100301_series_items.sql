-- Retours Marketing du 12/10/2026, MKT-C2-07 (docs/ARCHITECTURE.md § 8 decies,
-- « Livrables et séries »).
--
--   1. Each item of a series may have its own responsible, concept,
--      reference and date (delivery_date, already there) — written by who
--      edits the sheet, the responsible being a member of the organisation;
--   2. a series is followed grouped (one decision for all its items) or
--      decomposed (one decision per item): `tracking`, set by who edits the
--      sheet; submit_design_sheet follows it, else the project's mode.
--      Regrouping never erases the decisions already taken per item: they
--      stay on their versions.

alter table public.design_sheet_items
  add column responsible_person_id uuid references public.people (id),
  add column concept text,
  add column reference_url text,
  add constraint design_sheet_items_concept_length
    check (char_length(coalesce(concept, '')) <= 2000),
  add constraint design_sheet_items_reference_https
    check (reference_url is null or (reference_url ~ '^https://\S+$' and char_length(reference_url) <= 2000));
grant insert (responsible_person_id, concept, reference_url),
      update (responsible_person_id, concept, reference_url)
  on public.design_sheet_items to authenticated;

-- An item's responsible is an approved member of the organisation.
create or replace function public.design_sheet_items_responsible_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.responsible_person_id is not null and not exists (
    select 1 from public.memberships m
     where m.person_id = new.responsible_person_id
       and m.organization_id = new.organization_id
       and m.status = 'approved') then
    raise exception 'invalid_person' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_responsible_check before insert or update of responsible_person_id
  on public.design_sheet_items
  for each row execute function public.design_sheet_items_responsible_check();

alter table public.design_sheets
  add column tracking text,
  add constraint design_sheets_tracking_check
    check (tracking is null or tracking in ('global', 'per_item'));
grant update (tracking) on public.design_sheets to authenticated;

create or replace function public.submit_design_sheet(p_sheet_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.design_sheets%rowtype;
  v_mode text;
  v_sections text[];
  v_id uuid;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not (public.is_project_owner(v.project_id) or exists (
            select 1 from public.design_assignments a
            where a.sheet_id = v.id and a.ended_at is null
              and a.person_id = public.auth_person_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked';
  end if;
  if not exists (select 1 from public.design_assignments a
                 where a.sheet_id = v.id and a.ended_at is null) then
    raise exception 'responsible_required';
  end if;
  if not exists (select 1 from public.design_validators x where x.sheet_id = v.id) then
    raise exception 'validator_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v.id::text));
  if exists (select 1 from public.design_submissions s
             where s.sheet_id = v.id and s.status = 'pending') then
    raise exception 'already_pending';
  end if;
  -- A series follows its own tracking when set (MKT-C2-07): grouped = one
  -- decision, decomposed = one per item; else the project's mode.
  select case v.tracking when 'global' then 'global'
                         when 'per_item' then 'per_section'
                         else w.validation_mode end
    into v_mode from public.design_workspaces w
   where w.project_id = v.project_id;
  select array['sheet'] || coalesce(array_agg(i.id::text order by i.number), '{}')
    into v_sections from public.design_sheet_items i where i.sheet_id = v.id;
  insert into public.design_submissions
    (organization_id, project_id, kind, sheet_id, number, sections, snapshot, mode, submitted_by)
  values (v.organization_id, v.project_id, 'sheet', v.id,
          (select coalesce(max(number), 0) + 1 from public.design_submissions
            where sheet_id = v.id),
          v_sections, public.design_sheet_snapshot(v.id),
          coalesce(v_mode, 'per_section'), public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$function$;
