-- Marketing › Activations › Relations presse, in-house (ticket « Relations
-- presse », § 5 ; docs/ARCHITECTURE.md § 8 duodecies). The cadrage is an
-- activation sheet (framing), the Dossier de presse is the Stratégie's
-- (strategy_documents, versioned and validated there), targets and messages
-- are the shared ones. Here :
--   1. opportunities and interviews : « Interview proposée → Disponibilité de
--      principe → Créneau confirmé → Interview réalisée → Diffusion déclarée »,
--      each confirmation saying who confirmed what, when, by which channel and
--      with which proof ; a broadcast or a coverage is then an evidence ;
--   2. follow-ups : refused after a refusal, an open opportunity or a closed
--      activation, unless a reason is written (« sauf dérogation motivée »).

create table public.press_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  -- The message the answer came to.
  origin_message_id uuid references public.activation_messages (id) on delete set null,
  -- interview, article, review (chronique), radio, session, info_request, other.
  type text not null,
  format text,
  subject text,
  scheduled_at timestamptz,
  timezone text not null default 'Europe/Paris',
  location text,
  participants text,
  pds_person_id uuid references public.people (id),
  constraints_note text,
  -- proposed, availability (de principe), confirmed (créneau), done
  -- (réalisée), broadcast_declared, no_broadcast (réalisée, diffusion
  -- annulée), cancelled.
  status text not null default 'proposed',
  -- The confirmation : who (on their side), by which channel, the proof.
  confirmed_by_name text,
  confirmation_channel text,
  confirmation_proof_url text,
  confirmed_at timestamptz,
  -- The interview brief, prepared by code from the validated cadrage and
  -- Dossier de presse, then edited ; it never invents an answer.
  brief text,
  status_note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint press_opportunities_type_check check (type in (
    'interview', 'article', 'review', 'radio', 'session', 'info_request', 'other')),
  constraint press_opportunities_texts_check check (
    coalesce(char_length(format), 0) <= 120 and coalesce(char_length(subject), 0) <= 500
    and coalesce(char_length(location), 0) <= 500
    and coalesce(char_length(participants), 0) <= 500
    and coalesce(char_length(constraints_note), 0) <= 1000
    and coalesce(char_length(brief), 0) <= 20000
    and coalesce(char_length(status_note), 0) <= 1000
    and coalesce(char_length(confirmed_by_name), 0) <= 200),
  constraint press_opportunities_timezone_check check (char_length(timezone) between 1 and 60),
  constraint press_opportunities_status_check check (status in (
    'proposed', 'availability', 'confirmed', 'done', 'broadcast_declared', 'no_broadcast',
    'cancelled')),
  -- « Interview proposée sans date : autoriser l'opportunité, pas le statut
  -- Créneau confirmé. »
  constraint press_opportunities_slot_check check (
    status not in ('confirmed', 'done', 'broadcast_declared', 'no_broadcast')
    or scheduled_at is not null),
  constraint press_opportunities_confirmation_check check (
    status not in ('confirmed', 'done', 'broadcast_declared', 'no_broadcast')
    or (confirmed_by_name is not null and confirmation_channel is not null)),
  constraint press_opportunities_channel_check check (
    confirmation_channel is null or confirmation_channel in ('email', 'dm', 'phone', 'other')),
  constraint press_opportunities_proof_check check (
    confirmation_proof_url is null or (char_length(confirmation_proof_url) <= 2000
                                       and confirmation_proof_url ~ '^https?://\S+$')),
  constraint press_opportunities_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create index press_opportunities_activation_idx on public.press_opportunities (activation_id);
create trigger a_set_created_by before insert on public.press_opportunities
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.press_opportunities
  for each row execute function public.set_updated_at();

create or replace function public.press_opportunities_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select t.organization_id, t.project_id, t.activation_id
      into new.organization_id, new.project_id, new.activation_id
      from public.activation_targets t
      join public.marketing_activations a on a.id = t.activation_id
     where t.id = new.target_id and a.kind = 'press';
    if new.activation_id is null then raise exception 'target_not_found'; end if;
    if new.origin_message_id is not null and not exists (
      select 1 from public.activation_messages m
       where m.id = new.origin_message_id and m.target_id = new.target_id) then
      raise exception 'message_not_in_target' using errcode = '23514';
    end if;
    new.confirmed_at := case when new.confirmed_by_name is not null then now() end;
    perform public.log_activation_event(new.activation_id, 'opportunity.created', new.target_id,
      null, jsonb_build_object('type', new.type, 'status', new.status), null);
    return new;
  end if;
  if new.confirmed_by_name is distinct from old.confirmed_by_name
     or new.confirmation_channel is distinct from old.confirmation_channel then
    new.confirmed_at := now();
  end if;
  if new.status is distinct from old.status then
    perform public.log_activation_event(new.activation_id, 'opportunity.status', new.target_id,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status),
      new.status_note);
  end if;
  return new;
end;
$$;
revoke execute on function public.press_opportunities_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.press_opportunities
  for each row execute function public.press_opportunities_guard();

alter table public.press_opportunities enable row level security;
alter table public.press_opportunities force row level security;
revoke all on table public.press_opportunities from anon, authenticated;
grant select on public.press_opportunities to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, origin_message_id, type, format,
              subject, scheduled_at, timezone,
              location, participants, pds_person_id, constraints_note, status,
              confirmed_by_name, confirmation_channel, confirmation_proof_url, brief, status_note)
  on public.press_opportunities to authenticated;
grant update (type, format, subject, scheduled_at, timezone, location, participants,
              pds_person_id, constraints_note, status, confirmed_by_name, confirmation_channel,
              confirmation_proof_url, brief, status_note)
  on public.press_opportunities to authenticated;
create policy press_opportunities_select on public.press_opportunities
  for select to authenticated using (public.can_see_project(project_id));
create policy press_opportunities_insert on public.press_opportunities
  for insert to authenticated
  with check (exists (select 1 from public.activation_targets t
                       where t.id = target_id and public.activation_can_write(t.activation_id)));
create policy press_opportunities_update on public.press_opportunities
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- Follow-ups : a reason is required after a refusal or a decline, while an
-- opportunity is open, or once the activation is closed.
create or replace function public.activation_follow_up_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'follow_up' or new.target_id is null or new.derogation_reason is not null then
    return new;
  end if;
  if exists (select 1 from public.activation_targets t
              where t.id = new.target_id and t.outcome in ('refused', 'declined'))
     or exists (select 1 from public.press_opportunities o
                 where o.target_id = new.target_id
                   and o.status not in ('cancelled', 'no_broadcast', 'broadcast_declared'))
     or exists (select 1 from public.marketing_activations a
                 where a.id = new.activation_id and a.status = 'closed') then
    raise exception 'follow_up_blocked' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_follow_up_guard() from public, anon, authenticated;
create trigger c_follow_up before insert on public.activation_messages
  for each row execute function public.activation_follow_up_guard();
