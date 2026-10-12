-- Retours BUG + UX consolidés du 11/10/2026, lot 10 : PROJ-BUG-09 (B).
--   * Same engineer for the mix and the mastering: the mastering package is
--     added to the link already sent (one link, one history); a different
--     engineer gets a link of their own and never reads the mix's exchanges;
--   * the file an engineer confirms is exactly the one recorded: its size is
--     checked against the stored object.
-- docs/ARCHITECTURE.md § 8 septies (« Continuité Mixage → Mastering »).

-- 1. A sending that continues another (same engineer, next stage) ----------

alter table public.master_transmissions
  add column continues_id uuid references public.master_transmissions (id) on delete set null;
create index master_transmissions_continues_idx on public.master_transmissions (continues_id)
  where continues_id is not null;

-- The sending a link stands for now: itself, or the live sending that
-- continues it (the mastering after the mix, same engineer).
create function public.master_transmission_current(p_row public.master_transmissions)
returns public.master_transmissions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype := p_row;
  v_next public.master_transmissions%rowtype;
begin
  for i in 1..3 loop
    select * into v_next from public.master_transmissions
     where continues_id = v_row.id and revoked_at is null and expires_at > now()
     order by created_at desc limit 1;
    exit when not found;
    v_row := v_next;
  end loop;
  return v_row;
end;
$$;
revoke execute on function public.master_transmission_current(public.master_transmissions)
  from public, anon, authenticated;

-- The open sending behind a token, locked: the link's own checks, then the
-- sending it stands for now.
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
  return public.master_transmission_current(v_row);
end;
$$;
revoke execute on function public.open_transmission_of(text) from public, anon, authenticated;

