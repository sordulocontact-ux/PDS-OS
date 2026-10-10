-- The engineer deposits a version through the link (UX test of 09/10/2026,
-- section 5: the project's owner re-entered every file the mixer sent, and
-- the link died on 8 Nov. for a final mix expected on 17 Nov.).
--
-- No account and no service role (CLAUDE.md rule 3): the token is the key,
-- as for get_master_transmission.
--   1. open_master_delivery(token, master): checks the link is open and the
--      title is in its package, then opens a one-time slot, a random path of
--      the master-files bucket valid one hour. Storage lets anyone upload to
--      that exact path while the slot is open (master_files_objects_insert_delivery),
--      nothing else.
--   2. record_master_delivery(token, path, name, mime): the object must be
--      there; the size is read from Storage, never from the browser. The
--      file becomes an audio version of the title, at the Mix state (mix
--      link) or Master (mastering link): the version of every project with a
--      Brief follows (create_mix_versions), its team is notified, and the
--      sender of the link too (master_delivery_received).
--
-- Link lifetime: chosen by code from the Brief (the final date of the stage
-- plus 14 days, never under 30 days), bounded here to 1–180 days.

-- ---------------------------------------------------------------------------
-- Slots
-- ---------------------------------------------------------------------------
create table public.master_delivery_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  transmission_id uuid not null references public.master_transmissions (id) on delete cascade,
  master_id uuid not null,
  path text not null,
  expires_at timestamptz not null,
  file_id uuid references public.master_files (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint master_delivery_slots_path_key unique (path),
  constraint master_delivery_slots_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index master_delivery_slots_transmission_idx
  on public.master_delivery_slots (transmission_id, created_at desc);

alter table public.master_delivery_slots enable row level security;
alter table public.master_delivery_slots force row level security;
revoke all on table public.master_delivery_slots from anon, authenticated;

create or replace function public.is_open_delivery_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.master_delivery_slots s
      join public.master_transmissions t on t.id = s.transmission_id
     where s.path = p_path and s.used_at is null and s.expires_at > now()
       and t.revoked_at is null and t.expires_at > now()
  );
$$;

revoke execute on function public.is_open_delivery_slot(text) from public;
grant execute on function public.is_open_delivery_slot(text) to anon, authenticated;

create policy master_files_objects_insert_delivery
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'master-files' and public.is_open_delivery_slot(objects.name));

-- ---------------------------------------------------------------------------
-- The open transmission behind a token, locked
-- ---------------------------------------------------------------------------
create or replace function public.open_transmission_of(p_token text)
returns public.master_transmissions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'unknown' using errcode = 'P0001';
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found then
    raise exception 'unknown' using errcode = 'P0001';
  end if;
  if v_row.revoked_at is not null then
    raise exception 'replaced' using errcode = 'P0001';
  end if;
  if v_row.expires_at < now() then
    raise exception 'expired' using errcode = 'P0001';
  end if;
  return v_row;
end;
$$;

