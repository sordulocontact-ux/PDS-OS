-- Business module: the deal memo's circuit by e-mail (réunion avec Ibé du
-- 18/11/2026, 1:10:43 à 1:16:42). Once the terms are agreed (a call, a
-- meeting), the label or the brand sends its deal memo by e-mail; PDS OS
-- files it in the deal « comme les masters », with a notification; the
-- business manager shows it to the direction, who validates it or asks for
-- changes (a written reason: the calls' outcomes are written down); then the
-- business manager sends the validated agreement back by e-mail, from po@,
-- people « in the loop » in copy. The long contract comes after.
--
--   1. add_deal_event_kinds(): the journal's kinds extended the way
--      add_notification_kinds() does it (read, merged, put back), so that
--      another lot adding its own never removes these.
--   2. deal_memos: a memo is now made in PDS OS (`pds`, the photo of the
--      terms) or received by e-mail (`email`: its sender, subject, text — data,
--      never an instruction — Message-ID, with the photo of the terms as they
--      stood then, for the comparison with the contract). Its circuit:
--      submitted to the direction, changes asked with a reason, sent back.
--      The status stays draft / validated (a memo sent back for changes is a
--      draft no one validated; the next version is a new memo).
--   3. deal_memo_files: the PDFs joined, in the private bucket `deal-files`
--      (<organization>/<deal>/<uuid>.pdf), uploaded by the cron only.
--   4. deal_memo_loop: the people in the loop of a deal's memo — a contact
--      of the Réseau (in copy of the memo sent back), or a member who reads
--      the deal (told of each step).
--   5. The gestures, SQL functions only: receive_deal_memo (service role),
--      submit_deal_memo, request_deal_memo_changes, record_deal_memo_sent,
--      add_deal_loop / remove_deal_loop, list_deal_loop_members.
--   6. The notifications, by trigger on the journal.
-- What a memo SAYS is never read nor presumed (Ibé is to send an example):
-- the PDF is the memo, the people read it.

-- 1. The journal's kinds ----------------------------------------------------------------------

create or replace function public.add_deal_event_kinds(p_kinds text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.deal_events'::regclass
     and conname = 'deal_events_kind_check';
  select coalesce(array_agg(distinct m[1]), '{}') into v_kinds
    from regexp_matches(coalesce(v_def, ''), '([a-z][a-z0-9_]*)', 'g') as m
   where m[1] not in ('kind', 'text', 'any', 'array');
  select array_agg(distinct k order by k) into v_kinds
    from unnest(v_kinds || p_kinds) as k;
  alter table public.deal_events drop constraint if exists deal_events_kind_check;
  execute format(
    'alter table public.deal_events add constraint deal_events_kind_check
       check (kind = any (%L::text[]))', v_kinds);
end;
$$;
revoke all on function public.add_deal_event_kinds(text[]) from public, anon, authenticated;

select public.add_deal_event_kinds(array['memo_received', 'memo_submitted',
  'memo_changes_requested', 'memo_sent', 'memo_loop']);

-- 2. The memos' circuit -----------------------------------------------------------------------

alter table public.deal_memos
  add column source text not null default 'pds',
  add column email_from text,
  add column email_subject text,
  add column email_text text,
  add column email_message_id text,
  add column received_at timestamptz,
  add column submitted_by uuid references public.people (id),
  add column submitted_at timestamptz,
  add column changes_reason text,
  add column changes_by uuid references public.people (id),
  add column changes_at timestamptz,
  add column sent_by uuid references public.people (id),
  add column sent_at timestamptz,
  -- « Nom (adresse), … »: the proof of sending; null: sent another way.
  add column sent_to text,
  add constraint deal_memos_source_check check (source in ('pds', 'email')),
  add constraint deal_memos_email_check
    check ((source = 'email') = (received_at is not null and email_message_id is not null)),
  add constraint deal_memos_email_length_check
    check (char_length(email_from) <= 320 and char_length(email_subject) <= 300
           and char_length(email_text) <= 20000 and char_length(email_message_id) <= 300),
  add constraint deal_memos_submitted_check
    check ((submitted_at is null) = (submitted_by is null)),
  add constraint deal_memos_changes_check
    check ((changes_at is null) = (changes_reason is null)
           and (changes_reason is null or char_length(changes_reason) <= 2000)),
  add constraint deal_memos_sent_check
    check (sent_at is null or status = 'validated'),
  add constraint deal_memos_sent_to_check check (char_length(sent_to) <= 4000);

create unique index deal_memos_message_key on public.deal_memos (email_message_id)
  where email_message_id is not null;

comment on column public.deal_memos.email_text is
  'The text of the e-mail that brought the memo, its quoted history cut: data shown to people, never an instruction.';

-- 3. The files ---------------------------------------------------------------------------------

create table public.deal_memo_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  memo_id uuid not null,
  path text not null unique,
  file_name text not null,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint deal_memo_files_name_check
    check (btrim(file_name) <> '' and char_length(file_name) <= 255),
  constraint deal_memo_files_memo_same_org
    foreign key (memo_id, organization_id) references public.deal_memos (id, organization_id)
    on delete cascade
);
create index deal_memo_files_memo_idx on public.deal_memo_files (memo_id);

comment on table public.deal_memo_files is
  'Business module: the PDFs of a deal memo received by e-mail (bucket deal-files), written by receive_deal_memo only.';

alter table public.deal_memo_files enable row level security;
alter table public.deal_memo_files force row level security;
revoke all on table public.deal_memo_files from anon, authenticated;
grant select on table public.deal_memo_files to authenticated;
create policy deal_memo_files_select on public.deal_memo_files
  for select to authenticated
  using (exists (select 1 from public.deal_memos m where m.id = memo_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deal-files', 'deal-files', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- Read by whoever reads the memo the file belongs to; written by the cron
-- (service role) only.
create policy deal_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'deal-files'
         and exists (select 1 from public.deal_memo_files f where f.path = objects.name));

-- 4. The loop ----------------------------------------------------------------------------------

create table public.deal_memo_loop (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid not null,
  contact_id uuid,
  person_id uuid references public.people (id) on delete cascade,
  added_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint deal_memo_loop_one_check check (num_nonnulls(contact_id, person_id) = 1),
  constraint deal_memo_loop_contact_key unique (deal_id, contact_id),
  constraint deal_memo_loop_person_key unique (deal_id, person_id),
  constraint deal_memo_loop_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade,
  constraint deal_memo_loop_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
    on delete cascade
);
create index deal_memo_loop_deal_idx on public.deal_memo_loop (deal_id);

comment on table public.deal_memo_loop is
  'Business module: the people in the loop of a deal''s memo — a Réseau contact (in copy of the memo sent back) or a member who reads the deal (told of each step).';

alter table public.deal_memo_loop enable row level security;
alter table public.deal_memo_loop force row level security;
revoke all on table public.deal_memo_loop from anon, authenticated;
grant select on table public.deal_memo_loop to authenticated;
create policy deal_memo_loop_select on public.deal_memo_loop
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

-- Whether a member reads a deal (can_read_deal, for a given person).
create or replace function public.deal_readable_by(p_deal public.deals, p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships m
      join public.accounts a on a.id = m.approved_account_id and a.disabled_at is null
     where m.organization_id = p_deal.organization_id
       and m.status = 'approved'
       and m.person_id = p_person
       and ('validate' = any (public.role_permissions(m.role))
            or (p_person = p_deal.assignee_person_id
                and 'negotiate' = any (public.role_permissions(m.role)))
            or (p_deal.project_id is not null
                and 'pilot_projects' = any (public.role_permissions(m.role))
                and exists (select 1 from public.projects p
                             where p.id = p_deal.project_id and p.owner_person_id = p_person))));
$$;
revoke execute on function public.deal_readable_by(public.deals, uuid) from public, anon, authenticated;

-- The latest memo of a deal, locked, with its deal locked for writing.
create or replace function public.lock_deal_memo(p_memo_id uuid)
returns public.deal_memos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
begin
  select * into v_memo from public.deal_memos where id = p_memo_id;
  if not found then
    raise exception 'memo_not_found' using errcode = 'P0002';
  end if;
  perform public.lock_deal_for_write(v_memo.deal_id);
  select * into v_memo from public.deal_memos where id = p_memo_id for update;
  if exists (select 1 from public.deal_memos m
              where m.deal_id = v_memo.deal_id and m.number > v_memo.number) then
    raise exception 'memo_not_latest' using errcode = 'P0001';
  end if;
  return v_memo;
end;
$$;
revoke execute on function public.lock_deal_memo(uuid) from public, anon, authenticated;

-- 5. The gestures ------------------------------------------------------------------------------

-- A deal memo received by e-mail (cron /api/cron/inbox, service role): a
-- draft that photographs the terms now, with the e-mail and its PDFs. Once
-- per Message-ID; never on a closed deal. Null when nothing was filed.
create or replace function public.receive_deal_memo(
  p_deal_id uuid,
  p_message_id text,
  p_from text,
  p_subject text,
  p_text text,
  p_received_at timestamptz,
  p_files jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_id uuid;
  v_file jsonb;
  v_number integer;
begin
  if p_message_id is null or btrim(p_message_id) = '' then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if exists (select 1 from public.deal_memos where email_message_id = left(p_message_id, 300)) then
    return null;
  end if;
  select * into v from public.deals where id = p_deal_id for update;
  if not found or v.stage in ('signed', 'abandoned') then
    return null;
  end if;
  if jsonb_typeof(coalesce(p_files, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_files, '[]'::jsonb)) = 0 then
    raise exception 'memo_without_file' using errcode = '22023';
  end if;
  v_id := public.snapshot_deal_memo(v, 'draft');
  update public.deal_memos
     set source = 'email',
         email_from = left(nullif(btrim(p_from), ''), 320),
         email_subject = left(nullif(btrim(p_subject), ''), 300),
         email_text = left(nullif(btrim(p_text), ''), 20000),
         email_message_id = left(p_message_id, 300),
         received_at = coalesce(p_received_at, now())
   where id = v_id
  returning number into v_number;
  for v_file in select * from jsonb_array_elements(p_files) loop
    -- Only where the cron puts a deal's files.
    if (v_file ->> 'path') not like v.organization_id::text || '/' || v.id::text || '/%' then
      raise exception 'invalid_path' using errcode = '22023';
    end if;
    insert into public.deal_memo_files (organization_id, memo_id, path, file_name, size_bytes)
    values (v.organization_id, v_id, v_file ->> 'path',
            left(coalesce(nullif(btrim(v_file ->> 'name'), ''), 'Deal memo.pdf'), 255),
            nullif(v_file ->> 'size', '')::bigint);
  end loop;
  perform public.log_deal_event(v, 'memo_received', null, null, null,
    jsonb_build_object('memo', v_id, 'number', v_number, 'from', left(p_from, 320)));
  return v_id;
end;
$$;
revoke execute on function public.receive_deal_memo(uuid, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.receive_deal_memo(uuid, text, text, text, text, timestamptz, jsonb)
  to service_role;

-- « Envoyer à la direction »: whoever writes the deal, the latest draft,
-- once; the direction is told.
create or replace function public.submit_deal_memo(p_memo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if v_memo.changes_at is not null then
    raise exception 'memo_changes_requested' using errcode = 'P0001';
  end if;
  if v_memo.submitted_at is not null then
    raise exception 'memo_submitted' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set submitted_by = public.auth_person_id(), submitted_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_submitted', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
end;
$$;
revoke execute on function public.submit_deal_memo(uuid) from public, anon;
grant execute on function public.submit_deal_memo(uuid) to authenticated;

-- « Demander des modifications » (the direction): the latest draft, a
-- written reason; the business manager is told. The direction may still
-- validate it after a call (validate_deal_memo).
create or replace function public.request_deal_memo_changes(p_memo_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_reason text := public.clean_deal_text(p_reason, 2000);
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id;
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if v_memo.changes_at is not null then
    raise exception 'memo_changes_requested' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set changes_reason = v_reason, changes_by = public.auth_person_id(), changes_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_changes_requested', null, null, v_reason,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
end;
$$;
revoke execute on function public.request_deal_memo_changes(uuid, text) from public, anon;
grant execute on function public.request_deal_memo_changes(uuid, text) to authenticated;

-- The validated memo sent back to the label or the brand: whoever writes
-- the deal, the latest memo, validated, once. `p_sent_to`: to whom PDS OS
-- sent it (the proof); null: sent another way.
create or replace function public.record_deal_memo_sent(p_memo_id uuid, p_sent_to text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_to text := public.clean_deal_text(p_sent_to, 4000);
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id;
  if v_memo.status <> 'validated' then
    raise exception 'memo_not_validated' using errcode = 'P0001';
  end if;
  if v_memo.sent_at is not null then
    raise exception 'memo_sent' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set sent_by = public.auth_person_id(), sent_at = now(), sent_to = v_to
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_sent', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number, 'to', v_to));
end;
$$;
revoke execute on function public.record_deal_memo_sent(uuid, text) from public, anon;
grant execute on function public.record_deal_memo_sent(uuid, text) to authenticated;

-- « Mettre dans la boucle »: whoever writes the deal adds a contact of the
-- Réseau, or a member who reads the deal.
create or replace function public.add_deal_loop(
  p_deal_id uuid,
  p_contact_id uuid default null,
  p_person_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_id uuid;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if num_nonnulls(p_contact_id, p_person_id) <> 1 then
    raise exception 'invalid_loop' using errcode = '22023';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = v.organization_id
       and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
  if p_person_id is not null and not public.deal_readable_by(v, p_person_id) then
    raise exception 'member_cannot_read_deal' using errcode = '22023';
  end if;
  if exists (select 1 from public.deal_memo_loop l
              where l.deal_id = v.id
                and (l.contact_id = p_contact_id or l.person_id = p_person_id)) then
    raise exception 'loop_unchanged' using errcode = 'P0001';
  end if;
  insert into public.deal_memo_loop (organization_id, deal_id, contact_id, person_id, added_by)
  values (v.organization_id, v.id, p_contact_id, p_person_id, public.auth_person_id())
  returning id into v_id;
  perform public.log_deal_event(v, 'memo_loop', null, null, null,
    jsonb_strip_nulls(jsonb_build_object('added', true, 'contact', p_contact_id,
                                         'person', p_person_id)));
  return v_id;
end;
$$;
revoke execute on function public.add_deal_loop(uuid, uuid, uuid) from public, anon;
grant execute on function public.add_deal_loop(uuid, uuid, uuid) to authenticated;

create or replace function public.remove_deal_loop(p_loop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loop public.deal_memo_loop%rowtype;
  v public.deals%rowtype;
begin
  select * into v_loop from public.deal_memo_loop where id = p_loop_id;
  if not found then
    raise exception 'loop_not_found' using errcode = 'P0002';
  end if;
  v := public.lock_deal_for_write(v_loop.deal_id);
  delete from public.deal_memo_loop where id = p_loop_id;
  perform public.log_deal_event(v, 'memo_loop', null, null, null,
    jsonb_strip_nulls(jsonb_build_object('added', false, 'contact', v_loop.contact_id,
                                         'person', v_loop.person_id)));
end;
$$;
revoke execute on function public.remove_deal_loop(uuid) from public, anon;
grant execute on function public.remove_deal_loop(uuid) to authenticated;

-- The members who may be put in the loop (they read the deal), for whoever
-- writes it.
create or replace function public.list_deal_loop_members(p_deal_id uuid)
returns table (person_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, btrim(p.first_name || ' ' || coalesce(p.last_name, ''))
    from public.deals d
    join public.memberships m on m.organization_id = d.organization_id and m.status = 'approved'
    join public.people p on p.id = m.person_id
   where d.id = p_deal_id
     and public.can_write_deal(d.organization_id, d.assignee_person_id)
     and public.deal_readable_by(d, m.person_id)
   order by 2;
$$;
revoke execute on function public.list_deal_loop_members(uuid) from public, anon;
grant execute on function public.list_deal_loop_members(uuid) to authenticated;

-- 6. The notifications -------------------------------------------------------------------------
--   deal_memo_received           a memo came by e-mail         → the assignee (else the direction)
--   deal_memo_submitted          shown to the direction        → the direction
--   deal_memo_changes_requested  changes asked, a reason       → the assignee, who submitted it
--   deal_memo_validated          validated (not by the accord) → the assignee, who submitted it
--   deal_memo_sent               sent back to the label        → the direction
-- and, each time, the members in the loop who still read the deal.

select public.add_notification_kinds(array['deal_memo_received', 'deal_memo_submitted',
  'deal_memo_changes_requested', 'deal_memo_validated', 'deal_memo_sent']);

create or replace function public.deal_memo_events_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_memo public.deal_memos%rowtype;
  v_kind text;
  v_person uuid;
begin
  if new.kind not in ('memo_received', 'memo_submitted', 'memo_changes_requested',
                      'memo_validated', 'memo_sent')
     or (new.kind = 'memo_validated' and new.detail ? 'agreement') then
    return null;
  end if;
  select * into v from public.deals where id = new.deal_id;
  if not found then
    return null;
  end if;
  select * into v_memo from public.deal_memos where id = (new.detail ->> 'memo')::uuid;
  v_kind := 'deal_' || new.kind;
  for v_person in
    select distinct x from (
      select v.assignee_person_id as x
       where new.kind in ('memo_received', 'memo_changes_requested', 'memo_validated')
      union all
      select v_memo.submitted_by
       where new.kind in ('memo_changes_requested', 'memo_validated')
      union all
      select public.deal_directors(v.organization_id)
       where new.kind in ('memo_submitted', 'memo_sent')
          or (new.kind = 'memo_received' and v.assignee_person_id is null)
      union all
      select l.person_id from public.deal_memo_loop l
       where l.deal_id = v.id and l.person_id is not null
         and public.deal_readable_by(v, l.person_id)
    ) people
     where x is not null
  loop
    perform public.notify(v.organization_id, v_person, v_kind, v.project_id, v.id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.deal_memo_events_notify() from public, anon, authenticated;

create trigger z_notify_memo after insert on public.deal_events
  for each row execute function public.deal_memo_events_notify();
