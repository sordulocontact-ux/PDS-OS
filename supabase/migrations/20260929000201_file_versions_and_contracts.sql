-- Three MVP pieces that share the file library:
--
-- 1. File versions. A file of a library (artist, title, project, contract)
--    can be replaced by a new version that keeps the previous ones: every
--    version is its own row and object, grouped by `series_id` and numbered
--    by the database (`version`). Lists show the latest version of each
--    series; the others stay readable and downloadable ("Versions").
-- 2. Contracts (MVP "Contrats uniquement"): type, parties (from the
--    network), project, owner, status, dates, versioned files, validation
--    by the director then signature. The status only moves through
--    `advance_contract` (SQL), never by a direct update.
-- 3. `library_files`: every file the viewer may read, latest versions only,
--    for the organization-wide library (/app/files). A security-invoker view:
--    each table's RLS applies unchanged.

-- ---------------------------------------------------------------------------
-- 1. Versions on the three existing libraries
-- ---------------------------------------------------------------------------

alter table public.artist_files
  add column series_id uuid,
  add column version integer not null default 1,
  add column replaces_id uuid;
alter table public.master_files
  add column series_id uuid,
  add column version integer not null default 1,
  add column replaces_id uuid;
alter table public.project_files
  add column series_id uuid,
  add column version integer not null default 1,
  add column replaces_id uuid;

update public.artist_files set series_id = id;
update public.master_files set series_id = id;
update public.project_files set series_id = id;

-- The default only satisfies NOT NULL before the trigger runs: the
-- trigger always sets the real series.
alter table public.artist_files
  alter column series_id set not null, alter column series_id set default gen_random_uuid();
alter table public.master_files
  alter column series_id set not null, alter column series_id set default gen_random_uuid();
alter table public.project_files
  alter column series_id set not null, alter column series_id set default gen_random_uuid();

alter table public.artist_files
  add constraint artist_files_version_check check (version >= 1),
  add constraint artist_files_series_version_key unique (series_id, version);
alter table public.master_files
  add constraint master_files_version_check check (version >= 1),
  add constraint master_files_series_version_key unique (series_id, version);
alter table public.project_files
  add constraint project_files_version_check check (version >= 1),
  add constraint project_files_series_version_key unique (series_id, version);

-- Links a new row to its series. Without `replaces_id` it starts a series
-- (version 1); with it, it joins the replaced file's series under the next
-- number. The replaced file must belong to the same owner (tg_argv[0] names
-- the owner column): a version never moves a file to another artist or
-- project. Runs with the caller's rights: only a file the writer can read
-- can be replaced.
create or replace function public.file_versions_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner_column text := tg_argv[0];
  v_series uuid;
  v_owner uuid;
  v_new_owner uuid;
begin
  if tg_op = 'UPDATE' then
    -- The chain is set once, at insert.
    new.series_id := old.series_id;
    new.version := old.version;
    new.replaces_id := old.replaces_id;
    return new;
  end if;

  if new.replaces_id is null then
    new.series_id := new.id;
    new.version := 1;
    return new;
  end if;

  execute format('select series_id, %I from public.%I where id = $1',
                 v_owner_column, tg_table_name)
    into v_series, v_owner
    using new.replaces_id;
  execute format('select ($1).%I', v_owner_column) into v_new_owner using new;
  if v_series is null or v_owner is distinct from v_new_owner then
    raise exception 'file_version_mismatch' using errcode = '23514';
  end if;

  -- Two versions added at once get distinct numbers.
  perform pg_advisory_xact_lock(hashtextextended(v_series::text, 0));
  new.series_id := v_series;
  execute format('select coalesce(max(version), 0) + 1 from public.%I where series_id = $1',
                 tg_table_name)
    into new.version
    using v_series;
  return new;
end;
$$;

create trigger a_link_version before insert or update on public.artist_files
  for each row execute function public.file_versions_link('artist_id');
create trigger a_link_version before insert or update on public.master_files
  for each row execute function public.file_versions_link('master_id');
