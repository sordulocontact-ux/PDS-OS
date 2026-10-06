-- Juridique, branch 04: a versioned split sheet confirmed by each
-- contributor through a link, without an account (ticket Juridique 04,
-- docs/ARCHITECTURE.md § 8 sexies).
--
-- From the ticket:
--   * « Chaque ExternalConfirmation cible une SplitVersion précise » →
--     legal_split_confirmations.version_id, one per entry and version;
--   * « La somme stockée doit être exactement égale à 100 % » → shares are
--     numeric(7,4) and propose_split_version refuses any other total (the
--     code shows them rounded to 2 decimals);
--   * « Une confirmation ne vaut que pour le contenu exact présenté » → the
--     page receives the version's content and its SHA-256; the answer is
--     refused unless it carries that same hash, kept as proof with the time
--     and the browser;
--   * « Une nouvelle version supersède les confirmations antérieures ; elle
--     ne les copie pas » → proposing version n+1 supersedes n and revokes
--     its pending links;
--   * « Une contestation conserve la proposition, la réponse et la preuve »
--     → nothing is deleted, the version reads DISPUTED;
--   * « La feuille de splits et la répartition SACEM sont deux objets
--     distincts » → master_splits (the title's split, the SACEM's base) is
--     never written here;
--   * states DRAFT → PROPOSED → PARTIALLY_CONFIRMED → CONFIRMED | DISPUTED |
--     SUPERSEDED, consolidated in SQL at each answer; a confirmation PENDING
--     → CONFIRMED | DISPUTED | EXPIRED (read from expires_at) | REVOKED.
--
-- Read and written by manage_legal on a visible project; the public page
-- goes through two anon functions that check the token themselves.

create table public.legal_split_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  master_id uuid not null,
  created_at timestamptz not null default now(),
  constraint legal_split_sheets_key unique (project_id, master_id),
  constraint legal_split_sheets_id_org_key unique (id, organization_id),
  constraint legal_split_sheets_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint legal_split_sheets_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create table public.legal_split_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  sheet_id uuid not null,
  version integer not null,
  status text not null default 'draft',
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  proposed_by uuid references public.people (id),
  proposed_at timestamptz,
  superseded_at timestamptz,
  constraint legal_split_versions_status_check check (status in (
    'draft', 'proposed', 'partially_confirmed', 'confirmed', 'disputed', 'superseded')),
  constraint legal_split_versions_note_check check (note is null or char_length(note) <= 2000),
  constraint legal_split_versions_key unique (sheet_id, version),
  constraint legal_split_versions_id_org_key unique (id, organization_id),
  constraint legal_split_versions_sheet_same_org
    foreign key (sheet_id, organization_id)
    references public.legal_split_sheets (id, organization_id) on delete cascade
);

create table public.legal_split_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  version_id uuid not null,
  position integer not null,
  name text not null,
  role text not null,
  share numeric(7, 4) not null,
  contact_id uuid,
  -- Provenance: the credit it was proposed from, if any.
  credit_id uuid,
  constraint legal_split_entries_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint legal_split_entries_role_check
    check (role in ('author', 'composer', 'arranger', 'publisher', 'other')),
  constraint legal_split_entries_share_check check (share > 0 and share <= 100),
  constraint legal_split_entries_key unique (version_id, position),
  constraint legal_split_entries_id_org_key unique (id, organization_id),
  constraint legal_split_entries_version_same_org
    foreign key (version_id, organization_id)
    references public.legal_split_versions (id, organization_id) on delete cascade,
  constraint legal_split_entries_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create table public.legal_split_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  version_id uuid not null,
  entry_id uuid not null,
  status text not null default 'pending',
  token_hash text not null,
  expires_at timestamptz not null,
  responded_at timestamptz,
  comment text,
  -- Technical proof: the hash of the content answered, the time, the browser.
  evidence jsonb,
  revoked_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_split_confirmations_status_check
    check (status in ('pending', 'confirmed', 'disputed', 'revoked')),
  constraint legal_split_confirmations_comment_check
    check (comment is null or char_length(comment) <= 2000),
  constraint legal_split_confirmations_token_key unique (token_hash),
  constraint legal_split_confirmations_version_same_org
    foreign key (version_id, organization_id)
    references public.legal_split_versions (id, organization_id) on delete cascade,
  constraint legal_split_confirmations_entry_same_org
    foreign key (entry_id, organization_id)
    references public.legal_split_entries (id, organization_id) on delete cascade
);

