-- Calls (MVP "Calls : créer / rejoindre…"):
--
-- 1. A video link (`meeting_url`, https only) on every call: "Rejoindre"
--    opens it; the recording stays in the app.
-- 2. Internal meetings: a call without a project. Nothing of a project
--    applies to it (no Brief to fill, no project team): it is seen by its
--    creator and the members invited to it (`call_attendees`), and only its
--    creator records it and runs its processing — as the project's owner
--    does for a project call. Its transcript and report follow the call.
--
-- Every policy that followed `can_see_project(c.project_id)` for a call now
-- follows `can_see_call`, which is unchanged for project calls.

alter table public.calls alter column project_id drop not null;

alter table public.calls
  add column meeting_url text,
  add constraint calls_meeting_url_check
    check (meeting_url is null or (char_length(meeting_url) <= 500
                                   and meeting_url ~ '^https://[^\s]+$'));

create index calls_org_meetings_idx on public.calls (organization_id, occurred_at desc)
  where project_id is null;

grant insert (meeting_url) on public.calls to authenticated;
grant update (meeting_url) on public.calls to authenticated;

-- Members invited to an internal meeting.
create table public.call_attendees (
  call_id uuid not null,
  organization_id uuid not null,
  person_id uuid not null references public.people (id),
  created_at timestamptz not null default now(),
  primary key (call_id, person_id),
  constraint call_attendees_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
    on delete cascade
);

create index call_attendees_person_idx on public.call_attendees (person_id);

create or replace function public.can_see_call(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.calls c
     where c.id = p_call_id
       and case
             when c.project_id is not null then public.can_see_project(c.project_id)
             else public.is_active_member(c.organization_id)
                  and (c.created_by = public.auth_person_id()
                       or exists (select 1 from public.call_attendees ca
                                   where ca.call_id = c.id
                                     and ca.person_id = public.auth_person_id()))
           end
  );
$$;

revoke execute on function public.can_see_call(uuid) from public, anon;
grant execute on function public.can_see_call(uuid) to authenticated;

-- Who works on a call: the project's owner, or the meeting's creator.
create or replace function public.is_call_owner(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.calls c
     where c.id = p_call_id
       and case
             when c.project_id is not null then public.is_project_owner(c.project_id)
             else c.created_by = public.auth_person_id()
                  and public.is_active_member(c.organization_id)
           end
  );
$$;

-- Written on the row's own columns, not through can_see_call(id): a row
-- being inserted is not visible yet to a function reading the table, and
-- `insert … returning` checks this policy on it.
drop policy calls_select_visible on public.calls;
create policy calls_select_visible on public.calls
  for select to authenticated
  using (case
           when project_id is not null then public.can_see_project(project_id)
           else public.is_active_member(organization_id)
                and (created_by = public.auth_person_id()
                     or exists (select 1 from public.call_attendees ca
                                 where ca.call_id = calls.id
                                   and ca.person_id = public.auth_person_id()))
         end);

-- created_by is set by a trigger (set_created_by) before the check runs.
drop policy calls_insert_owner on public.calls;
create policy calls_insert_owner on public.calls
  for insert to authenticated
  with check (case
                when project_id is not null then public.is_project_owner(project_id)
                else public.is_active_member(organization_id)
                     and created_by = public.auth_person_id()
              end);

-- A call never moves between a project and "no project".
drop policy calls_update_owner on public.calls;
create policy calls_update_owner on public.calls
  for update to authenticated
  using (public.is_call_owner(id))
  with check (public.is_call_owner(id));

drop policy transcripts_select_visible on public.transcripts;
create policy transcripts_select_visible on public.transcripts
  for select to authenticated
  using (public.can_see_call(call_id));

drop policy call_reports_select_visible on public.call_reports;
create policy call_reports_select_visible on public.call_reports
  for select to authenticated
  using (public.can_see_call(call_id));

drop policy report_items_select_visible on public.report_items;
create policy report_items_select_visible on public.report_items
  for select to authenticated
  using (exists (select 1 from public.call_reports r
                  where r.id = report_items.report_id
                    and public.can_see_call(r.call_id)));

drop policy call_audio_select_visible on storage.objects;
create policy call_audio_select_visible on storage.objects
  for select to authenticated
  using (bucket_id = 'call-audio'
         and public.can_see_call(public.try_uuid((storage.foldername(objects.name))[2])));

-- Attendees: read by whoever sees the meeting, chosen by its creator among
-- the active members, only on a meeting without a project.
create or replace function public.call_attendees_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.calls c
                  where c.id = new.call_id and c.project_id is null) then
    raise exception 'attendees_only_on_meetings' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = new.organization_id and m.person_id = new.person_id
       and m.status = 'approved' and a.disabled_at is null
  ) then
    raise exception 'attendee_not_member' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger a_check before insert on public.call_attendees
  for each row execute function public.call_attendees_check();

create or replace function public.call_attendees_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.organization_id, new.person_id, 'meeting_invited', null,
                        new.call_id);
  return new;
end;
$$;

create trigger z_notify after insert on public.call_attendees
  for each row execute function public.call_attendees_notify();

alter table public.call_attendees enable row level security;
alter table public.call_attendees force row level security;
revoke all on public.call_attendees from anon, authenticated;

create policy call_attendees_select_visible on public.call_attendees
  for select to authenticated
  using (public.can_see_call(call_id));
create policy call_attendees_insert_owner on public.call_attendees
  for insert to authenticated
  with check (public.is_call_owner(call_id));
create policy call_attendees_delete_owner on public.call_attendees
  for delete to authenticated
  using (public.is_call_owner(call_id));

grant select, delete on public.call_attendees to authenticated;
grant insert (call_id, organization_id, person_id) on public.call_attendees to authenticated;
