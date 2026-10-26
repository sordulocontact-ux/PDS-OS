-- Suivi & bilan, recette Marketing V1 of 23/10/2026 (MKT-BIL-001,
-- MKT-BIL-002): an activation still open is never closed away, the budget
-- reads by activation.
--
-- Before (20261011000901, 20261011001001, docs/ARCHITECTURE.md § 8 terdecies):
-- the reserve of an activation still open could be arbitrated « Non
-- applicable » or « Doublon », or simply left out of the version, and the
-- Marketing closed « sans réserve » with activations under way. The recette
-- asks the opposite (latest feedback wins):
--
-- 1. The reserve of an activation still open (not closed, not cancelled) is
--    never « Non applicable » nor « Doublon » (`activation_reserve_kept`).
--    A reserve others point to as their kept one is not itself a duplicate.
-- 2. The closure is asked and decided only once every activation still open
--    has a reserve followed after the closure (who, when, channel) or a
--    limit accepted by the direction (`activations_uncovered:<titles>`).
-- 3. A budget line may name its activation (budget_lines.activation_id, same
--    project); the bilan reads estimated / committed / invoiced / paid by
--    activation, and the frozen version keeps the invoiced total
--    (marketing_report_budgets.invoiced_cents; « Facturé » = invoiced or
--    paid: an invoice received).

-- ------------------------------------------------------------ 1 and 2

