-- PROJ-BUG-01: a call recorded in the app is saved while it happens.
--
-- Until now the whole recording stayed in the browser's memory until « Envoyer »:
-- a reload, a crash or a closed tab lost everything. Now:
--   * a take = one continuous recording session (a reload, a revoked or
--     unplugged microphone ends it; « Reprendre » starts the next one);
--   * a piece = a few seconds of a take, uploaded to the call-audio bucket as
--     soon as the browser has them. The pieces of a take, in order, are the
--     take's file (MediaRecorder output cut in time slices);
--   * « Envoyer » assembles each take into one file (path), the first take's
--     file becomes calls.audio_path and the transcription reads them all.
-- Nothing is deleted: « Supprimer » marks the unsent takes discarded_at.

create table public.call_recording_takes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  take smallint not null,
  mime text not null,
  ext text not null,
  started_at timestamptz not null default now(),
  -- The assembled file, written at « Envoyer ».
  path text,
  bytes bigint,
  discarded_at timestamptz,
  constraint call_recording_takes_take_check check (take between 1 and 500),
  constraint call_recording_takes_mime_check
    check ((mime, ext) in (('audio/webm', 'webm'), ('audio/mp4', 'm4a'))),
  constraint call_recording_takes_path_check
    check (path is null
           or path like organization_id::text || '/' || call_id::text || '/%'),
  constraint call_recording_takes_bytes_check
    check ((path is null) = (bytes is null) and (bytes is null or bytes > 0)),
  constraint call_recording_takes_call_take_key unique (call_id, take),
  constraint call_recording_takes_id_call_org_key
    unique (id, call_id, organization_id),
  constraint call_recording_takes_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
    on delete cascade
);

create table public.call_recording_pieces (
  take_id uuid not null,
  call_id uuid not null,
  organization_id uuid not null,
  seq integer not null,
  path text not null,
  bytes integer not null,
  -- Recorded time at the end of this piece (pauses excluded), in ms.
  end_ms integer not null,
  saved_at timestamptz not null default now(),
  primary key (take_id, seq),
  constraint call_recording_pieces_seq_check check (seq between 0 and 100000),
  constraint call_recording_pieces_bytes_check check (bytes > 0),
  constraint call_recording_pieces_end_check check (end_ms >= 0),
  constraint call_recording_pieces_path_check
    check (path like organization_id::text || '/' || call_id::text
                     || '/takes/' || take_id::text || '/%'),
  constraint call_recording_pieces_take_same_call
    foreign key (take_id, call_id, organization_id)
    references public.call_recording_takes (id, call_id, organization_id)
    on delete cascade
);

create index call_recording_pieces_call_idx on public.call_recording_pieces (call_id);

alter table public.call_recording_takes enable row level security;
alter table public.call_recording_takes force row level security;
alter table public.call_recording_pieces enable row level security;
alter table public.call_recording_pieces force row level security;
revoke all on public.call_recording_takes from anon, authenticated;
revoke all on public.call_recording_pieces from anon, authenticated;

-- A call still waiting for its audio: the only time a recording is written.
create or replace function public.call_awaits_audio(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.calls c
                  where c.id = p_call_id and c.audio_path is null);
$$;

revoke execute on function public.call_awaits_audio(uuid) from public, anon;
grant execute on function public.call_awaits_audio(uuid) to authenticated;

-- Read by whoever sees the call, written by whoever works on it.
create policy call_recording_takes_select_visible on public.call_recording_takes
  for select to authenticated
  using (public.can_see_call(call_id));
create policy call_recording_takes_insert_owner on public.call_recording_takes
  for insert to authenticated
  with check (public.is_call_owner(call_id)
              and public.call_awaits_audio(call_id)
              and path is null and discarded_at is null);
-- Assembled, or discarded (an assembled take too, when sending failed half
-- way); never after the call has its audio.
create policy call_recording_takes_update_owner on public.call_recording_takes
  for update to authenticated
  using (public.is_call_owner(call_id)
         and public.call_awaits_audio(call_id)
         and discarded_at is null)
  with check (public.is_call_owner(call_id));

create policy call_recording_pieces_select_visible on public.call_recording_pieces
  for select to authenticated
  using (public.can_see_call(call_id));
create policy call_recording_pieces_insert_owner on public.call_recording_pieces
  for insert to authenticated
  with check (public.is_call_owner(call_id)
              and exists (select 1 from public.call_recording_takes t
                           where t.id = take_id
                             and t.path is null and t.discarded_at is null));

grant select on public.call_recording_takes to authenticated;
grant insert (organization_id, call_id, take, mime, ext)
  on public.call_recording_takes to authenticated;
grant update (path, bytes, discarded_at) on public.call_recording_takes to authenticated;
grant select on public.call_recording_pieces to authenticated;
grant insert (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  on public.call_recording_pieces to authenticated;

-- Next take of a call, numbered under a lock: two tabs never share a number.
create or replace function public.begin_recording_take(
  p_call_id uuid,
  p_mime text,
  p_ext text
)
returns table (id uuid, take smallint, started_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_take smallint;
begin
  select c.organization_id into v_org
    from public.calls c
   where c.id = p_call_id and c.audio_path is null
     for update;
  if v_org is null then
    raise exception 'call not found or already has its audio' using errcode = 'P0002';
  end if;
  select coalesce(max(t.take), 0) + 1 into v_take
    from public.call_recording_takes t where t.call_id = p_call_id;
  return query
    insert into public.call_recording_takes (organization_id, call_id, take, mime, ext)
    values (v_org, p_call_id, v_take, p_mime, p_ext)
    returning call_recording_takes.id, call_recording_takes.take,
              call_recording_takes.started_at;
end;
$$;

revoke execute on function public.begin_recording_take(uuid, text, text) from public, anon;
grant execute on function public.begin_recording_take(uuid, text, text) to authenticated;