create trigger a_link_version before insert or update on public.project_files
  for each row execute function public.file_versions_link('project_id');

create index artist_files_series_idx on public.artist_files (series_id, version desc);
create index master_files_series_idx on public.master_files (series_id, version desc);
create index project_files_series_idx on public.project_files (series_id, version desc);

grant insert (replaces_id) on public.artist_files to authenticated;
grant insert (replaces_id) on public.master_files to authenticated;
grant insert (replaces_id) on public.project_files to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Contracts
-- ---------------------------------------------------------------------------

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null,
  type text not null,
  status text not null default 'draft',
  project_id uuid,
  artist_id uuid,
  -- Who follows the contract (a member holding manage_contracts).
  owner_person_id uuid not null references public.people (id),
  -- The key date: signature expected, renewal, deadline.
  due_on date,
  starts_on date,
  ends_on date,
  -- Set with the signature (advance_contract), never typed afterwards.
  signed_on date,
  notes text,
  -- The director's last decision (approve / request changes).
  review_comment text,
  reviewed_by uuid references public.people (id),
  reviewed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_title_check check (btrim(title) <> '' and char_length(title) <= 200),
  constraint contracts_type_check check (type in (
    'artist', 'license', 'distribution', 'publishing', 'coproduction', 'image_rights',
    'service', 'partnership', 'other')),
  constraint contracts_status_check check (status in (
    'draft', 'in_review', 'approved', 'sent', 'signed', 'terminated')),
  constraint contracts_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint contracts_signed_check check ((status in ('signed', 'terminated')) = (signed_on is not null)),
  constraint contracts_notes_check
    check (notes is null or (btrim(notes) <> '' and char_length(notes) <= 4000)),
  constraint contracts_review_comment_check
    check (review_comment is null or char_length(review_comment) <= 2000),
  constraint contracts_id_org_key unique (id, organization_id),
  constraint contracts_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint contracts_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index contracts_org_idx on public.contracts (organization_id, created_at desc);
create index contracts_project_idx on public.contracts (project_id) where project_id is not null;
create index contracts_artist_idx on public.contracts (artist_id) where artist_id is not null;
create index contracts_owner_idx on public.contracts (owner_person_id);

create trigger a_set_created_by before insert on public.contracts
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

-- Who reads a contract: its owner, the direction (view_all_projects) and
-- the owner of its project. Contracts are sensitive: no one else.
create or replace function public.can_see_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contracts c
     where c.id = p_contract_id
       and public.is_active_member(c.organization_id)
       and (c.owner_person_id = public.auth_person_id()
            or public.has_permission(c.organization_id, 'view_all_projects')
            or (c.project_id is not null and public.is_project_owner(c.project_id)))
  );
$$;

-- Who writes a contract (its fields, parties and files): its owner or the
-- direction, holding manage_contracts, and never while the director is
-- reviewing it or once it is terminated (frozen in RLS, not only in code).
create or replace function public.can_edit_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contracts c
     where c.id = p_contract_id
       and c.status not in ('in_review', 'terminated')
       and public.has_permission(c.organization_id, 'manage_contracts')
       and (c.owner_person_id = public.auth_person_id()
            or public.has_permission(c.organization_id, 'view_all_projects'))
  );
$$;

revoke execute on function public.can_see_contract(uuid) from public, anon;
revoke execute on function public.can_edit_contract(uuid) from public, anon;
grant execute on function public.can_see_contract(uuid) to authenticated;
grant execute on function public.can_edit_contract(uuid) to authenticated;

-- The owner must be a member allowed to follow contracts.
create or replace function public.contracts_check_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.person_has_permission(new.organization_id, new.owner_person_id,
                                      'manage_contracts') then
    raise exception 'contract_owner_not_allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger b_check_owner before insert or update of owner_person_id
  on public.contracts
  for each row execute function public.contracts_check_owner();

alter table public.contracts enable row level security;
alter table public.contracts force row level security;
revoke all on public.contracts from anon, authenticated;

