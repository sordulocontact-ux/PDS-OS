-- Projet collectif, retours d'Ibé du 18/11/2026 (lot L0, SQL): the contracts
-- of a collective's titles, and no contract before the accord.
--
--   1. title_contract_needs: the contracts a title needs, confirmed by the
--      Juridique (décision: a list per title is recorded; drafting stays one
--      contract per person, legal_agreement_needs, as today). One line per
--      kind (production, image_rights, publishing, beatmaker), needed or
--      not, who confirmed it and when. Read as legal_agreement_needs
--      (manage_legal, on a project seen); written by
--      confirm_title_contract_needs only (the four lines at once, the kinds
--      ticked needed, the others not; a new confirmation replaces the
--      former), with the rights of approve_contract_mapping (manage_legal on
--      a project seen), a collective only, never an abandoned title;
--      journal « contract_needs_confirmed » ({kinds}). zz_project_live;
--      delete_project_row empties it.
--   2. No contract before the accord (Ibé, 1:17:44: « une fois l'accord
--      validé, la cheffe de projet lance les contrats »; décision: drafting
--      is blocked):
--      - participation_agreement_validated: the deal kept for a
--        participation (its live deal, else its latest abandoned one: the
--        rule of project_participation_deal_states) has its accord
--        validated; no deal: not validated.
--      - artist_agreement_pending: in a collective, the artist has a
--        participation in play (neither declined nor withdrawn, title not
--        abandoned) whose accord is not validated. False for any other
--        project, and for an artist without such a participation (the
--        project's main artist, a beatmaker, anyone not invited).
--      - generate_legal_contract refuses, in a collective, the need of a
--        contact that is a guest artist (network_contacts.artist_id, read
--        inside the guard, never returned) whose accord is pending:
--        « agreement_not_validated » (P0001, as set_deal_stage), the titles
--        concerned in DETAIL (project_title_label). A simple project, the
--        main artist, a beatmaker: unchanged.
--      - title_participations.contract_id: a new contract is refused while
--        the participation's accord is not validated (same code, the title
--        in DETAIL), whatever the path.
--      Nothing returns to the screens which needs wait for their accord
--      (décision 5): the app computes it under RLS.

-- 1 ------------------------------------------------------------------------------------------
create table public.title_contract_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  project_title_id uuid not null,
  kind text not null,
  needed boolean not null,
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz not null default now(),
  constraint title_contract_needs_kind_check
    check (kind in ('production', 'image_rights', 'publishing', 'beatmaker')),
  constraint title_contract_needs_title_kind_key unique (project_title_id, kind),
  constraint title_contract_needs_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  -- The title is one of this project's; never deleted under its needs.
  constraint title_contract_needs_title
    foreign key (project_title_id, project_id) references public.project_titles (id, project_id)
);

create index title_contract_needs_project_idx on public.title_contract_needs (project_id);

comment on table public.title_contract_needs is
  'Ibé 18/11: the contracts a title of a collective needs (production, image_rights, publishing, beatmaker), confirmed by the Juridique. Written by confirm_title_contract_needs only; drafting stays one contract per person (legal_agreement_needs).';

-- A collective only, whoever writes (the check of lot 2 reads new.project_id).
create trigger a_check_collective before insert on public.title_contract_needs
  for each row execute function public.project_titles_check_collective();

alter table public.title_contract_needs enable row level security;
alter table public.title_contract_needs force row level security;
revoke all on table public.title_contract_needs from anon, authenticated;
grant select on table public.title_contract_needs to authenticated;
-- As legal_agreement_needs_select_legal, the visibility computed once per
-- statement (20261026000101_visible_project_ids).
create policy title_contract_needs_select_legal on public.title_contract_needs
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and project_id = any ((select public.visible_project_ids())::uuid[]));

create trigger zz_project_live after insert or update or delete on public.title_contract_needs
  for each row execute function public.project_live_tick('project');

alter table public.project_title_events drop constraint project_title_events_kind_check;
alter table public.project_title_events add constraint project_title_events_kind_check
  check (kind in ('added', 'renamed', 'abandoned', 'reactivated', 'participation_added',
                  'participation_status', 'main_artist_changed', 'cataloged',
                  'master_attached', 'waiver_granted', 'waiver_revoked',
                  'release_mode_changed', 'release_decided', 'contract_needs_confirmed'));

