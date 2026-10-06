-- Master workflow, lot 6: the versions of the mix and their feedback
-- (ticket "Workflow Master", § 10; docs/ARCHITECTURE.md § 8 septies).
--
-- 1. A new audio state, "mix" (Mix), between the rough mix and the master:
--    a mix V1, V2… is an audio version of the title like the others, and
--    moves the title forward the same way (y_advance_title).
-- 2. master_mix_versions: a version of the mix of a title in a project,
--    created by the database when an audio file at the "mix" state is added
--    to a title that has a Brief Mix/Master in a project ("à réception d'une
--    V1 : créer la version, rattacher le fichier, auteur, date, statut") —
--    numbered by title and project, the team notified.
-- 3. master_mix_comments: what the team says of a version (every member who
--    sees the project). The owner writes a synthesis (PO may propose it) and
--    sends it to the engineer: the package's page shows it.

-- ---------------------------------------------------------------------------
-- 1. The "mix" audio state
-- ---------------------------------------------------------------------------

create or replace function public.audio_state_rank(p_state text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_state
    when 'demo' then 1
    when 'rough_mix' then 2
    when 'mix' then 3
    when 'master' then 4
    when 'final_master' then 5
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Versions
-- ---------------------------------------------------------------------------

create table public.master_mix_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  master_id uuid not null,
  file_id uuid not null references public.master_files (id) on delete cascade,
  -- V1, V2… for this title in this project (set by the database).
  number integer not null,
  status text not null default 'received',
  feedback_summary text,
  feedback_sent_at timestamptz,
  feedback_sent_by uuid references public.people (id),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_mix_versions_status_check check (status in ('received', 'feedback_sent')),
  constraint master_mix_versions_number_check check (number >= 1),
  constraint master_mix_versions_summary_check
    check (feedback_summary is null
           or (btrim(feedback_summary) <> '' and char_length(feedback_summary) <= 4000)),
  constraint master_mix_versions_file_project_key unique (file_id, project_id),
  constraint master_mix_versions_number_key unique (project_id, master_id, number),
  constraint master_mix_versions_id_org_key unique (id, organization_id),
  constraint master_mix_versions_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_mix_versions_title_in_project
    foreign key (project_id, master_id) references public.project_masters (project_id, master_id)
    on delete cascade
);

create index master_mix_versions_project_idx
  on public.master_mix_versions (project_id, master_id, number desc);
create index master_mix_versions_file_idx on public.master_mix_versions (file_id);

alter table public.master_mix_versions enable row level security;
alter table public.master_mix_versions force row level security;
revoke all on table public.master_mix_versions from anon, authenticated;
grant select on table public.master_mix_versions to authenticated;
-- The synthesis is written by the owner; sending it goes through
-- send_mix_feedback.
grant update (feedback_summary) on public.master_mix_versions to authenticated;

create policy master_mix_versions_select_visible on public.master_mix_versions
  for select to authenticated
  using (public.can_see_project(project_id));

-- Once sent, the synthesis is what the engineer read: never rewritten.
create policy master_mix_versions_update_owner on public.master_mix_versions
  for update to authenticated
  using (public.is_project_owner(project_id) and feedback_sent_at is null)
  with check (public.is_project_owner(project_id));

-- An audio file at the "mix" state, added to a title: one version per
-- project of the title that has a Brief Mix/Master, numbered after the
-- previous ones; the creative directors and the brief's validator are
-- notified (the uploader excepted). Security definer: the uploader
-- (manage_catalog) may not be the project's owner.
create or replace function public.create_mix_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project record;
  v_version uuid;
  v_actor uuid := public.auth_person_id();
begin
  if new.category <> 'audio' or new.audio_state is distinct from 'mix' then
    return new;
  end if;
  for v_project in
    select pm.project_id, b.validator_person_id
      from public.project_masters pm
      join public.master_briefs b on b.project_id = pm.project_id
     where pm.master_id = new.master_id
  loop
    insert into public.master_mix_versions
      (organization_id, project_id, master_id, file_id, number, created_by)
    values (new.organization_id, v_project.project_id, new.master_id, new.id,
            coalesce((select max(v.number) from public.master_mix_versions v
                       where v.project_id = v_project.project_id
                         and v.master_id = new.master_id), 0) + 1,
            coalesce(v_actor, new.created_by))
    returning id into v_version;

    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select new.organization_id, r.person_id, v_actor, 'master_mix_version_received',
           v_project.project_id, v_version
      from (select c.person_id from public.project_creatives c
             where c.project_id = v_project.project_id
            union
            select v_project.validator_person_id) r
     where r.person_id is not null
       and r.person_id is distinct from v_actor;
  end loop;
  return new;
end;
$$;

revoke execute on function public.create_mix_versions() from public, anon, authenticated;

create trigger z_create_mix_versions
  after insert on public.master_files
  for each row execute function public.create_mix_versions();

-- Sending the synthesis to the engineer: the owner, once, with a synthesis.
create or replace function public.send_mix_feedback(p_version_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
begin
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.feedback_sent_at is not null then
    raise exception 'already_sent';
  end if;
  if v_row.feedback_summary is null then
    raise exception 'no_summary';
  end if;
  update public.master_mix_versions
     set status = 'feedback_sent', feedback_sent_at = now(),
         feedback_sent_by = public.auth_person_id()
   where id = p_version_id;
end;
$$;

revoke execute on function public.send_mix_feedback(uuid) from public, anon;
grant execute on function public.send_mix_feedback(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Comments
-- ---------------------------------------------------------------------------

create table public.master_mix_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  version_id uuid not null,
  body text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_mix_comments_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint master_mix_comments_version_same_org
    foreign key (version_id, organization_id)
    references public.master_mix_versions (id, organization_id) on delete cascade,
  constraint master_mix_comments_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index master_mix_comments_version_idx
  on public.master_mix_comments (version_id, created_at);

-- The comment's project is its version's.
create or replace function public.check_mix_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.master_mix_versions v
                  where v.id = new.version_id and v.project_id = new.project_id) then
    raise exception 'version_not_in_project';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_mix_comment() from public, anon, authenticated;

create trigger master_mix_comments_check
  before insert on public.master_mix_comments
  for each row execute function public.check_mix_comment();
create trigger a_set_created_by before insert on public.master_mix_comments
  for each row execute function public.set_created_by();

alter table public.master_mix_comments enable row level security;
alter table public.master_mix_comments force row level security;
revoke all on table public.master_mix_comments from anon, authenticated;
grant select on table public.master_mix_comments to authenticated;
grant insert (organization_id, project_id, version_id, body) on public.master_mix_comments
  to authenticated;

create policy master_mix_comments_select_visible on public.master_mix_comments
  for select to authenticated
  using (public.can_see_project(project_id));

-- Every member who sees the project comments ("contributeurs commentent").
create policy master_mix_comments_insert_visible on public.master_mix_comments
  for insert to authenticated
  with check (public.can_see_project(project_id));

-- ---------------------------------------------------------------------------
-- Notifications: a version of the mix received
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received')) not valid;

-- ---------------------------------------------------------------------------
-- The engineer's page shows the feedback sent
-- ---------------------------------------------------------------------------

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
    -- The syntheses sent for the versions of the project's titles.
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', m.title, 'number', v.number,
               'summary', v.feedback_summary, 'sentAt', v.feedback_sent_at)
             order by v.feedback_sent_at desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
       where v.project_id = v_row.project_id and v.feedback_sent_at is not null
         -- Feedback on the mix is for the mix engineer only.
         and v_row.role = 'mix'), '[]'::jsonb));
end;
$$;