create index legal_split_versions_sheet_idx on public.legal_split_versions (sheet_id, version desc);
create index legal_split_entries_version_idx on public.legal_split_entries (version_id);
create index legal_split_confirmations_version_idx on public.legal_split_confirmations (version_id);
create index legal_split_confirmations_entry_idx on public.legal_split_confirmations (entry_id);

create table public.legal_split_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  version_id uuid not null,
  kind text not null,
  entry_id uuid,
  actor_person_id uuid references public.people (id),
  note text,
  created_at timestamptz not null default now(),
  constraint legal_split_events_kind_check check (kind in (
    'split.version_created', 'split.proposed', 'split.confirmed', 'split.disputed',
    'split.confirmation_revoked')),
  constraint legal_split_events_version_same_org
    foreign key (version_id, organization_id)
    references public.legal_split_versions (id, organization_id) on delete cascade
);

create index legal_split_events_version_idx on public.legal_split_events (version_id, created_at);

-- RLS: manage_legal on the sheet's visible project, reads only.
create or replace function public.can_manage_split_sheet(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legal_split_sheets s
     where s.id = p_sheet_id
       and public.has_permission(s.organization_id, 'manage_legal')
       and public.can_see_project(s.project_id));
$$;

alter table public.legal_split_sheets enable row level security;
alter table public.legal_split_sheets force row level security;
alter table public.legal_split_versions enable row level security;
alter table public.legal_split_versions force row level security;
alter table public.legal_split_entries enable row level security;
alter table public.legal_split_entries force row level security;
alter table public.legal_split_confirmations enable row level security;
alter table public.legal_split_confirmations force row level security;
alter table public.legal_split_events enable row level security;
alter table public.legal_split_events force row level security;
revoke all on public.legal_split_sheets, public.legal_split_versions,
  public.legal_split_entries, public.legal_split_confirmations, public.legal_split_events
  from anon, authenticated;

create policy legal_split_sheets_select on public.legal_split_sheets
  for select to authenticated using (public.can_manage_split_sheet(id));
create policy legal_split_versions_select on public.legal_split_versions
  for select to authenticated using (public.can_manage_split_sheet(sheet_id));
create policy legal_split_entries_select on public.legal_split_entries
  for select to authenticated using (exists (
    select 1 from public.legal_split_versions v
     where v.id = version_id and public.can_manage_split_sheet(v.sheet_id)));
create policy legal_split_confirmations_select on public.legal_split_confirmations
  for select to authenticated using (exists (
    select 1 from public.legal_split_versions v
     where v.id = version_id and public.can_manage_split_sheet(v.sheet_id)));
create policy legal_split_events_select on public.legal_split_events
  for select to authenticated using (exists (
    select 1 from public.legal_split_versions v
     where v.id = version_id and public.can_manage_split_sheet(v.sheet_id)));

-- token_hash is never read by a client.
grant select on public.legal_split_sheets, public.legal_split_versions,
  public.legal_split_entries, public.legal_split_events to authenticated;
grant select (id, organization_id, version_id, entry_id, status, expires_at, responded_at,
              comment, evidence, revoked_at, created_by, created_at)
  on public.legal_split_confirmations to authenticated;

-- ---------------------------------------------------------------------------
-- Content and its hash: what a person confirms, exactly.
-- ---------------------------------------------------------------------------

create or replace function public.split_version_content(p_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', v.version,
    'title', m.title,
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('name', e.name, 'role', e.role,
                                          'share', e.share::text) order by e.position)
        from public.legal_split_entries e where e.version_id = v.id), '[]'::jsonb))
  from public.legal_split_versions v
  join public.legal_split_sheets s on s.id = v.sheet_id
  join public.masters m on m.id = s.master_id
  where v.id = p_version_id;
$$;

