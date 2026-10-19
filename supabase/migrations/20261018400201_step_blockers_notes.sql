-- Blockers and noted information of any step of a project's journey
-- (docs/projet-complet/commons.md § 2.1 h and § 2.3, sub-lot C6; proto
-- `docs/protos/marketing.html` blockerForm, liftModal, decisionForm,
-- decisionsView).
--
-- « Signaler un blocage » : what blocks, who unblocks (a member, a contact of
-- the Réseau or only a name), the next action; lifted later with a written
-- explanation, never deleted.
-- « Noter une information » : what was said, its source, its status
-- (information, to confirm, waiting for a decision, decided); it may
-- contradict another one: the two stay, the owner chooses the one that is
-- authoritative, the other is discarded (kept, replaced). A note never moves
-- a step forward.
--
-- Who writes (decided 18/10/2026, docs/ARCHITECTURE.md § 8 ter) : the proto
-- opens both gestures to every member of the project's team
-- (`isMember(me())`), so anyone of PDS who sees the launched project
-- (`can_see_project`) reports a blocker or notes an information; lifting is
-- for the person who unblocks or the project's owner; deciding a note
-- (confirm, decide, discard, authoritative) is for the owner only
-- (`can("project")` in the proto). Every write goes through these
-- functions; the tables are read-only to members.
--
-- Activations keep their own `activation_blockers` (category, severity,
-- impact, resolution date, its journal and status): they are read alongside
-- these by the code (`lib/step-tools/queries.ts`), never copied.
--
-- Project deletion: both tables cascade with their project (the rest of
-- `delete_project_row` « cascades »), a contact's deletion keeps the name.

-- 1. Blockers -------------------------------------------------------------------------------

create table public.step_blockers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The module and its step (`JourneyStep.key`), and the object inside the
  -- module when the step has several (a deliverable, an activation).
  module text not null,
  step_key text not null,
  subject_id uuid,
  description text not null,
  unblocker_person_id uuid references public.people (id),
  unblocker_contact_id uuid,
  -- The name shown, kept when the contact is deleted (« garder le nom »).
  unblocker_name text not null,
  next_action text not null,
  reported_by uuid not null references public.people (id),
  reported_at timestamptz not null default now(),
  lifted_by uuid references public.people (id),
  lifted_at timestamptz,
  lift_note text,
  constraint step_blockers_module_check check (module in (
    'framing', 'strategy', 'design', 'production', 'activations', 'review', 'master', 'legal',
    'distribution')),
  constraint step_blockers_step_check check (step_key ~ '^[a-z0-9][a-z0-9_:-]{0,79}$'),
  constraint step_blockers_description_check
    check (btrim(description) <> '' and char_length(description) <= 1000),
  constraint step_blockers_unblocker_check
    check (btrim(unblocker_name) <> '' and char_length(unblocker_name) <= 200
           and not (unblocker_person_id is not null and unblocker_contact_id is not null)),
  constraint step_blockers_next_check
    check (btrim(next_action) <> '' and char_length(next_action) <= 500),
  constraint step_blockers_lift_check check (
    (lifted_at is null) = (lifted_by is null)
    and (lifted_at is null) = (lift_note is null)
    and (lift_note is null or (btrim(lift_note) <> '' and char_length(lift_note) <= 1000))),
  constraint step_blockers_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint step_blockers_contact_same_org foreign key (unblocker_contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete set null (unblocker_contact_id)
);
create index step_blockers_project_idx on public.step_blockers (project_id, module, step_key)
  where lifted_at is null;
create index step_blockers_unblocker_idx on public.step_blockers (unblocker_person_id)
  where lifted_at is null;

-- 2. Noted information ------------------------------------------------------------------------

