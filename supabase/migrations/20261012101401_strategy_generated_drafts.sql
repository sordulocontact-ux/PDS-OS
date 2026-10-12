-- Retours Marketing du 11/10/2026, MKT-S1-06 et MKT-S1-09
-- (docs/ARCHITECTURE.md § 6 bis, « Stratégie »).
--
-- A strategy drafted by PO from the Cadrage and the calls: each proposal is
-- a field value of its own kind (« generated »), always a proposal until a
-- person confirms it, with where it comes from (source_label, quote) and how
-- sure PO is (confidence). The history tells imported, generated and typed
-- values apart.

alter table public.field_values drop constraint field_values_source_check;
alter table public.field_values add constraint field_values_source_check
  check (source_type in ('call', 'manual', 'import', 'voice', 'suggestion', 'generated'));

-- Generated text is never a confirmed value by itself.
alter table public.field_values add constraint field_values_generated_proposed
  check (source_type <> 'generated' or status in ('proposed', 'rejected'));

alter table public.field_values add column confidence text;
alter table public.field_values add constraint field_values_confidence_check
  check (confidence is null or (source_type = 'generated' and confidence in ('high', 'medium', 'low')));

grant select (confidence), insert (confidence) on public.field_values to authenticated;

-- The view is a frozen column list: recreated with the confidence.
create or replace view public.current_field_values
  with (security_invoker = true) as
select distinct on (project_id, deliverable, field_key)
  id, organization_id, project_id, deliverable, field_key, value, status,
  source_type, source_report_item_id, source_quote, source_start_seconds,
  created_by, created_at, source_label, confidence
from public.field_values
order by project_id, deliverable, field_key, created_at desc;