create or replace function public.split_content_hash(p_version_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(sha256(convert_to(public.split_version_content(p_version_id)::text, 'UTF8')), 'hex');
$$;

create or replace function public.log_split_event(
  p_org uuid, p_version_id uuid, p_kind text, p_entry_id uuid default null,
  p_note text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.legal_split_events (organization_id, version_id, kind, entry_id,
                                         actor_person_id, note)
  values (p_org, p_version_id, p_kind, p_entry_id, public.auth_person_id(),
          nullif(btrim(coalesce(p_note, '')), ''));
$$;

-- The version's state from its answers (« PO consolide les réponses »).
create or replace function public.consolidate_split_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_confirmed integer;
  v_disputed integer;
begin
  select count(*) into v_total from public.legal_split_entries where version_id = p_version_id;
  -- Each entry's latest link speaks for it.
  select count(*) filter (where c.status = 'confirmed'),
         count(*) filter (where c.status = 'disputed')
    into v_confirmed, v_disputed
    from (select distinct on (entry_id) entry_id, status
            from public.legal_split_confirmations
           where version_id = p_version_id
           order by entry_id, created_at desc) c;
  update public.legal_split_versions
     set status = case
       when v_disputed > 0 then 'disputed'
       when v_confirmed = v_total and v_total > 0 then 'confirmed'
       when v_confirmed > 0 then 'partially_confirmed'
       else 'proposed' end
   where id = p_version_id and status not in ('draft', 'superseded');
end;
$$;

-- ---------------------------------------------------------------------------
-- Writing a version (manage_legal).
-- ---------------------------------------------------------------------------

-- The draft of a title's split: a new version when the last one was already
-- proposed (it stays as it is until the new one is proposed), else the draft
-- is rewritten. Entries: [{name, role, share, contact_id, credit_id}].
create or replace function public.save_split_draft(
  p_project_id uuid,
  p_master_id uuid,
  p_entries jsonb,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_sheet uuid;
  v_last public.legal_split_versions%rowtype;
  v_version uuid;
  v_entry jsonb;
  v_position integer := 0;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or public.auth_person_id() is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters
                  where project_id = p_project_id and master_id = p_master_id) then
    raise exception 'split_title_invalid' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 30 then
    raise exception 'split_entries_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_split_sheets (organization_id, project_id, master_id)
  values (v_org, p_project_id, p_master_id)
  on conflict (project_id, master_id) do nothing;
  select id into v_sheet from public.legal_split_sheets
   where project_id = p_project_id and master_id = p_master_id;

  select * into v_last from public.legal_split_versions
   where sheet_id = v_sheet order by version desc limit 1 for update;
  if found and v_last.status = 'draft' then
    v_version := v_last.id;
    delete from public.legal_split_entries where version_id = v_version;
    update public.legal_split_versions
       set note = nullif(btrim(coalesce(p_note, '')), '') where id = v_version;
  else
    insert into public.legal_split_versions (organization_id, sheet_id, version, note, created_by)
    values (v_org, v_sheet, coalesce(v_last.version, 0) + 1,
            nullif(btrim(coalesce(p_note, '')), ''), public.auth_person_id())
    returning id into v_version;
    perform public.log_split_event(v_org, v_version, 'split.version_created');
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    v_position := v_position + 1;
    if nullif(v_entry ->> 'contact_id', '') is not null and not exists (
      select 1 from public.network_contacts
       where id = (v_entry ->> 'contact_id')::uuid and organization_id = v_org) then
      raise exception 'split_contact_invalid' using errcode = 'P0001';
    end if;
    insert into public.legal_split_entries
      (organization_id, version_id, position, name, role, share, contact_id, credit_id)
    values (v_org, v_version, v_position, btrim(v_entry ->> 'name'), v_entry ->> 'role',
            (v_entry ->> 'share')::numeric, nullif(v_entry ->> 'contact_id', '')::uuid,
            nullif(v_entry ->> 'credit_id', '')::uuid);
  end loop;
  return v_version;
end;
$$;

-- A link for one entry of a proposed version: the previous pending one is
-- revoked. Returns the token once (only its hash is kept).
create or replace function public.new_split_confirmation(p_entry_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.legal_split_entries%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_token text;
begin
  select * into v_entry from public.legal_split_entries where id = p_entry_id;
  select * into v_version from public.legal_split_versions where id = v_entry.version_id;
  if not found or public.auth_person_id() is null
     or not public.can_manage_split_sheet(v_version.sheet_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_version.status in ('draft', 'superseded') then
    raise exception 'split_version_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_split_confirmations
              where entry_id = p_entry_id and status = 'pending') then
    update public.legal_split_confirmations
       set status = 'revoked', revoked_at = now()
     where entry_id = p_entry_id and status = 'pending';
    perform public.log_split_event(v_version.organization_id, v_version.id,
                                   'split.confirmation_revoked', p_entry_id);
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.legal_split_confirmations
    (organization_id, version_id, entry_id, token_hash, expires_at, created_by)
  values (v_version.organization_id, v_version.id, p_entry_id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '30 days',
          public.auth_person_id());
  perform public.consolidate_split_version(v_version.id);
  return v_token;
end;
$$;

-- « Alizé déclenche les demandes »: the draft becomes the active version
-- (exactly 100 %), the previous one is superseded with its pending links,
-- and each person gets a link. Returns (entry_id, token) once.
create or replace function public.propose_split_version(p_version_id uuid)
returns table (entry_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.legal_split_versions%rowtype;
  v_total numeric;
  v_entry uuid;
begin
  select * into v_version from public.legal_split_versions where id = p_version_id for update;
  if not found or public.auth_person_id() is null
     or not public.can_manage_split_sheet(v_version.sheet_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_version.status <> 'draft' then
    raise exception 'split_version_not_draft' using errcode = 'P0001';
  end if;
  select coalesce(sum(share), 0) into v_total
    from public.legal_split_entries where version_id = p_version_id;
  if v_total <> 100 then
    raise exception 'split_total_not_100' using errcode = 'P0001', detail = v_total::text;
  end if;

  -- The versions before it no longer count, nor do their links.
  update public.legal_split_confirmations c
     set status = 'revoked', revoked_at = now()
    from public.legal_split_versions v
   where c.version_id = v.id and v.sheet_id = v_version.sheet_id
     and v.id <> p_version_id and c.status = 'pending';
  update public.legal_split_versions
     set status = 'superseded', superseded_at = now()
   where sheet_id = v_version.sheet_id and id <> p_version_id and status <> 'superseded';

  update public.legal_split_versions
     set status = 'proposed', proposed_by = public.auth_person_id(), proposed_at = now()
   where id = p_version_id;
  perform public.log_split_event(v_version.organization_id, p_version_id, 'split.proposed');

  for v_entry in
    select e.id from public.legal_split_entries e
     where e.version_id = p_version_id order by e.position
  loop
    entry_id := v_entry;
    token := public.new_split_confirmation(v_entry);
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The public page (anon): the token is the key.
-- ---------------------------------------------------------------------------

create or replace function public.get_split_confirmation(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conf public.legal_split_confirmations%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_entry public.legal_split_entries%rowtype;
  v_project text;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_conf from public.legal_split_confirmations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then return null; end if;
  select * into v_version from public.legal_split_versions where id = v_conf.version_id;
  select * into v_entry from public.legal_split_entries where id = v_conf.entry_id;
  select p.title into v_project from public.legal_split_sheets s
    join public.projects p on p.id = s.project_id where s.id = v_version.sheet_id;
  v_state := case
    when v_conf.status = 'revoked' or v_version.status = 'superseded' then 'revoked'
    when v_conf.status in ('confirmed', 'disputed') then v_conf.status
    when v_conf.expires_at < now() then 'expired'
    else 'open' end;
  if v_state <> 'open' then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', 'open',
    'project', v_project,
    'person', v_entry.name,
    'position', v_entry.position,
    'content', public.split_version_content(v_version.id),
    'hash', public.split_content_hash(v_version.id));
end;
$$;

create or replace function public.respond_split_confirmation(
  p_token text,
  p_decision text,
  p_comment text,
  p_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conf public.legal_split_confirmations%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_headers jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'split_link_closed' using errcode = 'P0001';
  end if;
  select * into v_conf from public.legal_split_confirmations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found or v_conf.status <> 'pending' or v_conf.expires_at < now() then
    raise exception 'split_link_closed' using errcode = 'P0001';
  end if;
  select * into v_version from public.legal_split_versions where id = v_conf.version_id;
  if v_version.status in ('draft', 'superseded') then
    raise exception 'split_link_closed' using errcode = 'P0001';
  end if;
  -- « Une confirmation ne vaut que pour le contenu exact présenté ».
  if p_hash is distinct from public.split_content_hash(v_version.id) then
    raise exception 'split_content_changed' using errcode = 'P0001';
  end if;
  if p_decision not in ('confirm', 'dispute') then
    raise exception 'split_decision_invalid' using errcode = 'P0001';
  end if;
  if p_decision = 'dispute' and v_comment is null then
    raise exception 'split_comment_required' using errcode = 'P0001';
  end if;

  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    v_headers := null;
  end;
  update public.legal_split_confirmations
     set status = case p_decision when 'confirm' then 'confirmed' else 'disputed' end,
         responded_at = now(),
         comment = left(v_comment, 2000),
         evidence = jsonb_build_object(
           'content_hash', p_hash,
           'content', public.split_version_content(v_version.id),
           'responded_at', now(),
           'user_agent', left(coalesce(v_headers ->> 'user-agent', ''), 300))
   where id = v_conf.id;
  perform public.log_split_event(v_version.organization_id, v_version.id,
                                 case p_decision when 'confirm' then 'split.confirmed'
                                                 else 'split.disputed' end,
                                 v_conf.entry_id, v_comment);
  perform public.consolidate_split_version(v_version.id);
  return (select status from public.legal_split_versions where id = v_version.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- The plan's « Répartir l'édition » is done when the active version of the
-- title's sheet is confirmed (it no longer reads master_splits).
-- ---------------------------------------------------------------------------

create or replace function public.legal_plan_item_done(p_item public.legal_plan_items)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_item.kind
    when 'onboarding' then not exists (
      select 1 from public.master_contributors c
        join public.project_masters pm on pm.master_id = c.master_id
       where pm.project_id = p_item.project_id
         and (c.contact_id is null or not exists (
           select 1 from public.legal_forms f
            where f.project_id = p_item.project_id and f.contact_id = c.contact_id
              and f.status = 'complete')))
    when 'contract' then exists (
      select 1 from public.contracts k
        join public.contract_parties cp on cp.contract_id = k.id
        join public.master_contributors c on c.contact_id = cp.contact_id
       where k.project_id = p_item.project_id and k.status = 'signed'
         and c.id = any (p_item.credit_ids))
    when 'splits' then exists (
      select 1 from public.legal_split_versions v
        join public.legal_split_sheets s on s.id = v.sheet_id
       where s.project_id = p_item.project_id and s.master_id = p_item.master_id
         and v.status = 'confirmed')
    when 'clearance' then exists (
      select 1 from public.legal_clearances c
       where c.id::text = split_part(p_item.item_key, ':', 2) and c.status = 'cleared')
    when 'formality' then exists (
      select 1 from public.master_declarations d
       where d.master_id = p_item.master_id and d.organism = 'sacem'
         and d.status = 'confirmed')
    else false
  end;
$$;

drop trigger if exists z_legal_tick on public.master_splits;

create or replace function public.legal_split_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    perform public.legal_tick_tasks(array(
      select s.project_id from public.legal_split_sheets s where s.id = new.sheet_id));
  end if;
  return null;
end;
$$;

create trigger z_legal_tick after update of status on public.legal_split_versions
  for each row execute function public.legal_split_tick();

-- Grants -----------------------------------------------------------------------

revoke execute on function public.can_manage_split_sheet(uuid) from public, anon;
revoke execute on function public.split_version_content(uuid) from public, anon, authenticated;
revoke execute on function public.split_content_hash(uuid) from public, anon, authenticated;
revoke execute on function public.log_split_event(uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.consolidate_split_version(uuid) from public, anon, authenticated;
revoke execute on function public.legal_split_tick() from public, anon, authenticated;
revoke execute on function public.save_split_draft(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.new_split_confirmation(uuid) from public, anon;
revoke execute on function public.propose_split_version(uuid) from public, anon;
revoke execute on function public.get_split_confirmation(text) from public;
revoke execute on function public.respond_split_confirmation(text, text, text, text) from public;

grant execute on function public.can_manage_split_sheet(uuid) to authenticated;
grant execute on function public.save_split_draft(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.new_split_confirmation(uuid) to authenticated;
grant execute on function public.propose_split_version(uuid) to authenticated;
grant execute on function public.get_split_confirmation(text) to anon, authenticated;
grant execute on function public.respond_split_confirmation(text, text, text, text)
  to anon, authenticated;