-- « Transmettre au mastering » to the engineer who did the mix, while their
-- mix link lives: the package is added to that link (no new token, the
-- link's life is extended to the mastering's); otherwise, as before.
-- Returns the new token, or 'continued' when the link was reused.
create or replace function public.create_master_transmission(
  p_project_id uuid,
  p_role text,
  p_package jsonb,
  p_note text,
  p_expires_at timestamptz,
  p_derogations jsonb default '{}'::jsonb
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
  v_without text[];
  v_allowed text[];
  v_parent public.master_transmissions%rowtype;
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
  if p_derogations is null or jsonb_typeof(p_derogations) <> 'object' then
    raise exception 'invalid_input' using errcode = '23514';
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

  if p_role = 'mix' then
    select coalesce(array_agg(coalesce(t ->> 'title', t ->> 'masterId', '?')
                              order by coalesce(t ->> 'title', t ->> 'masterId', '?')), '{}')
      into v_without
      from jsonb_array_elements(coalesce(p_package -> 'titles', '[]'::jsonb)) t
     where jsonb_array_length(coalesce(t -> 'stems', '[]'::jsonb)) = 0;
    select coalesce(array_agg(x order by x), '{}') into v_allowed
      from jsonb_array_elements_text(coalesce(p_derogations -> 'withoutStems', '[]'::jsonb)) x;
    if not v_without <@ v_allowed then
      raise exception 'stems_missing' using errcode = '23514';
    end if;
  end if;

  update public.master_transmissions
     set revoked_at = now()
   where project_id = p_project_id and role = p_role and revoked_at is null;

  -- The same person, by their stable identity (the Réseau contact), never by
  -- a name that looks alike.
  if p_role = 'mastering' then
    select * into v_parent from public.master_transmissions
     where project_id = p_project_id and role = 'mix' and contact_id = v_contact
       and revoked_at is null and expires_at > now()
     order by created_at desc limit 1;
  end if;

  if v_parent.id is not null then
    insert into public.master_transmissions
      (organization_id, project_id, role, contact_id, token_hash, expires_at, package, note,
       created_by, derogations, continues_id, link_sent_at, link_sent_by)
    values (v_org, p_project_id, p_role, v_contact,
            -- Never a token: the link stays the mix's.
            'continues:' || gen_random_uuid()::text, p_expires_at,
            p_package, nullif(btrim(p_note), ''), public.auth_person_id(), '{}'::jsonb,
            v_parent.id, now(), public.auth_person_id());
    update public.master_transmissions
       set expires_at = greatest(expires_at, p_expires_at)
     where id = v_parent.id;
    return 'continued';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.master_transmissions
    (organization_id, project_id, role, contact_id, token_hash, expires_at, package, note,
     created_by, derogations)
  values (v_org, p_project_id, p_role, v_contact,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_expires_at,
          p_package, nullif(btrim(p_note), ''), public.auth_person_id(),
          case when p_role = 'mix' and cardinality(v_without) > 0
               then jsonb_build_object('withoutStems', to_jsonb(v_without))
               else '{}'::jsonb end);
  return v_token;
end;
$$;

-- « J'ai bien reçu le dossier »: the sending the link stands for now.
create or replace function public.acknowledge_master_transmission(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return 'unknown';
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found then
    return 'unknown';
  end if;
  if v_row.revoked_at is not null then
    return 'replaced';
  end if;
  if v_row.expires_at < now() then
    return 'expired';
  end if;
  v_row := public.master_transmission_current(v_row);
  if v_row.acknowledged_at is not null then
    return 'received';
  end if;

  update public.master_transmissions set acknowledged_at = now() where id = v_row.id;
  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null, 'master_transmission_received',
            v_row.project_id, v_row.id);
  end if;
  return 'received';
end;
$$;

-- Opening the link marks the sending it stands for now.
create or replace function public.note_master_transmission_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revoked_at is null and expires_at > now();
  if not found then
    return;
  end if;
  v_row := public.master_transmission_current(v_row);
  update public.master_transmissions set opened_at = now()
   where id = v_row.id and opened_at is null;
end;
$$;

-- The engineer's page: the package of the sending the link stands for now;
-- the versions of every stage this same link carried (mix, then mastering),
-- each with its stage. A link of its own (another engineer) carries one.
create or replace function public.get_master_transmission(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.master_transmissions%rowtype;
  v_row public.master_transmissions%rowtype;
  v_state text;
  v_stages text[];
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_link from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_link.revoked_at is not null and v_link.revoke_reason is not null then 'revoked'
    when v_link.revoked_at is not null then 'replaced'
    when v_link.expires_at < now() then 'expired'
    else null end;
  if v_state is not null then
    return jsonb_build_object('state', v_state);
  end if;
  v_row := public.master_transmission_current(v_link);
  v_state := case when v_row.acknowledged_at is not null then 'received' else 'open' end;
  v_stages := case when v_row.id <> v_link.id then array[v_link.role, v_row.role]
                   else array[v_row.role] end;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_link.expires_at,
    'acknowledgedAt', v_row.acknowledged_at,
    'continued', v_row.id <> v_link.id,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', v.master_id, 'title', m.title, 'number', v.number,
               'stage', v.stage,
               'fileName', f.file_name, 'receivedAt', v.created_at,
               'summary', case when v.feedback_sent_at is not null then v.feedback_summary end,
               'sentAt', v.feedback_sent_at,
               'decision', v.decision, 'decidedAt', v.decided_at,
               'decidedBy', nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
               'decisionNote', v.decision_note)
             order by v.created_at desc, v.stage desc, v.number desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
        left join public.master_files f on f.id = v.file_id
        left join public.people p on p.id = v.decided_by
       where v.project_id = v_row.project_id
         and v.stage = any (v_stages)), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', s.master_id, 'fileName', f.file_name, 'sentAt', s.used_at)
             order by s.used_at desc)
        from public.master_delivery_slots s
        join public.master_files f on f.id = s.file_id
       where s.transmission_id in (v_link.id, v_row.id)), '[]'::jsonb));
end;
$$;

-- 2. The file deposited is the one confirmed ------------------------------------

drop function public.record_master_delivery(text, text, text, text);
create function public.record_master_delivery(
  p_token text,
  p_path text,
  p_file_name text,
  p_mime text,
  -- The size of the file the engineer confirmed: the stored object must
  -- match it exactly.
  p_bytes bigint default null
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
  if p_bytes is not null and p_bytes <> v_bytes then
    raise exception 'file_mismatch' using errcode = 'P0001';
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
revoke execute on function public.record_master_delivery(text, text, text, text, bigint) from public;
grant execute on function public.record_master_delivery(text, text, text, text, bigint) to anon, authenticated;
