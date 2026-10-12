-- Retours Marketing du 11/10/2026, MKT-S1-11, MKT-S1-12 et MKT-S1-15
-- (docs/ARCHITECTURE.md § 8 ter, « Budget »).
--
-- Families: the taxonomy of the team's real spending (content production,
-- advertising & promotion, events & activations, services, travel, sundry
-- costs, other), the four former ones mapped without loss; « Autre » asks a
-- precision (family_detail). Statuses: « Facturé » joins between engaged
-- and paid (the real = invoiced + paid). A line may point at the deliverable
-- it pays for (same project) and carry its proof, a file of the project's
-- library (same project): never a second storage.

-- 1. Families ----------------------------------------------------------------

alter table public.budget_lines drop constraint budget_lines_family_check;
update public.budget_lines set family = case family
    when 'creation_content' then 'content_production'
    when 'promotion_distribution' then 'advertising'
    when 'experiences_activations' then 'events'
    else family end
 where family in ('creation_content', 'promotion_distribution', 'experiences_activations');
alter table public.budget_lines add constraint budget_lines_family_check
  check (family is null or family in ('content_production', 'advertising', 'events', 'services',
                                      'travel', 'misc', 'other'));

alter table public.budget_lines add column family_detail text;
alter table public.budget_lines add constraint budget_lines_family_detail_check
  check (family_detail is null or (btrim(family_detail) <> '' and char_length(family_detail) <= 120));
-- « Autre » says what it is. Not validated on former lines: they keep
-- working until edited.
alter table public.budget_lines add constraint budget_lines_other_detail_check
  check (family is distinct from 'other' or family_detail is not null) not valid;

-- 2. Statuses ----------------------------------------------------------------

alter table public.budget_lines drop constraint budget_lines_status_check;
alter table public.budget_lines add constraint budget_lines_status_check
  check (status in ('planned', 'proposed', 'committed', 'invoiced', 'paid'));

-- 3. Deliverable and proof ---------------------------------------------------

alter table public.budget_lines
  add column deliverable_id uuid references public.strategy_deliverables (id) on delete set null,
  add column attachment_file_id uuid references public.project_files (id) on delete set null;

create or replace function public.check_budget_line_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and not exists (
    select 1 from public.strategy_deliverables d
     where d.id = new.deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = 'P0001';
  end if;
  if new.attachment_file_id is not null and not exists (
    select 1 from public.project_files f
     where f.id = new.attachment_file_id and f.project_id = new.project_id) then
    raise exception 'attachment_not_in_project' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_budget_line_links() from public, anon, authenticated;
create trigger budget_lines_check_links
  before insert or update of deliverable_id, attachment_file_id on public.budget_lines
  for each row execute function public.check_budget_line_links();

grant insert (family_detail, deliverable_id, attachment_file_id) on public.budget_lines to authenticated;
grant update (family_detail, deliverable_id, attachment_file_id) on public.budget_lines to authenticated;

-- 4. Reports count the invoiced as engaged -----------------------------------

create or replace function public.generate_marketing_report(
  p_project_id uuid,
  p_activation_ids uuid[],
  p_period_start date,
  p_period_end date,
  p_sections text[],
  p_summary text,
  p_recommendations text,
  p_reserves jsonb,
  p_rules_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_snapshot jsonb;
  v_id uuid;
  v_reserve jsonb;
  v_ids uuid[];
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.marketing_can_contribute(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_activation_ids) x;
  if cardinality(v_ids) = 0 or exists (
       select 1 from unnest(v_ids) x
        where not exists (select 1 from public.marketing_review_activations a
                           where a.id = x and a.project_id = p_project_id
                             and a.archived_at is null)) then
    raise exception 'invalid_scope' using errcode = '23514';
  end if;
  if char_length(coalesce(p_summary, '')) > 5000
     or char_length(coalesce(p_recommendations, '')) > 5000
     or jsonb_typeof(coalesce(p_reserves, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reserves, '[]'::jsonb)) > 30 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  -- One generation at a time per project: the version number is the next one.
  perform 1 from public.projects where id = p_project_id for update;
  select coalesce(max(version), 0) + 1 into v_version
    from public.marketing_reports where project_id = p_project_id;
  v_id := gen_random_uuid();

  for v_reserve in select * from jsonb_array_elements(coalesce(p_reserves, '[]'::jsonb)) loop
    insert into public.marketing_reserves
      (organization_id, project_id, category, description, origin, activation_id)
    values (v_org, p_project_id, v_reserve ->> 'category', v_reserve ->> 'description', 'report',
            nullif(v_reserve ->> 'activation_id', '')::uuid);
  end loop;

  v_snapshot := public.marketing_report_snapshot(p_project_id, v_ids, p_period_start, p_period_end,
                                                 p_sections, p_summary, p_recommendations);
  update public.marketing_reports set state = 'superseded'
   where project_id = p_project_id and state in ('generated', 'to_validate', 'changes_requested',
                                                'postponed');
  insert into public.marketing_reports
    (id, organization_id, project_id, version, period_start, period_end, activation_ids, sections,
     rules_version, snapshot, content_hash, created_by)
  values (v_id, v_org, p_project_id, v_version, p_period_start, p_period_end, v_ids, p_sections,
          p_rules_version, v_snapshot,
          encode(extensions.digest(convert_to(v_snapshot::text, 'UTF8'), 'sha256'), 'hex'),
          public.auth_person_id());
  update public.marketing_reserves set origin_report_id = v_id
   where project_id = p_project_id and origin = 'report' and origin_report_id is null;

  -- The budget, apart, only when the author reads it and asked for it.
  if 'budget' = any (p_sections) and public.can_read_project_budget(p_project_id) then
    insert into public.marketing_report_budgets
      (report_id, organization_id, project_id, planned_cents, committed_cents, paid_cents)
    select v_id, v_org, p_project_id,
           coalesce(sum(amount_cents) filter (where status = 'planned'), 0),
           coalesce(sum(amount_cents) filter (where status in ('committed', 'invoiced', 'paid')), 0),
           coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
      from public.budget_lines where project_id = p_project_id;
  end if;
  return v_id;
end;
$$;
