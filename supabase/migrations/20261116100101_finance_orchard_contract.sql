-- Finance › Financements : le contrat The Orchard (retour d'Ibé du 16/11/2026).
--
-- « C'est comme si c'était un crédit, mais versé en plusieurs fois. […] Il
-- signe un contrat de 100 000 €. Il va te dire : je te verse 25 000 € dès que
-- tu me livres 12 sons. » « Après, c'est t'arrives à le relier aussi à PO qui
-- sait quand les X sons sont atteints. »
--
-- The Orchard rule of lot 5 (20261113500101_finance_fundings.sql) paid an
-- advance every N titles, forever, and the Finance counted the titles by hand
-- and set the count back at each advance. Now:
--
--   1. The contract has a total (orchard_contract_cents, null = no total, as
--      before): the advances stop once it is paid, the last one being what is
--      left. The advances received are a number the Finance enters
--      (orchard_advances_received), never reset.
--   2. The titles count themselves: from orchard_counts_from (the contract's
--      start), each title deposited at The Orchard through PDS OS'
--      Distribution counts on the day of its first deposit still standing
--      (distribution_declarations, kind 'deposit', not withdrawn), once, even
--      when a compilation delivers it again. orchard_titles_counted now holds
--      the titles delivered outside PDS OS (before the contract was followed
--      here, or never deposited through the Distribution), added to them.
--      With no start date nothing is read from the Distribution: the count is
--      the Finance's, as before, and an existing row (received = 0) computes
--      exactly what it did.
--
-- What it makes happen (the advance due, those the planned shows trigger, what
-- is left to receive) is computed by code at each reading
-- (lib/finance/engines.ts), never stored.

alter table public.finance_engine_settings
  add column orchard_contract_cents bigint,
  add column orchard_counts_from date,
  add column orchard_advances_received integer not null default 0,
  add constraint finance_engine_settings_contract_check
    check (orchard_contract_cents is null
           or (orchard_contract_cents > 0 and orchard_contract_cents <= 100000000000)),
  add constraint finance_engine_settings_received_check
    check (orchard_advances_received between 0 and 1000);

comment on column public.finance_engine_settings.orchard_titles_counted is
  'Titles delivered to The Orchard outside PDS OS'' Distribution (before the contract was followed here, or never deposited through it), added to those it counts since orchard_counts_from.';
comment on column public.finance_engine_settings.orchard_contract_cents is
  'The contract''s total: the advances stop once it is paid. Null: no total.';
comment on column public.finance_engine_settings.orchard_counts_from is
  'From this day, the titles deposited at The Orchard through the Distribution count. Null: only orchard_titles_counted.';
comment on column public.finance_engine_settings.orchard_advances_received is
  'The advances The Orchard has paid so far, entered by the Finance.';

-- The titles the Distribution delivered to The Orchard since the contract's
-- start, grouped by deposit: the project, the release (a collective's), the
-- day and how many titles it delivered for the first time. A simple project
-- delivers the masters it links; a collective's release its title's master,
-- the compilation the masters of its titles not abandoned. A Finance member
-- may not see the project: only its name and the count are given, nothing
-- for anyone without read_finance.
create or replace function public.finance_orchard_deliveries()
returns table (
  project_id uuid,
  project_title text,
  release_title text,
  delivered_on date,
  titles integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with settings as (
    select s.organization_id, s.orchard_counts_from as since
      from public.finance_engine_settings s
     where s.organization_id = public.auth_organization_id()
       and s.orchard_counts_from is not null
       and public.has_permission(s.organization_id, 'read_finance')
  ), deposits as (
    -- The first deposit still standing of each scope: a simple project, or
    -- one release of a collective.
    select distinct on (d.project_id, coalesce(d.release_id, d.project_id))
           d.project_id,
           d.release_id,
           coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) as day
      from public.distribution_declarations d
      join settings s on s.organization_id = d.organization_id
     where d.kind = 'deposit'
       and d.withdrawn_at is null
     order by d.project_id, coalesce(d.release_id, d.project_id),
              coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date),
              d.declared_at
  ), delivered as (
    select dep.project_id, dep.release_id, dep.day, pm.master_id
      from deposits dep
      join public.project_masters pm on pm.project_id = dep.project_id
     where dep.release_id is null
    union all
    select dep.project_id, dep.release_id, dep.day, pt.master_id
      from deposits dep
      join public.releases r on r.id = dep.release_id
      join public.project_titles pt
        on pt.project_id = dep.project_id
       and pt.master_id is not null
       and (pt.id = r.project_title_id
            or (r.project_title_id is null and pt.status <> 'abandoned'))
  ), firsts as (
    -- A title counts once, on the day it was first delivered.
    select distinct on (x.master_id) x.master_id, x.project_id, x.release_id, x.day
      from delivered x
     order by x.master_id, x.day
  )
  select f.project_id, p.title, r.title, f.day, count(*)::integer
    from firsts f
    join public.projects p on p.id = f.project_id
    left join public.releases r on r.id = f.release_id
   where f.day >= (select since from settings)
   group by f.project_id, p.title, f.release_id, r.title, f.day
   order by f.day, p.title;
$$;
revoke execute on function public.finance_orchard_deliveries() from public, anon;
grant execute on function public.finance_orchard_deliveries() to authenticated;
