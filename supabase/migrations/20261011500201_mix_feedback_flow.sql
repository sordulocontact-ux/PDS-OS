-- Retours BUG + UX consolidés du 11/10/2026, lot 8 : PROJ-BUG-08.
-- One flow of feedback per version between the label and the engineer:
--   * « Demander une modification » no longer keeps a note the engineer never
--     reads: with nothing sent yet, its note IS the feedback sent for the
--     version (written once, shown once); with a synthesis already sent, the
--     decision completes it, its note shown only when it says something else;
--   * the engineer's page lists every version of their stage with its state,
--     the feedback, and the decision (who, when, what comes next), Mix and
--     Master apart;
--   * a comment carries its timecode and an idempotency key (a request sent
--     twice adds it once);
--   * a deposit is refused when its name or extension is not an audio file's.
-- docs/ARCHITECTURE.md § 8 septies (« Un seul fil de retours »).

-- 1. Comments --------------------------------------------------------------

alter table public.master_mix_comments
  add column timecode_seconds integer,
  add column client_key uuid;
alter table public.master_mix_comments add constraint master_mix_comments_timecode_check
  check (timecode_seconds is null or (timecode_seconds >= 0 and timecode_seconds < 86400));
create unique index master_mix_comments_client_key
  on public.master_mix_comments (version_id, client_key) where client_key is not null;
grant insert (timecode_seconds, client_key) on public.master_mix_comments to authenticated;

-- 2. The decision -------------------------------------------------------------

create or replace function public.decide_mix_version(
  p_version_id uuid,
  p_decision text,
  p_note text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_validator uuid;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_message text;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select b.validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p
    left join public.master_briefs b on b.project_id = p.id
   where p.id = v_row.project_id;
  if v_actor is null
     or v_actor is distinct from coalesce(v_validator, v_owner)
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is not null then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.stage = v_row.stage and v.number > v_row.number) then
    raise exception 'not_latest';
  end if;
  if p_decision = 'approved' and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = v_row.project_id and v.master_id = v_row.master_id
          and v.stage = v_row.stage and v.decision = 'approved') then
    raise exception 'already_final';
  end if;

  -- A change request always tells the engineer what to change: the feedback
  -- already sent, or else the synthesis saved, or else this note, sent now.
  if p_decision = 'changes_requested' and v_row.feedback_sent_at is null then
    v_message := coalesce(nullif(btrim(coalesce(v_row.feedback_summary, '')), ''), v_note);
    if v_message is null then
      raise exception 'note_required' using errcode = '23514';
    end if;
    update public.master_mix_versions
       set feedback_summary = v_message, status = 'feedback_sent',
           feedback_sent_at = now(), feedback_sent_by = v_actor
     where id = p_version_id;
    -- The note became the feedback: kept once, not twice.
    if v_message = v_note then
      v_note := null;
    end if;
  end if;

  update public.master_mix_versions
     set decision = p_decision, decision_note = v_note,
         decided_by = v_actor, decided_at = now()
   where id = p_version_id;

  if p_decision = 'approved' and v_row.stage = 'mastering' then
    update public.master_files set audio_state = 'final_master'
     where id = v_row.file_id and audio_state <> 'final_master';
    update public.masters set audio_state = 'final_master'
     where id = v_row.master_id;
  end if;

  if v_owner is not null and v_owner <> v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, v_actor,
            case
              when p_decision = 'approved' and v_row.stage = 'mix' then 'master_mix_approved'
              when p_decision = 'approved' then 'master_final_approved'
              when v_row.stage = 'mix' then 'master_mix_changes_requested'
              else 'master_mastering_changes_requested' end,
            v_row.project_id, v_row.id);
  end if;
end;
$$;

-- 3. The engineer's page --------------------------------------------------------

-- Every version of the engineer's stage, newest first, with what the label
-- said and decided: one entry per version.
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
         -- The engineer's own stage (a package sent before 10/10/2026 does
         -- not name its titles' ids: the project's versions, as before).
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

-- 4. The deposit ------------------------------------------------------------------

-- An audio file's name: a few words and an audio extension, nothing that
-- reads as a path.
create function public.master_delivery_name_ok(p_file_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_file_name is not null
     and char_length(btrim(p_file_name)) between 3 and 200
     and p_file_name !~ '[/\\[:cntrl:]]'
     and lower(p_file_name) ~ '\.(wav|aif|aiff|flac|mp3|m4a|aac|ogg)$';
$$;

drop function public.open_master_delivery(text, uuid, text);
create function public.open_master_delivery(
  p_token text,
  p_master_id uuid,
  p_extension text,
  p_file_name text default null
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
$$;
revoke execute on function public.open_master_delivery(text, uuid, text, text) from public;
grant execute on function public.open_master_delivery(text, uuid, text, text) to anon, authenticated;
