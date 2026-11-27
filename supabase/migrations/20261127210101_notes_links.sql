-- Notes linked to a deal or a contract (Sacha, 27/11/2026: « on veut lier une
-- note à un projet mais aussi à un deal, un devis, etc. »). The Notes page's
-- « Projet » column becomes « Lié à ».
--
--   1. A written note is linked to AT MOST ONE record among a project, a deal
--      and a contract, or to none (a note of the team). No « devis » link: a
--      quote (production_quotes) lives inside a project's Production, it is
--      not a record of its own; a note about it is linked to the project.
--   2. Reading follows the link: the project's viewers (visible_project_ids),
--      the deal's readers (the RLS of deals, can_read_deal), the contract's
--      (can_see_contract); without a link, every approved member.
--   3. Writing: still its author only, and the link is a record he can read.
--   4. A deal or a contract is only ever deleted with its project
--      (delete_project_row; neither table grants delete). Its notes go with
--      it (on delete cascade, like its calls and its journal): a note about a
--      deal that no longer exists has nothing left to be about, and set null
--      would turn a private note about a deal into a note every member reads.
--      delete_project_row also deletes them by name, before their record.
--   5. A note is a document saved as one types (Sacha 27/11/2026, after
--      Accordee): it may be saved before its text is written, so the text
--      may be empty (the title stays required: « Sans titre » by default).

-- 1. The links --------------------------------------------------------------------------

alter table public.notes
  add column deal_id uuid,
  add column contract_id uuid,
  add constraint notes_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade,
  add constraint notes_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
    on delete cascade,
  add constraint notes_one_link_check
    check (num_nonnulls(project_id, deal_id, contract_id) <= 1);

create index notes_deal_idx on public.notes (deal_id) where deal_id is not null;
create index notes_contract_idx on public.notes (contract_id) where contract_id is not null;

comment on table public.notes is
  'Notes written by hand (Notes page, 27/11/2026), linked to at most one project, deal or contract. Read: whoever reads the record it is linked to, or every approved member for a note of the team. Written by any member who reads that record (deliberate exception to the owner-only rule of a launched project); changed and deleted by its author only.';

-- A title alone is a note; its text comes later.
alter table public.notes
  alter column body set default '',
  drop constraint notes_body_check,
  add constraint notes_body_check check (char_length(body) <= 20000);

-- 2. Who reads, who writes --------------------------------------------------------------

grant insert (deal_id, contract_id) on public.notes to authenticated;
grant update (deal_id, contract_id) on public.notes to authenticated;

-- The record a note is linked to is one the reader reads. The deal through
-- its own RLS (deals_select = can_read_deal): the subquery runs with the
-- reader's rights.
drop policy notes_select on public.notes;
create policy notes_select on public.notes
  for select to authenticated
  using (case
           when project_id is not null
             then project_id = any ((select public.visible_project_ids())::uuid[])
           when deal_id is not null
             then exists (select 1 from public.deals d where d.id = notes.deal_id)
           when contract_id is not null
             then public.can_see_contract(contract_id)
           else public.is_active_member(organization_id)
         end);

-- Any approved member, as its author, linked to a record he reads. Not
-- is_project_owner: see the exception in 20261127180101.
drop policy notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and created_by = public.auth_person_id()
              and (project_id is null or public.can_see_project(project_id))
              and (deal_id is null
                   or exists (select 1 from public.deals d where d.id = notes.deal_id))
              and (contract_id is null or public.can_see_contract(contract_id)));

-- Its author only, still a member; a note linked elsewhere lands on a record
-- he reads.
drop policy notes_update on public.notes;
create policy notes_update on public.notes
  for update to authenticated
  using (created_by = public.auth_person_id()
         and public.is_active_member(organization_id))
  with check (created_by = public.auth_person_id()
              and public.is_active_member(organization_id)
              and (project_id is null or public.can_see_project(project_id))
              and (deal_id is null
                   or exists (select 1 from public.deals d where d.id = notes.deal_id))
              and (contract_id is null or public.can_see_contract(contract_id)));

-- 3. Deleting a project -----------------------------------------------------------------

-- delete_project_row: from 20261127180101, the notes of the project's
-- contracts and deals too, with the project's own, before the contracts.
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

  -- Notes (20261127180101, 20261127210101): the project's written notes and
  -- those linked to its contracts or its deals, before them.
  delete from public.notes
   where project_id = p_project_id
      or contract_id = any (v_contracts)
      or deal_id in (select d.id from public.deals d where d.project_id = p_project_id);

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

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
