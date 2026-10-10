-- Stratégie, étapes 3 à 5 (docs/ARCHITECTURE.md § 6 bis):
--   - Livrables engagés: how many of a deliverable (« cinq capsules »), and a
--     deliverable can move to another selected lever;
--   - Calendrier de lancement: each milestone sits on a channel (the view by
--     channel) and carries a note; it stays typed by a person, never by PO.
-- Written with "if not exists": a local database that once applied the
-- reverted 20261009000101 already holds these columns.

-- Livrables engagés ----------------------------------------------------------------

alter table public.strategy_deliverables add column if not exists quantity integer;
alter table public.strategy_deliverables
  drop constraint if exists strategy_deliverables_quantity_check;
alter table public.strategy_deliverables add constraint strategy_deliverables_quantity_check
  check (quantity is null or quantity between 1 and 99);
grant insert (quantity) on public.strategy_deliverables to authenticated;
grant update (quantity, lever_id) on public.strategy_deliverables to authenticated;

-- Calendrier de lancement ----------------------------------------------------------

-- organic = Organique, influence = Influence, press = RP / Médias,
-- release = Sortie, live = Live / Event, other = Autre.
alter table public.milestones add column if not exists channel text not null default 'organic';
alter table public.milestones add column if not exists notes text;
update public.milestones set channel = case kind
  when 'release' then 'release' when 'press' then 'press' when 'live' then 'live'
  else 'organic' end
 where channel = 'organic' and kind in ('release', 'press', 'live');
alter table public.milestones drop constraint if exists milestones_channel_check;
alter table public.milestones add constraint milestones_channel_check
  check (channel in ('organic', 'influence', 'press', 'release', 'live', 'other'));
alter table public.milestones drop constraint if exists milestones_notes_length;
alter table public.milestones add constraint milestones_notes_length
  check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 1000));
grant insert (channel, notes) on public.milestones to authenticated;
grant update (channel, notes) on public.milestones to authenticated;