-- Same rule as can_see_contract, on the row's own columns: a row being
-- inserted (`insert … returning`) is not visible yet to the function.
create policy contracts_select_visible on public.contracts
  for select to authenticated
  using (public.is_active_member(organization_id)
         and (owner_person_id = public.auth_person_id()
              or public.has_permission(organization_id, 'view_all_projects')
              or (project_id is not null and public.is_project_owner(project_id))));

-- A manager creates a contract they follow; the direction may give it to
-- another member. It always starts as a draft.
create policy contracts_insert_writer on public.contracts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_contracts')
              and status = 'draft'
              and (owner_person_id = public.auth_person_id()
                   or public.has_permission(organization_id, 'view_all_projects')));

create policy contracts_update_writer on public.contracts
  for update to authenticated
  using (public.can_edit_contract(id))
  with check (public.has_permission(organization_id, 'manage_contracts')
              and (owner_person_id = public.auth_person_id()
                   or public.has_permission(organization_id, 'view_all_projects')));

grant select on public.contracts to authenticated;
grant insert (organization_id, title, type, project_id, artist_id, owner_person_id, due_on,
              starts_on, ends_on, notes)
  on public.contracts to authenticated;
grant update (title, type, project_id, artist_id, owner_person_id, due_on, starts_on,
              ends_on, notes)
  on public.contracts to authenticated;

