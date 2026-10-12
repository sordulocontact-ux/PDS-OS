-- Retours BUG + UX consolidés du 11/10/2026, lot 9 : PROJ-UX-08 + PROJ-UX-09.
--   * The Brief Mix/Master gets its « Message » for the engineer and its
--     formats (« Livrables et formats »), reused by the sending;
--   * a sending says, apart and dated: link created, link sent (said by the
--     owner: PDS OS sends no e-mail), opened by the engineer, reception
--     confirmed (their explicit action, unchanged), file received; a link
--     can be revoked with its reason, a renewal replaces it as before;
--   * a missing prerequisite the sending can do without (stems) goes only
--     with an explicit derogation, kept on the sending.
-- docs/ARCHITECTURE.md § 8 septies (« Brief et transmission lisibles »).

-- 1. The Brief ---------------------------------------------------------------

alter table public.master_briefs
  add column engineer_message text,
  add column delivery_formats text;
alter table public.master_briefs
  add constraint master_briefs_engineer_message_length check (char_length(engineer_message) <= 2000),
  add constraint master_briefs_delivery_formats_length check (char_length(delivery_formats) <= 500);
grant insert (engineer_message, delivery_formats) on public.master_briefs to authenticated;
grant update (engineer_message, delivery_formats) on public.master_briefs to authenticated;

-- 2. A sending's life ------------------------------------------------------------

alter table public.master_transmissions
  add column link_sent_at timestamptz,
  add column link_sent_by uuid references public.people (id),
  add column opened_at timestamptz,
  add column revoke_reason text,
  add column revoked_by uuid references public.people (id),
  -- What the owner chose to send without, and why: {"withoutStems": ["Titre"]}.
  add column derogations jsonb not null default '{}'::jsonb;
alter table public.master_transmissions
  add constraint master_transmissions_revoke_reason_length check (char_length(revoke_reason) <= 500),
  add constraint master_transmissions_derogations_object check (jsonb_typeof(derogations) = 'object');

-- « Transmettre » / « Relancer » / « Renouveler »: as before (a new link
-- replaces the previous one of the same role), and refused when a title of a
-- mix package has no stems unless the owner sends without them on purpose.
drop function public.create_master_transmission(uuid, text, jsonb, text, timestamptz);
create function public.create_master_transmission(
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

  -- The titles of a mix package without stems must be named, on purpose.
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
revoke execute on function public.create_master_transmission(uuid, text, jsonb, text, timestamptz, jsonb)
  from public, anon;
grant execute on function public.create_master_transmission(uuid, text, jsonb, text, timestamptz, jsonb)
  to authenticated;

-- « J'ai envoyé le lien »: the owner says the link left (by e-mail, by
-- message); PDS OS never sends it itself.
create function public.mark_master_transmission_sent(p_transmission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  select * into v_row from public.master_transmissions where id = p_transmission_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.revoked_at is not null or v_row.link_sent_at is not null then
    raise exception 'invalid_transition';
  end if;
  update public.master_transmissions
     set link_sent_at = now(), link_sent_by = public.auth_person_id()
   where id = p_transmission_id;
end;
$$;
revoke execute on function public.mark_master_transmission_sent(uuid) from public, anon;
grant execute on function public.mark_master_transmission_sent(uuid) to authenticated;

-- « Révoquer le lien »: it stops working at once, with its reason.
create function public.revoke_master_transmission(p_transmission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.master_transmissions where id = p_transmission_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.revoked_at is not null then
    raise exception 'invalid_transition';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  update public.master_transmissions
     set revoked_at = now(), revoked_by = public.auth_person_id(), revoke_reason = left(v_reason, 500)
   where id = p_transmission_id;
end;
$$;
revoke execute on function public.revoke_master_transmission(uuid, text) from public, anon;
grant execute on function public.revoke_master_transmission(uuid, text) to authenticated;

-- The engineer opened their link (the page notes it once, without account).
-- Opening is not taking charge: that stays « J'ai bien reçu le dossier ».
create function public.note_master_transmission_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  update public.master_transmissions
     set opened_at = now()
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and opened_at is null and revoked_at is null and expires_at > now();
end;
$$;
revoke execute on function public.note_master_transmission_opened(text) from public;
grant execute on function public.note_master_transmission_opened(text) to anon, authenticated;

-- 3. The engineer's page: a revoked link says it was turned off, not replaced.
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
    when v_row.revoked_at is not null and v_row.revoke_reason is not null then 'revoked'
    when v_row.revoked_at is not null then 'replaced'
    when v_row.expires_at < now() then 'expired'
    when v_row.acknowledged_at is not null then 'received'
    else 'open' end;
  if v_state in ('replaced', 'expired', 'revoked') then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'acknowledgedAt', v_row.acknowledged_at,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', v.master_id, 'title', m.title, 'number', v.number,
               'fileName', f.file_name, 'receivedAt', v.created_at,
               'summary', case when v.feedback_sent_at is not null then v.feedback_summary end,
               'sentAt', v.feedback_sent_at,
               'decision', v.decision, 'decidedAt', v.decided_at,
               'decidedBy', nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
               'decisionNote', v.decision_note)
             order by v.created_at desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
        left join public.master_files f on f.id = v.file_id
        left join public.people p on p.id = v.decided_by
       where v.project_id = v_row.project_id
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

-- 4. « Fichier reçu »: the first version the engineer deposited through the
-- link, kept on the sending (the slots stay unreadable to members).
alter table public.master_transmissions add column delivered_at timestamptz;

create function public.master_transmission_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.used_at is not null and old.used_at is null then
    update public.master_transmissions
       set delivered_at = coalesce(delivered_at, new.used_at)
     where id = new.transmission_id;
  end if;
  return new;
end;
$$;
create trigger z_master_transmission_delivered after update of used_at on public.master_delivery_slots
  for each row execute function public.master_transmission_delivered();

update public.master_transmissions t
   set delivered_at = s.first_used
  from (select transmission_id, min(used_at) as first_used
          from public.master_delivery_slots where used_at is not null
         group by transmission_id) s
 where s.transmission_id = t.id and t.delivered_at is null;