create table public.step_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  module text not null,
  step_key text not null,
  subject_id uuid,
  body text not null,
  source text not null,
  status text not null,
  -- The note it contradicts and the group of notes that contradict each
  -- other (the first one's id): open while none of them is authoritative.
  contradicts_id uuid references public.step_notes (id) on delete set null,
  contradiction_group uuid,
  authoritative boolean not null default false,
  noted_by uuid not null references public.people (id),
  noted_at timestamptz not null default now(),
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  discarded_by uuid references public.people (id),
  discarded_at timestamptz,
  -- The note that was chosen instead (« remplacée »).
  replaced_by_id uuid references public.step_notes (id) on delete set null,
  constraint step_notes_module_check check (module in (
    'framing', 'strategy', 'design', 'production', 'activations', 'review', 'master', 'legal',
    'distribution')),
  constraint step_notes_step_check check (step_key ~ '^[a-z0-9][a-z0-9_:-]{0,79}$'),
  constraint step_notes_body_check check (btrim(body) <> '' and char_length(body) <= 1000),
  constraint step_notes_source_check
    check (source in ('call', 'whatsapp', 'email', 'meeting', 'other')),
  constraint step_notes_status_check
    check (status in ('information', 'to_confirm', 'pending_decision', 'decided')),
  constraint step_notes_decided_check check (
    (decided_at is null) = (decided_by is null)
    and (decided_at is null or status = 'decided')),
  constraint step_notes_discarded_check check ((discarded_at is null) = (discarded_by is null)),
  constraint step_notes_authoritative_check
    check (not authoritative or (status = 'decided' and discarded_at is null)),
  constraint step_notes_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index step_notes_project_idx on public.step_notes (project_id, module, step_key);
create index step_notes_group_idx on public.step_notes (contradiction_group)
  where contradiction_group is not null;

-- 3. Reading: whoever sees the project ---------------------------------------------------------

alter table public.step_blockers enable row level security;
alter table public.step_blockers force row level security;
revoke all on table public.step_blockers from anon, authenticated;
grant select on public.step_blockers to authenticated;
create policy step_blockers_select on public.step_blockers
  for select to authenticated using (public.can_see_project(project_id));

alter table public.step_notes enable row level security;
alter table public.step_notes force row level security;
revoke all on table public.step_notes from anon, authenticated;
grant select on public.step_notes to authenticated;
create policy step_notes_select on public.step_notes
  for select to authenticated using (public.can_see_project(project_id));

-- 4. Writing: functions only ------------------------------------------------------------------

-- A member of PDS who sees the launched project (the team of the proto).
create or replace function public.step_tools_can_write(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project(p_project_id) and public.is_project_launched(p_project_id);
$$;
revoke execute on function public.step_tools_can_write(uuid) from public, anon;
grant execute on function public.step_tools_can_write(uuid) to authenticated;

create or replace function public.report_step_blocker(
  p_project_id uuid, p_module text, p_step_key text, p_subject_id uuid, p_description text,
  p_unblocker_person_id uuid, p_unblocker_contact_id uuid, p_unblocker_name text,
  p_next_action text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_name text := nullif(btrim(coalesce(p_unblocker_name, '')), '');
  v_id uuid;
begin
  if not public.step_tools_can_write(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  if nullif(btrim(coalesce(p_description, '')), '') is null
     or nullif(btrim(coalesce(p_next_action, '')), '') is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_unblocker_person_id is not null then
    if not public.production_person_is_member(p_unblocker_person_id, v_org) then
      raise exception 'unblocker_not_member' using errcode = 'P0001';
    end if;
    select btrim(concat_ws(' ', first_name, last_name)) into v_name
      from public.people where id = p_unblocker_person_id;
  elsif p_unblocker_contact_id is not null then
    select name into v_name from public.network_contacts
     where id = p_unblocker_contact_id and organization_id = v_org;
    if v_name is null then
      raise exception 'unblocker_unknown' using errcode = 'P0001';
    end if;
  end if;
  if v_name is null then
    raise exception 'unblocker_required' using errcode = 'P0001';
  end if;
  insert into public.step_blockers (organization_id, project_id, module, step_key, subject_id,
                                    description, unblocker_person_id, unblocker_contact_id,
                                    unblocker_name, next_action, reported_by)
  values (v_org, p_project_id, p_module, p_step_key, p_subject_id, btrim(p_description),
          p_unblocker_person_id, p_unblocker_contact_id, v_name, btrim(p_next_action),
          public.auth_person_id())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.report_step_blocker(uuid, text, text, uuid, text, uuid, uuid, text, text)
  from public, anon;
grant execute on function public.report_step_blocker(uuid, text, text, uuid, text, uuid, uuid, text, text)
  to authenticated;

-- The person who unblocks, or the project's owner, with what solved it.
create or replace function public.lift_step_blocker(p_blocker_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.step_blockers%rowtype;
begin
  select * into b from public.step_blockers where id = p_blocker_id for update;
  if not found or not public.can_see_project(b.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (public.is_project_owner(b.project_id)
          or (b.unblocker_person_id is not null
              and b.unblocker_person_id = public.auth_person_id())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if b.lifted_at is not null then
    raise exception 'blocker_lifted' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'lift_note_required' using errcode = 'P0001';
  end if;
  update public.step_blockers
     set lifted_at = now(), lifted_by = public.auth_person_id(), lift_note = btrim(p_note)
   where id = b.id;
end;
$$;
revoke execute on function public.lift_step_blocker(uuid, text) from public, anon;
grant execute on function public.lift_step_blocker(uuid, text) to authenticated;

create or replace function public.note_step_information(
  p_project_id uuid, p_module text, p_step_key text, p_subject_id uuid, p_body text,
  p_source text, p_status text, p_contradicts_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_group uuid;
  v_id uuid;
  o public.step_notes%rowtype;
begin
  if not public.step_tools_can_write(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  if nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_contradicts_id is not null then
    select * into o from public.step_notes where id = p_contradicts_id for update;
    if not found or o.project_id <> p_project_id or o.discarded_at is not null then
      raise exception 'note_unknown' using errcode = 'P0001';
    end if;
    v_group := coalesce(o.contradiction_group, o.id);
    -- A new contradiction reopens the group: nothing is authoritative yet.
    update public.step_notes set contradiction_group = v_group, authoritative = false
     where id = o.id or contradiction_group = v_group;
  end if;
  insert into public.step_notes (organization_id, project_id, module, step_key, subject_id, body,
                                 source, status, contradicts_id, contradiction_group, noted_by,
                                 decided_by, decided_at)
  values (v_org, p_project_id, p_module, p_step_key, p_subject_id, btrim(p_body), p_source,
          p_status, p_contradicts_id, v_group, public.auth_person_id(),
          case when p_status = 'decided' then public.auth_person_id() end,
          case when p_status = 'decided' then now() end)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.note_step_information(uuid, text, text, uuid, text, text, text, uuid)
  from public, anon;
grant execute on function public.note_step_information(uuid, text, text, uuid, text, text, text, uuid)
  to authenticated;

-- The owner's decision on a note: `decide` (confirmed or decided),
-- `discard`, or `authoritative` (in a contradiction: this one is decided
-- and the others of its group are discarded, replaced by it).
create or replace function public.decide_step_note(p_note_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.step_notes%rowtype;
  v_me uuid := public.auth_person_id();
begin
  select * into n from public.step_notes where id = p_note_id for update;
  if not found or not public.is_project_owner(n.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if n.discarded_at is not null then
    raise exception 'note_discarded' using errcode = 'P0001';
  end if;
  if p_decision = 'decide' then
    if n.status not in ('to_confirm', 'pending_decision') then
      raise exception 'note_not_open' using errcode = 'P0001';
    end if;
    update public.step_notes set status = 'decided', decided_by = v_me, decided_at = now()
     where id = n.id;
  elsif p_decision = 'discard' then
    update public.step_notes set discarded_by = v_me, discarded_at = now(), authoritative = false
     where id = n.id;
  elsif p_decision = 'authoritative' then
    if n.contradiction_group is null then
      raise exception 'note_not_contradicted' using errcode = 'P0001';
    end if;
    update public.step_notes
       set status = 'decided', authoritative = true,
           decided_by = coalesce(decided_by, v_me), decided_at = coalesce(decided_at, now())
     where id = n.id;
    update public.step_notes
       set discarded_by = v_me, discarded_at = now(), replaced_by_id = n.id, authoritative = false
     where contradiction_group = n.contradiction_group and id <> n.id and discarded_at is null;
  else
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.decide_step_note(uuid, text) from public, anon;
grant execute on function public.decide_step_note(uuid, text) to authenticated;

-- 5. Notifications ------------------------------------------------------------------------------

-- The kinds are added to the constraint as it is now (other migrations of
-- the same days add theirs): read, extended, put back.
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'notifications_kind_check' and conrelid = 'public.notifications'::regclass;
  select array_agg(m[1]) into v_kinds
    from regexp_matches(v_def, '''([a-z_]+)''', 'g') as m;
  v_kinds := v_kinds || array(select k from unnest(array['step_blocker_reported',
               'step_blocker_lifted', 'step_note_to_decide']) k where k <> all (v_kinds));
  alter table public.notifications drop constraint notifications_kind_check;
  execute format('alter table public.notifications add constraint notifications_kind_check '
                 'check (kind = any (%L::text[])) not valid', v_kinds);
end $$;

create or replace function public.step_blockers_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_person_id into v_owner from public.projects where id = new.project_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.organization_id, new.unblocker_person_id, 'step_blocker_reported',
                          new.project_id, new.id);
    if v_owner is distinct from new.unblocker_person_id then
      perform public.notify(new.organization_id, v_owner, 'step_blocker_reported',
                            new.project_id, new.id);
    end if;
  elsif new.lifted_at is not null and old.lifted_at is null then
    perform public.notify(new.organization_id, new.reported_by, 'step_blocker_lifted',
                          new.project_id, new.id);
    if v_owner is distinct from new.reported_by then
      perform public.notify(new.organization_id, v_owner, 'step_blocker_lifted',
                            new.project_id, new.id);
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function public.step_blockers_notify() from public, anon, authenticated;
create trigger step_blockers_notify after insert or update on public.step_blockers
  for each row execute function public.step_blockers_notify();

-- An information to confirm, waiting for a decision or contradicting
-- another: the owner decides.
create or replace function public.step_notes_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('to_confirm', 'pending_decision') or new.contradicts_id is not null then
    perform public.notify(new.organization_id,
                          (select owner_person_id from public.projects where id = new.project_id),
                          'step_note_to_decide', new.project_id, new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.step_notes_notify() from public, anon, authenticated;
create trigger step_notes_notify after insert on public.step_notes
  for each row execute function public.step_notes_notify();

-- 6. Live pages (ProjectLive) ------------------------------------------------------------------

create trigger zz_project_live after insert or update or delete on public.step_blockers
  for each row execute function public.project_live_tick('project');
create trigger zz_project_live after insert or update or delete on public.step_notes
  for each row execute function public.project_live_tick('project');