-- Parties: contacts of the network, with their role in the contract.
create table public.contract_parties (
  contract_id uuid not null,
  organization_id uuid not null,
  contact_id uuid not null,
  role text,
  created_at timestamptz not null default now(),
  primary key (contract_id, contact_id),
  constraint contract_parties_role_check
    check (role is null or (btrim(role) <> '' and char_length(role) <= 80)),
  constraint contract_parties_contract_same_org
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade,
  constraint contract_parties_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create index contract_parties_contact_idx on public.contract_parties (contact_id);

alter table public.contract_parties enable row level security;
alter table public.contract_parties force row level security;
revoke all on public.contract_parties from anon, authenticated;

create policy contract_parties_select_visible on public.contract_parties
  for select to authenticated
  using (public.can_see_contract(contract_id));
create policy contract_parties_insert_writer on public.contract_parties
  for insert to authenticated
  with check (public.can_edit_contract(contract_id));
create policy contract_parties_update_writer on public.contract_parties
  for update to authenticated
  using (public.can_edit_contract(contract_id))
  with check (public.can_edit_contract(contract_id));
create policy contract_parties_delete_writer on public.contract_parties
  for delete to authenticated
  using (public.can_edit_contract(contract_id));

grant select, delete on public.contract_parties to authenticated;
grant insert (contract_id, organization_id, contact_id, role)
  on public.contract_parties to authenticated;
grant update (role) on public.contract_parties to authenticated;

-- Files of a contract: the drafts exchanged, the signed copy, annexes; each
-- one versioned like every library.
create table public.contract_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  contract_id uuid not null,
  category text not null default 'draft',
  description text,
  -- "<organization_id>/<contract_id>/<uuid>[.<ext>]" in the contract-files bucket.
  path text not null,
  file_name text not null,
  mime text not null,
  bytes bigint not null,
  -- Set by the trigger (a_link_version); the default only satisfies NOT NULL.
  series_id uuid not null default gen_random_uuid(),
  version integer not null default 1,
  replaces_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint contract_files_category_check
    check (category in ('draft', 'signed', 'annex', 'other')),
  constraint contract_files_description_check
    check (description is null
           or (btrim(description) <> '' and char_length(description) <= 200)),
  constraint contract_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint contract_files_mime_check check (char_length(mime) between 1 and 255),
  constraint contract_files_bytes_check check (bytes > 0 and bytes <= 52428800),
  constraint contract_files_path_format
    check (path ~ ('^' || organization_id::text || '/' || contract_id::text
                   || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint contract_files_path_key unique (path),
  constraint contract_files_version_check check (version >= 1),
  constraint contract_files_series_version_key unique (series_id, version),
  constraint contract_files_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
);

create index contract_files_contract_idx on public.contract_files (contract_id, created_at desc);
create index contract_files_series_idx on public.contract_files (series_id, version desc);

create trigger a_set_created_by before insert on public.contract_files
  for each row execute function public.set_created_by();
create trigger a_link_version before insert or update on public.contract_files
  for each row execute function public.file_versions_link('contract_id');

alter table public.contract_files enable row level security;
alter table public.contract_files force row level security;
revoke all on public.contract_files from anon, authenticated;

create policy contract_files_select_visible on public.contract_files
  for select to authenticated
  using (public.can_see_contract(contract_id));
create policy contract_files_insert_writer on public.contract_files
  for insert to authenticated
  with check (public.can_edit_contract(contract_id));
create policy contract_files_update_writer on public.contract_files
  for update to authenticated
  using (public.can_edit_contract(contract_id))
  with check (public.can_edit_contract(contract_id));
create policy contract_files_delete_writer on public.contract_files
  for delete to authenticated
  using (public.can_edit_contract(contract_id));

grant select, delete on public.contract_files to authenticated;
grant insert (organization_id, contract_id, category, description, path, file_name, mime,
              bytes, replaces_id)
  on public.contract_files to authenticated;
grant update (file_name, category, description) on public.contract_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contract-files', 'contract-files', false, 52428800, null)
on conflict (id) do nothing;

create policy contract_files_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'contract-files'
         and public.can_see_contract(public.try_uuid((storage.foldername(objects.name))[2])));

create policy contract_files_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contract-files'
    and public.can_edit_contract(public.try_uuid((storage.foldername(objects.name))[2]))
    and exists (
      select 1 from public.contracts c
       where c.id = public.try_uuid((storage.foldername(objects.name))[2])
         and c.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy contract_files_objects_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'contract-files'
         and public.can_edit_contract(public.try_uuid((storage.foldername(objects.name))[2])));

-- ---------------------------------------------------------------------------
-- Contract status: submit → approve / request changes → send → sign →
-- terminate. The director (validate) decides; the owner or the direction
-- moves the rest. Notifications are written here, in the same transaction.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited'));

create or replace function public.advance_contract(
  p_contract_id uuid,
  p_action text,
  p_comment text default null,
  p_signed_on date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_editor boolean;
  v_validator boolean;
  v_person uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;

  v_editor := public.has_permission(v_contract.organization_id, 'manage_contracts')
              and (v_contract.owner_person_id = v_me
                   or public.has_permission(v_contract.organization_id, 'view_all_projects'));
  v_validator := public.has_permission(v_contract.organization_id, 'validate');

  if p_action = 'submit' then
    if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'in_review' where id = p_contract_id;
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v_contract.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate' = any (public.role_permissions(m.role))
    loop
      perform public.notify(v_contract.organization_id, v_person, 'contract_review_requested',
                            v_contract.project_id, p_contract_id);
    end loop;

  elsif p_action in ('approve', 'request_changes') then
    if v_contract.status <> 'in_review' then raise exception 'contract_wrong_status'; end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_action = 'request_changes' and v_comment is null then
      raise exception 'contract_comment_required';
    end if;
    update public.contracts
       set status = case p_action when 'approve' then 'approved' else 'draft' end,
           review_comment = v_comment,
           reviewed_by = v_me,
           reviewed_at = now()
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          case p_action when 'approve' then 'contract_approved'
                                        else 'contract_changes_requested' end,
                          v_contract.project_id, p_contract_id);

  elsif p_action = 'send' then
    if v_contract.status <> 'approved' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'sent' where id = p_contract_id;

  elsif p_action = 'sign' then
    if v_contract.status not in ('approved', 'sent') then
      raise exception 'contract_wrong_status';
    end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_signed_on is null or p_signed_on > current_date then
      raise exception 'contract_signed_on_invalid';
    end if;
    update public.contracts set status = 'signed', signed_on = p_signed_on
     where id = p_contract_id;

  elsif p_action = 'terminate' then
    if v_contract.status <> 'signed' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'terminated' where id = p_contract_id;

  else
    raise exception 'contract_unknown_action';
  end if;
end;
$$;

revoke execute on function public.advance_contract(uuid, text, text, date) from public, anon;
grant execute on function public.advance_contract(uuid, text, text, date) to authenticated;

-- Members a contract can be given to, for the direction's picker: holders
-- of manage_contracts. Empty for anyone else (decided here).
create or replace function public.list_contract_owners(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
  from public.people p
  where public.has_permission(p_organization_id, 'view_all_projects')
    and public.person_has_permission(p_organization_id, p.id, 'manage_contracts')
  order by p.first_name, p.last_name;
$$;

revoke execute on function public.list_contract_owners(uuid) from public, anon;
grant execute on function public.list_contract_owners(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Archiving a network contact (the director), refused while a contract
-- still running names it.
-- ---------------------------------------------------------------------------

revoke update (archived_at) on public.network_contacts from authenticated;

create or replace function public.set_network_contact_archived(
  p_contact_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact public.network_contacts%rowtype;
begin
  select * into v_contact from public.network_contacts where id = p_contact_id for update;
  if not found or not public.is_active_member(v_contact.organization_id) then
    raise exception 'record_not_found';
  end if;
  if not public.has_permission(v_contact.organization_id, 'archive_records') then
    raise exception 'not_allowed_to_archive' using errcode = '42501';
  end if;
  if (v_contact.archived_at is not null) = p_archived then
    return;
  end if;
  if p_archived and exists (
    select 1 from public.contract_parties cp
      join public.contracts c on c.id = cp.contract_id
     where cp.contact_id = p_contact_id and c.status <> 'terminated'
  ) then
    raise exception 'contact_in_use';
  end if;
  update public.network_contacts
     set archived_at = case when p_archived then now() else null end
   where id = p_contact_id;
end;
$$;

revoke execute on function public.set_network_contact_archived(uuid, boolean) from public, anon;
grant execute on function public.set_network_contact_archived(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. The organization-wide library: latest version of every file the viewer
-- may read, with what it belongs to. security_invoker: RLS of each table
-- (and of the joined owners) applies to the viewer.
-- ---------------------------------------------------------------------------

create view public.library_files
with (security_invoker = true)
as
select f.*
from (
  select 'artist'::text as source, af.id, af.organization_id, af.artist_id as owner_id,
         a.name as owner_label, af.category, af.description, af.path, af.file_name,
         af.mime, af.bytes, af.series_id, af.version, af.created_by, af.created_at,
         row_number() over (partition by af.series_id order by af.version desc) as rank,
         count(*) over (partition by af.series_id) as version_count
    from public.artist_files af
    join public.artists a on a.id = af.artist_id
  union all
  select 'master', mf.id, mf.organization_id, mf.master_id, m.title, mf.category,
         mf.description, mf.path, mf.file_name, mf.mime, mf.bytes, mf.series_id,
         mf.version, mf.created_by, mf.created_at,
         row_number() over (partition by mf.series_id order by mf.version desc),
         count(*) over (partition by mf.series_id)
    from public.master_files mf
    join public.masters m on m.id = mf.master_id
  union all
  select 'project', pf.id, pf.organization_id, pf.project_id, p.title, pf.category,
         pf.description, pf.path, pf.file_name, pf.mime, pf.bytes, pf.series_id,
         pf.version, pf.created_by, pf.created_at,
         row_number() over (partition by pf.series_id order by pf.version desc),
         count(*) over (partition by pf.series_id)
    from public.project_files pf
    join public.projects p on p.id = pf.project_id
  union all
  select 'contract', cf.id, cf.organization_id, cf.contract_id, c.title, cf.category,
         cf.description, cf.path, cf.file_name, cf.mime, cf.bytes, cf.series_id,
         cf.version, cf.created_by, cf.created_at,
         row_number() over (partition by cf.series_id order by cf.version desc),
         count(*) over (partition by cf.series_id)
    from public.contract_files cf
    join public.contracts c on c.id = cf.contract_id
) f
where f.rank = 1;

revoke all on public.library_files from anon, authenticated;
grant select on public.library_files to authenticated;
