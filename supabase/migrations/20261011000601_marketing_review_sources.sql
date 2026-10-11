-- Marketing › Suivi & bilan, lot 1 (ticket « Suivi & bilan », docs/ARCHITECTURE.md
-- § 8 terdecies): the source data the dashboard, the reports and the closing
-- are built on. The activations, their evidence and statistics are the ones of
-- the ticket « Activations » (20261011000101 to 20261011000501, § 8 duodecies):
-- one model, never a second register. The review reads them through two views
-- that group them its own way, computed here, never stored:
--   1. marketing_review_activations: an activation as the review counts it —
--      planned (draft, to prepare, ready), in progress (in progress, suspended,
--      blocked), done (done declared, closed) or cancelled; its due date is the
--      period's end, its description the note. Activations are never archived
--      (a cancelled one is said cancelled), so archived_at is always null.
--   2. marketing_review_evidence: what an activation produced, kept apart by
--      nature — a publication; a coverage (coverage, broadcast, interview,
--      other); a statistic (the latest valid reading of each subject, metric
--      and unit, as lib/activations/totals.ts: an invalidated or superseded
--      reading never counts). Level: declared (no check yet), to verify (the
--      last check contested it or found the link unreachable), verified (the
--      last check verified it). A withdrawn proof is archived.
--   3. marketing_events: the audit of the review (reports, approvals, reserves,
--      closing), written by triggers only. The activations keep their own
--      journal (activation_events).
-- Contributors: the project's owner and its creative directors
-- (marketing_can_contribute). Read by whoever sees the project: both views are
-- security invoker, so the activations' RLS applies.

-- 1. Who contributes ------------------------------------------------------------------

create function public.marketing_can_contribute(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
      or exists (select 1 from public.project_creatives pc
                  where pc.project_id = p_project_id
                    and pc.person_id = public.auth_person_id());
$$;
revoke execute on function public.marketing_can_contribute(uuid) from public, anon;
grant execute on function public.marketing_can_contribute(uuid) to authenticated;

-- 2. Activations, as the review groups them ---------------------------------------------

create view public.marketing_review_activations
with (security_invoker = true) as
select a.id,
       a.organization_id,
       a.project_id,
       a.title,
       a.kind,
       case
         when a.status in ('draft', 'to_prepare', 'ready') then 'planned'
         when a.status in ('in_progress', 'suspended', 'blocked') then 'in_progress'
         when a.status in ('done_declared', 'closed') then 'done'
         else 'cancelled'
       end as status,
       a.owner_person_id,
       a.deliverable_id,
       a.lever_id,
       a.starts_on,
       a.due_on as ends_on,
       a.description as note,
       null::timestamptz as archived_at,
       a.created_at
  from public.marketing_activations a;
revoke all on public.marketing_review_activations from anon, authenticated;
grant select on public.marketing_review_activations to authenticated;

-- 3. Evidence and statistics, as the review reads them ----------------------------------

create view public.marketing_review_evidence
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
       'available',
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

-- 4. Audit ---------------------------------------------------------------------------

create table public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- report.*, approval.*, reserve.*, closure.* (written by the next lots).
  kind text not null,
  subject_id uuid,
  activation_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  actor uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint marketing_events_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index marketing_events_project_idx on public.marketing_events (project_id, created_at desc);
create index marketing_events_subject_idx on public.marketing_events (subject_id, created_at desc);
alter table public.marketing_events enable row level security;
alter table public.marketing_events force row level security;
revoke all on table public.marketing_events from anon, authenticated;
grant select on public.marketing_events to authenticated;
create policy marketing_events_select on public.marketing_events
  for select to authenticated using (public.can_see_project(project_id));

create function public.marketing_log(
  p_org uuid, p_project uuid, p_kind text, p_subject uuid, p_activation uuid,
  p_old jsonb, p_new jsonb, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.marketing_events
    (organization_id, project_id, kind, subject_id, activation_id, old_value, new_value, reason, actor)
  values (p_org, p_project, p_kind, p_subject, p_activation, p_old, p_new, p_reason,
          public.auth_person_id());
$$;
revoke execute on function public.marketing_log(uuid, uuid, text, uuid, uuid, jsonb, jsonb, text)
  from public, anon, authenticated;

-- The fields that changed, before and after (bookkeeping columns left out).
create function public.marketing_diff(p_old jsonb, p_new jsonb, p_skip text[])
returns table (old_value jsonb, new_value jsonb)
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(n.key, o.value) filter (where n.key is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(n.key, n.value) filter (where n.key is not null), '{}'::jsonb)
    from jsonb_each(p_new) n
    join jsonb_each(p_old) o on o.key = n.key
   where n.value is distinct from o.value and not (n.key = any (p_skip));
$$;
revoke execute on function public.marketing_diff(jsonb, jsonb, text[]) from public, anon, authenticated;
