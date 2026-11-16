-- Projet collectif, lot 14 (docs/pds-mic-plan.md § 3.1 « Sortie ≠ plan de
-- sortie », § 8): the editorial PLAN DE SORTIE of each title of a collective,
-- a document shared with the artist's team (modelled on the plan Jeho), never
-- the release itself (releases, lot 13: date, ISRC, UPC, Distribution), which
-- it reads.
--
--   1. title_release_plans: one per title of a collective, born with it
--      (« Brouillon »); its working draft (`config`, what the next version is
--      built from); its status: draft › provisional › internal ›
--      ready_to_share › revised › active › archived.
--   2. title_release_plan_versions (append only): each version as recorded —
--      the document (`content`, all a shared link ever shows), the draft it
--      came from (`config`), the marketing actions it read (`sources`, to
--      tell when one changed since) —, its author, date and status.
--   3. title_release_plan_events (append only): the journal of the statuses
--      (and of the links given and withdrawn).
--   4. share_links: scope 'title_release_plan', one version; read without an
--      account through get_shared_title_release_plan only (never the draft,
--      never the sources).
--   5. Gestures, by the project's owner alone (as the project's Plan de
--      sortie): save the draft, move the status, record a version, give and
--      withdraw a version's link. A title abandoned archives its plan;
--      reactivated, the plan gets its status back.
--   6. RLS forced, read by whoever sees the project, written by the
--      functions only; zz_project_live; delete_project_row empties them.
--
-- Any other project: no plan, nothing changes (the Stratégie's Plan de sortie
-- of the project stays as it is).

-- 1-3 --------------------------------------------------------------------------------------
create table public.title_release_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title_id uuid not null references public.project_titles (id),
  status text not null default 'draft',
  -- An archived plan: the status it had, and why (the title abandoned, or
  -- the campaign's review done).
  status_before_archive text,
  archived_reason text,
  config jsonb not null default '{}'::jsonb,
  config_updated_at timestamptz,
  config_updated_by uuid references public.people (id),
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint title_release_plans_title_key unique (title_id),
  constraint title_release_plans_id_org_key unique (id, organization_id),
  constraint title_release_plans_status_check check (status in
    ('draft', 'provisional', 'internal', 'ready_to_share', 'revised', 'active', 'archived')),
  constraint title_release_plans_archive_check check (
    (status = 'archived') = (status_before_archive is not null)
    and (status = 'archived') = (archived_reason is not null)),
  constraint title_release_plans_before_check check (status_before_archive is null
    or status_before_archive in ('draft', 'provisional', 'internal', 'ready_to_share',
                                 'revised', 'active')),
  constraint title_release_plans_reason_check check (archived_reason is null
    or archived_reason in ('title_abandoned', 'closed')),
  constraint title_release_plans_config_check check (jsonb_typeof(config) = 'object'),
  constraint title_release_plans_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);
create index title_release_plans_project_idx on public.title_release_plans (project_id);

create table public.title_release_plan_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  plan_id uuid not null,
  version integer not null,
  -- The plan's status this version was recorded at: internal or revised.
  status text not null,
  note text,
  content jsonb not null,
  config jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint title_release_plan_versions_key unique (plan_id, version),
  constraint title_release_plan_versions_id_org_key unique (id, organization_id),
  constraint title_release_plan_versions_status_check check (status in ('internal', 'revised')),
  constraint title_release_plan_versions_note_check check (note is null or length(note) <= 1000),
  constraint title_release_plan_versions_content_check
    check (jsonb_typeof(content) = 'object' and content ->> 'kind' = 'title_release_plan'),
  constraint title_release_plan_versions_plan_same_org
    foreign key (plan_id, organization_id) references public.title_release_plans (id, organization_id),
  constraint title_release_plan_versions_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);
create index title_release_plan_versions_project_idx
  on public.title_release_plan_versions (project_id);

create table public.title_release_plan_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  plan_id uuid not null,
  version_id uuid,
  from_status text,
  to_status text not null,
  -- What moved it when no one chose the status: the title abandoned or
  -- reactivated; a version's link given or withdrawn (status unchanged).
  reason text,
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint title_release_plan_events_reason_check check (reason is null or reason in
    ('title_abandoned', 'title_reactivated', 'shared', 'unshared')),
  constraint title_release_plan_events_plan_same_org
    foreign key (plan_id, organization_id) references public.title_release_plans (id, organization_id),
  constraint title_release_plan_events_version_same_org
    foreign key (version_id, organization_id)
    references public.title_release_plan_versions (id, organization_id),
  constraint title_release_plan_events_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);