-- The activations still open without a reserve followed or a limit, by title.
create or replace function public.marketing_uncovered_activations(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(a.title, ', ' order by a.title)
    from public.marketing_activations a
   where a.project_id = p_project_id and a.status not in ('closed', 'cancelled')
     and not exists (
       select 1 from public.marketing_reserves r
        where r.activation_id = a.id and r.status = 'arbitrated'
          and r.decision in ('follow_up', 'accepted_limit'));
$$;

revoke execute on function public.marketing_uncovered_activations(uuid) from public, anon;
grant execute on function public.marketing_uncovered_activations(uuid) to authenticated;

create or replace function public.arbitrate_marketing_reserve(p_reserve_id uuid, p_decision text, p_reason text, p_follow_up_person_id uuid, p_follow_up_due_on date, p_follow_up_channel text, p_duplicate_of uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_reserves%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_channel text := nullif(btrim(coalesce(p_follow_up_channel, '')), '');
begin
  select * into v from public.marketing_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.is_project_owner(v.project_id)
     and not (p_decision = 'accepted_limit' and public.has_permission(v.organization_id, 'validate')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status not in ('open', 'arbitrated') then
    raise exception 'invalid_transition';
  end if;
  if p_decision not in ('blocking', 'follow_up', 'accepted_limit', 'not_applicable', 'duplicate') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- A definitive limit is the direction's to accept.
  if p_decision = 'accepted_limit' and not public.has_permission(v.organization_id, 'validate') then
    raise exception 'limit_needs_direction' using errcode = '42501';
  end if;
  if p_decision in ('accepted_limit', 'not_applicable') and v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  -- An activation still open stays a reserve: followed, a limit, or blocking.
  if p_decision in ('not_applicable', 'duplicate') and exists (
       select 1 from public.marketing_activations a
        where a.id = v.activation_id and a.status not in ('closed', 'cancelled')) then
    raise exception 'activation_reserve_kept' using errcode = '23514';
  end if;
  if p_decision = 'follow_up' and (p_follow_up_person_id is null or p_follow_up_due_on is null
                                   or v_channel is null
                                   or not public.production_person_is_member(p_follow_up_person_id,
                                                                            v.organization_id)) then
    raise exception 'follow_up_incomplete' using errcode = '23514';
  end if;
  if p_decision = 'duplicate' and (p_duplicate_of is null or p_duplicate_of = v.id or not exists (
       select 1 from public.marketing_reserves k
        where k.id = p_duplicate_of and k.project_id = v.project_id
          and k.decision is distinct from 'duplicate')
       -- The reserve others keep is not itself a duplicate: no loop.
       or exists (select 1 from public.marketing_reserves k where k.duplicate_of = v.id)) then
    raise exception 'invalid_duplicate' using errcode = '23514';
  end if;
  update public.marketing_reserves
     set decision = p_decision,
         decision_reason = v_reason,
         follow_up_person_id = case when p_decision = 'follow_up' then p_follow_up_person_id end,
         follow_up_due_on = case when p_decision = 'follow_up' then p_follow_up_due_on end,
         follow_up_channel = case when p_decision = 'follow_up' then v_channel end,
         duplicate_of = case when p_decision = 'duplicate' then p_duplicate_of end,
         status = case when p_decision in ('not_applicable', 'duplicate') then 'closed'
                       else 'arbitrated' end,
         arbitrated_by = public.auth_person_id(),
         arbitrated_at = now()
   where id = v.id;
end;
$$;

create or replace function public.request_marketing_closure(p_project_id uuid, p_report_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_report public.marketing_reports%rowtype;
  v_id uuid;
  v_uncovered text;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform 1 from public.projects where id = p_project_id for update;
  if public.marketing_is_closed(p_project_id) then
    raise exception 'already_closed';
  end if;
  if exists (select 1 from public.marketing_closures c
              where c.project_id = p_project_id and c.state = 'requested') then
    raise exception 'closure_pending';
  end if;
  select * into v_report from public.marketing_reports
   where id = p_report_id and project_id = p_project_id;
  -- The newest version approved as a provisional review; after a reopening,
  -- the finalized one it rested on still counts.
  if not found or v_report.state not in ('approved_provisional', 'finalized') or exists (
       select 1 from public.marketing_reports r
        where r.project_id = p_project_id and r.state in ('approved_provisional', 'finalized')
          and r.version > v_report.version) then
    raise exception 'report_not_reference';
  end if;
  if exists (select 1 from public.marketing_reserves r
              where r.project_id = p_project_id and r.status = 'open') then
    raise exception 'reserves_unarbitrated';
  end if;
  if exists (select 1 from public.marketing_reserves r
              where r.project_id = p_project_id and r.status = 'arbitrated'
                and r.decision = 'blocking') then
    raise exception 'reserves_blocking';
  end if;
  -- Every activation still open is followed or accepted as a limit (MKT-BIL-001).
  v_uncovered := public.marketing_uncovered_activations(p_project_id);
  if v_uncovered is not null then
    raise exception 'activations_uncovered:%', v_uncovered using errcode = '23514';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.sole_validator(v_org);
  insert into public.marketing_closures
    (organization_id, project_id, report_id, request_note, requested_by)
  values (v_org, p_project_id, p_report_id, nullif(btrim(coalesce(p_note, '')), ''),
          public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.decide_marketing_closure(p_closure_id uuid, p_decision text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.marketing_closures%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_remaining integer;
  v_uncovered text;
begin
  select * into v from public.marketing_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.state <> 'requested' then
    raise exception 'invalid_transition';
  end if;
  if v_me = v.requested_by then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if p_decision not in ('closed_clean', 'closed_with_reserves', 'changes_requested', 'postponed') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_decision in ('changes_requested', 'postponed') and v_comment is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  if char_length(coalesce(v_comment, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_decision in ('closed_clean', 'closed_with_reserves') then
    -- The reserves are read again: something may have moved since the request.
    if exists (select 1 from public.marketing_reserves r
                where r.project_id = v.project_id
                  and (r.status = 'open' or (r.status = 'arbitrated' and r.decision = 'blocking'))) then
      raise exception 'reserves_unarbitrated';
    end if;
    select count(*) into v_remaining from public.marketing_reserves r
     where r.project_id = v.project_id and r.status = 'arbitrated';
    if p_decision = 'closed_clean' and v_remaining > 0 then
      raise exception 'reserves_remaining';
    end if;
    if p_decision = 'closed_with_reserves' and v_remaining = 0 then
      raise exception 'no_reserves';
    end if;
    -- Every activation still open is followed or accepted as a limit (MKT-BIL-001).
    v_uncovered := public.marketing_uncovered_activations(v.project_id);
    if v_uncovered is not null then
      raise exception 'activations_uncovered:%', v_uncovered using errcode = '23514';
    end if;
  end if;
  update public.marketing_closures
     set state = p_decision, decided_by = v_me, decided_at = now(), decision_comment = v_comment,
         reserves = coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', r.id, 'category', r.category, 'description', r.description,
                    'status', r.status, 'decision', r.decision, 'reason', r.decision_reason,
                    'follow_up_person_id', r.follow_up_person_id,
                    'follow_up_due_on', r.follow_up_due_on,
                    'follow_up_channel', r.follow_up_channel) order by r.created_at)
             from public.marketing_reserves r where r.project_id = v.project_id), '[]'::jsonb)
   where id = v.id;
  if p_decision in ('closed_clean', 'closed_with_reserves') then
    update public.marketing_reports set state = 'finalized' where id = v.report_id;
  end if;
end;
$$;
-- ------------------------------------------------------------ 3. budget

alter table public.budget_lines add column if not exists activation_id uuid;
alter table public.budget_lines drop constraint if exists budget_lines_activation_same_org;
alter table public.budget_lines add constraint budget_lines_activation_same_org
  foreign key (activation_id, organization_id)
  references public.marketing_activations (id, organization_id)
  on delete set null (activation_id);
create index if not exists budget_lines_activation_idx on public.budget_lines (activation_id)
  where activation_id is not null;
grant select (activation_id), insert (activation_id), update (activation_id)
  on public.budget_lines to authenticated;

-- A line's activation belongs to the same project.
create or replace function public.check_budget_line_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activation_id is not null and not exists (
    select 1 from public.marketing_activations a
     where a.id = new.activation_id and a.project_id = new.project_id) then
    raise exception 'activation_not_in_project' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_budget_line_activation() from public, anon, authenticated;

drop trigger if exists budget_lines_check_activation on public.budget_lines;
create trigger budget_lines_check_activation
  before insert or update of activation_id, project_id on public.budget_lines
  for each row execute function public.check_budget_line_activation();

-- The frozen version keeps what was invoiced (null: generated before).
alter table public.marketing_report_budgets add column if not exists invoiced_cents bigint;

create or replace function public.generate_marketing_report(p_project_id uuid, p_activation_ids uuid[], p_period_start date, p_period_end date, p_sections text[], p_summary text, p_recommendations text, p_reserves jsonb, p_rules_version integer)
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
      (report_id, organization_id, project_id, planned_cents, committed_cents, invoiced_cents,
       paid_cents)
    select v_id, v_org, p_project_id,
           coalesce(sum(amount_cents) filter (where status = 'planned'), 0),
           coalesce(sum(amount_cents) filter (where status in ('committed', 'invoiced', 'paid')), 0),
           coalesce(sum(amount_cents) filter (where status in ('invoiced', 'paid')), 0),
           coalesce(sum(amount_cents) filter (where status = 'paid'), 0)
      from public.budget_lines where project_id = p_project_id;
  end if;
  return v_id;
end;
$$;