create or replace function public.confirm_title_contract_needs(
  p_title_id uuid,
  p_kinds text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_project public.projects%rowtype;
  v_kinds text[] := array['production', 'image_rights', 'publishing', 'beatmaker'];
  v_needed text[];
begin
  select * into v_title from public.project_titles where id = p_title_id;
  if not found or not public.can_see_project(v_title.project_id) then
    raise exception 'title_not_found' using errcode = 'P0002';
  end if;
  select * into v_project from public.projects where id = v_title.project_id;
  if public.auth_person_id() is null
     or not public.has_permission(v_project.organization_id, 'manage_legal') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if p_kinds is null or not (p_kinds <@ v_kinds) or array_position(p_kinds, null) is not null then
    raise exception 'invalid_kinds' using errcode = '22023';
  end if;
  -- One confirmation of a title at a time.
  select * into v_title from public.project_titles where id = p_title_id for update;
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;

  insert into public.title_contract_needs
    (organization_id, project_id, project_title_id, kind, needed, confirmed_by, confirmed_at)
  select v_title.organization_id, v_title.project_id, v_title.id, k, k = any (p_kinds),
         public.auth_person_id(), now()
    from unnest(v_kinds) as k
  on conflict (project_title_id, kind) do update
    set needed = excluded.needed,
        confirmed_by = excluded.confirmed_by,
        confirmed_at = excluded.confirmed_at;

  v_needed := array(select k from unnest(v_kinds) with ordinality as x (k, n)
                     where k = any (p_kinds) order by n);
  perform public.log_project_title_event(p_title_id, 'contract_needs_confirmed',
    jsonb_build_object('kinds', to_jsonb(v_needed)));
end;
$$;
revoke execute on function public.confirm_title_contract_needs(uuid, text[]) from public, anon;
grant execute on function public.confirm_title_contract_needs(uuid, text[]) to authenticated;

-- 2 ------------------------------------------------------------------------------------------
-- The deal kept for a participation (project_participation_deal_states'
-- rule) has its accord validated. Internal.
create or replace function public.participation_agreement_validated(p_participation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
           (select d.agreement_status = 'validated'
              from public.deals d
             where d.participation_id = p_participation_id
             order by (d.stage = 'abandoned'), d.created_at desc
             limit 1),
           false);
$$;
revoke execute on function public.participation_agreement_validated(uuid) from public, anon, authenticated;

-- The participations of an artist in a collective still waiting for their
-- accord: in play (neither declined nor withdrawn, title not abandoned).
-- Internal.
create or replace function public.artist_pending_participations(
  p_project_id uuid, p_artist_id uuid)
returns table (participation_id uuid, title_id uuid, title_position integer)
language sql
stable
security definer
set search_path = ''
as $$
  select tp.id, t.id, t.position
    from public.projects p
    join public.title_participations tp on tp.project_id = p.id
    join public.project_titles t on t.id = tp.title_id
   where p.id = p_project_id
     and p.collective
     and tp.artist_id = p_artist_id
     and tp.status not in ('declined', 'withdrawn')
     and t.status <> 'abandoned'
     and not public.participation_agreement_validated(tp.id);
$$;
revoke execute on function public.artist_pending_participations(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.artist_agreement_pending(p_project_id uuid, p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.artist_pending_participations(p_project_id, p_artist_id));
$$;
revoke execute on function public.artist_agreement_pending(uuid, uuid) from public, anon, authenticated;

-- As 20261007000301, plus: in a collective, a guest artist's contract waits
-- for its accord (network_contacts.artist_id read here only, never returned).
create or replace function public.generate_legal_contract(
  p_need_id uuid,
  p_fields jsonb,
  p_automatic boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_need public.legal_agreement_needs%rowtype;
  v_template public.contract_templates%rowtype;
  v_me uuid := public.auth_person_id();
  v_owner uuid;
  v_body text;
  v_key text;
  v_value text;
  v_missing text[] := '{}';
  v_fields jsonb := '{}';
  v_contract uuid;
  v_name text;
  v_artist uuid;
  v_pending text;
begin
  select * into v_need from public.legal_agreement_needs where id = p_need_id for update;
  if not found or v_me is null
     or not public.has_permission(v_need.organization_id, 'manage_legal')
     or not public.has_permission(v_need.organization_id, 'manage_contracts')
     or not public.can_see_project(v_need.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_need.contract_id is not null then raise exception 'agreement_already_generated'; end if;

  -- No contract before the accord (Ibé 18/11), a collective's guest only.
  if exists (select 1 from public.projects p where p.id = v_need.project_id and p.collective) then
    select nc.artist_id into v_artist
      from public.network_contacts nc where nc.id = v_need.contact_id;
    if v_artist is not null and public.artist_agreement_pending(v_need.project_id, v_artist) then
      select string_agg(public.project_title_label(x.title_id), ', ' order by x.title_position)
        into v_pending
        from public.artist_pending_participations(v_need.project_id, v_artist) x;
      raise exception 'agreement_not_validated' using errcode = 'P0001', detail = v_pending;
    end if;
  end if;

  select * into v_template from public.contract_templates where id = v_need.template_id;
  if not found or v_template.status <> 'validated' then
    raise exception 'template_not_validated';
  end if;
  if jsonb_typeof(coalesce(p_fields, '{}')) <> 'object' then
    raise exception 'contract_fields_invalid';
  end if;

  v_body := v_template.body;
  foreach v_key in array v_template.fields loop
    v_value := nullif(btrim(coalesce(p_fields -> v_key ->> 'value', '')), '');
    if v_value is null then
      v_missing := v_missing || v_key;
      continue;
    end if;
    v_value := left(v_value, 2000);
    v_fields := v_fields || jsonb_build_object(v_key, jsonb_build_object(
      'value', v_value,
      'source', left(coalesce(p_fields -> v_key ->> 'source', ''), 200)));
    v_body := regexp_replace(
      v_body, '\{\{\s*' || replace(v_key, '.', '\.') || '\s*\}\}',
      replace(v_value, '\', '\\'), 'g');
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'contract_fields_missing'
      using detail = array_to_string(v_missing, ',');
  end if;

  -- Whoever opened the page, the copy is the project owner's to follow
  -- (he submits it, the director validates it).
  select owner_person_id into v_owner from public.projects where id = v_need.project_id;
  select name into v_name from public.network_contacts where id = v_need.contact_id;
  insert into public.contracts
    (organization_id, title, type, status, project_id, owner_person_id)
  values (v_need.organization_id, left(v_template.name || ' — ' || v_name, 200),
          v_template.type, 'draft', v_need.project_id, coalesce(v_owner, v_me))
  returning id into v_contract;
  insert into public.contract_parties (contract_id, organization_id, contact_id)
  values (v_contract, v_need.organization_id, v_need.contact_id);
  insert into public.contract_documents
    (organization_id, contract_id, version, template_id, template_version, body, fields)
  values (v_need.organization_id, v_contract, 1, v_template.id, v_template.version,
          v_body, v_fields);
  update public.legal_agreement_needs set contract_id = v_contract where id = p_need_id;

  perform public.log_contract_event(v_need.organization_id, v_contract, v_need.project_id,
                                    'contract.generated',
                                    v_template.name || ' v' || v_template.version
                                    || case when p_automatic then ' · automatique' else '' end);
  return v_contract;
end;
$$;

revoke execute on function public.generate_legal_contract(uuid, jsonb, boolean) from public, anon;
grant execute on function public.generate_legal_contract(uuid, jsonb, boolean) to authenticated;

-- A participation's contract waits for its accord, whatever the path (a
-- contract unlinked, set null by its deletion, always passes).
create or replace function public.title_participations_agreement_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.contract_id is not null
     and (tg_op = 'INSERT' or new.contract_id is distinct from old.contract_id)
     and not public.participation_agreement_validated(new.id) then
    raise exception 'agreement_not_validated' using errcode = 'P0001',
      detail = public.project_title_label(new.title_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.title_participations_agreement_check() from public, anon, authenticated;
create trigger b_agreement_before_contract before insert or update of contract_id
  on public.title_participations
  for each row execute function public.title_participations_agreement_check();

-- delete_project_row: from 20261114130101, the needs of the titles before
-- the titles they name.
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