create index title_release_plan_events_plan_idx
  on public.title_release_plan_events (plan_id, created_at);
create index title_release_plan_events_project_idx
  on public.title_release_plan_events (project_id);

do $$
declare
  t text;
begin
  foreach t in array array['title_release_plans', 'title_release_plan_versions',
                           'title_release_plan_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (project_id = any ((select public.visible_project_ids())::uuid[]))',
      t || '_select', t);
    execute format(
      'create trigger zz_project_live after insert or update or delete on public.%I
         for each row execute function public.project_live_tick(''project'')', t);
  end loop;
end;
$$;

-- 4 ------------------------------------------------------------------------------------------
alter table public.share_links add column if not exists title_plan_version_id uuid;
alter table public.share_links drop constraint if exists share_links_scope_check;
alter table public.share_links add constraint share_links_scope_check
  check (scope in ('brief', 'strategy', 'design_doc', 'release_plan', 'press_kit',
                   'framing_brief', 'title_release_plan'));
alter table public.share_links drop constraint if exists share_links_title_plan_scope;
alter table public.share_links add constraint share_links_title_plan_scope
  check ((scope = 'title_release_plan') = (title_plan_version_id is not null));
alter table public.share_links drop constraint if exists share_links_title_plan_same_org;
alter table public.share_links add constraint share_links_title_plan_same_org
  foreign key (title_plan_version_id, organization_id)
  references public.title_release_plan_versions (id, organization_id);
create index if not exists share_links_title_plan_idx
  on public.share_links (title_plan_version_id) where title_plan_version_id is not null;
grant select (title_plan_version_id) on public.share_links to authenticated;

-- 5 ------------------------------------------------------------------------------------------
-- The date a title's plan aims at: its own release's (lot 13), or the
-- compilation's when the collective releases only a compilation.
create or replace function public.title_release_plan_target_date(p_title_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when p.collective_release_mode = 'compilation' then
             (select r.planned_release_date from public.releases r
               where r.project_id = t.project_id and r.project_title_id is null
                 and r.archived_at is null
               order by r.created_at limit 1)
           else
             (select r.planned_release_date from public.releases r
               where r.project_title_id = t.id and r.archived_at is null)
         end
    from public.project_titles t
    join public.projects p on p.id = t.project_id
   where t.id = p_title_id;
$$;
revoke execute on function public.title_release_plan_target_date(uuid) from public, anon;
grant execute on function public.title_release_plan_target_date(uuid) to authenticated;

-- A title of a collective has its plan, born « Brouillon » (archived, if the
-- title is abandoned already). Idempotent.
create or replace function public.ensure_title_release_plan(p_title_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_collective boolean;
  v_id uuid;
  v_status text;
begin
  select * into v_title from public.project_titles where id = p_title_id;
  if not found then
    return null;
  end if;
  select collective into v_collective from public.projects where id = v_title.project_id;
  if not coalesce(v_collective, false) then
    return null;
  end if;
  select id into v_id from public.title_release_plans where title_id = p_title_id;
  if v_id is not null then
    return v_id;
  end if;
  v_status := case when v_title.status = 'abandoned' then 'archived' else 'draft' end;
  insert into public.title_release_plans
    (organization_id, project_id, title_id, status, status_before_archive, archived_reason,
     status_changed_by)
  values (v_title.organization_id, v_title.project_id, p_title_id, v_status,
          case when v_status = 'archived' then 'draft' end,
          case when v_status = 'archived' then 'title_abandoned' end,
          public.auth_person_id())
  returning id into v_id;
  insert into public.title_release_plan_events
    (organization_id, project_id, plan_id, from_status, to_status, reason, created_by)
  values (v_title.organization_id, v_title.project_id, v_id, null, v_status,
          case when v_status = 'archived' then 'title_abandoned' end, public.auth_person_id());
  return v_id;
end;
$$;
revoke execute on function public.ensure_title_release_plan(uuid) from public, anon, authenticated;

-- A title added (its plan is born), abandoned (its plan archived), reactivated
-- (its plan gets back the status it had, if the abandonment archived it).
create or replace function public.project_titles_release_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.title_release_plans%rowtype;
begin
  perform public.ensure_title_release_plan(new.id);
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return null;
  end if;
  select * into v_plan from public.title_release_plans where title_id = new.id for update;
  if not found then
    return null;
  end if;
  if new.status = 'abandoned' and v_plan.status <> 'archived' then
    update public.title_release_plans
       set status = 'archived', status_before_archive = v_plan.status,
           archived_reason = 'title_abandoned',
           status_changed_at = now(), status_changed_by = public.auth_person_id()
     where id = v_plan.id;
    insert into public.title_release_plan_events
      (organization_id, project_id, plan_id, from_status, to_status, reason, created_by)
    values (v_plan.organization_id, v_plan.project_id, v_plan.id, v_plan.status, 'archived',
            'title_abandoned', public.auth_person_id());
  elsif old.status = 'abandoned' and new.status <> 'abandoned'
        and v_plan.status = 'archived' and v_plan.archived_reason = 'title_abandoned' then
    update public.title_release_plans
       set status = v_plan.status_before_archive, status_before_archive = null,
           archived_reason = null,
           status_changed_at = now(), status_changed_by = public.auth_person_id()
     where id = v_plan.id;
    insert into public.title_release_plan_events
      (organization_id, project_id, plan_id, from_status, to_status, reason, created_by)
    values (v_plan.organization_id, v_plan.project_id, v_plan.id, 'archived',
            v_plan.status_before_archive, 'title_reactivated', public.auth_person_id());
  end if;
  return null;
end;
$$;
revoke execute on function public.project_titles_release_plan() from public, anon, authenticated;
create trigger z_title_release_plan after insert or update of status on public.project_titles
  for each row execute function public.project_titles_release_plan();

-- The collectives' titles already there (lots 2 to 13): their plans, born
-- without an author.
select public.ensure_title_release_plan(t.id)
  from public.project_titles t
  join public.projects p on p.id = t.project_id
 where p.collective
 order by t.project_id, t.position;

-- Who writes a title's plan: the project's owner (as the project's Plan de
-- sortie), the project not archived. Locks the plan: one gesture at a time.
create or replace function public.lock_title_release_plan(p_plan_id uuid)
returns public.title_release_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.title_release_plans%rowtype;
  v_archived timestamptz;
begin
  select * into v_plan from public.title_release_plans where id = p_plan_id for update;
  if not found or not public.can_see_project(v_plan.project_id) then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;
  select archived_at into v_archived from public.projects where id = v_plan.project_id;
  if v_archived is not null or not public.is_project_owner(v_plan.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_plan;
end;
$$;
revoke execute on function public.lock_title_release_plan(uuid) from public, anon, authenticated;

-- The draft: each key of the patch replaces the draft's (the screens send one
-- part at a time, checked by the app). Never on an archived plan.
create or replace function public.save_title_release_plan(p_plan_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.title_release_plans%rowtype;
begin
  v_plan := public.lock_title_release_plan(p_plan_id);
  if v_plan.status = 'archived' then
    raise exception 'plan_archived' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.title_release_plans
     set config = config || p_patch, config_updated_at = now(),
         config_updated_by = public.auth_person_id()
   where id = p_plan_id;
  if (select pg_column_size(config) from public.title_release_plans where id = p_plan_id)
     > 400000 then
    raise exception 'too_large' using errcode = '22023';
  end if;
end;
$$;

-- A status chosen (a version is recorded by its own gesture):
--   draft › provisional          once the title has a target date;
--   internal › ready_to_share;
--   ready_to_share, revised › active;
--   active › archived            the campaign's review done, a note required;
--   archived › its status before (reopened), when the review archived it and
--                                the title is not abandoned.
-- p_from: the status the person saw (two tabs never move it twice).
create or replace function public.set_title_release_plan_status(
  p_plan_id uuid, p_from text, p_to text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.title_release_plans%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_title_status text;
begin
  v_plan := public.lock_title_release_plan(p_plan_id);
  if v_plan.status is distinct from p_from then
    raise exception 'status_changed' using errcode = 'P0001';
  end if;
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_plan.status = 'draft' and p_to = 'provisional' then
    if public.title_release_plan_target_date(v_plan.title_id) is null then
      raise exception 'no_target_date' using errcode = 'P0001';
    end if;
  elsif v_plan.status = 'internal' and p_to = 'ready_to_share' then
    null;
  elsif v_plan.status in ('ready_to_share', 'revised') and p_to = 'active' then
    null;
  elsif v_plan.status = 'active' and p_to = 'archived' then
    if v_note is null then
      raise exception 'note_required' using errcode = 'P0001';
    end if;
  elsif v_plan.status = 'archived' and p_to = v_plan.status_before_archive then
    select status into v_title_status from public.project_titles where id = v_plan.title_id;
    if v_plan.archived_reason <> 'closed' or v_title_status = 'abandoned' then
      raise exception 'title_abandoned' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  update public.title_release_plans
     set status = p_to,
         status_before_archive = case when p_to = 'archived' then v_plan.status end,
         archived_reason = case when p_to = 'archived' then 'closed' end,
         status_changed_at = now(), status_changed_by = public.auth_person_id()
   where id = p_plan_id;
  insert into public.title_release_plan_events
    (organization_id, project_id, plan_id, from_status, to_status, note, created_by)
  values (v_plan.organization_id, v_plan.project_id, p_plan_id, v_plan.status, p_to, v_note,
          public.auth_person_id());
end;
$$;

-- A version recorded: the document built by the app from the draft and the
-- project (`p_content`), the actions it read (`p_sources`). From « Planning
-- provisoire » or « Version interne »: a version interne (the agreement in
-- principle); once shared (ready, revised, active): a version révisée.
create or replace function public.record_title_release_plan_version(
  p_plan_id uuid, p_from text, p_content jsonb, p_sources jsonb default '[]'::jsonb,
  p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.title_release_plans%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_to text;
  v_version integer;
  v_id uuid;
begin
  v_plan := public.lock_title_release_plan(p_plan_id);
  if v_plan.status is distinct from p_from then
    raise exception 'status_changed' using errcode = 'P0001';
  end if;
  v_to := case
            when v_plan.status in ('provisional', 'internal') then 'internal'
            when v_plan.status in ('ready_to_share', 'revised', 'active') then 'revised'
          end;
  if v_plan.status = 'draft' then
    raise exception 'not_provisional' using errcode = 'P0001';
  elsif v_plan.status = 'archived' then
    raise exception 'plan_archived' using errcode = 'P0001';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object'
     or p_content ->> 'kind' is distinct from 'title_release_plan'
     or jsonb_typeof(coalesce(p_sources, '[]'::jsonb)) <> 'array'
     or (v_note is not null and length(v_note) > 1000) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select coalesce(max(version), 0) + 1 into v_version
    from public.title_release_plan_versions where plan_id = p_plan_id;
  insert into public.title_release_plan_versions
    (organization_id, project_id, plan_id, version, status, note, content, config, sources,
     created_by)
  values (v_plan.organization_id, v_plan.project_id, p_plan_id, v_version, v_to, v_note,
          p_content, v_plan.config, coalesce(p_sources, '[]'::jsonb), public.auth_person_id())
  returning id into v_id;
  update public.title_release_plans
     set status = v_to, status_changed_at = now(), status_changed_by = public.auth_person_id()
   where id = p_plan_id;
  insert into public.title_release_plan_events
    (organization_id, project_id, plan_id, version_id, from_status, to_status, note, created_by)
  values (v_plan.organization_id, v_plan.project_id, p_plan_id, v_id, v_plan.status, v_to,
          v_note, public.auth_person_id());
  return v_id;
end;
$$;

-- A version's link (created once, then reused while it lives): the latest
-- version of a plan ready to share, revised or active. A link already given
-- to an older version keeps working until it is withdrawn.
create or replace function public.share_title_release_plan_version(p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.title_release_plan_versions%rowtype;
  v_plan public.title_release_plans%rowtype;
  v_token uuid;
begin
  select * into v_version from public.title_release_plan_versions where id = p_version_id;
  if not found or not public.can_see_project(v_version.project_id) then
    raise exception 'version_not_found' using errcode = 'P0002';
  end if;
  v_plan := public.lock_title_release_plan(v_version.plan_id);
  select token into v_token from public.share_links
   where title_plan_version_id = p_version_id and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;
  if v_token is not null then
    return v_token;
  end if;
  if v_plan.status not in ('ready_to_share', 'revised', 'active')
     or v_version.version <> (select max(version) from public.title_release_plan_versions
                               where plan_id = v_plan.id) then
    raise exception 'not_shareable' using errcode = 'P0001';
  end if;
  insert into public.share_links
    (organization_id, project_id, scope, title_plan_version_id, created_by)
  values (v_version.organization_id, v_version.project_id, 'title_release_plan',
          p_version_id, public.auth_person_id())
  returning token into v_token;
  insert into public.title_release_plan_events
    (organization_id, project_id, plan_id, version_id, from_status, to_status, reason,
     created_by)
  values (v_plan.organization_id, v_plan.project_id, v_plan.id, p_version_id, v_plan.status,
          v_plan.status, 'shared', public.auth_person_id());
  return v_token;
end;
$$;

-- « Retirer le lien »: the version's live links stop working at once.
create or replace function public.revoke_title_release_plan_link(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.title_release_plan_versions%rowtype;
  v_plan public.title_release_plans%rowtype;
  v_count integer;
begin
  select * into v_version from public.title_release_plan_versions where id = p_version_id;
  if not found or not public.can_see_project(v_version.project_id) then
    raise exception 'version_not_found' using errcode = 'P0002';
  end if;
  v_plan := public.lock_title_release_plan(v_version.plan_id);
  update public.share_links set revoked_at = now()
   where title_plan_version_id = p_version_id and revoked_at is null;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'no_link' using errcode = 'P0001';
  end if;
  insert into public.title_release_plan_events
    (organization_id, project_id, plan_id, version_id, from_status, to_status, reason,
     created_by)
  values (v_plan.organization_id, v_plan.project_id, v_plan.id, p_version_id, v_plan.status,
          v_plan.status, 'unshared', public.auth_person_id());
end;
$$;

-- The only way anon reads a title's plan: one version, by its link, while
-- the link lives. The document alone: never the draft nor the sources.
create or replace function public.get_shared_title_release_plan(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('version', v.version, 'content', v.content)
    from public.share_links l
    join public.title_release_plan_versions v on v.id = l.title_plan_version_id
   where l.token = p_token
     and l.scope = 'title_release_plan'
     and l.revoked_at is null
     and (l.expires_at is null or l.expires_at > now());
$$;

revoke execute on function public.save_title_release_plan(uuid, jsonb) from public, anon;
revoke execute on function public.set_title_release_plan_status(uuid, text, text, text)
  from public, anon;
revoke execute on function public.record_title_release_plan_version(uuid, text, jsonb, jsonb, text)
  from public, anon;
revoke execute on function public.share_title_release_plan_version(uuid) from public, anon;
revoke execute on function public.revoke_title_release_plan_link(uuid) from public, anon;
revoke execute on function public.get_shared_title_release_plan(uuid) from public;
grant execute on function public.save_title_release_plan(uuid, jsonb) to authenticated;
grant execute on function public.set_title_release_plan_status(uuid, text, text, text)
  to authenticated;
grant execute on function public.record_title_release_plan_version(uuid, text, jsonb, jsonb, text)
  to authenticated;
grant execute on function public.share_title_release_plan_version(uuid) to authenticated;
grant execute on function public.revoke_title_release_plan_link(uuid) to authenticated;
grant execute on function public.get_shared_title_release_plan(uuid) to anon, authenticated;

-- 6 ------------------------------------------------------------------------------------------
-- delete_project_row: from 20261114110101, the title plans (their journal,
-- versions, then plans) after the links that name a version and before the
-- titles they name.
CREATE OR REPLACE FUNCTION public.delete_project_row(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  -- Business module (20261112010101): a deal's call has no project of its
  -- own; the calls of the project's deals go with the project's calls.
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls
   where project_id = p_project_id
      or deal_id in (select d.id from public.deals d where d.project_id = p_project_id);
  select coalesce(array_agg(id), '{}') into v_contracts
    from public.contracts where project_id = p_project_id;

  -- Tables of the abandoned "Cadrage intelligent" branch (04/10/2026), not
  -- created by these migrations but still present in some local databases:
  -- emptied for the project when they exist, children first.
  foreach v_table in array array['master_versions', 'master_workflows', 'brief_change_requests',
                                 'brief_versions'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where project_id = $1', v_table) using p_project_id;
    end if;
  end loop;

  -- Cadrage intelligent (20261006000101, 20261006000201): the plan names the
  -- brief (its items cascade), a deadline names a report item, a brief names
  -- its validation, so they go before those. framing_calls cascades with calls.
  delete from public.project_plans where project_id = p_project_id;
  delete from public.framing_deadlines where project_id = p_project_id;
  delete from public.framing_briefs where project_id = p_project_id;

  -- Children before parents: a NO ACTION key is checked after each
  -- statement. ON DELETE CASCADE children are left to their parent.
  delete from public.activity_events where project_id = p_project_id;
  delete from public.tasks where project_id = p_project_id;
  delete from public.budget_lines where project_id = p_project_id;
  delete from public.design_versions where project_id = p_project_id;
  delete from public.milestones where project_id = p_project_id;
  -- Projet collectif, lot 10 (20261113200101): the titles each action targets,
  -- before the actions and the titles they name.
  delete from public.deliverable_titles where project_id = p_project_id;
  delete from public.strategy_deliverables where project_id = p_project_id;
  delete from public.levers where project_id = p_project_id;
  delete from public.needs where project_id = p_project_id;
  delete from public.field_values where project_id = p_project_id;
  delete from public.framing_constraints where project_id = p_project_id;
  delete from public.open_points where project_id = p_project_id;
  delete from public.project_team_members where project_id = p_project_id;

  delete from public.report_items
   where report_id in (select id from public.call_reports where call_id = any (v_calls));
  delete from public.call_reports where call_id = any (v_calls);
  delete from public.transcripts where call_id = any (v_calls);
  delete from public.calls where id = any (v_calls);

  delete from public.validations
   where project_stage_id in (select id from public.project_stages
                               where project_id = p_project_id);
  delete from public.project_stages where project_id = p_project_id;

  delete from public.legal_clearances where project_id = p_project_id;
  delete from public.legal_facts where project_id = p_project_id;
  delete from public.legal_answers where project_id = p_project_id;
  delete from public.legal_intakes where project_id = p_project_id;
  delete from public.legal_plan_events where project_id = p_project_id;
  delete from public.legal_plan_items where project_id = p_project_id;
  delete from public.legal_plans where project_id = p_project_id;
  delete from public.legal_form_submissions where project_id = p_project_id;
  delete from public.legal_forms where project_id = p_project_id;
  delete from public.legal_agreement_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.legal_split_sheets where project_id = p_project_id;
  delete from public.legal_formalities where project_id = p_project_id;

  delete from public.legal_clearance_contracts where contract_id = any (v_contracts);
  delete from public.financial_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contract_files where contract_id = any (v_contracts);
  delete from public.contract_events
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contracts where id = any (v_contracts);

  delete from public.project_files where project_id = p_project_id;
  delete from public.releases where project_id = p_project_id;
  delete from public.share_links where project_id = p_project_id;
  -- Projet collectif, lot 14 (20261114130101): the title plans, after the
  -- links that name a version, before the titles they name.
  delete from public.title_release_plan_events where project_id = p_project_id;
  delete from public.title_release_plan_versions where project_id = p_project_id;
  delete from public.title_release_plans where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;
  -- Business module (20261111230101): a project's deals (their journal and
  -- terms cascade) name its participations, so they go first.
  delete from public.deals where project_id = p_project_id;
  -- Projet collectif (20261111120101, 20261111140101): the participations
  -- name their titles, the titles hold their links (on delete restrict), so
  -- they go before the cascade takes the links. Lot 9 bis (20261114100101):
  -- the file requests name their titles too; lot 12 (20261114110101): the
  -- waivers name their participations.
  delete from public.master_file_requests where project_id = p_project_id;
  delete from public.participation_waivers where project_id = p_project_id;
  delete from public.title_participations where project_id = p_project_id;
  delete from public.project_title_events where project_id = p_project_id;
  delete from public.project_titles where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
