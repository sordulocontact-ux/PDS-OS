-- PROJ-AMEL-02 (docs/ARCHITECTURE.md § 8 septies, « Fil avec l'ingénieur »).
--
-- The engineer's page (/m/…, no account) gets a thread with the team and
-- three signals: a question, a delay (with how many days), a missing file.
-- Each message is dated and tied to the sending and its stage (mix or
-- mastering); the history follows the link when the same engineer goes on
-- to the mastering. The project's owner is told once until they read it
-- (no spam), answers in the thread and handles a signal; a delay never
-- moves a date by itself: the dates it touches are proposed, a person
-- applies them.

create table public.master_engineer_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  transmission_id uuid not null references public.master_transmissions (id) on delete cascade,
  -- mix or mastering: the sending's stage when it was written.
  stage text not null,
  -- message (either side), question / delay / missing_file (the engineer's signals).
  kind text not null,
  -- engineer (by the link) or team (a member).
  author text not null,
  author_person_id uuid references public.people (id),
  body text not null,
  delay_days integer,
  -- A signal is open until the team handles it.
  status text,
  handled_by uuid references public.people (id),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint master_engineer_messages_stage_check check (stage in ('mix', 'mastering')),
  constraint master_engineer_messages_kind_check
    check (kind in ('message', 'question', 'delay', 'missing_file')),
  constraint master_engineer_messages_author_check check (
    (author = 'engineer' and author_person_id is null)
    or (author = 'team' and kind = 'message')),
  constraint master_engineer_messages_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint master_engineer_messages_delay_check
    check ((kind = 'delay') = (delay_days is not null)
           and (delay_days is null or delay_days between 1 and 90)),
  constraint master_engineer_messages_status_check check (
    (kind = 'message' and status is null)
    or (kind <> 'message' and status in ('open', 'handled'))),
  constraint master_engineer_messages_handled_check
    check ((status = 'handled') = (handled_at is not null)),
  constraint master_engineer_messages_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index master_engineer_messages_transmission_idx
  on public.master_engineer_messages (transmission_id, created_at);
create index master_engineer_messages_project_idx
  on public.master_engineer_messages (project_id, created_at desc);

alter table public.master_engineer_messages enable row level security;
alter table public.master_engineer_messages force row level security;
revoke all on table public.master_engineer_messages from anon, authenticated;
grant select on public.master_engineer_messages to authenticated;
grant insert (organization_id, project_id, transmission_id, stage, kind, author, body)
  on public.master_engineer_messages to authenticated;
grant update (status) on public.master_engineer_messages to authenticated;
-- The team reads the project's threads; the owner answers and handles.
create policy master_engineer_messages_select on public.master_engineer_messages
  for select to authenticated using (public.can_see_project(project_id));
create policy master_engineer_messages_insert on public.master_engineer_messages
  for insert to authenticated
  with check (author = 'team' and kind = 'message'
              and public.is_project_owner(project_id)
              and exists (select 1 from public.master_transmissions t
                           where t.id = transmission_id and t.project_id = master_engineer_messages.project_id));
create policy master_engineer_messages_update on public.master_engineer_messages
  for update to authenticated
  using (public.is_project_owner(project_id) and kind <> 'message')
  with check (public.is_project_owner(project_id));

-- Who wrote or handled: the session's person, never sent by the browser.
create or replace function public.master_engineer_messages_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.author = 'team' then
    new.author_person_id := public.auth_person_id();
  end if;
  if tg_op = 'UPDATE' then
    if new.status = 'handled' and old.status is distinct from 'handled' then
      new.handled_at := now();
      new.handled_by := public.auth_person_id();
    elsif new.status = 'open' then
      new.handled_at := null;
      new.handled_by := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger a_stamp before insert or update on public.master_engineer_messages
  for each row execute function public.master_engineer_messages_stamp();

-- The sendings a link reads: its own and those that continue it (the same
-- engineer at the mastering), so the history follows the link.
create or replace function public.master_link_chain(p_token text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_chain uuid[] := '{}';
begin
  select id into v_id from public.master_transmissions
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  for i in 1..4 loop
    exit when v_id is null;
    v_chain := v_chain || v_id;
    select id into v_id from public.master_transmissions
     where continues_id = v_id order by created_at desc limit 1;
  end loop;
  return v_chain;
end;
$$;
revoke execute on function public.master_link_chain(text) from public, anon, authenticated;

-- The thread as the engineer reads it, by their link.
create or replace function public.get_master_engineer_messages(p_token text)
returns table (id uuid, stage text, kind text, author text, body text, delay_days integer,
               status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.stage, m.kind, m.author, m.body, m.delay_days, m.status, m.created_at
    from public.master_engineer_messages m
   where m.transmission_id = any (public.master_link_chain(p_token))
   order by m.created_at;
$$;
revoke execute on function public.get_master_engineer_messages(text) from public;
grant execute on function public.get_master_engineer_messages(text) to anon, authenticated;

-- « Poser une question », « Signaler un retard », « Signaler un fichier
-- manquant » or a plain message, by the link. The project's owner is told,
-- unless an unread notice of this thread already waits for them.
create or replace function public.post_master_engineer_message(
  p_token text,
  p_kind text,
  p_body text,
  p_delay_days integer default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype := public.open_transmission_of(p_token);
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
$$;
revoke execute on function public.post_master_engineer_message(text, text, text, integer) from public;
grant execute on function public.post_master_engineer_message(text, text, text, integer)
  to anon, authenticated;

-- Notifications ---------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
  'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
  'master_final_approved', 'master_mastering_changes_requested',
  'clearance_terms_proposed', 'clearance_terms_validated', 'clearance_terms_rejected',
  'strategy_review_requested', 'strategy_review_approved',
  'strategy_review_changes_requested', 'strategy_review_reminder',
  'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
  'master_mastering_delivery_received', 'legal_form_received', 'call_report_shared',
  'master_engineer_signal'))
  not valid;
