-- Business module, lot BIZ 6: the calls of a deal.
--
-- A call may be about a deal (calls.deal_id). It reuses everything a call
-- has (recorder, transcription, report, closure), but it belongs to the
-- deal, not to the project:
--
--   1. calls.deal_id. A deal's call keeps the deal's project THROUGH THE DEAL
--      (deals.project_id), never in calls.project_id: every module of a
--      project (Cadrage, Stratégie, Conception, Production, Master, history,
--      plan, PO's readers) reads « all the calls of the project », and a
--      negotiation would enter them. So calls.project_id stays null on a
--      deal's call (calls_deal_check), and a deal without a project has its
--      calls too. An internal meeting stays a call with neither.
--   2. Seen only by whoever reads the deal (can_read_deal), worked on
--      (recorded, processed, closed) by whoever writes it (can_write_deal):
--      can_see_call, is_call_owner and the calls policies get a deal branch
--      FIRST, so every table that already follows them (transcripts,
--      reports, recordings, the audio's Storage, closures, guests) follows
--      the deal. No member is invited as an attendee to a deal's call (the
--      deal's readers are its audience); guests from the Réseau are.
--   3. deal_call_proposals: what PO proposes from a deal's call report —
--      a term's value, a stage, a next action — each with its verbatim
--      quote, « proposé » until a person opens the real form and saves it
--      (« appliqué ») or sets it aside (« écarté »). PO never changes a deal.
--   4. delete_project_row takes the calls of the project's deals before the
--      deals.

-- 1. The column -------------------------------------------------------------------------

alter table public.calls add column deal_id uuid;
alter table public.calls
  add constraint calls_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id);
-- A deal's call reads its project through the deal; no module purpose.
alter table public.calls
  add constraint calls_deal_check
    check (deal_id is null or (project_id is null and purpose is null));
create index calls_deal_idx on public.calls (deal_id, occurred_at desc) where deal_id is not null;
-- Chosen when the call is planned, never changed (calls_keep_deal).
grant insert (deal_id) on public.calls to authenticated;

comment on column public.calls.deal_id is
  'Business module (BIZ 6): the deal this call is about; its project is the deal''s, read through it (calls.project_id stays null). Seen by the deal''s readers, worked on by its writers.';

-- A call never changes deal.
create or replace function public.calls_keep_deal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deal_id is distinct from old.deal_id then
    raise exception 'call_deal_fixed' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.calls_keep_deal() from public, anon, authenticated;
create trigger b_keep_deal before update of deal_id on public.calls
  for each row execute function public.calls_keep_deal();

-- 2. Who sees, who works on it ----------------------------------------------------------

create or replace function public.can_see_call(p_call_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.calls c
      left join public.deals d on d.id = c.deal_id
     where c.id = p_call_id
       and case
             when c.deal_id is not null then
               public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id)
             when c.project_id is not null then public.can_see_project(c.project_id)
             else public.is_active_member(c.organization_id)
                  and (c.created_by = public.auth_person_id()
                       or exists (select 1 from public.call_attendees ca
                                   where ca.call_id = c.id
                                     and ca.person_id = public.auth_person_id()))
           end
  );
$function$;

create or replace function public.is_call_owner(p_call_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.calls c
      left join public.deals d on d.id = c.deal_id
     where c.id = p_call_id
       and case
             when c.deal_id is not null then
               public.can_write_deal(d.organization_id, d.assignee_person_id)
             when c.project_id is not null then public.is_project_owner(c.project_id)
             else c.created_by = public.auth_person_id()
                  and public.is_active_member(c.organization_id)
           end
  );
$function$;

-- Written on the row's columns (a row being inserted is not yet visible to
-- a function); a deal's branch reads the deal under its own policy.
drop policy calls_select_visible on public.calls;
create policy calls_select_visible on public.calls
  for select to authenticated
  using (
    case
      when deal_id is not null then
        exists (select 1 from public.deals d where d.id = calls.deal_id)
      when project_id is not null then
        project_id = any ((select public.visible_project_ids())::uuid[])
      else public.is_active_member(organization_id)
           and (created_by = public.auth_person_id()
                or exists (select 1 from public.call_attendees ca
                            where ca.call_id = calls.id
                              and ca.person_id = public.auth_person_id()))
    end);

