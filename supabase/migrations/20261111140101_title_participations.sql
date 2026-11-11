-- Projet collectif, lot 3 (docs/pds-mic-plan.md § 3.1 and 3.2, décisions 5,
-- 8 and 10; § 8, lot 3): the participations of artists in the titles of a
-- collective project.
--
--   1. title_participations: one artist on one title of the collective, role
--      main / featuring (featuring by default: a guest), status proposed /
--      invited / confirmed / declined / withdrawn, an interlocutor
--      (contact_id) and a contract (contract_id), both optional. An artist
--      once per title, on as many titles as wanted, several artists per
--      title. The project's main artist (projects.artist_id, PDS by default)
--      is not a participation. A collective only, added at any time, even
--      after the launch; never deleted: declined or withdrawn, it stays with
--      its status.
--   2. Confirmed, on a title that has a master: the missing credits are
--      written in master_artists, the project's main artist in « main » at
--      the head, the artist with the participation's role after the others
--      (décision 10). Adding only, never a credit removed or changed. Same
--      when a master is linked later to a title that already has confirmed
--      participations (trigger on project_titles.master_id, lot 7). A master
--      also in a project that is not collective gets no automatic credit
--      (client, 11/11/2026): the screens warn « Crédits à vérifier au
--      Catalogue » (project_title_shared_projects).
--   3. contact_id (décision 5): read under RLS only, never by a SECURITY
--      DEFINER function. The functions below write it and leave its check to
--      the foreign key (same organization); none reads network_contacts and
--      none returns it.
--   4. The history goes to project_title_events (participation added, status
--      changed), read in the project's Activité.
--   5. delete_project_row empties the table with the titles.
--
-- « The artists of the project » are computed by the code (participations
-- neither declined nor withdrawn, plus the credits of the active titles),
-- never stored. Any other project: no participation, nothing changes.

-- 1. The participations ------------------------------------------------------------

-- A participation names its title and the title's project: both checked by
-- one key.
alter table public.project_titles
  add constraint project_titles_id_project_key unique (id, project_id);

create table public.title_participations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title_id uuid not null,
  artist_id uuid not null,
  -- Same words as master_artists; a guest is featured (décision 10).
  role text not null default 'featuring',
  status text not null default 'proposed',
  -- The artist's interlocutor for this participation (a manager…): read
  -- under RLS only (décision 5).
  contact_id uuid,
  -- The participation contract; « signed » = contracts.status = 'signed'
  -- (lots 11 and 12). Its link is cut if the contract is deleted: the
  -- participation then has no signed contract, which only ever blocks more.
  contract_id uuid,
  -- Who gave the current status, and when.
  decided_by uuid references public.people (id),
  decided_at timestamptz not null default now(),
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_participations_role_check check (role in ('main', 'featuring')),
  constraint title_participations_status_check
    check (status in ('proposed', 'invited', 'confirmed', 'declined', 'withdrawn')),
  constraint title_participations_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 2000)),
  constraint title_participations_artist_unique unique (title_id, artist_id),
  constraint title_participations_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  -- The title is one of this project's; never deleted under a participation.
  constraint title_participations_title
    foreign key (title_id, project_id) references public.project_titles (id, project_id),
  constraint title_participations_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id),
  constraint title_participations_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id),
  constraint title_participations_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
    on delete set null (contract_id)
);

create index title_participations_project_idx on public.title_participations (project_id);
create index title_participations_artist_idx on public.title_participations (artist_id);
create index title_participations_contact_idx on public.title_participations (contact_id)
  where contact_id is not null;
create index title_participations_contract_idx on public.title_participations (contract_id)
  where contract_id is not null;

comment on table public.title_participations is
  'Participations of artists in the titles of a collective project (docs/pds-mic-plan.md § 3): role, status, interlocutor, contract. Written through add_title_participation / set_title_participation_status only; contact_id read under RLS only. id is stable: a status change is an update of the row, never a new one, and nothing deletes it but delete_project_row (the Business module points its negotiation file at it). The status stays simple: no negotiation logic here.';

create trigger a_set_updated_at before update on public.title_participations
  for each row execute function public.set_updated_at();

-- A collective only, whoever writes (the check of lot 2 reads new.project_id).
create trigger a_check_collective before insert on public.title_participations
  for each row execute function public.project_titles_check_collective();

-- Read by whoever sees the project; written by the functions below only.
alter table public.title_participations enable row level security;
alter table public.title_participations force row level security;
revoke all on table public.title_participations from anon, authenticated;
grant select on table public.title_participations to authenticated;
create policy title_participations_select on public.title_participations
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

-- The project's pages follow it (by name, as lot 2 did).
create trigger zz_project_live after insert or update or delete on public.title_participations
  for each row execute function public.project_live_tick('project');

-- 4. The history: two more kinds of title events -------------------------------------

alter table public.project_title_events
  drop constraint project_title_events_kind_check,
  add constraint project_title_events_kind_check
    check (kind in ('added', 'renamed', 'abandoned', 'reactivated',
                    'participation_added', 'participation_status'));

