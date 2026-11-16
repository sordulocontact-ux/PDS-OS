-- Projet collectif, lot 12 (docs/pds-mic-plan.md décision 6, § 0 bis « Où est
-- l'étape tournage », principle 5): a participation's missing contract.
-- Preparing and recording stay possible (warned upstream, in the code);
-- the shoot and the release are refused for a collective while a confirmed
-- participation concerned has neither its contract signed nor an open
-- waiver of that scope, granted by the direction alone.
--
--   1. participation_waivers: append-only. A scope (« shoot » or
--      « release »: one never covers the other), a reason (required), a
--      risk, a due date (required: past it, the waiver lapses), who granted
--      it and when; revoked (who, when, why) without anything overwritten.
--      Generic on purpose: the Business module may reuse it for its
--      exceptions before signature (PDSBIZ-010), extending the scope check
--      rather than adding a second table.
--   2. participation_covered / contract_gaps: covered = the participation's
--      contract (title_participations.contract_id, the only source) is
--      signed, or an open waiver of the scope. The gaps of a scope: the
--      confirmed participations of the titles concerned, not covered. The
--      titles concerned: a deliverable's targeted titles (deliverable_titles,
--      lot 10; « none »: no title), else every title not abandoned.
--      list_contract_gaps: the same for whoever sees the project (names of
--      artists and titles only, never a contact).
--   3. grant_participation_waiver / revoke_participation_waiver: the
--      direction (« validate ») only; a confirmed participation of a title
--      not abandoned whose contract is not signed; one open waiver per
--      scope; logged in the collective's journal (the Activité), the
--      project's owner told.
--   4. The locks, for a collective only (any other project: unchanged): a
--      shoot starting or declared held (production_shoots, the same
--      transition as production_shoots_check's « not_ready ») checks its
--      sheet's deliverable; a version submitted to the Distribution checks
--      every title (the project's release; per release with lot 15).
--      Refused with « contract_missing », the missing contracts in DETAIL.
--   5. RLS forced, read by whoever sees the project, written by functions
--      only; zz_project_live; delete_project_row empties it.

-- 1 ------------------------------------------------------------------------------------------
create table public.participation_waivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  participation_id uuid not null references public.title_participations (id) on delete cascade,
  scope text not null,
  reason text not null,
  risk text,
  due_on date not null,
  granted_by uuid not null references public.people (id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.people (id),
  revoked_at timestamptz,
  revoke_reason text,
  constraint participation_waivers_scope_check check (scope in ('shoot', 'release')),
  constraint participation_waivers_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 2000),
  constraint participation_waivers_risk_check
    check (risk is null or (btrim(risk) <> '' and char_length(risk) <= 2000)),
  constraint participation_waivers_revoke_check
    check ((revoked_at is null) = (revoked_by is null)
           and (revoke_reason is null or (revoked_at is not null
                                          and char_length(revoke_reason) <= 2000))),
  constraint participation_waivers_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index participation_waivers_participation_idx
  on public.participation_waivers (participation_id, scope);
create index participation_waivers_project_idx on public.participation_waivers (project_id);

comment on table public.participation_waivers is
  'Projet collectif, lot 12 (décision 6): a waiver to shoot or release without a signed participation contract. Append-only: granted by grant_participation_waiver, closed by revoke_participation_waiver, never changed otherwise. Reusable by the Business module (PDSBIZ-010) by extending participation_waivers_scope_check.';

-- Nothing but the revocation ever changes, once.
create or replace function public.participation_waivers_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revoked_at is not null then
    raise exception 'waiver_revoked' using errcode = 'P0001';
  end if;
  if (new.organization_id, new.project_id, new.participation_id, new.scope, new.reason,
      new.risk, new.due_on, new.granted_by, new.granted_at)
     is distinct from
     (old.organization_id, old.project_id, old.participation_id, old.scope, old.reason,
      old.risk, old.due_on, old.granted_by, old.granted_at) then
    raise exception 'waiver_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger a_append_only before update on public.participation_waivers
  for each row execute function public.participation_waivers_append_only();

alter table public.participation_waivers enable row level security;
alter table public.participation_waivers force row level security;
revoke all on table public.participation_waivers from anon, authenticated;
grant select on table public.participation_waivers to authenticated;
create policy participation_waivers_select on public.participation_waivers
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

create trigger zz_project_live after insert or update or delete on public.participation_waivers
  for each row execute function public.project_live_tick('project');

select public.add_notification_kinds(array['participation_waiver_granted',
                                           'participation_waiver_revoked']);

-- The collective's journal (20261113170101) notes the waivers.
alter table public.project_title_events drop constraint project_title_events_kind_check;
alter table public.project_title_events add constraint project_title_events_kind_check
  check (kind in ('added', 'renamed', 'abandoned', 'reactivated', 'participation_added',
                  'participation_status', 'main_artist_changed', 'cataloged',
                  'master_attached', 'waiver_granted', 'waiver_revoked'));

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.paris_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

create or replace function public.participation_covered(p_participation_id uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.title_participations tp
                   join public.contracts c on c.id = tp.contract_id
                  where tp.id = p_participation_id and c.status = 'signed')
      or exists (select 1 from public.participation_waivers w
                  where w.participation_id = p_participation_id and w.scope = p_scope
                    and w.revoked_at is null and w.due_on >= public.paris_today());
$$;
revoke execute on function public.participation_covered(uuid, text) from public, anon, authenticated;

-- The confirmed participations not covered for a scope, on the titles
-- concerned (a deliverable's targets, else every title not abandoned).
-- Internal: no right is checked here (the locks call it).
create or replace function public.contract_gaps(
  p_project_id uuid, p_scope text, p_strategy_deliverable_id uuid default null)
returns table (
  participation_id uuid,
  title_id uuid,
  title_position integer,
  working_title text,
  master_title text,
  artist_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select tp.id, t.id, t.position, t.working_title,
         case when coalesce(m.title_is_provisional, false) then null else m.title end,
         a.name
    from public.title_participations tp
    join public.project_titles t on t.id = tp.title_id
    left join public.masters m on m.id = t.master_id
    join public.artists a on a.id = tp.artist_id
   where tp.project_id = p_project_id
     and tp.status = 'confirmed'
     and t.status <> 'abandoned'
     and (p_strategy_deliverable_id is null
          or not exists (select 1 from public.deliverable_titles d
                          where d.strategy_deliverable_id = p_strategy_deliverable_id)
          or exists (select 1 from public.deliverable_titles d
                      where d.strategy_deliverable_id = p_strategy_deliverable_id
                        and (d.scope = 'all_titles' or d.title_id = t.id)))
     and not public.participation_covered(tp.id, p_scope)
   order by t.position, a.name;
$$;
revoke execute on function public.contract_gaps(uuid, text, uuid) from public, anon, authenticated;

-- « Titre 2 · Néons » in a refusal's detail (projectTitleLabel's rule).
create or replace function public.contract_gaps_text(
  p_project_id uuid, p_scope text, p_strategy_deliverable_id uuid default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(g.artist_name || ' (' ||
           coalesce(g.working_title, g.master_title, 'Titre ' || g.title_position || ' · sans nom')
           || ')', ', ' order by g.title_position, g.artist_name)
    from public.contract_gaps(p_project_id, p_scope, p_strategy_deliverable_id) g;
$$;
revoke execute on function public.contract_gaps_text(uuid, text, uuid) from public, anon, authenticated;

-- For the screens: the same gaps, for whoever sees the collective.
create or replace function public.list_contract_gaps(
  p_project_id uuid, p_scope text, p_strategy_deliverable_id uuid default null)
returns table (
  participation_id uuid,
  title_id uuid,
  title_position integer,
  working_title text,
  master_title text,
  artist_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.*
    from public.contract_gaps(p_project_id, p_scope, p_strategy_deliverable_id) g
   where public.can_see_project(p_project_id)
     and exists (select 1 from public.projects p where p.id = p_project_id and p.collective)
     and p_scope in ('shoot', 'release');
$$;
revoke execute on function public.list_contract_gaps(uuid, text, uuid) from public, anon;
grant execute on function public.list_contract_gaps(uuid, text, uuid) to authenticated;

-- 3 ------------------------------------------------------------------------------------------
create or replace function public.grant_participation_waiver(
  p_participation_id uuid,
  p_scope text,
  p_reason text,
  p_due_on date,
  p_risk text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part public.title_participations%rowtype;
  v_project public.projects%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_risk text := nullif(btrim(coalesce(p_risk, '')), '');
  v_id uuid;
begin
  select * into v_part from public.title_participations where id = p_participation_id for update;
  if not found or not public.can_see_project(v_part.project_id) then
    raise exception 'participation_not_found' using errcode = 'P0002';
  end if;
  select * into v_project from public.projects where id = v_part.project_id;
  if not public.has_permission(v_project.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if p_scope is null or p_scope not in ('shoot', 'release') then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 or char_length(coalesce(v_risk, '')) > 2000 then
    raise exception 'text_too_long' using errcode = '22001';
  end if;
  if p_due_on is null then
    raise exception 'due_required' using errcode = '23514';
  end if;
  if p_due_on < public.paris_today() then
    raise exception 'due_in_past' using errcode = '23514';
  end if;
  if v_part.status <> 'confirmed' then
    raise exception 'participation_not_confirmed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.project_titles t
              where t.id = v_part.title_id and t.status = 'abandoned') then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.contracts c
              where c.id = v_part.contract_id and c.status = 'signed') then
    raise exception 'contract_signed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.participation_waivers w
              where w.participation_id = p_participation_id and w.scope = p_scope
                and w.revoked_at is null and w.due_on >= public.paris_today()) then
    raise exception 'waiver_open' using errcode = 'P0001';
  end if;

  insert into public.participation_waivers
    (organization_id, project_id, participation_id, scope, reason, risk, due_on, granted_by)
  values (v_project.organization_id, v_project.id, p_participation_id, p_scope, v_reason,
          v_risk, p_due_on, public.auth_person_id())
  returning id into v_id;
  perform public.log_project_title_event(v_part.title_id, 'waiver_granted',
    public.title_participation_snapshot(p_participation_id)
      || jsonb_build_object('waiver', v_id, 'scope', p_scope, 'due_on', p_due_on,
                            'reason', v_reason));
  perform public.notify(v_project.organization_id, v_project.owner_person_id,
                        'participation_waiver_granted', v_project.id, p_participation_id);
  return v_id;
end;
$$;
revoke execute on function public.grant_participation_waiver(uuid, text, text, date, text) from public, anon;
grant execute on function public.grant_participation_waiver(uuid, text, text, date, text) to authenticated;

create or replace function public.revoke_participation_waiver(
  p_waiver_id uuid,
  p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.participation_waivers%rowtype;
  v_title uuid;
  v_owner uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.participation_waivers where id = p_waiver_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'waiver_not_found' using errcode = 'P0002';
  end if;
  if not public.has_permission(v_row.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.revoked_at is not null then
    raise exception 'waiver_revoked' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_reason, '')) > 2000 then
    raise exception 'text_too_long' using errcode = '22001';
  end if;
  update public.participation_waivers
     set revoked_at = now(), revoked_by = public.auth_person_id(), revoke_reason = v_reason
   where id = p_waiver_id;
  select tp.title_id into v_title from public.title_participations tp
   where tp.id = v_row.participation_id;
  perform public.log_project_title_event(v_title, 'waiver_revoked',
    public.title_participation_snapshot(v_row.participation_id)
      || jsonb_build_object('waiver', v_row.id, 'scope', v_row.scope, 'reason', v_reason));
  select owner_person_id into v_owner from public.projects where id = v_row.project_id;
  perform public.notify(v_row.organization_id, v_owner, 'participation_waiver_revoked',
                        v_row.project_id, v_row.participation_id);
end;
$$;
revoke execute on function public.revoke_participation_waiver(uuid, text) from public, anon;
grant execute on function public.revoke_participation_waiver(uuid, text) to authenticated;

-- 4 ------------------------------------------------------------------------------------------
-- The shoot: the same transition as production_shoots_check's « not_ready »
-- (a start, or a shoot declared held, from planned or postponed).
create or replace function public.production_shoots_contract_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_deliverable uuid;
  v_missing text;
begin
  if new.state in ('in_progress', 'done', 'partial', 'interrupted')
     and (tg_op = 'INSERT' or old.state in ('planned', 'postponed')) then
    select s.project_id, s.deliverable_id into v_project, v_deliverable
      from public.production_sheets s
      join public.projects p on p.id = s.project_id and p.collective
     where s.id = new.sheet_id;
    if v_project is not null then
      v_missing := public.contract_gaps_text(v_project, 'shoot', v_deliverable);
      if v_missing is not null then
        raise exception 'contract_missing' using errcode = '23514', detail = v_missing;
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_shoots_contract_check() from public, anon, authenticated;
create trigger c_contract_check before insert or update on public.production_shoots
  for each row execute function public.production_shoots_contract_check();

-- The release: a version submitted to the Distribution (every title not
-- abandoned; per release with lot 15).
create or replace function public.distribution_versions_contract_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text;
begin
  if exists (select 1 from public.projects p where p.id = new.project_id and p.collective) then
    v_missing := public.contract_gaps_text(new.project_id, 'release');
    if v_missing is not null then
      raise exception 'contract_missing' using errcode = '23514', detail = v_missing;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.distribution_versions_contract_check() from public, anon, authenticated;
create trigger c_contract_check before insert on public.distribution_versions
  for each row execute function public.distribution_versions_contract_check();

-- 5 ------------------------------------------------------------------------------------------
-- delete_project_row: from 20261114100101, the waivers before the
-- participations they name.
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
  -- they go before the cascade takes the links. Lot 9 bis (20261114100101):
  -- the file requests name their titles too; lot 12 (20261114110101): the
  -- waivers name their participations.
  delete from public.master_file_requests where project_id = p_project_id;
  delete from public.participation_waivers where project_id = p_project_id;
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