-- A deal's call: planned by whoever writes the deal, on an open deal.
drop policy calls_insert_owner on public.calls;
create policy calls_insert_owner on public.calls
  for insert to authenticated
  with check (
    case
      when deal_id is not null then
        created_by = public.auth_person_id()
        and exists (select 1 from public.deals d
                     where d.id = calls.deal_id
                       and d.organization_id = calls.organization_id
                       and d.stage not in ('signed', 'abandoned')
                       and public.can_write_deal(d.organization_id, d.assignee_person_id))
      when project_id is not null then public.is_project_owner(project_id)
      else public.is_active_member(organization_id) and created_by = public.auth_person_id()
    end);

-- No member attendee on a deal's call (its audience is the deal's readers).
create or replace function public.call_attendees_check()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_project uuid;
  v_deal uuid;
begin
  select c.project_id, c.deal_id into v_project, v_deal
    from public.calls c where c.id = new.call_id;
  if v_deal is not null then
    raise exception 'deal_call_no_attendee' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = new.organization_id and m.person_id = new.person_id
       and m.status = 'approved' and a.disabled_at is null
  ) then
    raise exception 'attendee_not_member' using errcode = '23514';
  end if;
  if v_project is not null then
    perform public.design_person_check(v_project, new.person_id);
  end if;
  return new;
end;
$function$;

-- 3. PO's proposals from a deal's call ---------------------------------------------------

create table public.deal_call_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid not null,
  call_id uuid not null,
  kind text not null,
  -- « term »: the term's key, its proposed value (the shape of
  -- lib/deals/terms.ts) and where it stands in the negotiation.
  term_key text,
  value jsonb,
  term_state text,
  -- « stage »: the stage proposed.
  stage text,
  -- « next_action »: the action and the date said (null when none was).
  next_action text,
  next_action_on date,
  quote text not null,
  status text not null default 'proposed',
  settled_by uuid references public.people (id),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint deal_call_proposals_kind_check check (kind in ('term', 'stage', 'next_action')),
  constraint deal_call_proposals_shape_check
    check (case kind
             when 'term' then term_key ~ '^[a-z][a-z0-9_]{0,39}$' and value is not null
                              and octet_length(value::text) <= 4000
                              and term_state in ('pds_proposal', 'counter_proposal', 'confirmed')
             when 'stage' then stage in ('to_contact', 'call_planned', 'negotiation',
                                         'agreement', 'contracting', 'signed')
             else next_action is not null and btrim(next_action) <> ''
                  and char_length(next_action) <= 500
           end),
  constraint deal_call_proposals_quote_check
    check (btrim(quote) <> '' and char_length(quote) <= 1000),
  constraint deal_call_proposals_status_check
    check (status in ('proposed', 'applied', 'dismissed')),
  constraint deal_call_proposals_settled_check
    check ((status = 'proposed') = (settled_at is null)),
  constraint deal_call_proposals_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade,
  constraint deal_call_proposals_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
    on delete cascade
);
create index deal_call_proposals_deal_idx on public.deal_call_proposals (deal_id, created_at);
create index deal_call_proposals_call_idx on public.deal_call_proposals (call_id);

comment on table public.deal_call_proposals is
  'Business module (BIZ 6): what PO proposes from a deal''s call report (a term, a stage, a next action), each with its quote; a person applies it through the real form or sets it aside (settle_deal_call_proposal). PO never changes a deal.';

alter table public.deal_call_proposals enable row level security;
alter table public.deal_call_proposals force row level security;
revoke all on table public.deal_call_proposals from anon, authenticated;
grant select, insert on table public.deal_call_proposals to authenticated;
-- Whoever reads the deal reads them (the deals policy applies).
create policy deal_call_proposals_select on public.deal_call_proposals
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));
-- Written by the processing of the call, under the session of whoever works
-- on it, as « proposé » only.
create policy deal_call_proposals_insert on public.deal_call_proposals
  for insert to authenticated
  with check (
    status = 'proposed' and settled_by is null
    and public.is_call_owner(call_id)
    and exists (select 1 from public.calls c
                 where c.id = call_id and c.deal_id = deal_call_proposals.deal_id));

