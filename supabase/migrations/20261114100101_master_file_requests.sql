-- Projet collectif, lot 9 bis (docs/pds-mic-plan.md § 8, lot 9; decided on
-- 14/11/2026: option (a)): « Demander des fichiers » in a collective's
-- Master. The project's owner asks a member of the team for the source of
-- several titles at once; each title gets its own line (principle 1: a file
-- deposited answers one title, never another).
--
--   1. master_file_requests: one row per title asked for. Open until an
--      audio file arrives on the title (received, stamped by the trigger of
--      § 4, whoever deposits it and however: the Catalogue, a session, the
--      deposit of § 5), or until cancelled (by its author or the owner) or
--      replaced (the title asked again of someone else). Nothing is deleted.
--   2. Who may be asked: a member who works on the project and sees it, the
--      requester aside: its team (project_creatives), the in-house engineers
--      of its Master, the direction (view_all_projects).
--   3. request_master_files / cancel_master_file_request: the owner of a
--      launched collective, for live titles of its Master (with a master);
--      the person asked is told (master_files_requested).
--   4. The trigger on master_files: an audio file marks the open lines of
--      its title received; their author is told (master_files_received).
--   5. The deposit of the person asked, who may not write in the Catalogue
--      (a creative director): a one-hour path of master-files, as for the
--      in-house engineer (20261020010601), then the audio version of the
--      title (Maquette or Mise à plat).
--   6. RLS forced, read by whoever sees the project, written by functions
--      only; zz_project_live; delete_project_row empties it.
--
-- Any other project: refused (not_collective), nothing changes. No contact
-- is read: only members of the organization are asked.

