-- Distribution, lot 4 (ticket « Distribution » § 6.8-6.10, § 7, CA06-CA09):
-- the manual deposit at The Orchard and the distributor's answers, as people
-- declare them. PDS OS sends nothing and imports nothing (CA07, CA18).
--
-- 1. distribution_declarations: one row per declaration, never rewritten —
--    deposit (« dépôt manuel déclaré effectué »), received, corrections
--    requested, accepted, platforms delivered. Each has its author and time
--    (written by the database), and optionally the date said, The Orchard's
--    identifier (deposit), a note and a proof (a file of distribution-proofs
--    or an https link). Their absence stays visible (CA08).
--    No state is deduced from another (§ 7): each one reads only its own
--    declarations. The only order kept is that the distributor's answers
--    follow a declared deposit of the same version, and that a deposit
--    follows a validation (CA06).
--    A mistake is withdrawn (who, when, why), never deleted.
-- 2. Bucket distribution-proofs: "<organization_id>/<project_id>/<uuid>[.<ext>]",
--    written by the project's owner, read by whoever sees the project.

create table public.distribution_declarations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The dossier version this cycle deposits (distribution_versions.number).
  version_number integer not null,
  kind text not null,
  -- The date the person says it happened, if they know it.
  declared_on date,
  orchard_id text,
  note text,
  proof_path text,
  proof_name text,
  proof_url text,
  declared_by uuid not null references public.people (id),
  declared_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.people (id),
  withdraw_note text,
  constraint distribution_declarations_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_declarations_version
    foreign key (project_id, version_number)
    references public.distribution_versions (project_id, number) on delete cascade,
  constraint distribution_declarations_kind_check check (kind in (
    'deposit', 'received', 'corrections_requested', 'accepted', 'platforms_delivered')),
  constraint distribution_declarations_orchard_id
    check (orchard_id is null or (kind = 'deposit' and char_length(orchard_id) between 1 and 100)),
  constraint distribution_declarations_corrections_note check (
    kind <> 'corrections_requested' or char_length(btrim(coalesce(note, ''))) > 0),
  constraint distribution_declarations_note_length
    check (note is null or char_length(note) <= 1000),
  constraint distribution_declarations_proof_path check (
    proof_path is null or proof_path ~ ('^' || organization_id::text || '/'
      || project_id::text || '/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$')),
  constraint distribution_declarations_proof_name check (
    (proof_path is null) = (proof_name is null)
    and (proof_name is null or char_length(proof_name) between 1 and 255)),
  constraint distribution_declarations_proof_url check (
    proof_url is null or (char_length(proof_url) <= 2048 and proof_url ~ '^https://\S+$')),
  constraint distribution_declarations_withdrawn check (
    (withdrawn_at is null) = (withdrawn_by is null)
    and (withdrawn_at is null or char_length(btrim(coalesce(withdraw_note, ''))) > 0)),
  constraint distribution_declarations_withdraw_note_length
    check (withdraw_note is null or char_length(withdraw_note) <= 1000)
);

create index distribution_declarations_project_idx
  on public.distribution_declarations (project_id, declared_at desc);

alter table public.distribution_declarations enable row level security;
alter table public.distribution_declarations force row level security;
revoke all on table public.distribution_declarations from anon, authenticated;
grant select on table public.distribution_declarations to authenticated;

create policy distribution_declarations_select on public.distribution_declarations
  for select to authenticated
  using (public.can_see_project(project_id));

-- The version a deposit cycle is about: the latest approved one, not
-- superseded by a new preparation (lot 6). Null: nothing to deposit.
create or replace function public.distribution_current_version(p_project_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select v.number from public.distribution_versions v
   where v.project_id = p_project_id and v.status = 'approved' and v.superseded_at is null
   order by v.number desc limit 1;
$$;

revoke execute on function public.distribution_current_version(uuid) from public, anon;
grant execute on function public.distribution_current_version(uuid) to authenticated;

create or replace function public.declare_distribution(
  p_project_id uuid,
  p_kind text,
  p_declared_on date default null,
  p_orchard_id text default null,
  p_note text default null,
  p_proof_path text default null,
  p_proof_name text default null,
  p_proof_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_version := public.distribution_current_version(p_project_id);
  if v_version is null then
    raise exception 'not_validated' using errcode = 'P0001';
  end if;
  if p_declared_on is not null and p_declared_on > current_date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_kind = 'deposit' then
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and version_number = v_version
                  and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
  else
    if not exists (select 1 from public.distribution_declarations
                    where project_id = p_project_id and version_number = v_version
                      and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'not_deposited' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and version_number = v_version
                  and kind = p_kind and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
  end if;
  insert into public.distribution_declarations (organization_id, project_id,
    version_number, kind, declared_on, orchard_id, note, proof_path, proof_name,
    proof_url, declared_by)
  values (v_org, p_project_id, v_version, p_kind, p_declared_on,
    nullif(btrim(coalesce(p_orchard_id, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(p_proof_path, ''), nullif(btrim(coalesce(p_proof_name, '')), ''),
    nullif(btrim(coalesce(p_proof_url, '')), ''),
    public.auth_person_id())
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'declaration.' || p_kind,
    jsonb_build_object('id', v_id, 'version', v_version,
      'declared_on', p_declared_on,
      'proof', nullif(p_proof_path, '') is not null or nullif(btrim(coalesce(p_proof_url, '')), '') is not null));
  return v_id;
end;
$$;

revoke execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text) from public, anon;
grant execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text) to authenticated;

-- « Retirer » a declaration made by mistake: kept, marked, said why. A
-- deposit is withdrawn only once nothing of the distributor rests on it.
create or replace function public.withdraw_distribution_declaration(
  p_declaration_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_declarations%rowtype;
begin
  select * into v_row from public.distribution_declarations
   where id = p_declaration_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.withdrawn_at is not null then
    raise exception 'already_withdrawn' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if v_row.kind = 'deposit' and exists (
       select 1 from public.distribution_declarations d
        where d.project_id = v_row.project_id and d.version_number = v_row.version_number
          and d.kind <> 'deposit' and d.withdrawn_at is null) then
    raise exception 'deposit_in_use' using errcode = 'P0001';
  end if;
  update public.distribution_declarations
     set withdrawn_at = now(), withdrawn_by = public.auth_person_id(),
         withdraw_note = btrim(p_note)
   where id = p_declaration_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'declaration.withdrawn', jsonb_build_object('id', v_row.id, 'kind', v_row.kind,
      'version', v_row.version_number, 'note', btrim(p_note)));
end;
$$;

revoke execute on function public.withdraw_distribution_declaration(uuid, text) from public, anon;
grant execute on function public.withdraw_distribution_declaration(uuid, text) to authenticated;

-- ------------------------------------------------------------ 2. proofs

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('distribution-proofs', 'distribution-proofs', false, 52428800, null)
on conflict (id) do nothing;

create policy distribution_proofs_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'distribution-proofs'
    and public.can_see_project(public.try_uuid((storage.foldername(objects.name))[2]))
  );
create policy distribution_proofs_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'distribution-proofs'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and public.is_project_owner(p.id))
  );
-- An object no declaration points to (an upload whose declaration failed).
create policy distribution_proofs_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'distribution-proofs'
    and not exists (select 1 from public.distribution_declarations d
                     where d.proof_path = objects.name)
    and public.is_project_owner(public.try_uuid((storage.foldername(objects.name))[2]))
  );
