-- Retours Marketing du 12/10/2026, MKT-C2-04 (docs/ARCHITECTURE.md § 8 decies,
-- « Identité artistique »).
--
--   1. The artist's identity belongs to the artist, not to a release: dated
--      versions on the artist (manifesto, tone, palette, typography, symbols,
--      references and counter-references, moodboards as links). Written by
--      catalog managers and creative directors (creative_work), or proposed
--      from a release by its owner or its creative team (« Proposer une évolution de l'identité »); a version
--      written by someone who validates is approved at once, any other one
--      waits for a validator. The current identity is the latest approved
--      version; a proposal never changes it.
--   2. A Conception keeps the version it was designed with: set when the
--      work opens (the current one), changed only by its owner while the
--      Conception is open. A later version never rewrites a dossier.
--   3. A release may deviate from the identity on purpose: said in words,
--      by who writes in the Conception, shown in the Brief créatif.
--   4. An element of the identity copied into the release's references keeps
--      the version it came from (a linked reference, not an opaque copy).

-- The artist of a project: its first title's first artist, else the artist
-- a content project names (same rule as project_artist_name).
create or replace function public.project_artist_id(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ma.artist_id
       from public.project_masters pm
       join public.master_artists ma on ma.master_id = pm.master_id
      where pm.project_id = p_project_id
      order by pm.position, ma.position
      limit 1),
    (select p.artist_id from public.projects p where p.id = p_project_id));
$$;
revoke execute on function public.project_artist_id(uuid) from public, anon;
grant execute on function public.project_artist_id(uuid) to authenticated;

-- 1. Versions -----------------------------------------------------------------------

create table public.artist_identity_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  artist_id uuid not null,
  number integer not null,
  manifesto text,
  tone text,
  palette text,
  typography text,
  symbols text,
  -- [{ "kind": "reference" | "counter" | "moodboard", "title", "url", "note" }]
  refs jsonb not null default '[]',
  change_note text,
  status text not null,
  proposed_from_project_id uuid references public.projects (id) on delete set null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_comment text,
  constraint artist_identity_number_key unique (artist_id, number),
  constraint artist_identity_status_check
    check (status in ('proposed', 'approved', 'rejected')),
  constraint artist_identity_decided
    check ((status = 'proposed') = (decided_at is null)),
  constraint artist_identity_lengths check (
    char_length(coalesce(manifesto, '')) <= 4000
    and char_length(coalesce(tone, '')) <= 2000
    and char_length(coalesce(palette, '')) <= 1000
    and char_length(coalesce(typography, '')) <= 1000
    and char_length(coalesce(symbols, '')) <= 2000
    and char_length(coalesce(change_note, '')) <= 1000
    and char_length(coalesce(decision_comment, '')) <= 1000),
  constraint artist_identity_refs_array
    check (jsonb_typeof(refs) = 'array' and jsonb_array_length(refs) <= 60),
  constraint artist_identity_artist_same_org foreign key (artist_id, organization_id)
    references public.artists (id, organization_id) on delete cascade
);
create index artist_identity_artist_idx on public.artist_identity_versions (artist_id, number desc);

alter table public.artist_identity_versions enable row level security;
alter table public.artist_identity_versions force row level security;
revoke all on table public.artist_identity_versions from anon, authenticated;
-- Read like the artist itself; written only through the functions below.
grant select on public.artist_identity_versions to authenticated;
create policy artist_identity_select_members on public.artist_identity_versions
  for select to authenticated using (public.is_active_member(organization_id));