-- 1 ------------------------------------------------------------------------------------------
create table public.master_file_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title_id uuid not null references public.project_titles (id) on delete cascade,
  requested_to uuid not null references public.people (id),
  requested_by uuid not null references public.people (id),
  note text,
  created_at timestamptz not null default now(),
  received_at timestamptz,
  received_file_id uuid references public.master_files (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.people (id),
  -- Replaced by a request of the same title to someone else.
  replaced boolean not null default false,
  -- The deposit of § 5: a one-hour path, once.
  slot_path text,
  slot_expires_at timestamptz,
  constraint master_file_requests_note_check check (note is null or char_length(note) <= 1000),
  constraint master_file_requests_closed_check
    check (received_at is null or cancelled_at is null),
  constraint master_file_requests_slot_key unique (slot_path),
  constraint master_file_requests_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

-- One open line per title at a time.
create unique index master_file_requests_open_key
  on public.master_file_requests (title_id)
  where received_at is null and cancelled_at is null;
create index master_file_requests_project_idx on public.master_file_requests (project_id);
create index master_file_requests_to_idx on public.master_file_requests (requested_to);

alter table public.master_file_requests enable row level security;
alter table public.master_file_requests force row level security;
revoke all on table public.master_file_requests from anon, authenticated;
grant select on table public.master_file_requests to authenticated;
create policy master_file_requests_select on public.master_file_requests
  for select to authenticated
  using (project_id = any ((select public.visible_project_ids())::uuid[]));

create trigger zz_project_live after insert or update or delete on public.master_file_requests
  for each row execute function public.project_live_tick('project');

select public.add_notification_kinds(array['master_files_requested', 'master_files_received']);

-- 2 ------------------------------------------------------------------------------------------
-- An active member of the project's organization who works on it: its team,
-- an in-house engineer of its Master, or the direction.
create or replace function public.file_request_recipient_ok(p_project_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.projects p
      join public.memberships m on m.organization_id = p.organization_id
                               and m.person_id = p_person_id and m.status = 'approved'
      join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
     where p.id = p_project_id
       and (exists (select 1 from public.project_creatives pc
                     where pc.project_id = p.id and pc.person_id = p_person_id)
            or exists (select 1 from public.master_briefs mb
                        where mb.project_id = p.id
                          and p_person_id in (mb.mix_person_id, mb.mastering_person_id))
            or 'view_all_projects' = any (public.role_permissions(m.role))));
$$;
revoke execute on function public.file_request_recipient_ok(uuid, uuid) from public, anon;
grant execute on function public.file_request_recipient_ok(uuid, uuid) to authenticated;

-- The people the owner may ask, the requester aside; their names only.
create or replace function public.list_file_request_recipients(p_project_id uuid)
returns table (person_id uuid, first_name text, last_name text, reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select pe.id, pe.first_name, pe.last_name,
         case
           when exists (select 1 from public.project_creatives pc
                         where pc.project_id = p_project_id and pc.person_id = pe.id) then 'team'
           when exists (select 1 from public.master_briefs mb
                         where mb.project_id = p_project_id
                           and pe.id in (mb.mix_person_id, mb.mastering_person_id)) then 'engineer'
           else 'direction'
         end
    from public.people pe
   where public.can_see_project(p_project_id)
     and pe.id is distinct from public.auth_person_id()
     and public.file_request_recipient_ok(p_project_id, pe.id)
   order by pe.first_name, pe.last_name;
$$;
revoke execute on function public.list_file_request_recipients(uuid) from public, anon;
grant execute on function public.list_file_request_recipients(uuid) to authenticated;

-- 3 ------------------------------------------------------------------------------------------
-- « Demander des fichiers »: one line per title; a title already asked of
-- the same person stays as it is, asked of someone else it is replaced.
-- Returns how many lines were opened.
create or replace function public.request_master_files(
  p_project_id uuid,
  p_title_ids uuid[],
  p_person_id uuid,
  p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_ids uuid[] := array(select distinct u from unnest(coalesce(p_title_ids, '{}'::uuid[])) u);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_title uuid;
  v_count integer := 0;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  if v_project.archived_at is not null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_project.collective then
    raise exception 'not_collective' using errcode = '23514';
  end if;
  if cardinality(v_ids) = 0 then
    raise exception 'titles_required' using errcode = '23514';
  end if;
  if p_person_id is null or p_person_id = public.auth_person_id()
     or not public.file_request_recipient_ok(p_project_id, p_person_id) then
    raise exception 'recipient_not_allowed' using errcode = '23514';
  end if;
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;
  if exists (select 1 from unnest(v_ids) u
              where not exists (select 1 from public.project_titles t
                                 where t.id = u and t.project_id = p_project_id)) then
    raise exception 'title_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(v_ids) u
               join public.project_titles t on t.id = u
              where t.status = 'abandoned') then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  -- In the Master: a title already in the Catalogue (lot 7).
  if exists (select 1 from unnest(v_ids) u
               join public.project_titles t on t.id = u
              where t.master_id is null) then
    raise exception 'title_not_in_master' using errcode = 'P0001';
  end if;

  foreach v_title in array v_ids loop
    if exists (select 1 from public.master_file_requests r
                where r.title_id = v_title and r.received_at is null and r.cancelled_at is null
                  and r.requested_to = p_person_id) then
      continue;
    end if;
    update public.master_file_requests
       set cancelled_at = now(), cancelled_by = public.auth_person_id(), replaced = true,
           slot_path = null, slot_expires_at = null
     where title_id = v_title and received_at is null and cancelled_at is null;
    insert into public.master_file_requests
      (organization_id, project_id, title_id, requested_to, requested_by, note)
    values (v_project.organization_id, p_project_id, v_title, p_person_id,
            public.auth_person_id(), v_note);
    v_count := v_count + 1;
  end loop;
  if v_count > 0 then
    perform public.notify(v_project.organization_id, p_person_id, 'master_files_requested',
                          p_project_id, null);
  end if;
  return v_count;
end;
$$;
revoke execute on function public.request_master_files(uuid, uuid[], uuid, text) from public, anon;
grant execute on function public.request_master_files(uuid, uuid[], uuid, text) to authenticated;

-- Its author or the project's owner withdraws an open line.
create or replace function public.cancel_master_file_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_file_requests%rowtype;
begin
  select * into v_row from public.master_file_requests where id = p_request_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_row.requested_by is distinct from public.auth_person_id()
     and not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.received_at is not null or v_row.cancelled_at is not null then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  update public.master_file_requests
     set cancelled_at = now(), cancelled_by = public.auth_person_id(),
         slot_path = null, slot_expires_at = null
   where id = p_request_id;
end;
$$;
revoke execute on function public.cancel_master_file_request(uuid) from public, anon;
grant execute on function public.cancel_master_file_request(uuid) to authenticated;

-- 4 ------------------------------------------------------------------------------------------
-- An audio file arrives on a title: the open lines of the titles holding
-- that master are received (by this file); their author is told, once per
-- line, unless they deposited it themselves (public.notify).
create or replace function public.master_files_receive_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_file_requests%rowtype;
begin
  if new.category <> 'audio' or new.audio_state is null then
    return null;
  end if;
  for v_row in
    update public.master_file_requests r
       set received_at = now(), received_file_id = new.id,
           slot_path = null, slot_expires_at = null
      from public.project_titles t
     where t.id = r.title_id and t.master_id = new.master_id
       and r.received_at is null and r.cancelled_at is null
    returning r.*
  loop
    perform public.notify(v_row.organization_id, v_row.requested_by, 'master_files_received',
                          v_row.project_id, v_row.title_id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.master_files_receive_requests() from public, anon, authenticated;
create trigger z_receive_file_requests after insert on public.master_files
  for each row execute function public.master_files_receive_requests();

-- 5 ------------------------------------------------------------------------------------------
create or replace function public.is_open_file_request_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_file_requests r
                  where r.slot_path = p_path and r.slot_expires_at > now()
                    and r.received_at is null and r.cancelled_at is null
                    and r.requested_to = public.auth_person_id());
$$;
revoke execute on function public.is_open_file_request_slot(text) from public, anon;
grant execute on function public.is_open_file_request_slot(text) to authenticated;

create policy master_files_objects_insert_file_request on storage.objects
  for insert to authenticated
  with check (bucket_id = 'master-files' and public.is_open_file_request_slot(objects.name));

-- « Déposer le fichier », step 1: the person asked, an open line, the title
-- still in the Master; a path of the title's folder, valid one hour.
create or replace function public.open_file_request_delivery(
  p_request_id uuid, p_extension text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_file_requests%rowtype;
  v_master uuid;
  v_path text;
begin
  select * into v_row from public.master_file_requests where id = p_request_id for update;
  if not found or v_row.requested_to is distinct from public.auth_person_id()
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.received_at is not null or v_row.cancelled_at is not null then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;
  select t.master_id into v_master from public.project_titles t
   where t.id = v_row.title_id and t.status <> 'abandoned';
  if v_master is null then
    raise exception 'title_not_in_master' using errcode = 'P0001';
  end if;
  if p_extension is null or p_extension !~ '^(wav|aif|aiff|flac|mp3|m4a|aac|ogg)$' then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if p_file_name is not null and not public.master_delivery_name_ok(p_file_name) then
    raise exception 'invalid_file_name' using errcode = 'P0001';
  end if;
  v_path := v_row.organization_id::text || '/' || v_master::text || '/'
            || gen_random_uuid()::text || '.' || p_extension;
  update public.master_file_requests
     set slot_path = v_path, slot_expires_at = now() + interval '1 hour'
   where id = p_request_id;
  return v_path;
end;
$$;
revoke execute on function public.open_file_request_delivery(uuid, text, text) from public, anon;
grant execute on function public.open_file_request_delivery(uuid, text, text) to authenticated;

-- Step 2: the stored file becomes an audio version of the title (its size
-- checked); the trigger of § 4 marks the line received.
create or replace function public.record_file_request_delivery(
  p_path text, p_file_name text, p_mime text, p_bytes bigint, p_audio_state text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_file_requests%rowtype;
  v_master uuid;
  v_bytes bigint;
  v_file uuid;
begin
  select * into v_row from public.master_file_requests
   where slot_path = p_path and requested_to = public.auth_person_id() for update;
  if not found or v_row.received_at is not null or v_row.cancelled_at is not null
     or v_row.slot_expires_at <= now() then
    raise exception 'slot_unknown' using errcode = 'P0001';
  end if;
  if p_audio_state is null or p_audio_state not in ('demo', 'rough_mix') then
    raise exception 'invalid_audio_state' using errcode = '22023';
  end if;
  select (o.metadata ->> 'size')::bigint into v_bytes
    from storage.objects o where o.bucket_id = 'master-files' and o.name = p_path;
  if v_bytes is null then
    raise exception 'file_missing' using errcode = 'P0001';
  end if;
  if p_bytes is not null and p_bytes <> v_bytes then
    raise exception 'file_mismatch' using errcode = 'P0001';
  end if;
  if p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255
     or p_mime is null or p_mime !~ '^audio/' then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  select t.master_id into v_master from public.project_titles t where t.id = v_row.title_id;
  insert into public.master_files
    (organization_id, master_id, category, audio_state, path, file_name, mime, bytes, created_by)
  values (v_row.organization_id, v_master, 'audio', p_audio_state, p_path, btrim(p_file_name),
          p_mime, v_bytes, public.auth_person_id())
  returning id into v_file;
  return v_file;
end;
$$;
revoke execute on function public.record_file_request_delivery(text, text, text, bigint, text) from public, anon;
grant execute on function public.record_file_request_delivery(text, text, text, bigint, text) to authenticated;

-- 6 ------------------------------------------------------------------------------------------
-- delete_project_row: from 20261113200101, the file requests before the
-- titles they name.
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
  -- the file requests name their titles too.
  delete from public.master_file_requests where project_id = p_project_id;
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
