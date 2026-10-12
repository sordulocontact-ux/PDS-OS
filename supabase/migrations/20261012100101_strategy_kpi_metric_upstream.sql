-- Retours Stratégie du 11/10/2026, lot 1 (docs/ARCHITECTURE.md § 6 bis).
--
-- MKT-S1-03: a KPI names what it measures (streams, fans, views, playlist
-- adds, other), and the Deezer source — the artist's fans — only goes with
-- a fans KPI. Before, any figure could be « measured by Deezer », so a
-- streams target was followed with a fans count.
--
-- MKT-S1-04: an upstream deadline (conception, production, validation of a
-- deliverable before its milestone) can be arbitrated when it is really
-- past: shorter lead times for that deliverable, or a risk accepted for the
-- milestone's date (moving the milestone itself was already possible).

-- ---------------------------------------------------------------------------
-- KPI metric
-- ---------------------------------------------------------------------------

alter table public.strategy_objectives add column metric text;
alter table public.strategy_objectives add constraint strategy_objectives_metric_check
  check (metric is null or metric in ('streams', 'fans', 'views', 'playlists', 'other'));

-- Existing rows: the metric read from the team's own label; a Deezer source
-- on anything but fans is turned back into a manual follow-up (it measured
-- something else than the target).
update public.strategy_objectives
   set metric = case
         when label ~* '(fan|abonn|follower)' then 'fans'
         when label ~* 'stream|écoute|ecoute' then 'streams'
         when label ~* 'vue|view' then 'views'
         when label ~* 'playlist' then 'playlists'
         else 'other'
       end
 where kind = 'quantitative';
update public.strategy_objectives
   set source = 'manual'
 where source = 'deezer_fans' and metric is distinct from 'fans';

-- A qualitative signal has no metric (the form always says one for a
-- figure), and the Deezer source measures fans only.
alter table public.strategy_objectives add constraint strategy_objectives_metric_kind_check
  check (kind = 'quantitative' or metric is null);
alter table public.strategy_objectives add constraint strategy_objectives_source_metric_check
  check (source <> 'deezer_fans' or metric = 'fans');

grant insert (metric) on public.strategy_objectives to authenticated;
grant update (metric) on public.strategy_objectives to authenticated;

-- ---------------------------------------------------------------------------
-- Upstream deadlines: lead times and accepted risk, per deliverable
-- ---------------------------------------------------------------------------

-- Null = the label's default (21, 10 and 4 days, lib/strategy/upstream.ts).
alter table public.strategy_deliverables
  add column conception_lead_days integer,
  add column production_lead_days integer,
  add column validation_lead_days integer,
  -- The milestone date the late deadlines were accepted for: moving the
  -- milestone makes the code ask again.
  add column upstream_risk_accepted_for date,
  add column upstream_risk_accepted_by uuid references public.people (id),
  add column upstream_risk_accepted_at timestamptz;
alter table public.strategy_deliverables add constraint strategy_deliverables_lead_days_check
  check (
    (conception_lead_days is null or conception_lead_days between 0 and 365)
    and (production_lead_days is null or production_lead_days between 0 and 365)
    and (validation_lead_days is null or validation_lead_days between 0 and 365)
  );

-- Who accepted the risk and when: written here, never by the client.
create or replace function public.strategy_deliverables_risk_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.upstream_risk_accepted_for is distinct from old.upstream_risk_accepted_for then
    if new.upstream_risk_accepted_for is null then
      new.upstream_risk_accepted_by := null;
      new.upstream_risk_accepted_at := null;
    else
      new.upstream_risk_accepted_by := public.auth_person_id();
      new.upstream_risk_accepted_at := now();
    end if;
  else
    new.upstream_risk_accepted_by := old.upstream_risk_accepted_by;
    new.upstream_risk_accepted_at := old.upstream_risk_accepted_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.strategy_deliverables_risk_author()
  from public, anon, authenticated;

create trigger b_risk_author before update on public.strategy_deliverables
  for each row execute function public.strategy_deliverables_risk_author();

grant update (conception_lead_days, production_lead_days, validation_lead_days,
  upstream_risk_accepted_for) on public.strategy_deliverables to authenticated;
