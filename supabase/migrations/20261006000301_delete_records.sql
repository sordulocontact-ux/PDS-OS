-- Deleting artists, masters, projects and network contacts for good, one or
-- several at once from their list (docs/ARCHITECTURE.md § 2 quater).
--
-- Archiving stays the way to put a row aside; deleting removes it and what
-- only exists through it. Decided by Sacha on 06/10/2026 (lists cluttered
-- with test data), replacing the "nothing is deleted" rule of 27/09.
--   * director only: permission archive_records (same as archiving);
--   * one call for many rows, each in its own sub-transaction: a row that
--     cannot go is reported (record_id, error) and the others still go;
--   * project: deleted with everything inside it (stages, calls, tasks,
--     strategy, budget, files rows, legal and master workflows, its
--     contracts); its masters and artist stay in the catalogue;
--   * master: refused while a project uses it (or a legal / master workflow
--     row still points at it); its own items (artists, sessions, tracks,
--     credits, splits, declarations, files, journal) go with it;
--   * artist: refused while a master credits it, a project or a contract
--     names it; contacts, files and journal go with it; a split party or a
--     network contact linked to it keeps its name, the link is cut;
--   * network contact: credits and split parties keep the name and lose the
--     link (as "Garder seulement le nom"), members of a structure become
--     independent, legal details go; refused while anything else (contract
--     party, brief, legal form…) names it;
--   * any reference this file does not know about raises a foreign key
--     violation: the row is reported "in use" and nothing of it is deleted.
-- Storage objects are left in their buckets (unreachable once their row is
-- gone): the clean-up policy of Storage is still to be decided.

create or replace function public.delete_project_row(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls where project_id = p_project_id;
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

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$$;

create or replace function public.delete_master_row(p_master_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.project_masters where master_id = p_master_id) then
    raise exception 'master_in_use';
  end if;
  -- Removed one by one first: their journal triggers write events that
  -- point at the master, which must go before it.
  delete from public.master_files where master_id = p_master_id;
  delete from public.master_tracks where master_id = p_master_id;
  delete from public.master_sessions where master_id = p_master_id;
  delete from public.master_contributors where master_id = p_master_id;
  delete from public.master_splits where master_id = p_master_id;
  delete from public.master_declarations where master_id = p_master_id;
  delete from public.master_artists where master_id = p_master_id;
  delete from public.activity_events where master_id = p_master_id;
  delete from public.masters where id = p_master_id;
end;
$$;

create or replace function public.delete_artist_row(p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.master_artists where artist_id = p_artist_id)
     or exists (select 1 from public.projects where artist_id = p_artist_id)
     or exists (select 1 from public.contracts where artist_id = p_artist_id) then
    raise exception 'artist_in_use';
  end if;
  update public.master_splits set artist_id = null where artist_id = p_artist_id;
  update public.network_contacts set artist_id = null where artist_id = p_artist_id;
  delete from public.artist_contacts where artist_id = p_artist_id;
  delete from public.artist_files where artist_id = p_artist_id;
  delete from public.activity_events where artist_id = p_artist_id;
  delete from public.artists where id = p_artist_id;
end;
$$;

create or replace function public.delete_contact_row(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.master_contributors set contact_id = null where contact_id = p_contact_id;
  update public.master_splits set contact_id = null where contact_id = p_contact_id;
  update public.network_contacts set parent_id = null where parent_id = p_contact_id;
  delete from public.contact_legal_details where contact_id = p_contact_id;
  delete from public.network_contacts where id = p_contact_id;
end;
$$;

revoke execute on function public.delete_project_row(uuid) from public, anon, authenticated;
revoke execute on function public.delete_master_row(uuid) from public, anon, authenticated;
revoke execute on function public.delete_artist_row(uuid) from public, anon, authenticated;
revoke execute on function public.delete_contact_row(uuid) from public, anon, authenticated;

-- The only entry point. One row per asked id: error is null when deleted,
-- else a code translated by the app (lib/archive/delete-actions.ts).
create or replace function public.delete_records(p_kind text, p_ids uuid[])
returns table (record_id uuid, error text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_org uuid;
  v_visible boolean;
begin
  if p_kind not in ('artist', 'master', 'project', 'contact') then
    raise exception 'unknown_kind';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 200 then
    raise exception 'invalid_selection';
  end if;

  foreach v_id in array (select array_agg(distinct i) from unnest(p_ids) as i) loop
    record_id := v_id;
    error := null;
    v_org := null;
    case p_kind
      when 'artist' then
        select a.organization_id, public.is_active_member(a.organization_id)
          into v_org, v_visible from public.artists a where a.id = v_id;
      when 'master' then
        select m.organization_id, public.is_active_member(m.organization_id)
          into v_org, v_visible from public.masters m where m.id = v_id;
      when 'contact' then
        select c.organization_id, public.is_active_member(c.organization_id)
          into v_org, v_visible from public.network_contacts c where c.id = v_id;
      else
        select p.organization_id,
               public.can_see_project_row(p.organization_id, p.id, p.owner_person_id)
          into v_org, v_visible from public.projects p where p.id = v_id;
    end case;

    if v_org is null or not v_visible then
      error := 'not_found';
    elsif not public.has_permission(v_org, 'archive_records') then
      error := 'forbidden';
    else
      begin
        case p_kind
          when 'artist' then perform public.delete_artist_row(v_id);
          when 'master' then perform public.delete_master_row(v_id);
          when 'contact' then perform public.delete_contact_row(v_id);
          else perform public.delete_project_row(v_id);
        end case;
      exception
        when foreign_key_violation then
          error := case p_kind when 'project' then 'generic' else p_kind || '_in_use' end;
        when raise_exception then
          error := case when sqlerrm like '%\_in\_use' then sqlerrm else 'generic' end;
        when others then
          raise warning 'delete_records % %: %', p_kind, v_id, sqlerrm;
          error := 'generic';
      end;
    end if;
    return next;
  end loop;
end;
$$;

revoke execute on function public.delete_records(text, uuid[]) from public, anon;
grant execute on function public.delete_records(text, uuid[]) to authenticated;
