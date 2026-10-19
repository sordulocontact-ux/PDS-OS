-- The meeting held, in its step (docs/projet-complet/commons.md § 5, sous-lot
-- C10; docs/ARCHITECTURE.md § 4 ter):
--
-- 1. Each line of a report is filed under the agenda point it belongs to
--    (`report_items.agenda_topic`): PO names the point's key, the code checks
--    it against the call's agenda and copies the point's words; null = said
--    outside the agenda. The report modal reads it point by point.
-- 2. « Résumé pour les participants »: a message written by the code from
--    what was confirmed in the step, read and corrected by the call's owner,
--    then sent. Each sending is a version (1, 2…), the previous ones kept;
--    « Corriger et renvoyer » sends the next. A table of its own rather than
--    a column of call_report_shares: a summary is a text sent to the call's
--    participants, not a share of the frozen report, and it exists without
--    any closure (decision written in docs/ARCHITECTURE.md § 4 ter).
--    Written by send_call_summary only; the team members among the
--    recipients are told (trigger) and may read it.

-- 1. Report lines filed by agenda point ---------------------------------------

alter table public.report_items add column agenda_topic text;
alter table public.report_items add constraint report_items_agenda_topic_check
  check (agenda_topic is null or (btrim(agenda_topic) <> '' and char_length(agenda_topic) <= 200));
grant select (agenda_topic), insert (agenda_topic) on public.report_items to authenticated;

create or replace function public.save_call_report(
  p_call_id uuid,
  p_transcript_id uuid,
  p_summary text,
  p_provider text,
  p_model text,
  p_items jsonb,
  p_processing_ms integer default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_report_id uuid;
begin
  select c.organization_id into v_org from public.calls c where c.id = p_call_id;
  if not found then
    raise exception 'call_not_found';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items';
  end if;

  insert into public.call_reports
    (organization_id, call_id, transcript_id, summary, provider, model,
     processing_ms, input_tokens, output_tokens)
  values
    (v_org, p_call_id, p_transcript_id, p_summary, p_provider, p_model,
     p_processing_ms, p_input_tokens, p_output_tokens)
  returning id into v_report_id;

  insert into public.report_items
    (organization_id, report_id, kind, position, what, who, why, need_family,
     quote, located, start_seconds, end_seconds, agenda_topic)
  select v_org, v_report_id, x.kind, x.position, x.what, x.who, x.why, x.need_family,
         x.quote, x.located, x.start_seconds, x.end_seconds, nullif(btrim(x.agenda_topic), '')
  from jsonb_to_recordset(p_items) as x(
    kind text, position integer, what text, who text, why text, need_family text,
    quote text, located text, start_seconds numeric, end_seconds numeric,
    agenda_topic text);

  return v_report_id;
end;
$$;
revoke execute on function public.save_call_report(uuid, uuid, text, text, text, jsonb, integer, integer, integer) from public, anon;
grant execute on function public.save_call_report(uuid, uuid, text, text, text, jsonb, integer, integer, integer) to authenticated;

-- 2. Summaries sent to the participants ------------------------------------

create table public.call_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  version integer not null,
  text text not null,
  -- [{name, how: app | link | email, person_id?, contact_id?, email?}]
  recipients jsonb not null,
  -- The team members among them: told, and allowed to read this summary.
  recipient_person_ids uuid[] not null default '{}',
  sent_by uuid references public.people (id),
  sent_at timestamptz not null default now(),
  constraint call_summaries_version_key unique (call_id, version),
  constraint call_summaries_version_check check (version >= 1),
  constraint call_summaries_text_check
    check (btrim(text) <> '' and char_length(text) <= 10000),
  constraint call_summaries_recipients_check
    check (jsonb_typeof(recipients) = 'array'
           and jsonb_array_length(recipients) between 1 and 50),
  -- A call deleted (delete_project_row deletes the project's calls) takes
  -- its summaries with it.
  constraint call_summaries_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade
);
create index call_summaries_call_idx on public.call_summaries (call_id, version desc);
create index call_summaries_people_idx on public.call_summaries using gin (recipient_person_ids);

alter table public.call_summaries enable row level security;
alter table public.call_summaries force row level security;
revoke all on table public.call_summaries from anon, authenticated;
grant select on public.call_summaries to authenticated;
-- Read by whoever sees the call, and by the members it was sent to.
create policy call_summaries_select on public.call_summaries
  for select to authenticated
  using (public.can_see_call(call_id) or public.auth_person_id() = any (recipient_person_ids));

-- Sends the next version of a call's summary. The owner of the call only;
-- the members among the recipients must be its participants (the creator,
-- the members invited) or its project's team, never anyone of the
-- organization; contacts and addresses are kept as written by the server.
create or replace function public.send_call_summary(
  p_call_id uuid,
  p_text text,
  p_recipients jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call record;
  v_version integer;
  v_people uuid[];
begin
  select c.id, c.organization_id, c.project_id, c.created_by into v_call
    from public.calls c where c.id = p_call_id;
  if v_call.id is null then
    raise exception 'call_not_found' using errcode = 'P0002';
  end if;
  if not public.is_call_owner(p_call_id) or not public.is_active_member(v_call.organization_id) then
    raise exception 'not_the_call_owner' using errcode = '42501';
  end if;
  if p_text is null or btrim(p_text) = '' then
    raise exception 'summary_empty' using errcode = '23514';
  end if;
  if jsonb_typeof(p_recipients) <> 'array' or jsonb_array_length(p_recipients) = 0 then
    raise exception 'summary_no_recipient' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct (r ->> 'person_id')::uuid), '{}') into v_people
    from jsonb_array_elements(p_recipients) r
   where r ? 'person_id' and r ->> 'person_id' is not null;
  if exists (
    select 1 from unnest(v_people) as p(id)
     where p.id is distinct from v_call.created_by
       and not exists (select 1 from public.call_attendees a
                        where a.call_id = p_call_id and a.person_id = p.id)
       and not exists (select 1 from public.projects pr
                        where pr.id = v_call.project_id and pr.owner_person_id = p.id)
       and not exists (select 1 from public.project_creatives pc
                        where pc.project_id = v_call.project_id and pc.person_id = p.id)
  ) then
    raise exception 'summary_recipient_not_participant' using errcode = '23514';
  end if;

  -- One sending at a time per call: the version is the next one.
  perform 1 from public.calls where id = p_call_id for update;
  select coalesce(max(version), 0) + 1 into v_version
    from public.call_summaries where call_id = p_call_id;

  insert into public.call_summaries
    (organization_id, call_id, version, text, recipients, recipient_person_ids, sent_by)
  values (v_call.organization_id, p_call_id, v_version, btrim(p_text), p_recipients,
          v_people, public.auth_person_id());
  return v_version;