revoke execute on function public.open_transmission_of(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- open_master_delivery (anyone with the link)
-- ---------------------------------------------------------------------------
create or replace function public.open_master_delivery(
  p_token text,
  p_master_id uuid,
  p_extension text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_path text;
begin
  v_row := public.open_transmission_of(p_token);
  if not exists (
    select 1 from jsonb_array_elements(v_row.package -> 'titles') t
     where t ->> 'masterId' = p_master_id::text
  ) or not exists (
    select 1 from public.masters m
     where m.id = p_master_id and m.organization_id = v_row.organization_id
       and m.archived_at is null
  ) then
    raise exception 'title_not_in_package' using errcode = 'P0001';
  end if;
  if p_extension is not null and p_extension !~ '^[a-z0-9]{1,10}$' then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  -- A link is not a storage space: a few deposits an hour.
  if (select count(*) from public.master_delivery_slots s
       where s.transmission_id = v_row.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits' using errcode = 'P0001';
  end if;

  v_path := v_row.organization_id::text || '/' || p_master_id::text || '/'
            || gen_random_uuid()::text
            || coalesce('.' || p_extension, '');
  insert into public.master_delivery_slots
    (organization_id, transmission_id, master_id, path, expires_at)
  values (v_row.organization_id, v_row.id, p_master_id, v_path, now() + interval '1 hour');
  return v_path;
end;
$$;

revoke execute on function public.open_master_delivery(text, uuid, text) from public;
grant execute on function public.open_master_delivery(text, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_master_delivery (anyone with the link)
-- ---------------------------------------------------------------------------
create or replace function public.record_master_delivery(
  p_token text,
  p_path text,
  p_file_name text,
  p_mime text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_slot public.master_delivery_slots%rowtype;
  v_bytes bigint;
  v_file uuid;
begin
  v_row := public.open_transmission_of(p_token);
  select * into v_slot from public.master_delivery_slots
   where path = p_path and transmission_id = v_row.id
   for update;
  if not found or v_slot.used_at is not null then
    raise exception 'slot_unknown' using errcode = 'P0001';
  end if;
  select (o.metadata ->> 'size')::bigint into v_bytes
    from storage.objects o
   where o.bucket_id = 'master-files' and o.name = p_path;
  if v_bytes is null then
    raise exception 'file_missing' using errcode = 'P0001';
  end if;
  if p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255
     or p_mime is null or char_length(p_mime) not between 1 and 255
     or p_mime !~ '^audio/' then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;

  insert into public.master_files
    (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
  values (v_row.organization_id, v_slot.master_id, 'audio',
          case v_row.role when 'mix' then 'mix' else 'master' end,
          p_path, btrim(p_file_name), p_mime, v_bytes)
  returning id into v_file;

  update public.master_delivery_slots set used_at = now(), file_id = v_file
   where id = v_slot.id;

  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null,
            case v_row.role when 'mix' then 'master_delivery_received'
                            else 'master_mastering_delivery_received' end,
            v_row.project_id, v_row.id);
  end if;
  return v_file;
end;
$$;

revoke execute on function public.record_master_delivery(text, text, text, text) from public;
grant execute on function public.record_master_delivery(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The engineer's page lists what was deposited through the link
-- ---------------------------------------------------------------------------
create or replace function public.get_master_transmission(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_row.revoked_at is not null then 'replaced'
    when v_row.expires_at < now() then 'expired'
    when v_row.acknowledged_at is not null then 'received'
    else 'open' end;
  if v_state in ('replaced', 'expired') then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'acknowledgedAt', v_row.acknowledged_at,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', m.title, 'number', v.number,
               'summary', v.feedback_summary, 'sentAt', v.feedback_sent_at)
             order by v.feedback_sent_at desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
       where v.project_id = v_row.project_id and v.feedback_sent_at is not null
         -- The feedback of the engineer's own stage.
         and v.stage = v_row.role), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', s.master_id, 'fileName', f.file_name, 'sentAt', s.used_at)
             order by s.used_at desc)
        from public.master_delivery_slots s
        join public.master_files f on f.id = s.file_id
       where s.transmission_id = v_row.id), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- create_master_transmission: the link's lifetime chosen by code
-- ---------------------------------------------------------------------------
drop function public.create_master_transmission(uuid, text, jsonb, text);

create or replace function public.create_master_transmission(
  p_project_id uuid,
  p_role text,
  p_package jsonb,
  p_note text,
  p_expires_at timestamptz
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_contact uuid;
  v_token text;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('mix', 'mastering') then
    raise exception 'invalid_role';
  end if;
  if p_expires_at is null
     or p_expires_at < now() + interval '1 day'
     or p_expires_at > now() + interval '180 days' then
    raise exception 'invalid_expiry';
  end if;
  select b.organization_id,
         case when p_role = 'mix' or b.mastering_same_engineer then b.mix_contact_id
              else b.mastering_contact_id end
    into v_org, v_contact
    from public.master_briefs b
   where b.project_id = p_project_id;
  if v_contact is null then
    raise exception 'no_engineer';
  end if;

  update public.master_transmissions
     set revoked_at = now()
   where project_id = p_project_id and role = p_role and revoked_at is null;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.master_transmissions
    (organization_id, project_id, role, contact_id, token_hash, expires_at, package, note, created_by)
  values (v_org, p_project_id, p_role, v_contact,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_expires_at,
          p_package, nullif(btrim(p_note), ''), public.auth_person_id());
  return v_token;
end;
$$;

revoke execute on function public.create_master_transmission(uuid, text, jsonb, text, timestamptz)
  from public, anon;
grant execute on function public.create_master_transmission(uuid, text, jsonb, text, timestamptz)
  to authenticated;
