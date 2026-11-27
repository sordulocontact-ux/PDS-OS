-- Notes (ticket « Calls → Calendrier + Notes », Sacha 27/11/2026,
-- .tickets/2026-11-27-calls-notes/TICKET.md). The Notes page lists the past
-- calls with their content and notes written by hand: this migration adds the
-- written notes and one search over both.
--
--   1. notes: a title, a text, an optional project, its author. Without a
--      project it is a note of the team, read by every approved member of
--      the organization; with a project, by whoever sees the project.
--   2. Writing: any approved member, as its author; on a project, only one
--      he sees. DELIBERATE EXCEPTION to « in a launched project only its
--      owner writes » (decision of Sacha, 27/11/2026): a note is a team
--      member's own writing about the project, not the project's content
--      (no step, no state, nothing a journey reads), so anyone who sees the
--      project may leave one. Only its author changes or deletes it.
--   3. search_notes(p_query): the calls (title, report, report items,
--      transcript, summary sent) and the written notes that match, French
--      full text with an ilike fallback on titles. SECURITY INVOKER: each
--      table's RLS applies, nobody finds what they cannot read.
--      search_calls (PO) is left as it is: it reads projects' calls only and
--      returns excerpts, the Notes page needs ids of every visible call.
--   4. delete_project_row takes a project's notes; project_live follows
--      them (zz_project_live, and the project a note leaves).

-- 1. The notes ------------------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  -- Null: a note of the team, outside any project.
  project_id uuid,
  title text not null,
  body text not null,
  -- Always the writer (a_set_created_by), never chosen.
  created_by uuid not null default public.auth_person_id() references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector
    generated always as (to_tsvector('french'::regconfig, title || ' ' || body)) stored,
  constraint notes_id_org_key unique (id, organization_id),
  constraint notes_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint notes_body_check
    check (btrim(body) <> '' and char_length(body) <= 20000),
  constraint notes_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index notes_org_updated_idx on public.notes (organization_id, updated_at desc);
create index notes_project_idx on public.notes (project_id) where project_id is not null;
create index notes_author_idx on public.notes (created_by);
create index notes_search_idx on public.notes using gin (search);

comment on table public.notes is
  'Notes written by hand (Notes page, 27/11/2026). Read: the project''s viewers, or every approved member for a note without project. Written by any member who sees the project (deliberate exception to the owner-only rule of a launched project); changed and deleted by its author only.';

create trigger a_set_created_by before insert on public.notes
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- 2. Who reads, who writes --------------------------------------------------------------

alter table public.notes enable row level security;
alter table public.notes force row level security;
revoke all on public.notes from anon, authenticated;
grant select, delete on public.notes to authenticated;
grant insert (organization_id, project_id, title, body) on public.notes to authenticated;
grant update (title, body, project_id) on public.notes to authenticated;

create policy notes_select on public.notes
  for select to authenticated
  using (case
           when project_id is not null
             then project_id = any ((select public.visible_project_ids())::uuid[])
           else public.is_active_member(organization_id)
         end);

-- Any approved member, as its author; on a project, one he sees. Not
-- is_project_owner: see the exception at the top of this file.
create policy notes_insert on public.notes
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and created_by = public.auth_person_id()
              and (project_id is null or public.can_see_project(project_id)));

-- Its author only, still a member; a note moved to a project lands in one
-- he sees.
create policy notes_update on public.notes
  for update to authenticated
  using (created_by = public.auth_person_id()
         and public.is_active_member(organization_id))
  with check (created_by = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id)));

create policy notes_delete on public.notes
  for delete to authenticated
  using (created_by = public.auth_person_id()
         and public.is_active_member(organization_id));

-- 3. Live pages -------------------------------------------------------------------------

-- Posed by name, not by attach_project_live(): that one also puts it back on
-- personal_tasks (left without it on purpose, 20261112120101) and on tables
-- created since without it (finance_incomes, deal_call_proposals).
create trigger zz_project_live after insert or update or delete on public.notes
  for each row execute function public.project_live_tick('project');

