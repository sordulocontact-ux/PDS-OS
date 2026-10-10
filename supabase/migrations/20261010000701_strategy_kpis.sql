-- Stratégie, étape 7 (docs/ARCHITECTURE.md § 6 bis): « Objectifs & KPIs ».
-- A KPI is a quantitative signal (a figure to reach) or a qualitative one (a
-- sign to look for, no figure). After the release, a real data source may
-- feed it automatically (Deezer fans of the project's artist, read by code);
-- otherwise nothing is shown: no value is ever made up (CLAUDE.md, rule 6).
-- The strategic objective itself is a text field of the strategy
-- (field_values, key strategic_objective).

alter table public.strategy_objectives
  add column kind text not null default 'quantitative',
  add column source text not null default 'manual';
alter table public.strategy_objectives add constraint strategy_objectives_kind_check
  check (kind in ('quantitative', 'qualitative'));
alter table public.strategy_objectives add constraint strategy_objectives_source_check
  check (source in ('manual', 'deezer_fans'));
-- A qualitative signal carries no figure, and only a figure can be measured.
alter table public.strategy_objectives add constraint strategy_objectives_qualitative_check
  check (kind = 'quantitative' or (target is null and unit is null and source = 'manual'));

grant insert (kind, source) on public.strategy_objectives to authenticated;
grant update (kind, source) on public.strategy_objectives to authenticated;
