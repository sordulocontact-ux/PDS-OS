-- Master final: the other deliverables deposited by the engineer on their
-- link, and « Rouvrir le master » (docs/projet-complet/master.md § 5, § 8,
-- proto `master:final`).
--
-- 1. Once a title has its Master final, the mastering engineer's link
--    shows « Autres livrables »: one deposit per deliverable the Brief
--    expects (instrumental, a cappella… stems as a zip), through one-time
--    slots as the versions (master_deliverable_slots). The file joins the
--    title's files in the Catalogue (never an audio state: a deliverable is
--    not a version), and the deliverable is received « par son lien »
--    (master_deliverables_received.file_id, via_link); the owner is told.
--    The owner's « Noter comme reçu » stays for what came another way.
-- 2. « Rouvrir le master »: the same rule as « Rouvrir le mix » (the owner,
--    with a reason), while the Distribution has not delivered the release:
--    the decision is replaced, never erased; the file and the title step
--    back from « Master final » to « Master », the engineer may deposit a
--    new version.

-- 1 --------------------------------------------------------------------------
alter table public.master_deliverables_received
  add column file_id uuid references public.master_files (id) on delete set null,
  add column via_link boolean not null default false;

select public.add_notification_kinds(array['master_deliverable_received']);

create table public.master_deliverable_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  transmission_id uuid not null references public.master_transmissions (id) on delete cascade,
  master_id uuid not null,
  deliverable text not null,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  file_id uuid references public.master_files (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint master_deliverable_slots_path_key unique (path),
  constraint master_deliverable_slots_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);
create index master_deliverable_slots_transmission_idx
  on public.master_deliverable_slots (transmission_id, created_at desc);
alter table public.master_deliverable_slots enable row level security;
alter table public.master_deliverable_slots force row level security;
revoke all on table public.master_deliverable_slots from anon, authenticated;

create or replace function public.is_open_deliverable_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.master_deliverable_slots s
      join public.master_transmissions t on t.id = s.transmission_id
     where s.path = p_path and s.used_at is null and s.expires_at > now()
       and t.revoked_at is null and t.expires_at > now());
$$;
revoke execute on function public.is_open_deliverable_slot(text) from public;
grant execute on function public.is_open_deliverable_slot(text) to anon, authenticated;

create policy master_files_objects_insert_deliverable on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'master-files' and public.is_open_deliverable_slot(objects.name));

-- What a link may deposit: the titles of its package that have their
-- Master final, when its engineer masters; each deliverable the Brief
-- expects, received or not.
create or replace function public.master_link_deliverables(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.master_transmissions%rowtype;
  v_row public.master_transmissions%rowtype;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_link from public.master_transmissions
   where token_hash = p_link_hash and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  v_row := public.master_transmission_current(v_link);
  if not ('mastering' = any (coalesce(public.master_contact_roles(v_row.project_id,
                                                                  v_row.contact_id), '{}'))) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'masterId', m.id, 'title', m.title, 'deliverable', d.key,
             'fileName', f.file_name, 'at', r.created_at, 'viaLink', r.via_link)
           order by m.title, d.ord)
      from jsonb_array_elements(v_row.package -> 'titles') t
      join public.masters m on m.id::text = t ->> 'masterId'
      join public.master_briefs b on b.project_id = v_row.project_id
      cross join lateral unnest(b.deliverables) with ordinality d(key, ord)
      left join public.master_deliverables_received r
        on r.project_id = v_row.project_id and r.master_id = m.id and r.deliverable = d.key
      left join public.master_files f on f.id = r.file_id
     where d.key not in ('mix_final', 'master_final')
       and exists (select 1 from public.master_mix_versions v
                    where v.project_id = v_row.project_id and v.master_id = m.id
                      and v.stage = 'mastering' and v.decision = 'approved')), '[]'::jsonb);
end;
$$;
revoke execute on function public.master_link_deliverables(text) from public, anon, authenticated;

