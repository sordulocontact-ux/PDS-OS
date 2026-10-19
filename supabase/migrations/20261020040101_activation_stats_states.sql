-- Statistics « Partielles » and « Indisponibles » as real states of an
-- activation (proto « Projet complet » mk.js STSTATE, `asnap`, `agstats`;
-- docs/projet-complet/activations.md § 1.3), read by the Activations and by
-- the Suivi & bilan from the same records:
--   1. activation_metrics.partial: a reading that does not count everything
--      yet (« Relevé partiel (toutes les publications ne sont pas encore
--      comptées) », a reading taken from an agency's sheet). Until now the
--      app wrote « Relevé partiel » in `method`: carried over.
--   2. marketing_activations.metrics_unavailable: « Donnée indisponible : la
--      plateforme ne la fournit pas ». Not « Non attendues » (metrics_expected
--      = false, « Sans objet » with its reason): the statistics were expected
--      and will not come. A later reading lifts it (the app writes both).
--   3. marketing_review_evidence gives `availability = 'partial'` for a
--      partial reading (the Suivi & bilan's figures and frozen reports).

alter table public.activation_metrics
  add column partial boolean not null default false;

update public.activation_metrics
   set partial = true
 where method = 'Relevé partiel';

grant insert (partial) on public.activation_metrics to authenticated;

alter table public.marketing_activations
  add column metrics_unavailable boolean not null default false;

grant update (metrics_unavailable) on public.marketing_activations to authenticated;

create or replace view public.marketing_review_evidence
with (security_invoker = true) as
select e.id,
       e.organization_id,
       e.project_id,
       e.activation_id,
       case when e.kind = 'publication' then 'publication' else 'coverage' end as kind,
       coalesce(e.platform, left(btrim(e.declaration_note), 200), e.url, e.kind) as label,
       e.url,
       e.platform,
       null::text as metric,
       null::numeric as value,
       null::text as unit,
       null::date as period_start,
       null::date as period_end,
       null::text as availability,
       e.declared_source as reported_by,
       e.declared_on as observed_on,
       case c.result when 'verified' then 'verified'
                     when 'contested' then 'to_verify'
                     when 'unavailable' then 'to_verify'
                     else 'declared' end as verification,
       case when c.result = 'verified' then c.checked_by end as verified_by,
       case when c.result = 'verified' then c.checked_at end as verified_at,
       case when c.result = 'unavailable' then c.checked_at end as link_unreachable_at,
       e.withdrawn_at as archived_at,
       e.created_at
  from public.activation_evidence e
  left join lateral (
    select k.result, k.checked_by, k.checked_at
      from public.activation_evidence_checks k
     where k.evidence_id = e.id
     order by k.checked_at desc, k.id desc
     limit 1) c on true
union all
select m.id,
       m.organization_id,
       m.project_id,
       m.activation_id,
       'statistic',
       coalesce(m.label, m.metric),
       null,
       m.platform,
       case when m.metric = 'other' then m.label else m.metric end,
       m.value,
       m.unit,
       m.period_start,
       m.period_end,
       case when m.partial then 'partial' else 'available' end,
       m.source,
       m.collected_on,
       case m.verification when 'verified' then 'verified'
                           when 'contested' then 'to_verify'
                           else 'declared' end,
       null::uuid,
       null::timestamptz,
       null::timestamptz,
       null::timestamptz,
       m.created_at
  from (
    select distinct on (x.activation_id, coalesce(x.target_id, x.agency_row_id), x.metric,
                        coalesce(x.label, ''), x.unit) x.*
      from public.activation_metrics x
     where x.invalidated_at is null
     order by x.activation_id, coalesce(x.target_id, x.agency_row_id), x.metric,
              coalesce(x.label, ''), x.unit, x.collected_on desc, x.created_at desc) m;

revoke all on public.marketing_review_evidence from anon, authenticated;
grant select on public.marketing_review_evidence to authenticated;