-- « Appliqué » (the person saved the real form) or « Écarté »: whoever
-- writes the deal, once.
create or replace function public.settle_deal_call_proposal(p_proposal_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deal_call_proposals%rowtype;
begin
  if p_status is null or p_status not in ('applied', 'dismissed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select * into v from public.deal_call_proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal_not_found' using errcode = 'P0002';
  end if;
  perform public.lock_deal_for_write(v.deal_id);
  if v.status <> 'proposed' then
    raise exception 'proposal_settled' using errcode = 'P0001';
  end if;
  update public.deal_call_proposals
     set status = p_status, settled_by = public.auth_person_id(), settled_at = now()
   where id = p_proposal_id;
end;
$$;
revoke execute on function public.settle_deal_call_proposal(uuid, text) from public, anon;
grant execute on function public.settle_deal_call_proposal(uuid, text) to authenticated;

-- 4. delete_project_row: the calls of the project's deals before the deals -----------

-- Unchanged from 20261111230101 but for the calls it takes (v_calls).
CREATE OR REPLACE FUNCTION public.delete_project_row(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  -- Business module (20261112010101): a deal's call has no project of its
  -- own; the calls of the project's deals go with the project's calls.
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls
   where project_id = p_project_id
      or deal_id in (select d.id from public.deals d where d.project_id = p_project_id);
  select coalesce(array_agg(id), '{}') into v_contracts
    from public.contracts where project_id = p_project_id;

  -- Tables of the abandoned "Cadrage intelligent" branch (04/10/2026), not
  -- created by these migrations but still present in some local databases:
  -- emptied for the project when they exist, children first.
  foreach v_table in array array['master_versions', 'master_workflows', 'brief_change_requests',
                                 'brief_versions'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where project_id = $1', v_table) using p_project_id;
    end if;
  end loop;

  -- Cadrage intelligent (20261006000101, 20261006000201): the plan names the
  -- brief (its items cascade), a deadline names a report item, a brief names
  -- its validation, so they go before those. framing_calls cascades with calls.
  delete from public.project_plans where project_id = p_project_id;
  delete from public.framing_deadlines where project_id = p_project_id;
  delete from public.framing_briefs where project_id = p_project_id;

  -- Children before parents: a NO ACTION key is checked after each
  -- statement. ON DELETE CASCADE children are left to their parent.
  delete from public.activity_events where project_id = p_project_id;
  delete from public.tasks where project_id = p_project_id;
  delete from public.budget_lines where project_id = p_project_id;
  delete from public.design_versions where project_id = p_project_id;
  delete from public.milestones where project_id = p_project_id;
  delete from public.strategy_deliverables where project_id = p_project_id;
  delete from public.levers where project_id = p_project_id;
  delete from public.needs where project_id = p_project_id;
  delete from public.field_values where project_id = p_project_id;
  delete from public.framing_constraints where project_id = p_project_id;
  delete from public.open_points where project_id = p_project_id;
  delete from public.project_team_members where project_id = p_project_id;

  delete from public.report_items
   where report_id in (select id from public.call_reports where call_id = any (v_calls));
  delete from public.call_reports where call_id = any (v_calls);
  delete from public.transcripts where call_id = any (v_calls);
  delete from public.calls where id = any (v_calls);

  delete from public.validations
   where project_stage_id in (select id from public.project_stages
                               where project_id = p_project_id);
  delete from public.project_stages where project_id = p_project_id;

  delete from public.legal_clearances where project_id = p_project_id;
  delete from public.legal_facts where project_id = p_project_id;
  delete from public.legal_answers where project_id = p_project_id;
  delete from public.legal_intakes where project_id = p_project_id;
  delete from public.legal_plan_events where project_id = p_project_id;
  delete from public.legal_plan_items where project_id = p_project_id;
  delete from public.legal_plans where project_id = p_project_id;
  delete from public.legal_form_submissions where project_id = p_project_id;
  delete from public.legal_forms where project_id = p_project_id;
  delete from public.legal_agreement_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.legal_split_sheets where project_id = p_project_id;
  delete from public.legal_formalities where project_id = p_project_id;

  delete from public.legal_clearance_contracts where contract_id = any (v_contracts);
  delete from public.financial_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contract_files where contract_id = any (v_contracts);
  delete from public.contract_events
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contracts where id = any (v_contracts);

  delete from public.project_files where project_id = p_project_id;
  delete from public.releases where project_id = p_project_id;
  delete from public.share_links where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
  -- Business module (20261111230101): a project's deals (their journal and
  -- terms cascade) name its participations, so they go first.
  delete from public.deals where project_id = p_project_id;
  -- Projet collectif (20261111120101, 20261111140101): the participations
  -- name their titles, the titles hold their links (on delete restrict), so
  -- they go before the cascade takes the links.
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
