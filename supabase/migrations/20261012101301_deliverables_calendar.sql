-- Retours Marketing du 11/10/2026, MKT-S1-08 et MKT-S1-10
-- (docs/ARCHITECTURE.md § 6 bis, « Stratégie »).
--
-- Deliverables: a format (« Vidéo 9:16, 30 s »); a lever may say it needs
-- no deliverable, which is a decision, not an oversight (a deliverable added
-- to it later takes that back). Calendar: delivery, validation and
-- publication join the kinds of milestones, apart from the announcement,
-- the teaser and the release.

alter table public.strategy_deliverables add column format text;
alter table public.strategy_deliverables add constraint strategy_deliverables_format_check
  check (format is null or (btrim(format) <> '' and char_length(format) <= 80));
grant insert (format) on public.strategy_deliverables to authenticated;
grant update (format) on public.strategy_deliverables to authenticated;

alter table public.levers add column no_deliverables boolean not null default false;
grant update (no_deliverables) on public.levers to authenticated;

create or replace function public.strategy_deliverables_lever_needs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.levers set no_deliverables = false
   where id = new.lever_id and no_deliverables;
  return null;
end;
$$;
revoke execute on function public.strategy_deliverables_lever_needs() from public, anon, authenticated;
create trigger z_lever_needs after insert or update of lever_id on public.strategy_deliverables
  for each row execute function public.strategy_deliverables_lever_needs();

alter table public.milestones drop constraint milestones_kind_check;
alter table public.milestones add constraint milestones_kind_check check (kind in (
  'release', 'announcement', 'teaser', 'content', 'live', 'press', 'delivery', 'validation',
  'publication', 'other'));
