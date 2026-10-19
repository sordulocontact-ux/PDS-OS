-- Lot 11 (docs/projet-complet/shell.md E10 § 3): the public functions of
-- every private link also take the person's link (project_contact_links) and
-- the object's id. Signatures already sent are untouched: /m, /f, /s, /i and
-- /p keep working with their own token.
--
-- Each function F(p_token, …) is split in two:
--   _F_h(p_link_hash, …)  its body, unchanged, keyed by the token's SHA-256
--                     (internal, no one may call it);
--   F(p_token, …)     the same signature: hashes the token, calls _F_h;
--   F(p_contact_token, p_item_id, …)  the person's token and the object:
--                     contact_item_hash checks that the link is open and that
--                     the object belongs to the same contact and project,
--                     then the object's own hash goes through the same body.
-- Every rule of the object (revoked, expired, replaced, stage locked, role)
-- is checked as before, by the same code. The overloads have no default
-- argument: they always take one more argument than the original, so no
-- call can match both.
--
-- From now on a change to one of these functions is made in its _F_h.
-- Generated from the definitions in force (20261019110101) by the lot's
-- script; the bodies are copied verbatim, only the token's hash is a
-- parameter.

-- The token's hash, null when the token is malformed.
create function public.link_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_token ~ '^[0-9a-f]{64}$'
              then encode(sha256(convert_to(p_token, 'UTF8')), 'hex') end;
$$;
revoke execute on function public.link_token_hash(text) from public, anon, authenticated;