-- The current identity of an artist: its latest approved version.
create or replace function public.current_artist_identity(p_artist_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.artist_identity_versions
   where artist_id = p_artist_id and status = 'approved'
   order by decided_at desc, number desc
   limit 1;
$$;
revoke execute on function public.current_artist_identity(uuid) from public, anon;
grant execute on function public.current_artist_identity(uuid) to authenticated;

-- A new version of the identity. From the artist's page (catalog managers)
-- or from a release (p_project_id: its owner or creative team, for that
-- release's artist). Approved at once when its author validates, else
-- proposed. Returns the version.
create or replace function public.propose_artist_identity(
  p_artist_id uuid,
  p_fields jsonb,
  p_change_note text default null,
  p_project_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_number integer;
  v_refs jsonb := coalesce(p_fields -> 'refs', '[]'::jsonb);
  v_ref jsonb;
  v_approve boolean;
  v_id uuid;
  v_field text;
begin
  select organization_id into v_org from public.artists
   where id = p_artist_id and archived_at is null
   for update;
  if v_org is null or not public.is_active_member(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (public.has_permission(v_org, 'manage_catalog')
          or public.has_permission(v_org, 'creative_work')
          or (p_project_id is not null
              and public.project_artist_id(p_project_id) = p_artist_id
              and (public.is_project_owner(p_project_id)
                   or exists (select 1 from public.project_creatives pc
                               where pc.project_id = p_project_id
                                 and pc.person_id = v_me)))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_fields) <> 'object' or jsonb_typeof(v_refs) <> 'array' then
    raise exception 'invalid_identity' using errcode = '23514';
  end if;
  foreach v_field in array array['manifesto', 'tone', 'palette', 'typography', 'symbols'] loop
    if p_fields ? v_field and jsonb_typeof(p_fields -> v_field) not in ('string', 'null') then
      raise exception 'invalid_identity' using errcode = '23514';
    end if;
  end loop;
  for v_ref in select * from jsonb_array_elements(v_refs) loop
    if jsonb_typeof(v_ref) <> 'object'
       or coalesce(v_ref ->> 'kind', '') not in ('reference', 'counter', 'moodboard')
       or coalesce(v_ref ->> 'url', '') !~ '^https://\S+$'
       or char_length(v_ref ->> 'url') > 2000
       or char_length(coalesce(v_ref ->> 'title', '')) > 200
       or char_length(coalesce(v_ref ->> 'note', '')) > 500 then
      raise exception 'invalid_identity' using errcode = '23514';
    end if;
  end loop;

  select coalesce(max(number), 0) + 1 into v_number
    from public.artist_identity_versions where artist_id = p_artist_id;
  v_approve := public.has_permission(v_org, 'validate');
  insert into public.artist_identity_versions
    (organization_id, artist_id, number, manifesto, tone, palette, typography,
     symbols, refs, change_note, status, proposed_from_project_id, created_by,
     decided_by, decided_at)
  values (v_org, p_artist_id, v_number,
          nullif(btrim(p_fields ->> 'manifesto'), ''),
          nullif(btrim(p_fields ->> 'tone'), ''),
          nullif(btrim(p_fields ->> 'palette'), ''),
          nullif(btrim(p_fields ->> 'typography'), ''),
          nullif(btrim(p_fields ->> 'symbols'), ''),
          v_refs,
          nullif(btrim(coalesce(p_change_note, '')), ''),
          case when v_approve then 'approved' else 'proposed' end,
          p_project_id, v_me,
          case when v_approve then v_me end,
          case when v_approve then now() end)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.propose_artist_identity(uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.propose_artist_identity(uuid, jsonb, text, uuid) to authenticated;

-- A validator approves or rejects a proposed version (never their own; a
-- refusal says why). An approved one becomes the current identity.
create or replace function public.decide_artist_identity(
  p_version_id uuid,
  p_approve boolean,
  p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_identity_versions%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v_row from public.artist_identity_versions
   where id = p_version_id for update;
  if v_row.id is null or not public.has_permission(v_row.organization_id, 'validate')
     or not public.is_active_member(v_row.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'proposed' then
    raise exception 'already_decided' using errcode = '23514';
  end if;
  if v_row.created_by = public.auth_person_id() then
    raise exception 'own_proposal' using errcode = '42501';
  end if;
  if not p_approve and v_comment is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  update public.artist_identity_versions
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(),
         decision_comment = v_comment
   where id = p_version_id;
end;
$$;
revoke execute on function public.decide_artist_identity(uuid, boolean, text) from public, anon;
grant execute on function public.decide_artist_identity(uuid, boolean, text) to authenticated;

-- 2 and 3. The Conception's version and deviation ------------------------------------

alter table public.design_workspaces
  add column identity_version_id uuid
    references public.artist_identity_versions (id) on delete set null,
  add column identity_deviation text,
  add column identity_deviation_by uuid references public.people (id),
  add column identity_deviation_at timestamptz,
  add constraint design_workspaces_deviation_length
    check (char_length(coalesce(identity_deviation, '')) <= 2000);

-- The work opens on the artist's current identity.
create or replace function public.design_workspaces_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.identity_version_id is null then
    new.identity_version_id :=
      public.current_artist_identity(public.project_artist_id(new.project_id));
  end if;
  return new;
end;
$$;
create trigger a_identity before insert on public.design_workspaces
  for each row execute function public.design_workspaces_identity();

-- The owner moves the Conception to another approved version of its
-- artist's identity, while the Conception is open.
create or replace function public.use_artist_identity_version(
  p_project_id uuid,
  p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) or not public.design_is_open(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.artist_identity_versions v
     where v.id = p_version_id and v.status = 'approved'
       and v.artist_id = public.project_artist_id(p_project_id)) then
    raise exception 'invalid_identity' using errcode = '23514';
  end if;
  update public.design_workspaces set identity_version_id = p_version_id
   where project_id = p_project_id;
end;
$$;
revoke execute on function public.use_artist_identity_version(uuid, uuid) from public, anon;
grant execute on function public.use_artist_identity_version(uuid, uuid) to authenticated;

-- The release deviates from the identity on purpose (empty text: it no
-- longer does). Who writes in the Conception, while it is in progress.
create or replace function public.set_design_identity_deviation(
  p_project_id uuid,
  p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if not public.design_can_write(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(coalesce(v_text, '')) > 2000 then
    raise exception 'invalid_identity' using errcode = '23514';
  end if;
  update public.design_workspaces
     set identity_deviation = v_text,
         identity_deviation_by = case when v_text is null then null else public.auth_person_id() end,
         identity_deviation_at = case when v_text is null then null else now() end
   where project_id = p_project_id;
end;
$$;
revoke execute on function public.set_design_identity_deviation(uuid, text) from public, anon;
grant execute on function public.set_design_identity_deviation(uuid, text) to authenticated;

-- 4. A reference copied from the identity keeps its version --------------------------

alter table public.design_references
  add column identity_version_id uuid
    references public.artist_identity_versions (id) on delete set null;
grant insert (identity_version_id) on public.design_references to authenticated;

create or replace function public.design_references_identity_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.identity_version_id is not null and not exists (
    select 1 from public.artist_identity_versions v
     where v.id = new.identity_version_id
       and v.artist_id = public.project_artist_id(new.project_id)) then
    raise exception 'invalid_identity' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger a_identity_check before insert on public.design_references
  for each row execute function public.design_references_identity_check();