-- A note moved to another project (or out of one): zz_project_live stamps the
-- project it lands in (NEW); the one it leaves is stamped here, with the same
-- once-per-transaction rule as project_live_tick.
create or replace function public.notes_live_left_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_done text := coalesce(current_setting('pds.live_bumped', true), '');
  v_key text;
begin
  if old.project_id is null or old.project_id is not distinct from new.project_id then
    return null;
  end if;
  v_key := old.project_id::text || ':notes,';
  if position(v_key in v_done) > 0 then
    return null;
  end if;
  perform public.project_live_bump(
    old.project_id, 'notes', position(old.project_id::text || ',' in v_done) = 0);
  perform set_config('pds.live_bumped', v_done || old.project_id::text || ',' || v_key, true);
  return null;
end;
$$;
revoke execute on function public.notes_live_left_project() from public, anon, authenticated;

create trigger zz_project_live_left after update of project_id on public.notes
  for each row execute function public.notes_live_left_project();

-- 4. Search -----------------------------------------------------------------------------

-- The calls and written notes whose content matches `p_query`, newest first,
-- 200 of each at most. Empty query: nothing.
create or replace function public.search_notes(p_query text)
returns table (kind text, id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('french'::regconfig, t.text) as query,
           '%' || replace(replace(replace(t.text, '\', '\\'), '%', '\%'), '_', '\_') || '%'
             as pattern
      from (select left(btrim(coalesce(p_query, '')), 200) as text) t
     where t.text <> ''
  ),
  call_hits as (
    select c.id from q, public.calls c
     where to_tsvector('french'::regconfig, c.title) @@ q.query or c.title ilike q.pattern
    union
    select r.call_id from q, public.call_reports r
     where to_tsvector('french'::regconfig, r.summary) @@ q.query
    union
    select r.call_id from q, public.report_items ri
      join public.call_reports r on r.id = ri.report_id
     where ri.search @@ q.query
    union
    select t.call_id from q, public.transcripts t
     where t.search @@ q.query
    union
    select s.call_id from q, public.call_summaries s
     where to_tsvector('french'::regconfig, s.text) @@ q.query
  )
  (select 'call'::text, c.id
     from public.calls c
    where c.id in (select h.id from call_hits h)
    order by c.occurred_at desc
    limit 200)
  union all
  (select 'note'::text, n.id
     from q, public.notes n
    where n.search @@ q.query or n.title ilike q.pattern
    order by n.updated_at desc
    limit 200);
$$;
revoke execute on function public.search_notes(text) from public, anon;
grant execute on function public.search_notes(text) to authenticated;

-- 5. Deleting a project -----------------------------------------------------------------

-- delete_project_row: from 20261121210101, the project's notes before the
-- project (their key cascades too; deleted by name like every table).
create or replace function public.delete_project_row(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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
  -- Projet collectif, lot 14 (20261114130101): the title plans, after the
  -- links that name a version, before the titles they name.
  delete from public.title_release_plan_events where project_id = p_project_id;
  delete from public.title_release_plan_versions where project_id = p_project_id;
  delete from public.title_release_plans where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
  -- Business module (20261111230101): a project's deals (their journal and
  -- terms cascade) name its participations, so they go first.
  delete from public.deals where project_id = p_project_id;
  -- Projet collectif (20261111120101, 20261111140101): the participations
  -- name their titles, the titles hold their links (on delete restrict), so
  -- they go before the cascade takes the links. Lot 9 bis (20261114100101):
  -- the file requests name their titles too; lot 12 (20261114110101): the
  -- waivers name their participations; Ibé 18/11 (20261121210101): the
  -- contracts each title needs name their titles.
  delete from public.master_file_requests where project_id = p_project_id;
  delete from public.participation_waivers where project_id = p_project_id;
  delete from public.title_contract_needs where project_id = p_project_id;
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- Notes (20261127180101): the written notes of the project.
  delete from public.notes where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
