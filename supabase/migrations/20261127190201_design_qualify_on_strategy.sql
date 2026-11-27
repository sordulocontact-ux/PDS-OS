-- A Conception need « à qualifier » becomes the committed deliverable the
-- Stratégie adds under its name (Maël's test of 26/11/2026). A « Pochette »
-- added in the Conception (« Ajouter un livrable »), with its sheet and its
-- transfer, never reached the Production: the Production and the
-- Distribution read the Stratégie's committed deliverables only. Committing
-- it through a revision of the Stratégie (V2) then made a second
-- « Pochette » line, empty, next to the one already worked on.
--
-- Now the deliverable the Stratégie adds takes over the need of the same
-- title still to qualify (case and spaces aside): that line becomes
-- committed with everything hung on it (sheet, versions, transfer), so the
-- Production and the cover check of the Distribution find it. No match: a
-- new line, as before. A committed deliverable removed from the Stratégie
-- gives such a line back as a need to qualify, never deletes the work done
-- on it (the pure mirror lines, without a title of their own, still go with
-- it).

create or replace function public.design_deliverables_mirror()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_need uuid;
begin
  select dd.id into v_need from public.design_deliverables dd
   where dd.project_id = new.project_id
     and dd.status = 'to_qualify'
     and dd.strategy_deliverable_id is null
     and lower(btrim(dd.title)) = lower(btrim(new.title))
   order by dd.created_at
   limit 1
   for update;
  if v_need is not null then
    update public.design_deliverables
       set origin = 'strategy', strategy_deliverable_id = new.id, status = 'confirmed',
           lever_id = null, call_id = null
     where id = v_need;
    return new;
  end if;
  insert into public.design_deliverables
    (organization_id, project_id, strategy_deliverable_id, origin, status, created_by)
  values (new.organization_id, new.project_id, new.id, 'strategy', 'confirmed', new.created_by)
  on conflict (strategy_deliverable_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.design_deliverables_mirror() from public, anon, authenticated;

create or replace function public.design_deliverables_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.design_deliverables
     set origin = 'manual', strategy_deliverable_id = null, status = 'to_qualify'
   where strategy_deliverable_id = old.id
     and btrim(coalesce(title, '')) <> '';
  return old;
end;
$$;
revoke execute on function public.design_deliverables_release() from public, anon, authenticated;

drop trigger if exists a_design_release on public.strategy_deliverables;
create trigger a_design_release before delete on public.strategy_deliverables
  for each row execute function public.design_deliverables_release();
