-- PROJ-AMEL-01 (retours Projets 16, 23 et 24, docs/ARCHITECTURE.md § 4,
-- « Clôture et partage d'un call »).
--
-- « Clôturer le call »: whoever owns the call freezes its report as a
-- version (summary, decisions, actions with who and when, what is still to
-- review), written by the code; a correction is a new version, the previous
-- ones kept. The report is shared apart from the raw transcription and the
-- audio: with team members (told by a notification, they then read that
-- report only) and, by e-mail from the user's own mailbox, outside people;
-- each share keeps who, when, which scope (full report or summary) and to
-- whom.

create table public.call_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  version integer not null,
  -- {summary, decisions[], actions[], open[]}: the report as frozen.
  content jsonb not null,
  -- What was still to review at closing ({actions, proposals}).
  unreviewed jsonb not null default '{}',
  note text,
  closed_by uuid references public.people (id),
  closed_at timestamptz not null default now(),
  constraint call_closures_version_key unique (call_id, version),
  constraint call_closures_id_org_key unique (id, organization_id),
  constraint call_closures_version_check check (version >= 1),
  constraint call_closures_content_check
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  constraint call_closures_note_check check (note is null or char_length(note) <= 1000),
  constraint call_closures_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade
);
create index call_closures_call_idx on public.call_closures (call_id, version desc);

create table public.call_report_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  closure_id uuid not null,
  -- full = the whole report; summary = the summary and the decisions.
  scope text not null,
  -- [{name, email, person_id, contact_id}]: who it went to.
  recipients jsonb not null,
  -- The members among them: told, and allowed to read that report.
  recipient_person_ids uuid[] not null default '{}',
  shared_by uuid references public.people (id),
  shared_at timestamptz not null default now(),
  constraint call_report_shares_scope_check check (scope in ('full', 'summary')),
  constraint call_report_shares_recipients_check
    check (jsonb_typeof(recipients) = 'array' and jsonb_array_length(recipients) between 1 and 50),
  constraint call_report_shares_closure_same_org foreign key (closure_id, organization_id)
    references public.call_closures (id, organization_id) on delete cascade,
  constraint call_report_shares_call_same_org foreign key (call_id, organization_id)
    references public.calls (id, organization_id) on delete cascade
);
create index call_report_shares_call_idx on public.call_report_shares (call_id, shared_at desc);
create index call_report_shares_people_idx on public.call_report_shares using gin (recipient_person_ids);

-- A closure and its shares belong to the same call.
create or replace function public.call_report_shares_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.call_closures
                  where id = new.closure_id and call_id = new.call_id) then
    raise exception 'closure_not_of_call' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger a_check before insert on public.call_report_shares
  for each row execute function public.call_report_shares_check();

-- Who closed or shared: the session's person, never sent by the browser.
create or replace function public.call_report_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'call_closures' then
    new.closed_by := public.auth_person_id();
  else
    new.shared_by := public.auth_person_id();
  end if;
  return new;
end;
$$;
create trigger a_set_author before insert on public.call_closures
  for each row execute function public.call_report_author();
create trigger a_set_author before insert on public.call_report_shares
  for each row execute function public.call_report_author();

-- Who reads a shared report without seeing the call (security definer:
-- the two policies read each other's table otherwise).
create or replace function public.call_report_shared_with_me(p_closure_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.call_report_shares s
                  where s.closure_id = p_closure_id
                    and public.auth_person_id() = any (s.recipient_person_ids));
$$;
revoke execute on function public.call_report_shared_with_me(uuid) from public, anon;
grant execute on function public.call_report_shared_with_me(uuid) to authenticated;

alter table public.call_closures enable row level security;
alter table public.call_closures force row level security;
revoke all on table public.call_closures from anon, authenticated;
grant select on public.call_closures to authenticated;
grant insert (organization_id, call_id, version, content, unreviewed, note)
  on public.call_closures to authenticated;
create policy call_closures_select on public.call_closures
  for select to authenticated
  using (public.can_see_call(call_id) or public.call_report_shared_with_me(id));
-- Closed (and corrected) by whoever owns the call, never rewritten.
create policy call_closures_insert on public.call_closures
  for insert to authenticated
  with check (public.is_call_owner(call_id) and public.is_active_member(organization_id));

alter table public.call_report_shares enable row level security;
alter table public.call_report_shares force row level security;
revoke all on table public.call_report_shares from anon, authenticated;
grant select on public.call_report_shares to authenticated;
grant insert (organization_id, call_id, closure_id, scope, recipients, recipient_person_ids)
  on public.call_report_shares to authenticated;
create policy call_report_shares_select on public.call_report_shares
  for select to authenticated
  using (public.can_see_call(call_id) or public.auth_person_id() = any (recipient_person_ids));
create policy call_report_shares_insert on public.call_report_shares
  for insert to authenticated
  with check (public.is_call_owner(call_id) and public.is_active_member(organization_id));

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
  'master_mastering_delivery_received', 'legal_form_received', 'call_report_shared'))
  not valid;

-- Each member a report is shared with is told, once per share.
create or replace function public.call_report_shares_notify()
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
    perform public.notify(new.organization_id, v_person, 'call_report_shared',
                          v_project, new.call_id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.call_report_shares_notify() from public, anon, authenticated;
create trigger z_notify after insert on public.call_report_shares
  for each row execute function public.call_report_shares_notify();
