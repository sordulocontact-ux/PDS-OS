-- Conception, Fiches Livrables created by the Stratégie (proto « Projet
-- complet »: `onStrategyValidated` → one fiche per committed deliverable;
-- ticket « Workflow Conception complet » § 9: « PO crée une fiche par
-- livrable ou par série »). Nobody clicks « Créer la fiche » any more:
-- once the Stratégie is validated, every deliverable of the Conception —
-- committed, or added late « à qualifier » — has its sheet, a series when
-- the Stratégie committed more than one (as many numbered items as its
-- quantity, never a fixed number). Values are proposed by code on read
-- (lib/design/sheet-proposals.ts) and written with their source when the
-- responsible submits: nothing here invents a value.
--
-- Also: the format of a cover (« 3000 × 3000 px, JPG ou PNG »), and the
-- publication date of each element of a series (« Publié le »). Both are
-- part of the version handed to Production (design_sheet_snapshot reads
-- the whole rows).

alter table public.design_sheets add column file_format text;
alter table public.design_sheets
  add constraint design_sheets_file_format_check
  check (file_format is null or char_length(file_format) <= 200);

alter table public.design_sheet_items add column publish_date date;

create function public.design_ensure_sheets(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_sheet uuid;
  v_title text;
begin
  if not exists (
    select 1 from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
    where s.project_id = p_project_id and sd.key = 'launch_strategy'
      and s.state = 'validated') then
    return;
  end if;
  for d in
    select dd.id, dd.organization_id, dd.origin,
           coalesce(nullif(btrim(sd.title), ''), nullif(btrim(dd.title), ''), 'Livrable') as title,
           greatest(coalesce(sd.quantity, 1), 1) as quantity
      from public.design_deliverables dd
      left join public.strategy_deliverables sd on sd.id = dd.strategy_deliverable_id
     where dd.project_id = p_project_id
       and not exists (select 1 from public.design_sheets s where s.design_deliverable_id = dd.id)
     order by dd.created_at
  loop
    v_title := left(d.title, 200);
    insert into public.design_sheets
      (organization_id, project_id, design_deliverable_id, kind, title, provenance)
    values (d.organization_id, p_project_id, d.id,
            case when d.quantity > 1 then 'series' else 'single' end, v_title,
            jsonb_build_object('title', jsonb_build_object(
              'source', case when d.origin = 'strategy' then 'strategy' else 'manual' end)))
    returning id into v_sheet;
    if d.quantity > 1 then
      insert into public.design_sheet_items (organization_id, project_id, sheet_id, number, title)
      select d.organization_id, p_project_id, v_sheet, n, left(v_title || ' ' || n, 200)
        from generate_series(1, least(d.quantity, 200)) as n;
    end if;
  end loop;
end;
$$;

revoke all on function public.design_ensure_sheets(uuid) from public, anon, authenticated;

-- A deliverable arriving once the Stratégie is validated gets its sheet.
create function public.design_deliverables_sheet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.design_ensure_sheets(new.project_id);
  return null;
end;
$$;

revoke all on function public.design_deliverables_sheet() from public, anon, authenticated;

create trigger z_sheet after insert on public.design_deliverables
  for each row execute function public.design_deliverables_sheet();

-- The Stratégie validated: every deliverable gets its sheet.
create function public.design_strategy_validated_sheets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state = 'validated' and old.state is distinct from 'validated' and exists (
       select 1 from public.stage_definitions d
        where d.id = new.stage_definition_id and d.key = 'launch_strategy') then
    perform public.design_ensure_sheets(new.project_id);
  end if;
  return null;
end;
$$;

revoke all on function public.design_strategy_validated_sheets() from public, anon, authenticated;

create trigger z_design_sheets after update of state on public.project_stages
  for each row execute function public.design_strategy_validated_sheets();

-- Projects whose Stratégie is already validated.
do $$
declare
  r record;
begin
  for r in
    select s.project_id from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
    where sd.key = 'launch_strategy' and s.state = 'validated'
  loop
    perform public.design_ensure_sheets(r.project_id);
  end loop;
end;
$$;