end;
$$;
revoke execute on function public.send_call_summary(uuid, text, jsonb) from public, anon;
grant execute on function public.send_call_summary(uuid, text, jsonb) to authenticated;

-- Notifications ---------------------------------------------------------------

-- The kind is added to the list as it stands (other lots add theirs in
-- parallel): read, then rewritten with this kind, never a fixed list.
do $$
declare
  v_def text;
  v_list text;
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conname = 'notifications_kind_check' and conrelid = 'public.notifications'::regclass;
  if v_def is null or v_def like '%call_summary_sent%' then
    return;
  end if;
  -- Either form Postgres prints: '{a,b}'::text[] or ARRAY['a'::text, …].
  v_list := (regexp_match(v_def, '''\{([^}]*)\}''::text\[\]'))[1];
  if v_list is null then
    select string_agg(m[1], ',') into v_list
      from regexp_matches(v_def, '''([a-z_]+)''::text', 'g') as m;
  end if;
  alter table public.notifications drop constraint notifications_kind_check;
  execute format(
    'alter table public.notifications add constraint notifications_kind_check '
    'check (kind = any (%L::text[])) not valid',
    '{' || v_list || ',call_summary_sent}');
end;
$$;

-- Each team member the summary is sent to is told, once per version.
create or replace function public.call_summaries_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
  v_project uuid;
begin
  select project_id into v_project from public.calls where id = new.call_id;
  foreach v_person in array new.recipient_person_ids loop
    perform public.notify(new.organization_id, v_person, 'call_summary_sent',
                          v_project, new.call_id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.call_summaries_notify() from public, anon, authenticated;
create trigger z_notify after insert on public.call_summaries
  for each row execute function public.call_summaries_notify();