create function public.get_master_deliverables(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.master_link_deliverables(public.link_token_hash(p_token));
end;
$$;
revoke execute on function public.get_master_deliverables(text) from public;
grant execute on function public.get_master_deliverables(text) to anon, authenticated;

create function public.get_master_deliverables(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.master_link_deliverables(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$$;
revoke execute on function public.get_master_deliverables(text, uuid) from public;
grant execute on function public.get_master_deliverables(text, uuid) to anon, authenticated;

-- « Déposer » a deliverable, step 1: a one-time path of master-files.
create function public._open_master_deliverable_h(
  p_link_hash text, p_master_id uuid, p_deliverable text, p_extension text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype := public._open_transmission_of_h(p_link_hash);
  v_path text;
begin
  if not exists (
    select 1 from jsonb_array_elements(public.master_link_deliverables(p_link_hash)) x
     where x ->> 'masterId' = p_master_id::text and x ->> 'deliverable' = p_deliverable
       and x ->> 'fileName' is null) then
    raise exception 'deliverable_not_expected' using errcode = 'P0001';
  end if;
  if p_extension is null
     or p_extension !~ (case when p_deliverable = 'stems' then '^(zip|wav|aif|aiff|flac)$'
                             else '^(wav|aif|aiff|flac|mp3|m4a|aac|ogg)$' end) then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if p_file_name is not null
     and (char_length(btrim(p_file_name)) not between 3 and 200 or p_file_name ~ '[/\\]'
          or (p_extension <> 'zip' and not public.master_delivery_name_ok(p_file_name))) then
    raise exception 'invalid_file_name' using errcode = 'P0001';
  end if;
  if (select count(*) from public.master_deliverable_slots s
       where s.transmission_id = v_row.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits' using errcode = 'P0001';
  end if;
  v_path := v_row.organization_id::text || '/' || p_master_id::text || '/'
            || gen_random_uuid()::text || '.' || p_extension;
  insert into public.master_deliverable_slots
    (organization_id, transmission_id, master_id, deliverable, path, expires_at)
  values (v_row.organization_id, v_row.id, p_master_id, p_deliverable, v_path,
          now() + interval '1 hour');
  return v_path;
end;
$$;
revoke execute on function public._open_master_deliverable_h(text, uuid, text, text, text)
  from public, anon, authenticated;

create function public.open_master_deliverable(
  p_token text, p_master_id uuid, p_deliverable text, p_extension text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._open_master_deliverable_h(public.link_token_hash(p_token), p_master_id,
                                           p_deliverable, p_extension, p_file_name);
end;
$$;
revoke execute on function public.open_master_deliverable(text, uuid, text, text, text) from public;
grant execute on function public.open_master_deliverable(text, uuid, text, text, text) to anon, authenticated;

create function public.open_master_deliverable(
  p_contact_token text, p_item_id uuid, p_master_id uuid, p_deliverable text, p_extension text,
  p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._open_master_deliverable_h(public.contact_item_hash('master', p_contact_token, p_item_id),
                                           p_master_id, p_deliverable, p_extension, p_file_name);
end;
$$;
revoke execute on function public.open_master_deliverable(text, uuid, uuid, text, text, text) from public;
grant execute on function public.open_master_deliverable(text, uuid, uuid, text, text, text)
  to anon, authenticated;

-- Step 2: the file there, it joins the title's files and the deliverable
-- is received « par son lien »; the owner is told.
create function public._record_master_deliverable_h(
  p_link_hash text, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype := public._open_transmission_of_h(p_link_hash);
  v_slot public.master_deliverable_slots%rowtype;
  v_bytes bigint;
  v_file uuid;
  v_owner uuid;
begin
  select * into v_slot from public.master_deliverable_slots
   where path = p_path and transmission_id = v_row.id for update;
  if not found or v_slot.used_at is not null then
    raise exception 'slot_unknown' using errcode = 'P0001';
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
     or p_mime is null or char_length(p_mime) not between 1 and 255 then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  insert into public.master_files
    (organization_id, master_id, category, path, file_name, mime, bytes)
  values (v_row.organization_id, v_slot.master_id,
          case when v_slot.deliverable = 'stems' then 'stems' else 'other' end,
          p_path, btrim(p_file_name), p_mime, v_bytes)
  returning id into v_file;
  update public.master_deliverable_slots set used_at = now(), file_id = v_file where id = v_slot.id;
  insert into public.master_deliverables_received
    (organization_id, project_id, master_id, deliverable, file_id, via_link)
  values (v_row.organization_id, v_row.project_id, v_slot.master_id, v_slot.deliverable, v_file, true)
  on conflict (project_id, master_id, deliverable) do nothing;
  select owner_person_id into v_owner from public.projects where id = v_row.project_id;
  v_owner := coalesce(v_owner, v_row.created_by);
  if v_owner is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, null, 'master_deliverable_received',
            v_row.project_id, v_slot.master_id);
  end if;
  return v_file;
end;
$$;
revoke execute on function public._record_master_deliverable_h(text, text, text, text, bigint)
  from public, anon, authenticated;

create function public.record_master_deliverable(
  p_token text, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._record_master_deliverable_h(public.link_token_hash(p_token), p_path, p_file_name,
                                             p_mime, p_bytes);
end;
$$;
revoke execute on function public.record_master_deliverable(text, text, text, text, bigint) from public;
grant execute on function public.record_master_deliverable(text, text, text, text, bigint)
  to anon, authenticated;

create function public.record_master_deliverable(
  p_contact_token text, p_item_id uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._record_master_deliverable_h(public.contact_item_hash('master', p_contact_token, p_item_id),
                                             p_path, p_file_name, p_mime, p_bytes);
end;
$$;
revoke execute on function public.record_master_deliverable(text, uuid, text, text, text, bigint) from public;
grant execute on function public.record_master_deliverable(text, uuid, text, text, text, bigint)
  to anon, authenticated;

-- 2 --------------------------------------------------------------------------
create or replace function public.reopen_mix_version(p_version_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is distinct from 'approved' then
    raise exception 'not_final';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if v_row.stage = 'mix' then
    -- Once the mastering left on this mix, it is too late.
    if exists (select 1 from public.master_mix_versions v
                where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                  and v.stage = 'mastering')
       or exists (select 1 from public.master_transmissions x
                   where x.project_id = v_row.project_id and x.role = 'mastering'
                     and x.revoked_at is null) then
      raise exception 'mastering_started';
    end if;
  else
    -- Once the Distribution delivered the release, the master stays.
    if exists (select 1 from public.releases r
                where r.project_id = v_row.project_id and r.delivered_on is not null) then
      raise exception 'distribution_delivered';
    end if;
    update public.master_files set audio_state = 'master'
     where id = v_row.file_id and audio_state = 'final_master';
    update public.masters set audio_state = 'master'
     where id = v_row.master_id and audio_state = 'final_master'
       and not exists (select 1 from public.master_files f
                        where f.master_id = v_row.master_id and f.audio_state = 'final_master');
  end if;
  update public.master_mix_versions
     set decision = 'reopened', reopened_at = now(),
         reopened_by = public.auth_person_id(), reopen_reason = v_reason
   where id = p_version_id;
end;
$$;
revoke execute on function public.reopen_mix_version(uuid, text) from public, anon;
grant execute on function public.reopen_mix_version(uuid, text) to authenticated;