-- What an event says of a participation, at the time: the artist by name
-- (never the interlocutor).
create or replace function public.title_participation_snapshot(p_participation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'participation_id', tp.id,
           'artist_id', tp.artist_id,
           'artist', a.name,
           'role', tp.role)
    from public.title_participations tp
    join public.artists a on a.id = tp.artist_id
   where tp.id = p_participation_id;
$$;
revoke execute on function public.title_participation_snapshot(uuid) from public, anon, authenticated;

-- 2. The credits of a confirmed participation ------------------------------------------

-- A master also linked to a project that is not collective (the same title
-- in an artist's single, plan § 6.7). Such a title gets no automatic credit
-- (client, 11/11/2026, décision 10): its single shows its first credit as
-- its artist and must not change; the screens say « Crédits à vérifier au
-- Catalogue » instead (project_title_shared_projects).
create or replace function public.master_in_simple_project(p_master_id uuid, p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_masters pm
                   join public.projects op on op.id = pm.project_id
                  where pm.master_id = p_master_id
                    and pm.project_id <> p_project_id
                    and not op.collective);
$$;
revoke execute on function public.master_in_simple_project(uuid, uuid) from public, anon, authenticated;

-- The missing credits of the title's master for its confirmed participations
-- (one, or all of them): the project's main artist in « main » at the head,
-- then each artist with its role, after the others. Nothing is removed or
-- changed, a credit already there stays as it is. Nothing without a master,
-- when the master is archived, or when it is also in a project that is not
-- collective (above: credits to check by hand). Returns the number of
-- credits written.
create or replace function public.credit_title_participations(
  p_title_id uuid,
  p_participation_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_project uuid;
  v_master uuid;
  v_main uuid;
  v_main_added integer := 0;
  v_added integer;
begin
  select t.organization_id, t.project_id, t.master_id, p.artist_id
    into v_org, v_project, v_master, v_main
    from public.project_titles t
    join public.projects p on p.id = t.project_id and p.collective
   where t.id = p_title_id;
  if v_master is null
     or public.master_in_simple_project(v_master, v_project)
     or not exists (select 1 from public.title_participations tp
                     where tp.title_id = p_title_id and tp.status = 'confirmed'
                       and (p_participation_id is null or tp.id = p_participation_id)) then
    return 0;
  end if;
  -- One writer of the master's credits at a time.
  perform 1 from public.masters m where m.id = v_master and m.archived_at is null for update;
  if not found then
    return 0;
  end if;

  -- The main artist at the head: the others move down by one. In two steps,
  -- since (master_id, position) is checked row by row (and position >= 1).
  if v_main is not null
     and not exists (select 1 from public.master_artists ma
                      where ma.master_id = v_master and ma.artist_id = v_main) then
    update public.master_artists set position = position + 10000 where master_id = v_master;
    update public.master_artists set position = position - 9999 where master_id = v_master;
    insert into public.master_artists (organization_id, master_id, artist_id, role, position)
    values (v_org, v_master, v_main, 'main', 1);
    v_main_added := 1;
  end if;

  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select v_org, v_master, tp.artist_id, tp.role,
         (select coalesce(max(ma.position), 0) from public.master_artists ma
           where ma.master_id = v_master)
           + row_number() over (order by tp.decided_at, tp.created_at, tp.id)::integer
    from public.title_participations tp
   where tp.title_id = p_title_id
     and tp.status = 'confirmed'
     and (p_participation_id is null or tp.id = p_participation_id)
     and not exists (select 1 from public.master_artists ma
                      where ma.master_id = v_master and ma.artist_id = tp.artist_id);
  get diagnostics v_added = row_count;
  return v_main_added + v_added;
end;
$$;
revoke execute on function public.credit_title_participations(uuid, uuid) from public, anon, authenticated;

-- The titles of a collective whose master is also in a project that is not
-- collective (no automatic credit: « Crédits à vérifier au Catalogue : ce
-- titre est aussi dans le projet … »), for whoever sees the collective. The
-- other project is always counted, so the warning never goes missing; its
-- name only when the viewer sees it too (null otherwise: « un autre
-- projet »). Reads no contact.
create or replace function public.project_title_shared_projects(p_project_id uuid)
returns table (title_id uuid, other_project_title text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         case when public.can_see_project(op.id) then op.title end
    from public.project_titles t
    join public.project_masters pm
      on pm.master_id = t.master_id and pm.project_id <> t.project_id
    join public.projects op on op.id = pm.project_id and not op.collective
   where t.project_id = p_project_id
     and public.can_see_project(p_project_id)
   order by t.position, op.title;
$$;
revoke execute on function public.project_title_shared_projects(uuid) from public, anon;
grant execute on function public.project_title_shared_projects(uuid) to authenticated;

-- A master linked later to a title (lot 7: the title created in the
-- Catalogue at its first audio): its confirmed participations are credited.
create or replace function public.project_titles_credit_participations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.master_id is not null and new.master_id is distinct from old.master_id then
    perform public.credit_title_participations(new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.project_titles_credit_participations() from public, anon, authenticated;

create trigger c_credit_participations after update of master_id on public.project_titles
  for each row execute function public.project_titles_credit_participations();

-- 3. Gestures ---------------------------------------------------------------------

create or replace function public.clean_participation_note(p_note text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
begin
  if char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;
  return v_note;
end;
$$;
revoke execute on function public.clean_participation_note(text) from public, anon, authenticated;

-- « Ajouter un artiste » to a title: before or after the launch, by who
-- writes the collective's titles (lock_project_title: its owner once
-- launched, who creates projects before). Proposed by default; confirmed at
-- once, it is credited. An abandoned title is not edited: reactivate it.
-- Returns the participation and the number of credits written.
create or replace function public.add_title_participation(
  p_title_id uuid,
  p_artist_id uuid,
  p_role text default 'featuring',
  p_status text default 'proposed',
  p_contact_id uuid default null,
  p_note text default null)
returns table (participation_id uuid, credited integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_note text := public.clean_participation_note(p_note);
  v_id uuid;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if p_role is null or p_role not in ('main', 'featuring') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_status is null
     or p_status not in ('proposed', 'invited', 'confirmed', 'declined', 'withdrawn') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if p_artist_id is null
     or not exists (select 1 from public.artists a
                     where a.id = p_artist_id
                       and a.organization_id = v_title.organization_id
                       and a.archived_at is null) then
    raise exception 'artist_not_found' using errcode = '23503';
  end if;
  if exists (select 1 from public.projects p
              where p.id = v_title.project_id and p.artist_id = p_artist_id) then
    raise exception 'main_artist_not_participant' using errcode = '23514';
  end if;
  if exists (select 1 from public.title_participations tp
              where tp.title_id = p_title_id and tp.artist_id = p_artist_id) then
    raise exception 'participation_exists' using errcode = '23505';
  end if;

  begin
    insert into public.title_participations
      (organization_id, project_id, title_id, artist_id, role, status, contact_id, note,
       decided_by, created_by)
    values (v_title.organization_id, v_title.project_id, p_title_id, p_artist_id, p_role,
            p_status, p_contact_id, v_note, public.auth_person_id(), public.auth_person_id())
    returning id into v_id;
  exception when foreign_key_violation then
    -- The artist was checked above: the interlocutor is not a contact of the
    -- organization. Said without reading the contacts.
    raise exception 'contact_not_found' using errcode = '23503';
  end;

  perform public.log_project_title_event(p_title_id, 'participation_added',
    public.title_participation_snapshot(v_id) || jsonb_build_object('status', p_status));
  participation_id := v_id;
  credited := case when p_status = 'confirmed'
                   then public.credit_title_participations(p_title_id, v_id) else 0 end;
  return next;
end;
$$;
revoke execute on function public.add_title_participation(uuid, uuid, text, text, uuid, text) from public, anon;
grant execute on function public.add_title_participation(uuid, uuid, text, text, uuid, text) to authenticated;

-- « Changer le statut » of a participation: any other status, the history
-- keeps each change; declined or withdrawn, it stays. Confirmed, it is
-- credited (a credit already written stays whatever comes next). A note,
-- when given, replaces the participation's. Returns the number of credits
-- written.
create or replace function public.set_title_participation_status(
  p_participation_id uuid,
  p_status text,
  p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title_id uuid;
  v_project_id uuid;
  v_title public.project_titles%rowtype;
  v_from text;
  v_note text := public.clean_participation_note(p_note);
begin
  select tp.title_id, tp.project_id into v_title_id, v_project_id
    from public.title_participations tp where tp.id = p_participation_id;
  if v_title_id is null or not public.can_see_project(v_project_id) then
    raise exception 'participation_not_found' using errcode = 'P0002';
  end if;
  v_title := public.lock_project_title(v_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if p_status is null
     or p_status not in ('proposed', 'invited', 'confirmed', 'declined', 'withdrawn') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select tp.status into v_from from public.title_participations tp
   where tp.id = p_participation_id for update;
  if v_from = p_status then
    raise exception 'status_unchanged' using errcode = 'P0001';
  end if;

  update public.title_participations
     set status = p_status,
         decided_by = public.auth_person_id(),
         decided_at = now(),
         note = coalesce(v_note, note)
   where id = p_participation_id;
  perform public.log_project_title_event(v_title_id, 'participation_status',
    public.title_participation_snapshot(p_participation_id)
      || jsonb_build_object('from', v_from, 'to', p_status, 'note', v_note));
  if p_status = 'confirmed' then
    return public.credit_title_participations(v_title_id, p_participation_id);
  end if;
  return 0;
end;
$$;
revoke execute on function public.set_title_participation_status(uuid, text, text) from public, anon;
grant execute on function public.set_title_participation_status(uuid, text, text) to authenticated;

-- 5. delete_project_row: the participations before the titles they name ---------------

-- Unchanged from 20261111120101 but for the line « title_participations ».
create or replace function public.delete_project_row(p_project_id uuid)
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
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
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