-- The object's own hash, through the person's link: null unless the link is
-- open and the object is this contact's, in this project.
create function public.contact_item_hash(p_kind text, p_contact_token text, p_item_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
  v_hash text;
begin
  if v.id is null or p_item_id is null then
    return null;
  end if;
  if p_kind = 'master' then
    select m.token_hash into v_hash from public.master_transmissions m
     where m.id = p_item_id and m.project_id = v.project_id and m.contact_id = v.contact_id;
  elsif p_kind = 'form' then
    select f.token_hash into v_hash from public.legal_forms f
     where f.id = p_item_id and f.project_id = v.project_id and f.contact_id = v.contact_id;
  elsif p_kind = 'split' then
    select c.token_hash into v_hash
      from public.legal_split_confirmations c
      join public.legal_split_entries e on e.id = c.entry_id
      join public.legal_split_versions sv on sv.id = c.version_id
      join public.legal_split_sheets sh on sh.id = sv.sheet_id
     where c.id = p_item_id and sh.project_id = v.project_id and e.contact_id = v.contact_id;
  elsif p_kind = 'influence' then
    select a.token_hash into v_hash
      from public.influence_agreements a
      join public.activation_targets t on t.id = a.target_id
     where a.id = p_item_id and a.project_id = v.project_id and t.contact_id = v.contact_id;
  elsif p_kind = 'provider' then
    select l.token_hash into v_hash from public.production_provider_links l
     where l.id = p_item_id and l.project_id = v.project_id and l.contact_id = v.contact_id;
  end if;
  return v_hash;
end;
$$;
revoke execute on function public.contact_item_hash(text, text, uuid) from public, anon, authenticated;

-- production_link_of ------------------------------------------------------
create function public._production_link_of_h(p_link_hash text, p_lock boolean)
returns public.production_provider_links
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
begin
  if p_link_hash is null then
    return null;
  end if;
  if p_lock then
    select * into v from public.production_provider_links
     where token_hash = p_link_hash for update;
  else
    select * into v from public.production_provider_links
     where token_hash = p_link_hash;
  end if;
  if not found or v.revoked_at is not null or v.expires_at < now() then
    return null;
  end if;
  return v;
end;
$function$;
revoke execute on function public._production_link_of_h(text, p_lock boolean) from public, anon, authenticated;

create or replace function public.production_link_of(p_token text, p_lock boolean)
returns public.production_provider_links
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._production_link_of_h(public.link_token_hash(p_token), p_lock);
end;
$function$;

-- production_link_for_role ------------------------------------------------
create function public._production_link_for_role_h(p_link_hash text, p_role text)
returns public.production_provider_links
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if not (p_role = any (public.production_link_roles(v))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return v;
end;
$function$;
revoke execute on function public._production_link_for_role_h(text, p_role text) from public, anon, authenticated;

create or replace function public.production_link_for_role(p_token text, p_role text)
returns public.production_provider_links
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._production_link_for_role_h(public.link_token_hash(p_token), p_role);
end;
$function$;

-- influence_collab_of -----------------------------------------------------
create function public._influence_collab_of_h(p_link_hash text)
returns public.influence_agreements
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v from public.influence_agreements
   where token_hash = p_link_hash;
  if not found or v.status <> 'accepted' then
    return null;
  end if;
  return v;
end;
$function$;
revoke execute on function public._influence_collab_of_h(text) from public, anon, authenticated;

create or replace function public.influence_collab_of(p_token text)
returns public.influence_agreements
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._influence_collab_of_h(public.link_token_hash(p_token));
end;
$function$;

-- open_transmission_of ----------------------------------------------------
create function public._open_transmission_of_h(p_link_hash text)
returns public.master_transmissions
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_link_hash is null then
    raise exception 'unknown' using errcode = 'P0001';
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = p_link_hash
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
$function$;
revoke execute on function public._open_transmission_of_h(text) from public, anon, authenticated;

create or replace function public.open_transmission_of(p_token text)
returns public.master_transmissions
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_transmission_of_h(public.link_token_hash(p_token));
end;
$function$;

-- master_link_chain -------------------------------------------------------
create function public._master_link_chain_h(p_link_hash text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_chain uuid[] := '{}';
begin
  select id into v_id from public.master_transmissions
   where token_hash = p_link_hash;
  for i in 1..4 loop
    exit when v_id is null;
    v_chain := v_chain || v_id;
    select id into v_id from public.master_transmissions
     where continues_id = v_id order by created_at desc limit 1;
  end loop;
  return v_chain;
end;
$function$;
revoke execute on function public._master_link_chain_h(text) from public, anon, authenticated;

create or replace function public.master_link_chain(p_token text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._master_link_chain_h(public.link_token_hash(p_token));
end;
$function$;

-- acknowledge_master_transmission -----------------------------------------
create function public._acknowledge_master_transmission_h(p_link_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_link_hash is null then
    return 'unknown';
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = p_link_hash
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
$function$;
revoke execute on function public._acknowledge_master_transmission_h(text) from public, anon, authenticated;

create or replace function public.acknowledge_master_transmission(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._acknowledge_master_transmission_h(public.link_token_hash(p_token));
end;
$function$;

create function public.acknowledge_master_transmission(p_contact_token text, p_item_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._acknowledge_master_transmission_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.acknowledge_master_transmission(text, uuid) from public;
grant execute on function public.acknowledge_master_transmission(text, uuid) to anon, authenticated;

-- get_master_engineer_messages --------------------------------------------
create function public._get_master_engineer_messages_h(p_link_hash text)
returns TABLE(id uuid, stage text, kind text, author text, body text, delay_days integer, status text, created_at timestamp with time zone)
language sql
stable
security definer
set search_path = ''
as $function$
  select m.id, m.stage, m.kind, m.author, m.body, m.delay_days, m.status, m.created_at
    from public.master_engineer_messages m
   where m.transmission_id = any (public._master_link_chain_h(p_link_hash))
   order by m.created_at;
$function$;
revoke execute on function public._get_master_engineer_messages_h(text) from public, anon, authenticated;

create or replace function public.get_master_engineer_messages(p_token text)
returns TABLE(id uuid, stage text, kind text, author text, body text, delay_days integer, status text, created_at timestamp with time zone)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return query select * from public._get_master_engineer_messages_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_master_engineer_messages(p_contact_token text, p_item_id uuid)
returns TABLE(id uuid, stage text, kind text, author text, body text, delay_days integer, status text, created_at timestamp with time zone)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return query select * from public._get_master_engineer_messages_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_master_engineer_messages(text, uuid) from public;
grant execute on function public.get_master_engineer_messages(text, uuid) to anon, authenticated;

-- get_master_transmission -------------------------------------------------
create function public._get_master_transmission_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_link public.master_transmissions%rowtype;
  v_row public.master_transmissions%rowtype;
  v_state text;
  v_stages text[];
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_link from public.master_transmissions
   where token_hash = p_link_hash;
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
    -- The rates PDS estimated for the roles this link carries (proto « Prendre
    -- en charge le dossier »), and the ones the engineer gave.
    'estimate', (select jsonb_build_object(
        'mix', case when v_row.role = 'mix' then b.mix_rate_cents end,
        'mastering', case when v_row.role = 'mastering'
                            or (v_row.role = 'mix' and b.mastering_same_engineer)
                          then b.mastering_rate_cents end)
        from public.master_briefs b where b.project_id = v_row.project_id),
    'taken', jsonb_build_object('mix', v_row.proposed_mix_cents,
                                'mastering', v_row.proposed_mastering_cents),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', v.master_id, 'title', m.title, 'number', v.number,
               'stage', v.stage,
               'fileName', f.file_name, 'receivedAt', v.created_at,
               'summary', case when v.feedback_sent_at is not null then v.feedback_summary end,
               'sentAt', v.feedback_sent_at,
               'decision', v.decision, 'decidedAt', v.decided_at,
               'decidedBy', nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
               'decisionNote', v.decision_note,
               'reopenedAt', v.reopened_at, 'reopenReason', v.reopen_reason)
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
$function$;
revoke execute on function public._get_master_transmission_h(text) from public, anon, authenticated;

create or replace function public.get_master_transmission(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_master_transmission_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_master_transmission(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_master_transmission_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_master_transmission(text, uuid) from public;
grant execute on function public.get_master_transmission(text, uuid) to anon, authenticated;

-- note_master_transmission_opened -----------------------------------------
create function public._note_master_transmission_opened_h(p_link_hash text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_link_hash is null then
    return;
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = p_link_hash
     and revoked_at is null and expires_at > now();
  if not found then
    return;
  end if;
  v_row := public.master_transmission_current(v_row);
  update public.master_transmissions set opened_at = now()
   where id = v_row.id and opened_at is null;
end;
$function$;
revoke execute on function public._note_master_transmission_opened_h(text) from public, anon, authenticated;

create or replace function public.note_master_transmission_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_master_transmission_opened_h(public.link_token_hash(p_token));
end;
$function$;

create function public.note_master_transmission_opened(p_contact_token text, p_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_master_transmission_opened_h(public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.note_master_transmission_opened(text, uuid) from public;
grant execute on function public.note_master_transmission_opened(text, uuid) to anon, authenticated;

-- open_master_delivery ----------------------------------------------------
create function public._open_master_delivery_h(p_link_hash text, p_master_id uuid, p_extension text, p_file_name text DEFAULT NULL::text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
  v_path text;
begin
  v_row := public._open_transmission_of_h(p_link_hash);
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
  if p_extension is null
     or p_extension !~ '^(wav|aif|aiff|flac|mp3|m4a|aac|ogg)$' then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if p_file_name is not null and not public.master_delivery_name_ok(p_file_name) then
    raise exception 'invalid_file_name' using errcode = 'P0001';
  end if;
  -- A link is not a storage space: a few deposits an hour.
  if (select count(*) from public.master_delivery_slots s
       where s.transmission_id = v_row.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits' using errcode = 'P0001';
  end if;

  v_path := v_row.organization_id::text || '/' || p_master_id::text || '/'
            || gen_random_uuid()::text || '.' || p_extension;
  insert into public.master_delivery_slots
    (organization_id, transmission_id, master_id, path, expires_at)
  values (v_row.organization_id, v_row.id, p_master_id, v_path, now() + interval '1 hour');
  return v_path;
end;
$function$;
revoke execute on function public._open_master_delivery_h(text, p_master_id uuid, p_extension text, p_file_name text) from public, anon, authenticated;

create or replace function public.open_master_delivery(p_token text, p_master_id uuid, p_extension text, p_file_name text DEFAULT NULL::text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_master_delivery_h(public.link_token_hash(p_token), p_master_id, p_extension, p_file_name);
end;
$function$;

create function public.open_master_delivery(p_contact_token text, p_item_id uuid, p_master_id uuid, p_extension text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_master_delivery_h(public.contact_item_hash('master', p_contact_token, p_item_id), p_master_id, p_extension, p_file_name);
end;
$function$;
revoke execute on function public.open_master_delivery(text, uuid, p_master_id uuid, p_extension text, p_file_name text) from public;
grant execute on function public.open_master_delivery(text, uuid, p_master_id uuid, p_extension text, p_file_name text) to anon, authenticated;

-- post_master_engineer_message --------------------------------------------
create function public._post_master_engineer_message_h(p_link_hash text, p_kind text, p_body text, p_delay_days integer DEFAULT NULL::integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype := public._open_transmission_of_h(p_link_hash);
  v_owner uuid;
  v_id uuid;
begin
  if p_kind not in ('message', 'question', 'delay', 'missing_file') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.master_engineer_messages
    (organization_id, project_id, transmission_id, stage, kind, author, body, delay_days, status)
  values (v_row.organization_id, v_row.project_id, v_row.id, v_row.role, p_kind, 'engineer',
          btrim(coalesce(p_body, '')),
          case when p_kind = 'delay' then p_delay_days end,
          case when p_kind = 'message' then null else 'open' end)
  returning id into v_id;

  select owner_person_id into v_owner from public.projects where id = v_row.project_id;
  v_owner := coalesce(v_owner, v_row.created_by);
  if v_owner is not null and not exists (
       select 1 from public.notifications n
        where n.recipient_person_id = v_owner and n.kind = 'master_engineer_signal'
          and n.subject_id = v_row.id and n.read_at is null) then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, null, 'master_engineer_signal', v_row.project_id, v_row.id);
  end if;
  return v_id;
end;
$function$;
revoke execute on function public._post_master_engineer_message_h(text, p_kind text, p_body text, p_delay_days integer) from public, anon, authenticated;

create or replace function public.post_master_engineer_message(p_token text, p_kind text, p_body text, p_delay_days integer DEFAULT NULL::integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._post_master_engineer_message_h(public.link_token_hash(p_token), p_kind, p_body, p_delay_days);
end;
$function$;

create function public.post_master_engineer_message(p_contact_token text, p_item_id uuid, p_kind text, p_body text, p_delay_days integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._post_master_engineer_message_h(public.contact_item_hash('master', p_contact_token, p_item_id), p_kind, p_body, p_delay_days);
end;
$function$;
revoke execute on function public.post_master_engineer_message(text, uuid, p_kind text, p_body text, p_delay_days integer) from public;
grant execute on function public.post_master_engineer_message(text, uuid, p_kind text, p_body text, p_delay_days integer) to anon, authenticated;

-- record_master_delivery --------------------------------------------------
create function public._record_master_delivery_h(p_link_hash text, p_path text, p_file_name text, p_mime text, p_bytes bigint DEFAULT NULL::bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
  v_slot public.master_delivery_slots%rowtype;
  v_bytes bigint;
  v_file uuid;
begin
  v_row := public._open_transmission_of_h(p_link_hash);
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
$function$;
revoke execute on function public._record_master_delivery_h(text, p_path text, p_file_name text, p_mime text, p_bytes bigint) from public, anon, authenticated;

create or replace function public.record_master_delivery(p_token text, p_path text, p_file_name text, p_mime text, p_bytes bigint DEFAULT NULL::bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._record_master_delivery_h(public.link_token_hash(p_token), p_path, p_file_name, p_mime, p_bytes);
end;
$function$;

create function public.record_master_delivery(p_contact_token text, p_item_id uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._record_master_delivery_h(public.contact_item_hash('master', p_contact_token, p_item_id), p_path, p_file_name, p_mime, p_bytes);
end;
$function$;
revoke execute on function public.record_master_delivery(text, uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint) from public;
grant execute on function public.record_master_delivery(text, uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint) to anon, authenticated;

-- take_master_transmission ------------------------------------------------
create function public._take_master_transmission_h(p_link_hash text, p_mix_cents bigint DEFAULT NULL::bigint, p_mastering_cents bigint DEFAULT NULL::bigint)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_row public.master_transmissions%rowtype;
  v_brief public.master_briefs%rowtype;
  v_roles text[];
  v_role text;
  v_amount bigint;
  v_label text;
  v_name text;
begin
  v_row := public._open_transmission_of_h(p_link_hash);
  if v_row.acknowledged_at is not null then
    return 'received';
  end if;
  if (p_mix_cents is not null and (p_mix_cents < 0 or p_mix_cents > 100000000))
     or (p_mastering_cents is not null and (p_mastering_cents < 0 or p_mastering_cents > 100000000)) then
    raise exception 'invalid_amount' using errcode = '23514';
  end if;
  select * into v_brief from public.master_briefs where project_id = v_row.project_id;
  select name into v_name from public.network_contacts where id = v_row.contact_id;
  -- The mix link of the engineer who masters too carries both rates.
  v_roles := case
    when v_row.role = 'mix' and v_brief.mastering_same_engineer then array['mix', 'mastering']
    else array[v_row.role] end;

  update public.master_transmissions
     set acknowledged_at = now(),
         proposed_mix_cents = case when 'mix' = any (v_roles)
                                   then coalesce(p_mix_cents, v_brief.mix_rate_cents) end,
         proposed_mastering_cents = case when 'mastering' = any (v_roles)
                                         then coalesce(p_mastering_cents, v_brief.mastering_rate_cents) end
   where id = v_row.id;

  foreach v_role in array v_roles loop
    v_amount := case v_role when 'mix' then coalesce(p_mix_cents, v_brief.mix_rate_cents)
                            else coalesce(p_mastering_cents, v_brief.mastering_rate_cents) end;
    continue when v_amount is null;
    v_label := case v_role when 'mix' then 'Mix' else 'Mastering' end
               || coalesce(' · ' || v_name, '');
    insert into public.budget_lines
      (organization_id, project_id, label, amount_cents, status, master_role, family, note)
    values (v_row.organization_id, v_row.project_id, v_label, v_amount, 'proposed', v_role,
            'services', 'Proposé par ' || coalesce(v_name, 'l''ingénieur') || ' par son lien')
    on conflict (project_id, master_role) where master_role is not null
    do update set amount_cents = excluded.amount_cents, status = 'proposed',
                  label = excluded.label, note = excluded.note
      where public.budget_lines.status in ('planned', 'proposed');
  end loop;

  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null, 'master_rate_proposed',
            v_row.project_id, v_row.id);
  end if;
  return 'received';
end;
$function$;
revoke execute on function public._take_master_transmission_h(text, p_mix_cents bigint, p_mastering_cents bigint) from public, anon, authenticated;

create or replace function public.take_master_transmission(p_token text, p_mix_cents bigint DEFAULT NULL::bigint, p_mastering_cents bigint DEFAULT NULL::bigint)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._take_master_transmission_h(public.link_token_hash(p_token), p_mix_cents, p_mastering_cents);
end;
$function$;

create function public.take_master_transmission(p_contact_token text, p_item_id uuid, p_mix_cents bigint, p_mastering_cents bigint)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._take_master_transmission_h(public.contact_item_hash('master', p_contact_token, p_item_id), p_mix_cents, p_mastering_cents);
end;
$function$;
revoke execute on function public.take_master_transmission(text, uuid, p_mix_cents bigint, p_mastering_cents bigint) from public;
grant execute on function public.take_master_transmission(text, uuid, p_mix_cents bigint, p_mastering_cents bigint) to anon, authenticated;

-- get_legal_form ----------------------------------------------------------
create function public._get_legal_form_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_form public.legal_forms%rowtype;
  v_state text;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_form from public.legal_forms
   where token_hash = p_link_hash;
  if not found then
    return null;
  end if;
  v_state := case
    when v_form.status = 'revoked' then 'revoked'
    when v_form.status in ('complete', 'action_required') then 'submitted'
    when v_form.expires_at < now() then 'expired'
    else 'open' end;
  if v_state <> 'open' then
    return jsonb_build_object('state', v_state,
                              'requester', public.legal_form_requester(v_form));
  end if;
  return (
    select jsonb_build_object(
      'state', 'open',
      'version', v_form.definition_version,
      'person', c.name,
      'project', p.title,
      'requester', public.legal_form_requester(v_form),
      'prefill', v_form.prefill,
      'known', coalesce(d.details, '{}')
               || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone)))
      from public.network_contacts c
      join public.projects p on p.id = v_form.project_id
      left join public.contact_legal_details d on d.contact_id = c.id
     where c.id = v_form.contact_id
  );
end;
$function$;
revoke execute on function public._get_legal_form_h(text) from public, anon, authenticated;

create or replace function public.get_legal_form(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_legal_form_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_legal_form(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_legal_form_h(public.contact_item_hash('form', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_legal_form(text, uuid) from public;
grant execute on function public.get_legal_form(text, uuid) to anon, authenticated;

-- note_legal_form_opened --------------------------------------------------
create function public._note_legal_form_opened_h(p_link_hash text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if p_link_hash is null then
    return;
  end if;
  update public.legal_forms
     set opened_at = now()
   where token_hash = p_link_hash
     and opened_at is null
     and status in ('link_generated', 'sent')
     and expires_at > now();
end;
$function$;
revoke execute on function public._note_legal_form_opened_h(text) from public, anon, authenticated;

create or replace function public.note_legal_form_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_legal_form_opened_h(public.link_token_hash(p_token));
end;
$function$;

create function public.note_legal_form_opened(p_contact_token text, p_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_legal_form_opened_h(public.contact_item_hash('form', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.note_legal_form_opened(text, uuid) from public;
grant execute on function public.note_legal_form_opened(text, uuid) to anon, authenticated;

-- submit_legal_form -------------------------------------------------------
create function public._submit_legal_form_h(p_link_hash text, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_form public.legal_forms%rowtype;
  v_known jsonb;
  v_corrections jsonb := '{}';
  v_new jsonb := '{}';
  v_key text;
  v_value jsonb;
  v_status text;
begin
  if p_link_hash is null then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  select * into v_form from public.legal_forms
   where token_hash = p_link_hash
   for update;
  if not found or v_form.status not in ('link_generated', 'sent') or v_form.expires_at < now() then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_person) <> 'object' or jsonb_typeof(p_contribution) <> 'object'
     or coalesce(cardinality(p_roles), 0) = 0 then
    raise exception 'legal_form_invalid' using errcode = 'P0001';
  end if;

  -- What the person was shown as known (get_legal_form).
  select coalesce(d.details, '{}')
         || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone))
    into v_known
    from public.network_contacts c
    left join public.contact_legal_details d on d.contact_id = c.id
   where c.id = v_form.contact_id;
  v_known := coalesce(v_known, '{}');
  for v_key, v_value in select * from jsonb_each(p_person)
  loop
    if v_known ? v_key
       and not public.legal_form_same_value(v_key, v_known -> v_key, v_value) then
      v_corrections := v_corrections
        || jsonb_build_object(v_key, jsonb_build_object('before', v_known -> v_key, 'after', v_value));
    else
      v_new := v_new || jsonb_build_object(v_key, v_value);
    end if;
  end loop;

  insert into public.contact_legal_details (contact_id, organization_id, details, definition_version)
  values (v_form.contact_id, v_form.organization_id, v_new, p_version)
  on conflict (contact_id) do update
    set details = public.contact_legal_details.details || excluded.details,
        definition_version = excluded.definition_version,
        updated_at = now();
  -- Reach the person: the contact's own email and phone when it had none
  -- (a different one is a correction, applied only once accepted).
  update public.network_contacts
     set email = coalesce(email, nullif(p_person ->> 'email', '')),
         phone = coalesce(phone, nullif(p_person ->> 'phone', ''))
   where id = v_form.contact_id;

  insert into public.legal_form_submissions
    (organization_id, form_id, project_id, contact_id, roles, other_role, person, contribution,
     corrections, definition_version)
  values (v_form.organization_id, v_form.id, v_form.project_id, v_form.contact_id, p_roles,
          nullif(btrim(coalesce(p_other_role, '')), ''), p_person, p_contribution,
          v_corrections, p_version);

  v_status := case when v_corrections = '{}'::jsonb then 'complete' else 'action_required' end;
  update public.legal_forms
     set status = v_status, submitted_at = now(),
         completed_at = case when v_status = 'complete' then now() end
   where id = v_form.id;
  return v_status;
end;
$function$;
revoke execute on function public._submit_legal_form_h(text, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer) from public, anon, authenticated;

create or replace function public.submit_legal_form(p_token text, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._submit_legal_form_h(public.link_token_hash(p_token), p_roles, p_other_role, p_person, p_contribution, p_version);
end;
$function$;

create function public.submit_legal_form(p_contact_token text, p_item_id uuid, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._submit_legal_form_h(public.contact_item_hash('form', p_contact_token, p_item_id), p_roles, p_other_role, p_person, p_contribution, p_version);
end;
$function$;
revoke execute on function public.submit_legal_form(text, uuid, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer) from public;
grant execute on function public.submit_legal_form(text, uuid, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer) to anon, authenticated;

-- get_split_confirmation --------------------------------------------------
create function public._get_split_confirmation_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_conf public.legal_split_confirmations%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_entry public.legal_split_entries%rowtype;
  v_project text;
  v_state text;
begin
  if p_link_hash is null then return null; end if;
  select * into v_conf from public.legal_split_confirmations
   where token_hash = p_link_hash;
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
$function$;
revoke execute on function public._get_split_confirmation_h(text) from public, anon, authenticated;

create or replace function public.get_split_confirmation(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_split_confirmation_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_split_confirmation(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_split_confirmation_h(public.contact_item_hash('split', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_split_confirmation(text, uuid) from public;
grant execute on function public.get_split_confirmation(text, uuid) to anon, authenticated;

-- respond_split_confirmation ----------------------------------------------
create function public._respond_split_confirmation_h(p_link_hash text, p_decision text, p_comment text, p_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_conf public.legal_split_confirmations%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_headers jsonb;
begin
  if p_link_hash is null then
    raise exception 'split_link_closed' using errcode = 'P0001';
  end if;
  select * into v_conf from public.legal_split_confirmations
   where token_hash = p_link_hash for update;
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
$function$;
revoke execute on function public._respond_split_confirmation_h(text, p_decision text, p_comment text, p_hash text) from public, anon, authenticated;

create or replace function public.respond_split_confirmation(p_token text, p_decision text, p_comment text, p_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._respond_split_confirmation_h(public.link_token_hash(p_token), p_decision, p_comment, p_hash);
end;
$function$;

create function public.respond_split_confirmation(p_contact_token text, p_item_id uuid, p_decision text, p_comment text, p_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._respond_split_confirmation_h(public.contact_item_hash('split', p_contact_token, p_item_id), p_decision, p_comment, p_hash);
end;
$function$;
revoke execute on function public.respond_split_confirmation(text, uuid, p_decision text, p_comment text, p_hash text) from public;
grant execute on function public.respond_split_confirmation(text, uuid, p_decision text, p_comment text, p_hash text) to anon, authenticated;

-- get_influence_agreement -------------------------------------------------
create function public._get_influence_agreement_h(p_link_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
begin
  if p_link_hash is null then return null; end if;
  select * into v from public.influence_agreements
   where token_hash = p_link_hash for update;
  if not found then return null; end if;
  if v.status <> 'pending' then
    return jsonb_build_object('state', v.status);
  end if;
  if v.expires_at < now() then return jsonb_build_object('state', 'expired'); end if;
  if v.displayed_at is null then
    update public.influence_agreements set displayed_at = now() where id = v.id;
    perform public.log_activation_event(v.activation_id, 'agreement.viewed', v.target_id, null,
                                        null, null);
  end if;
  return jsonb_build_object('state', 'open', 'content', v.content, 'hash', v.content_hash);
end;
$function$;
revoke execute on function public._get_influence_agreement_h(text) from public, anon, authenticated;

create or replace function public.get_influence_agreement(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._get_influence_agreement_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_influence_agreement(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._get_influence_agreement_h(public.contact_item_hash('influence', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_influence_agreement(text, uuid) from public;
grant execute on function public.get_influence_agreement(text, uuid) to anon, authenticated;

-- get_influence_collaboration ---------------------------------------------
create function public._get_influence_collaboration_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
begin
  v := public._influence_collab_of_h(p_link_hash);
  if v.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'step', public.influence_creator_step(v.target_id),
    'creator', v.content ->> 'creator',
    'campaign', v.content ->> 'campaign',
    'project', v.content ->> 'project',
    'terms', v.content -> 'terms',
    'agreedAt', v.decided_at,
    'contents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'label', c.label, 'url', c.url, 'decision', c.decision,
               'comment', c.decision_comment, 'at', c.created_at,
               'feedback', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'timecode', f.timecode, 'category', f.category,
                          'comment', f.comment) order by f.created_at)
                   from public.influence_feedback f where f.content_id = c.id), '[]'::jsonb))
             order by c.created_at)
        from public.influence_contents c where c.target_id = v.target_id), '[]'::jsonb),
    'publication', (
      select jsonb_build_object('url', e.url, 'on', e.declared_on,
               'verified', exists (select 1 from public.activation_evidence_checks k
                                    where k.evidence_id = e.id and k.result = 'verified'))
        from public.activation_evidence e
       where e.target_id = v.target_id and e.kind = 'publication' and e.withdrawn_at is null
       order by e.created_at desc limit 1),
    'invoiceSent', exists (select 1 from public.influence_payments p
                            where p.target_id = v.target_id and p.invoice_file_id is not null));
end;
$function$;
revoke execute on function public._get_influence_collaboration_h(text) from public, anon, authenticated;

create or replace function public.get_influence_collaboration(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_influence_collaboration_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_influence_collaboration(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_influence_collaboration_h(public.contact_item_hash('influence', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_influence_collaboration(text, uuid) from public;
grant execute on function public.get_influence_collaboration(text, uuid) to anon, authenticated;

-- declare_influence_publication_by_token ----------------------------------
create function public._declare_influence_publication_by_token_h(p_link_hash text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
begin
  v := public._influence_collab_of_h(p_link_hash);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'publish' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_url !~ '^https?://\S+$' or char_length(v_url) > 2000 then
    raise exception 'url_invalid' using errcode = '23514';
  end if;
  insert into public.activation_evidence (organization_id, project_id, activation_id, target_id,
                                          kind, url, declared_on, declared_source)
  values (v.organization_id, v.project_id, v.activation_id, v.target_id, 'publication', v_url,
          (now() at time zone 'Europe/Paris')::date, 'creator');
  perform public.log_activation_event(v.activation_id, 'publication.declared_by_creator',
    v.target_id, null, jsonb_build_object('url', v_url), null);
  perform public.influence_creator_notify(v);
end;
$function$;
revoke execute on function public._declare_influence_publication_by_token_h(text, p_url text) from public, anon, authenticated;

create or replace function public.declare_influence_publication_by_token(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._declare_influence_publication_by_token_h(public.link_token_hash(p_token), p_url);
end;
$function$;

create function public.declare_influence_publication_by_token(p_contact_token text, p_item_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._declare_influence_publication_by_token_h(public.contact_item_hash('influence', p_contact_token, p_item_id), p_url);
end;
$function$;
revoke execute on function public.declare_influence_publication_by_token(text, uuid, p_url text) from public;
grant execute on function public.declare_influence_publication_by_token(text, uuid, p_url text) to anon, authenticated;

-- open_influence_invoice_slot ---------------------------------------------
create function public._open_influence_invoice_slot_h(p_link_hash text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
  v_ext text := lower(btrim(coalesce(p_ext, '')));
  v_path text;
begin
  v := public._influence_collab_of_h(p_link_hash);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'invoice' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_ext <> '' and v_ext !~ '^[a-z0-9]{1,10}$' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_path := v.organization_id || '/' || v.project_id || '/' || gen_random_uuid()
            || case when v_ext = '' then '' else '.' || v_ext end;
  insert into public.influence_upload_slots (organization_id, agreement_id, path, expires_at)
  values (v.organization_id, v.id, v_path, now() + interval '30 minutes');
  return v_path;
end;
$function$;
revoke execute on function public._open_influence_invoice_slot_h(text, p_ext text) from public, anon, authenticated;

create or replace function public.open_influence_invoice_slot(p_token text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_influence_invoice_slot_h(public.link_token_hash(p_token), p_ext);
end;
$function$;

create function public.open_influence_invoice_slot(p_contact_token text, p_item_id uuid, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_influence_invoice_slot_h(public.contact_item_hash('influence', p_contact_token, p_item_id), p_ext);
end;
$function$;
revoke execute on function public.open_influence_invoice_slot(text, uuid, p_ext text) from public;
grant execute on function public.open_influence_invoice_slot(text, uuid, p_ext text) to anon, authenticated;

-- respond_influence_agreement ---------------------------------------------
create function public._respond_influence_agreement_h(p_link_hash text, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_headers jsonb;
begin
  if p_link_hash is null then
    raise exception 'agreement_link_closed' using errcode = 'P0001';
  end if;
  select * into v from public.influence_agreements
   where token_hash = p_link_hash for update;
  if not found or v.status <> 'pending' or v.expires_at < now() or v.displayed_at is null then
    raise exception 'agreement_link_closed' using errcode = 'P0001';
  end if;
  if p_hash is distinct from v.content_hash then
    raise exception 'agreement_content_changed' using errcode = 'P0001';
  end if;
  if p_decision = 'accept' and (v_name is null or char_length(v_name) > 200
                                or p_consent is distinct from true) then
    raise exception 'agreement_identity_required' using errcode = 'P0001';
  end if;
  if p_decision = 'change' and v_comment is null then
    raise exception 'agreement_comment_required' using errcode = 'P0001';
  end if;
  if p_decision not in ('accept', 'change') then
    raise exception 'agreement_decision_invalid' using errcode = 'P0001';
  end if;
  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    v_headers := null;
  end;
  update public.influence_agreements
     set status = case p_decision when 'accept' then 'accepted' else 'change_requested' end,
         identity_name = left(v_name, 200), decided_at = now(), comment = left(v_comment, 2000),
         evidence = jsonb_build_object(
           'content_hash', v.content_hash, 'displayed_at', v.displayed_at,
           'decided_at', now(), 'consent', p_consent,
           'user_agent', left(coalesce(v_headers ->> 'user-agent', ''), 300))
   where id = v.id;
  if p_decision = 'accept' then
    perform set_config('pds.influence_rights', 'on', true);
    update public.influence_rights
       set status = 'accepted', decided_at = now(), decided_by = null,
           decision_note = 'Bon pour accord'
     where target_id = v.target_id and superseded_at is null and status = 'proposed'
       and id in (select (r ->> 'id')::uuid from jsonb_array_elements(v.content -> 'rights') r);
    perform set_config('pds.influence_rights', 'off', true);
  else
    insert into public.influence_proposals
      (organization_id, project_id, activation_id, target_id, party, note)
    values (v.organization_id, v.project_id, v.activation_id, v.target_id, 'creator',
            left(v_comment, 2000));
  end if;
  perform public.log_activation_event(v.activation_id,
    case p_decision when 'accept' then 'agreement.accepted' else 'agreement.change_requested' end,
    v.target_id, null, jsonb_build_object('name', v_name), v_comment);
  return case p_decision when 'accept' then 'accepted' else 'change_requested' end;
end;
$function$;
revoke execute on function public._respond_influence_agreement_h(text, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean) from public, anon, authenticated;

create or replace function public.respond_influence_agreement(p_token text, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._respond_influence_agreement_h(public.link_token_hash(p_token), p_decision, p_name, p_comment, p_hash, p_consent);
end;
$function$;

create function public.respond_influence_agreement(p_contact_token text, p_item_id uuid, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._respond_influence_agreement_h(public.contact_item_hash('influence', p_contact_token, p_item_id), p_decision, p_name, p_comment, p_hash, p_consent);
end;
$function$;
revoke execute on function public.respond_influence_agreement(text, uuid, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean) from public;
grant execute on function public.respond_influence_agreement(text, uuid, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean) to anon, authenticated;

-- submit_influence_content_by_token ---------------------------------------
create function public._submit_influence_content_by_token_h(p_link_hash text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
  v_count integer;
begin
  v := public._influence_collab_of_h(p_link_hash);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'content' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_url !~ '^https?://\S+$' or char_length(v_url) > 2000 then
    raise exception 'url_invalid' using errcode = '23514';
  end if;
  select count(*) into v_count from public.influence_contents where target_id = v.target_id;
  insert into public.influence_contents (organization_id, project_id, activation_id, target_id,
                                         label, url)
  values (v.organization_id, v.project_id, v.activation_id, v.target_id,
          'V' || (v_count + 1), v_url);
  perform public.influence_creator_notify(v);
end;
$function$;
revoke execute on function public._submit_influence_content_by_token_h(text, p_url text) from public, anon, authenticated;

create or replace function public.submit_influence_content_by_token(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_influence_content_by_token_h(public.link_token_hash(p_token), p_url);
end;
$function$;

create function public.submit_influence_content_by_token(p_contact_token text, p_item_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_influence_content_by_token_h(public.contact_item_hash('influence', p_contact_token, p_item_id), p_url);
end;
$function$;
revoke execute on function public.submit_influence_content_by_token(text, uuid, p_url text) from public;
grant execute on function public.submit_influence_content_by_token(text, uuid, p_url text) to anon, authenticated;

-- submit_influence_invoice_by_token ---------------------------------------
create function public._submit_influence_invoice_by_token_h(p_link_hash text, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.influence_agreements%rowtype;
  v_slot public.influence_upload_slots%rowtype;
  v_file uuid;
begin
  v := public._influence_collab_of_h(p_link_hash);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'invoice' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  select * into v_slot from public.influence_upload_slots
   where path = p_path and agreement_id = v.id and used_at is null for update;
  if not found or not exists (select 1 from storage.objects o
                               where o.bucket_id = 'activation-files' and o.name = p_path) then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  insert into public.activation_files (organization_id, project_id, activation_id, kind, path,
                                       file_name, mime, bytes, restricted)
  values (v.organization_id, v.project_id, v.activation_id, 'invoice', p_path,
          left(btrim(coalesce(nullif(p_file_name, ''), 'Facture')), 255),
          left(coalesce(nullif(p_mime, ''), 'application/octet-stream'), 255),
          p_bytes, true)
  returning id into v_file;
  update public.influence_upload_slots set used_at = now() where id = v_slot.id;
  perform set_config('pds.influence_payment', 'on', true);
  update public.influence_payments set invoice_file_id = v_file, status = 'to_validate'
   where target_id = v.target_id;
  perform set_config('pds.influence_payment', 'off', true);
  perform public.log_activation_event(v.activation_id, 'payment.invoice_by_creator',
    v.target_id, null, jsonb_build_object('file', v_file), null);
  perform public.influence_creator_notify(v);
end;
$function$;
revoke execute on function public._submit_influence_invoice_by_token_h(text, p_path text, p_file_name text, p_mime text, p_bytes bigint) from public, anon, authenticated;

create or replace function public.submit_influence_invoice_by_token(p_token text, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_influence_invoice_by_token_h(public.link_token_hash(p_token), p_path, p_file_name, p_mime, p_bytes);
end;
$function$;

create function public.submit_influence_invoice_by_token(p_contact_token text, p_item_id uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_influence_invoice_by_token_h(public.contact_item_hash('influence', p_contact_token, p_item_id), p_path, p_file_name, p_mime, p_bytes);
end;
$function$;
revoke execute on function public.submit_influence_invoice_by_token(text, uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint) from public;
grant execute on function public.submit_influence_invoice_by_token(text, uuid, p_path text, p_file_name text, p_mime text, p_bytes bigint) to anon, authenticated;

-- add_production_gear_by_link ---------------------------------------------
create function public._add_production_gear_by_link_h(p_link_hash text, p_lines jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_line jsonb;
  v_n integer := 0;
  v_pos integer;
begin
  v := public._production_link_for_role_h(p_link_hash, 'dop');
  if jsonb_typeof(coalesce(p_lines, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_lines) > 50 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select coalesce(max(position) + 1, 0) into v_pos from public.production_equipment where sheet_id = v.sheet_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    if btrim(coalesce(v_line ->> 'label', '')) = '' then
      continue;
    end if;
    insert into public.production_equipment
      (organization_id, project_id, sheet_id, category, label, quantity, status, source, note, position)
    values (v.organization_id, v.project_id, v.sheet_id,
            case when v_line ->> 'category' in ('image', 'light', 'sound') then v_line ->> 'category' else 'other' end,
            left(btrim(v_line ->> 'label'), 200),
            case when (v_line ->> 'quantity') ~ '^[0-9]{1,4}$' and (v_line ->> 'quantity')::integer between 1 and 1000
                 then (v_line ->> 'quantity')::integer end,
            'need', 'rental', 'Liste du chef opérateur', v_pos + v_n);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;
revoke execute on function public._add_production_gear_by_link_h(text, p_lines jsonb) from public, anon, authenticated;

create or replace function public.add_production_gear_by_link(p_token text, p_lines jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._add_production_gear_by_link_h(public.link_token_hash(p_token), p_lines);
end;
$function$;

create function public.add_production_gear_by_link(p_contact_token text, p_item_id uuid, p_lines jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._add_production_gear_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_lines);
end;
$function$;
revoke execute on function public.add_production_gear_by_link(text, uuid, p_lines jsonb) from public;
grant execute on function public.add_production_gear_by_link(text, uuid, p_lines jsonb) to anon, authenticated;

-- deposit_production_export -----------------------------------------------
create function public._deposit_production_export_h(p_link_hash text, p_line_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_owner uuid;
  v_deliverable uuid;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if v_url is null or v_url !~ '^https://\S+$' or char_length(v_url) > 2000 then
    raise exception 'invalid_url';
  end if;
  update public.production_export_checks
     set url = v_url, result = null, checked_by = null, checked_at = null, note = null
   where id = p_line_id and sheet_id = v.sheet_id;
  if not found then
    raise exception 'line_not_found';
  end if;
  select p.owner_person_id into v_owner from public.projects p where p.id = v.project_id;
  select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
  if v_owner is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_owner, null, 'production_export_deposited', v.project_id,
            v_deliverable);
  end if;
end;
$function$;
revoke execute on function public._deposit_production_export_h(text, p_line_id uuid, p_url text) from public, anon, authenticated;

create or replace function public.deposit_production_export(p_token text, p_line_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._deposit_production_export_h(public.link_token_hash(p_token), p_line_id, p_url);
end;
$function$;

create function public.deposit_production_export(p_contact_token text, p_item_id uuid, p_line_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._deposit_production_export_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_line_id, p_url);
end;
$function$;
revoke execute on function public.deposit_production_export(text, uuid, p_line_id uuid, p_url text) from public;
grant execute on function public.deposit_production_export(text, uuid, p_line_id uuid, p_url text) to anon, authenticated;

-- deposit_production_quote_by_link ----------------------------------------
create function public._deposit_production_quote_by_link_h(p_link_hash text, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint DEFAULT NULL::bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  select * into s from public.production_sheets where id = v.sheet_id;
  perform public.production_quote_insert(s, p_label, p_amount_cents, p_delivery_on, p_url, p_note, null,
                                         p_loc_budget_cents);
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_quote_deposited', s.project_id,
            s.deliverable_id);
  end if;
end;
$function$;
revoke execute on function public._deposit_production_quote_by_link_h(text, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint) from public, anon, authenticated;

create or replace function public.deposit_production_quote_by_link(p_token text, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint DEFAULT NULL::bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._deposit_production_quote_by_link_h(public.link_token_hash(p_token), p_label, p_amount_cents, p_delivery_on, p_url, p_note, p_loc_budget_cents);
end;
$function$;

create function public.deposit_production_quote_by_link(p_contact_token text, p_item_id uuid, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._deposit_production_quote_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_label, p_amount_cents, p_delivery_on, p_url, p_note, p_loc_budget_cents);
end;
$function$;
revoke execute on function public.deposit_production_quote_by_link(text, uuid, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint) from public;
grant execute on function public.deposit_production_quote_by_link(text, uuid, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text, p_loc_budget_cents bigint) to anon, authenticated;

-- deposit_production_version ----------------------------------------------
create function public._deposit_production_version_h(p_link_hash text, p_url text, p_path text, p_file_name text, p_notes text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_slot public.production_provider_slots%rowtype;
  v_bytes bigint;
  v_mime text;
  v_file uuid;
  v_version uuid;
  v_number integer;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if (v_url is null) = (p_path is null) then
    raise exception 'one_media';
  end if;
  if v_url is not null and (v_url !~ '^https://\S+$' or char_length(v_url) > 2000) then
    raise exception 'invalid_url';
  end if;
  if v_notes is not null and char_length(v_notes) > 4000 then
    raise exception 'invalid_input';
  end if;
  if p_path is not null then
    select * into v_slot from public.production_provider_slots
     where path = p_path and link_id = v.id for update;
    if not found or v_slot.used_at is not null then
      raise exception 'file_mismatch';
    end if;
    select (o.metadata ->> 'size')::bigint, coalesce(o.metadata ->> 'mimetype', 'application/octet-stream')
      into v_bytes, v_mime
      from storage.objects o where o.bucket_id = 'production-files' and o.name = p_path;
    if v_bytes is null or v_bytes <= 0 then
      raise exception 'file_mismatch';
    end if;
    insert into public.production_files
      (organization_id, project_id, sheet_id, kind, path, file_name, mime, bytes)
    values (v.organization_id, v.project_id, v.sheet_id, 'version', p_path,
            left(btrim(coalesce(p_file_name, 'version')), 255), v_mime, v_bytes)
    returning id into v_file;
    update public.production_provider_slots set used_at = now() where id = v_slot.id;
  end if;

  insert into public.production_versions
    (organization_id, project_id, sheet_id, url, file_id, notes, contact_id)
  values (v.organization_id, v.project_id, v.sheet_id, v_url, v_file, v_notes, v.contact_id)
  returning id, number into v_version, v_number;
  update public.production_versions
     set status = 'in_review', submitted_at = now()
   where id = v_version;
  return v_number;
end;
$function$;
revoke execute on function public._deposit_production_version_h(text, p_url text, p_path text, p_file_name text, p_notes text) from public, anon, authenticated;

create or replace function public.deposit_production_version(p_token text, p_url text, p_path text, p_file_name text, p_notes text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._deposit_production_version_h(public.link_token_hash(p_token), p_url, p_path, p_file_name, p_notes);
end;
$function$;

create function public.deposit_production_version(p_contact_token text, p_item_id uuid, p_url text, p_path text, p_file_name text, p_notes text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._deposit_production_version_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_url, p_path, p_file_name, p_notes);
end;
$function$;
revoke execute on function public.deposit_production_version(text, uuid, p_url text, p_path text, p_file_name text, p_notes text) from public;
grant execute on function public.deposit_production_version(text, uuid, p_url text, p_path text, p_file_name text, p_notes text) to anon, authenticated;

-- finish_production_action_by_link ----------------------------------------
create function public._finish_production_action_by_link_h(p_link_hash text, p_action_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  a public.production_plan_actions%rowtype;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  select * into a from public.production_plan_actions where id = p_action_id for update;
  if not found or a.sheet_id <> v.sheet_id or a.contact_id is distinct from v.contact_id
     or a.status <> 'approved' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.done_at is not null then
    return;
  end if;
  update public.production_plan_actions
     set done_at = now(), done_by_contact_id = v.contact_id, review = false
   where id = a.id;
end;
$function$;
revoke execute on function public._finish_production_action_by_link_h(text, p_action_id uuid) from public, anon, authenticated;

create or replace function public.finish_production_action_by_link(p_token text, p_action_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._finish_production_action_by_link_h(public.link_token_hash(p_token), p_action_id);
end;
$function$;

create function public.finish_production_action_by_link(p_contact_token text, p_item_id uuid, p_action_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._finish_production_action_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_action_id);
end;
$function$;
revoke execute on function public.finish_production_action_by_link(text, uuid, p_action_id uuid) from public;
grant execute on function public.finish_production_action_by_link(text, uuid, p_action_id uuid) to anon, authenticated;

-- finish_production_step_by_link ------------------------------------------
create function public._finish_production_step_by_link_h(p_link_hash text, p_step_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  st public.production_post_steps%rowtype;
  v_owner uuid;
  v_deliverable uuid;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  select * into st from public.production_post_steps
   where id = p_step_id and sheet_id = v.sheet_id and contact_id = v.contact_id for update;
  if not found then
    raise exception 'step_not_found';
  end if;
  if st.status = 'done' then
    return;
  end if;
  update public.production_post_steps set status = 'done' where id = st.id;
  select p.owner_person_id into v_owner from public.projects p where p.id = v.project_id;
  select deliverable_id into v_deliverable from public.production_sheets where id = v.sheet_id;
  if v_owner is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_owner, null, 'production_step_done', v.project_id, v_deliverable);
  end if;
end;
$function$;
revoke execute on function public._finish_production_step_by_link_h(text, p_step_id uuid) from public, anon, authenticated;

create or replace function public.finish_production_step_by_link(p_token text, p_step_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._finish_production_step_by_link_h(public.link_token_hash(p_token), p_step_id);
end;
$function$;

create function public.finish_production_step_by_link(p_contact_token text, p_item_id uuid, p_step_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._finish_production_step_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_step_id);
end;
$function$;
revoke execute on function public.finish_production_step_by_link(text, uuid, p_step_id uuid) from public;
grant execute on function public.finish_production_step_by_link(text, uuid, p_step_id uuid) to anon, authenticated;

-- get_production_link_journey ---------------------------------------------
create function public._get_production_link_journey_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public._production_link_of_h(p_link_hash, false);
  if v.id is null then
    return null;
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  return jsonb_build_object(
    'roles', to_jsonb(public.production_link_roles(v)),
    'organization', s.organization,
    'deliveryOn', s.delivery_date,
    'progress', s.company_progress,
    'direction', jsonb_build_object('status', s.direction_status, 'comment', s.direction_comment,
      'stagingIntent', s.staging_intent, 'runOfShow', s.run_of_show, 'references', s.references_note),
    'quotes', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
        'number', q.number, 'amountCents', q.amount_cents, 'locBudgetCents', q.loc_budget_cents,
        'deliveryOn', q.delivery_on, 'status', q.status, 'url', q.url, 'note', q.note,
        'reason', q.reason, 'depositedAt', q.deposited_at, 'decidedAt', q.decided_at)
        order by q.number desc)
      from public.production_quotes q where q.sheet_id = s.id), '[]'::jsonb),
    'quoteRevision', case when s.quote_revision_at is null then null
      else jsonb_build_object('reason', s.quote_revision_reason, 'at', s.quote_revision_at) end,
    -- The deposit's deadline: the company's task about the quote, from the call.
    'quoteDue', (select a.due_date from public.production_plan_actions a
                  where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'
                    and a.title ilike '%devis%' and a.due_date is not null
                  order by a.due_date limit 1),
    'shootOn', public.production_shoot_day(s),
    'readyAt', s.ready_at,
    'shootState', (select sh.state from public.production_shoots sh where sh.sheet_id = s.id),
    'rushesUrl', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url from public.production_shoots sh where sh.sheet_id = s.id) end,
    'rushesAt', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url_at from public.production_shoots sh where sh.sheet_id = s.id) end,
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o where o.sheet_id = s.id and o.status <> 'discarded'), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title,
        'dueDate', a.due_date, 'origin', a.origin, 'doneAt', a.done_at, 'review', a.review,
        'checklist', coalesce(a.origin = 'checklist' or a.template_key like 'checklist\_%', false))
        order by a.due_date nulls last, a.position)
      from public.production_plan_actions a
      where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object(
        'title', c.title, 'occurredAt', c.occurred_at, 'format', pc.format,
        'meetingUrl', c.meeting_url, 'status', c.status,
        'participants', coalesce((select jsonb_agg(p ->> 'name')
           from jsonb_array_elements(pc.participants) p), '[]'::jsonb),
        'agenda', coalesce((select jsonb_agg(a ->> 'topic')
           from jsonb_array_elements(case when jsonb_typeof(c.agenda) = 'array'
                                          then c.agenda else '[]'::jsonb end) a), '[]'::jsonb),
        'invitedAt', c.created_at,
        'invitedBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
           from public.people pe where pe.id = c.created_by),
        'summary', (select jsonb_build_object('version', cs.version, 'text', cs.text,
              'sentAt', cs.sent_at,
              'sentBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
                           from public.people pe where pe.id = cs.sent_by))
           from public.call_summaries cs
          where cs.call_id = c.id
            and cs.recipients @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
          order by cs.version desc limit 1))
        order by c.occurred_at)
      from public.production_calls pc join public.calls c on c.id = pc.call_id
      where pc.sheet_id = s.id
        and (pc.participants @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
             or exists (select 1 from public.call_guests g
                         where g.call_id = c.id and g.contact_id = v.contact_id))), '[]'::jsonb),
    'directorProposals', case when s.company_contact_id = v.contact_id then
      coalesce((select jsonb_agg(jsonb_build_object('name', d.name, 'reelUrl', d.reel_url,
          'note', d.note, 'status', d.status, 'proposedAt', d.proposed_at) order by d.proposed_at)
        from public.production_director_proposals d
        where d.sheet_id = s.id and d.proposed_by_contact_id = v.contact_id), '[]'::jsonb)
      else '[]'::jsonb end);
end;
$function$;
revoke execute on function public._get_production_link_journey_h(text) from public, anon, authenticated;

create or replace function public.get_production_link_journey(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_link_journey_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_production_link_journey(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_link_journey_h(public.contact_item_hash('provider', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_production_link_journey(text, uuid) from public;
grant execute on function public.get_production_link_journey(text, uuid) to anon, authenticated;

-- get_production_provider_locations ---------------------------------------
create function public._get_production_provider_locations_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_role text;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v from public.production_provider_links
   where token_hash = p_link_hash
     and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  select c.role into v_role from public.production_location_consults c
   where c.sheet_id = v.sheet_id and c.contact_id = v.contact_id;
  if v_role is null then
    return jsonb_build_object('role', null, 'options', '[]'::jsonb);
  end if;
  return jsonb_build_object('role', v_role, 'options', coalesce((select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'address', o.address, 'url', o.url,
      'availability', o.availability, 'constraints', o.constraints,
      'media', coalesce((select jsonb_agg(m.url) from public.production_location_media m
                          where m.option_id = o.id and m.url is not null), '[]'::jsonb),
      'files', (select count(*) from public.production_location_media m
                 where m.option_id = o.id and m.file_id is not null),
      'review', (select jsonb_build_object('verdict', r.verdict, 'comment', r.comment)
                   from public.production_location_reviews r
                  where r.option_id = o.id and r.contact_id = v.contact_id))
      order by o.position, o.created_at)
    from public.production_location_options o
    where o.sheet_id = v.sheet_id and o.status <> 'discarded'), '[]'::jsonb));
end;
$function$;
revoke execute on function public._get_production_provider_locations_h(text) from public, anon, authenticated;

create or replace function public.get_production_provider_locations(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_provider_locations_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_production_provider_locations(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_provider_locations_h(public.contact_item_hash('provider', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_production_provider_locations(text, uuid) from public;
grant execute on function public.get_production_provider_locations(text, uuid) to anon, authenticated;

-- get_production_provider_space -------------------------------------------
create function public._get_production_provider_space_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_state text;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v from public.production_provider_links
   where token_hash = p_link_hash;
  if not found then
    return null;
  end if;
  v_state := case when v.revoked_at is not null then 'replaced'
                  when v.expires_at < now() then 'expired' else 'open' end;
  if v_state <> 'open' then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', 'open',
    'expiresAt', v.expires_at,
    'writable', public.project_stage_in_progress(v.project_id, 'production'),
    'provider', (select c.name from public.network_contacts c where c.id = v.contact_id),
    'project', (select p.title from public.projects p where p.id = v.project_id),
    'deliverable', (select d.title from public.production_sheets sh
                      join public.strategy_deliverables d on d.id = sh.deliverable_id
                     where sh.id = v.sheet_id),
    'manager', (select btrim(concat_ws(' ', pe.first_name, pe.last_name)) from public.projects p
                  join public.people pe on pe.id = p.owner_person_id
                 where p.id = v.project_id),
    'steps', coalesce((select jsonb_agg(jsonb_build_object(
        'id', st.id, 'key', st.step_key, 'label', st.label, 'responsibilities', st.responsibilities,
        'accessNote', st.access_note, 'startsOn', st.starts_on, 'endsOn', st.ends_on,
        'status', st.status) order by st.position, st.created_at)
      from public.production_post_steps st
      where st.sheet_id = v.sheet_id and st.contact_id = v.contact_id), '[]'::jsonb),
    'references', coalesce((select jsonb_agg(jsonb_build_object(
        'kind', r.kind, 'title', r.title, 'url', r.url, 'note', r.note,
        'fileName', f.file_name) order by r.created_at)
      from public.production_post_references r
      left join public.production_files f on f.id = r.file_id
      where r.sheet_id = v.sheet_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', rq.id, 'versionNumber', pv.number, 'dueOn', rq.due_on, 'message', rq.message,
        'status', rq.status, 'sentAt', rq.sent_at,
        'comments', coalesce((select jsonb_agg(jsonb_build_object(
            'timecodeMs', c.timecode_ms, 'category', c.category, 'body', c.body,
            'status', c.status) order by c.timecode_ms nulls first, c.created_at)
          from public.production_version_comments c where c.request_id = rq.id), '[]'::jsonb))
        order by pv.number desc)
      from public.production_correction_requests rq
      join public.production_versions pv on pv.id = rq.version_id
      where rq.sheet_id = v.sheet_id and rq.contact_id = v.contact_id
        and rq.status <> 'draft'), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
        'number', pv.number, 'status', pv.status, 'url', pv.url,
        'fileName', f.file_name, 'mine', pv.contact_id = v.contact_id,
        'submittedAt', pv.submitted_at, 'createdAt', pv.created_at)
        order by pv.number desc)
      from public.production_versions pv
      left join public.production_files f on f.id = pv.file_id
      where pv.sheet_id = v.sheet_id and pv.status <> 'draft'), '[]'::jsonb),
    'exports', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'label', e.label, 'kind', e.kind, 'url', e.url, 'result', e.result,
        'note', e.note, 'spec', e.spec,
        'failed', coalesce((select jsonb_agg(jsonb_build_object('key', i.key, 'note', i.note)
                                              order by i.key)
                              from public.production_export_check_items i
                             where i.line_id = e.id and i.result = 'not_ok'), '[]'::jsonb))
        order by e.position, e.created_at)
      from public.production_export_checks e
      where e.sheet_id = v.sheet_id), '[]'::jsonb),
    'approved', exists (select 1 from public.production_versions pv
                         where pv.sheet_id = v.sheet_id and pv.status = 'approved'));
end;
$function$;
revoke execute on function public._get_production_provider_space_h(text) from public, anon, authenticated;

create or replace function public.get_production_provider_space(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_provider_space_h(public.link_token_hash(p_token));
end;
$function$;

create function public.get_production_provider_space(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  return public._get_production_provider_space_h(public.contact_item_hash('provider', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.get_production_provider_space(text, uuid) from public;
grant execute on function public.get_production_provider_space(text, uuid) to anon, authenticated;

-- note_production_provider_opened -----------------------------------------
create function public._note_production_provider_opened_h(p_link_hash text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    return;
  end if;
  update public.production_provider_links
     set first_opened_at = coalesce(first_opened_at, now()), last_opened_at = now()
   where id = v.id;
  update public.production_correction_requests
     set status = 'viewed', viewed_at = now()
   where sheet_id = v.sheet_id and contact_id = v.contact_id and status = 'sent';
end;
$function$;
revoke execute on function public._note_production_provider_opened_h(text) from public, anon, authenticated;

create or replace function public.note_production_provider_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_production_provider_opened_h(public.link_token_hash(p_token));
end;
$function$;

create function public.note_production_provider_opened(p_contact_token text, p_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._note_production_provider_opened_h(public.contact_item_hash('provider', p_contact_token, p_item_id));
end;
$function$;
revoke execute on function public.note_production_provider_opened(text, uuid) from public;
grant execute on function public.note_production_provider_opened(text, uuid) to anon, authenticated;

-- open_production_provider_slot -------------------------------------------
create function public._open_production_provider_slot_h(p_link_hash text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  v_ext text := lower(substring(coalesce(p_file_name, '') from '\.([A-Za-z0-9]{1,10})$'));
  v_path text;
begin
  v := public._production_link_of_h(p_link_hash, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255 then
    raise exception 'invalid_file_name';
  end if;
  if (select count(*) from public.production_provider_slots s
       where s.link_id = v.id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_deposits';
  end if;
  v_path := v.organization_id::text || '/' || v.project_id::text || '/' || gen_random_uuid()::text
            || coalesce('.' || v_ext, '');
  insert into public.production_provider_slots (organization_id, link_id, path, expires_at)
  values (v.organization_id, v.id, v_path, now() + interval '1 hour');
  return v_path;
end;
$function$;
revoke execute on function public._open_production_provider_slot_h(text, p_file_name text) from public, anon, authenticated;

create or replace function public.open_production_provider_slot(p_token text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_production_provider_slot_h(public.link_token_hash(p_token), p_file_name);
end;
$function$;

create function public.open_production_provider_slot(p_contact_token text, p_item_id uuid, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._open_production_provider_slot_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_file_name);
end;
$function$;
revoke execute on function public.open_production_provider_slot(text, uuid, p_file_name text) from public;
grant execute on function public.open_production_provider_slot(text, uuid, p_file_name text) to anon, authenticated;

-- propose_production_director_by_link -------------------------------------
create function public._propose_production_director_by_link_h(p_link_hash text, p_name text, p_reel_url text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  select * into s from public.production_sheets where id = v.sheet_id;
  if btrim(coalesce(p_name, '')) = '' or coalesce(p_reel_url, '') !~ '^https://\S+$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  insert into public.production_director_proposals
    (organization_id, project_id, sheet_id, name, reel_url, note, proposed_by_contact_id)
  values (s.organization_id, s.project_id, s.id, left(btrim(p_name), 200), btrim(p_reel_url),
          nullif(left(btrim(coalesce(p_note, '')), 1000), ''), v.contact_id);
  perform public.production_log(s.organization_id, s.project_id, s.id, 'director', s.id,
    'proposed', null, jsonb_build_object('name', btrim(p_name)));
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, p.owner_person_id, null, 'production_director_proposed', s.project_id,
         s.deliverable_id
    from public.projects p where p.id = s.project_id and p.owner_person_id is not null;
end;
$function$;
revoke execute on function public._propose_production_director_by_link_h(text, p_name text, p_reel_url text, p_note text) from public, anon, authenticated;

create or replace function public.propose_production_director_by_link(p_token text, p_name text, p_reel_url text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._propose_production_director_by_link_h(public.link_token_hash(p_token), p_name, p_reel_url, p_note);
end;
$function$;

create function public.propose_production_director_by_link(p_contact_token text, p_item_id uuid, p_name text, p_reel_url text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._propose_production_director_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_name, p_reel_url, p_note);
end;
$function$;
revoke execute on function public.propose_production_director_by_link(text, uuid, p_name text, p_reel_url text, p_note text) from public;
grant execute on function public.propose_production_director_by_link(text, uuid, p_name text, p_reel_url text, p_note text) to anon, authenticated;

-- propose_production_location_by_link -------------------------------------
create function public._propose_production_location_by_link_h(p_link_hash text, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  insert into public.production_location_options
    (organization_id, project_id, sheet_id, name, address, price_cents, availability, constraints,
     url, position)
  values (v.organization_id, v.project_id, v.sheet_id, btrim(coalesce(p_name, '')),
          nullif(btrim(coalesce(p_address, '')), ''), p_price_cents,
          nullif(btrim(coalesce(p_availability, '')), ''), nullif(btrim(coalesce(p_constraints, '')), ''),
          nullif(btrim(coalesce(p_url, '')), ''),
          coalesce((select max(position) + 1 from public.production_location_options
                     where sheet_id = v.sheet_id), 0));
end;
$function$;
revoke execute on function public._propose_production_location_by_link_h(text, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text) from public, anon, authenticated;

create or replace function public.propose_production_location_by_link(p_token text, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._propose_production_location_by_link_h(public.link_token_hash(p_token), p_name, p_address, p_price_cents, p_availability, p_constraints, p_url);
end;
$function$;

create function public.propose_production_location_by_link(p_contact_token text, p_item_id uuid, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._propose_production_location_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_name, p_address, p_price_cents, p_availability, p_constraints, p_url);
end;
$function$;
revoke execute on function public.propose_production_location_by_link(text, uuid, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text) from public;
grant execute on function public.propose_production_location_by_link(text, uuid, p_name text, p_address text, p_price_cents bigint, p_availability text, p_constraints text, p_url text) to anon, authenticated;

-- review_production_location_by_link --------------------------------------
create function public._review_production_location_by_link_h(p_link_hash text, p_option_id uuid, p_verdict text, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  o public.production_location_options%rowtype;
begin
  v := public._production_link_of_h(p_link_hash, false);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  select * into o from public.production_location_options
   where id = p_option_id and sheet_id = v.sheet_id;
  if not found then
    raise exception 'location_not_found';
  end if;
  perform public.production_write_location_review(o, null, v.contact_id, p_verdict, p_comment);
end;
$function$;
revoke execute on function public._review_production_location_by_link_h(text, p_option_id uuid, p_verdict text, p_comment text) from public, anon, authenticated;

create or replace function public.review_production_location_by_link(p_token text, p_option_id uuid, p_verdict text, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._review_production_location_by_link_h(public.link_token_hash(p_token), p_option_id, p_verdict, p_comment);
end;
$function$;

create function public.review_production_location_by_link(p_contact_token text, p_item_id uuid, p_option_id uuid, p_verdict text, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._review_production_location_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_option_id, p_verdict, p_comment);
end;
$function$;
revoke execute on function public.review_production_location_by_link(text, uuid, p_option_id uuid, p_verdict text, p_comment text) from public;
grant execute on function public.review_production_location_by_link(text, uuid, p_option_id uuid, p_verdict text, p_comment text) to anon, authenticated;

-- set_production_progress_by_link -----------------------------------------
create function public._set_production_progress_by_link_h(p_link_hash text, p_key text, p_done boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  if p_key not in ('calls', 'gear', 'crew', 'schedule') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.production_sheets
     set company_progress = company_progress || jsonb_build_object(p_key, coalesce(p_done, false)),
         company_progress_at = now()
   where id = v.sheet_id;
  perform public.production_log(v.organization_id, v.project_id, v.sheet_id, 'company', v.sheet_id,
    'progress', null, jsonb_build_object('key', p_key, 'done', coalesce(p_done, false)));
end;
$function$;
revoke execute on function public._set_production_progress_by_link_h(text, p_key text, p_done boolean) from public, anon, authenticated;

create or replace function public.set_production_progress_by_link(p_token text, p_key text, p_done boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._set_production_progress_by_link_h(public.link_token_hash(p_token), p_key, p_done);
end;
$function$;

create function public.set_production_progress_by_link(p_contact_token text, p_item_id uuid, p_key text, p_done boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._set_production_progress_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_key, p_done);
end;
$function$;
revoke execute on function public.set_production_progress_by_link(text, uuid, p_key text, p_done boolean) from public;
grant execute on function public.set_production_progress_by_link(text, uuid, p_key text, p_done boolean) to anon, authenticated;

-- set_production_rushes_by_link -------------------------------------------
create function public._set_production_rushes_by_link_h(p_link_hash text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  if coalesce(p_url, '') !~ '^https://\S+$' or char_length(p_url) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  if not exists (select 1 from public.production_shoots sh
                  where sh.sheet_id = s.id and sh.state in ('done', 'partial', 'interrupted')) then
    raise exception 'shoot_not_done';
  end if;
  update public.production_shoots
     set rushes_url = btrim(p_url), rushes_url_at = now(), rushes_url_contact_id = v.contact_id
   where sheet_id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'shoot', s.id, 'rushes_linked',
    null, jsonb_build_object('url', btrim(p_url)));
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_rushes_linked', s.project_id,
            s.deliverable_id);
  end if;
end;
$function$;
revoke execute on function public._set_production_rushes_by_link_h(text, p_url text) from public, anon, authenticated;

create or replace function public.set_production_rushes_by_link(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._set_production_rushes_by_link_h(public.link_token_hash(p_token), p_url);
end;
$function$;

create function public.set_production_rushes_by_link(p_contact_token text, p_item_id uuid, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._set_production_rushes_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_url);
end;
$function$;
revoke execute on function public.set_production_rushes_by_link(text, uuid, p_url text) from public;
grant execute on function public.set_production_rushes_by_link(text, uuid, p_url text) to anon, authenticated;

-- submit_production_direction_by_link -------------------------------------
create function public._submit_production_direction_by_link_h(p_link_hash text, p_staging_intent text, p_run_of_show text, p_references_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'director');
  if coalesce(char_length(p_staging_intent), 0) > 4000 or coalesce(char_length(p_run_of_show), 0) > 4000
     or coalesce(char_length(p_references_note), 0) > 4000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.production_sheets
     set staging_intent = nullif(btrim(coalesce(p_staging_intent, '')), ''),
         run_of_show = nullif(btrim(coalesce(p_run_of_show, '')), ''),
         references_note = nullif(btrim(coalesce(p_references_note, '')), ''),
         brief_updated_at = now(), brief_updated_by = null
   where id = v.sheet_id
  returning * into s;
  perform public.production_direction_submit(s);
end;
$function$;
revoke execute on function public._submit_production_direction_by_link_h(text, p_staging_intent text, p_run_of_show text, p_references_note text) from public, anon, authenticated;

create or replace function public.submit_production_direction_by_link(p_token text, p_staging_intent text, p_run_of_show text, p_references_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_production_direction_by_link_h(public.link_token_hash(p_token), p_staging_intent, p_run_of_show, p_references_note);
end;
$function$;

create function public.submit_production_direction_by_link(p_contact_token text, p_item_id uuid, p_staging_intent text, p_run_of_show text, p_references_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform public._submit_production_direction_by_link_h(public.contact_item_hash('provider', p_contact_token, p_item_id), p_staging_intent, p_run_of_show, p_references_note);
end;
$function$;
revoke execute on function public.submit_production_direction_by_link(text, uuid, p_staging_intent text, p_run_of_show text, p_references_note text) from public;
grant execute on function public.submit_production_direction_by_link(text, uuid, p_staging_intent text, p_run_of_show text, p_references_note text) to anon, authenticated;
