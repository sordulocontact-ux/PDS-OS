-- Projet collectif, lot 10 (docs/pds-mic-plan.md § 3.1, § 3.2, principle 3):
-- a marketing action of a collective targets titles, never duplicated, never
-- created per title.
--
--   1. deliverable_titles: the scope of an action, a committed deliverable
--      of the Stratégie (the same one the Conception and the Production
--      work on) or an activation. No row: the whole project (as today, the
--      default). One row « all_titles »: every title, those added later too.
--      One row per title « titles »: those titles. One row « none »: no
--      title (the brand, behind the scenes…). A deliverable of the
--      Conception still « à qualifier » is not an action yet: it takes its
--      Stratégie deliverable's scope once committed.
--   2. set_marketing_title_scope: the project's owner sets it (collective
--      only), the rows replaced at once; a title of the project, never an
--      unknown one (an abandoned title already targeted may stay).
--   3. RLS forced, read by whoever sees the project, written by the function
--      only; zz_project_live; delete_project_row empties it.
--
-- Any other project: no row, nothing changes. Nothing blocks on it here.

-- 1 ------------------------------------------------------------------------------------------
create table public.deliverable_titles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  strategy_deliverable_id uuid,
  activation_id uuid,
  scope text not null,
  title_id uuid references public.project_titles (id) on delete cascade,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint deliverable_titles_one_action
    check (num_nonnulls(strategy_deliverable_id, activation_id) = 1),
  constraint deliverable_titles_scope_check
    check (scope in ('all_titles', 'titles', 'none')),
  constraint deliverable_titles_title_check
    check ((scope = 'titles') = (title_id is not null)),
  constraint deliverable_titles_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint deliverable_titles_deliverable_same_org
    foreign key (strategy_deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete cascade,
  constraint deliverable_titles_activation_same_org
    foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);

-- One mode row per action, one row per targeted title.
create unique index deliverable_titles_mode_key
  on public.deliverable_titles (coalesce(strategy_deliverable_id, activation_id))
  where title_id is null;
create unique index deliverable_titles_title_key
  on public.deliverable_titles (coalesce(strategy_deliverable_id, activation_id), title_id)
  where title_id is not null;
create index deliverable_titles_project_idx on public.deliverable_titles (project_id);
create index deliverable_titles_title_idx on public.deliverable_titles (title_id);

alter table public.deliverable_titles enable row level security;
alter table public.deliverable_titles force row level security;
revoke all on table public.deliverable_titles from anon, authenticated;
grant select on table public.deliverable_titles to authenticated;
create policy deliverable_titles_select on public.deliverable_titles
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

create trigger zz_project_live after insert or update or delete on public.deliverable_titles
  for each row execute function public.project_live_tick('project');

-- 2 ------------------------------------------------------------------------------------------
-- p_scope: 'project' (no row), 'all_titles', 'titles' (p_title_ids), 'none';
-- the action: a deliverable or an activation, one of them.
create or replace function public.set_marketing_title_scope(
  p_scope text,
  p_title_ids uuid[] default null,
  p_strategy_deliverable_id uuid default null,
  p_activation_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_project_id uuid;
  v_ids uuid[] := array(select distinct u from unnest(coalesce(p_title_ids, '{}'::uuid[])) u);
begin
  if num_nonnulls(p_strategy_deliverable_id, p_activation_id) <> 1 then
    raise exception 'action_required' using errcode = '22023';
  end if;
  select coalesce(
           (select d.project_id from public.strategy_deliverables d
             where d.id = p_strategy_deliverable_id),
           (select a.project_id from public.marketing_activations a
             where a.id = p_activation_id))
    into v_project_id;
  if v_project_id is null or not public.can_see_project(v_project_id) then
    raise exception 'action_not_found' using errcode = 'P0002';
  end if;
  select * into v_project from public.projects where id = v_project_id for update;
  if v_project.archived_at is not null or not public.is_project_owner(v_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if p_scope is null or p_scope not in ('project', 'all_titles', 'titles', 'none') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if p_scope = 'titles' then
    if cardinality(v_ids) = 0 then
      raise exception 'titles_required' using errcode = '23514';
    end if;
    if exists (select 1 from unnest(v_ids) u
                where not exists (select 1 from public.project_titles t
                                   where t.id = u and t.project_id = v_project_id)) then
      raise exception 'title_not_found' using errcode = 'P0002';
    end if;
    -- A title abandoned is never newly targeted; one already targeted stays.
    if exists (select 1 from unnest(v_ids) u
                join public.project_titles t on t.id = u and t.status = 'abandoned'
               where not exists (select 1 from public.deliverable_titles dt
                                  where dt.title_id = u
                                    and (dt.strategy_deliverable_id = p_strategy_deliverable_id
                                         or dt.activation_id = p_activation_id))) then
      raise exception 'title_abandoned' using errcode = 'P0001';
    end if;
  end if;

  delete from public.deliverable_titles
   where strategy_deliverable_id is not distinct from p_strategy_deliverable_id
     and activation_id is not distinct from p_activation_id;
  if p_scope in ('all_titles', 'none') then
    insert into public.deliverable_titles
      (organization_id, project_id, strategy_deliverable_id, activation_id, scope, created_by)
    values (v_project.organization_id, v_project_id, p_strategy_deliverable_id, p_activation_id,
            p_scope, public.auth_person_id());
  elsif p_scope = 'titles' then
    insert into public.deliverable_titles
      (organization_id, project_id, strategy_deliverable_id, activation_id, scope, title_id,
       created_by)
    select v_project.organization_id, v_project_id, p_strategy_deliverable_id, p_activation_id,
           'titles', u, public.auth_person_id()
      from unnest(v_ids) u;
  end if;
end;
$$;
revoke execute on function public.set_marketing_title_scope(text, uuid[], uuid, uuid) from public, anon;
grant execute on function public.set_marketing_title_scope(text, uuid[], uuid, uuid) to authenticated;

-- 3 ------------------------------------------------------------------------------------------
-- As 20261112010101 (Business module), plus deliverable_titles.
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
  -- Projet collectif, lot 10 (20261113200101): the titles each action targets,
  -- before the actions and the titles they name.
  delete from public.deliverable_titles where project_id = p_project_id;
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
