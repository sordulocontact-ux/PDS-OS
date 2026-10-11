-- Marketing › Suivi & bilan, lot 1 (ticket « Suivi & bilan », docs/ARCHITECTURE.md
-- § 8 duodecies): the source data the dashboard, the reports and the closing
-- are built on.
--   1. marketing_activations: what the Marketing actually runs (a content, an
--      influence campaign, a press push…), its operational status, who holds
--      it, the Strategy commitment it comes from if any. Never deleted: an
--      activation is archived (« suppression logique »), a report keeps it in
--      its snapshot.
--   2. marketing_evidence: what an activation produced, kept apart by nature —
--      a publication, a press or media coverage (retombée), a statistic — and
--      by level: declared (someone says so), to verify (a check is expected),
--      verified (a person checked; who and when written by the database). A
--      statistic also says whether the figure exists: available, partial,
--      unavailable (an unavailable figure has no value: it is never a zero).
--      Where it comes from: who declared it (author or organism), when it was
--      observed, when it was entered (created_at). A link that became
--      unreachable is flagged, the evidence and its past check are kept.
--   3. marketing_events: the module's audit (who, when, before, after, why),
--      written by triggers only; the next lots (reports, approvals, reserves,
--      closing) write there too.
-- Contributors: the project's owner and its creative directors
-- (marketing_can_contribute). Read by whoever sees the project.

-- 1. Who contributes ------------------------------------------------------------------

create function public.marketing_can_contribute(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
      or exists (select 1 from public.project_creatives pc
                  where pc.project_id = p_project_id
                    and pc.person_id = public.auth_person_id());
$$;
revoke execute on function public.marketing_can_contribute(uuid) from public, anon;
grant execute on function public.marketing_can_contribute(uuid) to authenticated;

-- 2. Activations ---------------------------------------------------------------------

create table public.marketing_activations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null,
  kind text not null default 'content',
  status text not null default 'planned',
  owner_person_id uuid references public.people (id),
  -- The Strategy commitment it carries out, if any (read, never copied).
  deliverable_id uuid,
  lever_id uuid,
  starts_on date,
  ends_on date,
  note text,
  archived_at timestamptz,
  archived_by uuid references public.people (id),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_activations_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint marketing_activations_kind_check
    check (kind in ('content', 'influence', 'press', 'social', 'event', 'other')),
  constraint marketing_activations_status_check
    check (status in ('planned', 'in_progress', 'done', 'cancelled')),
  constraint marketing_activations_dates_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on),
  constraint marketing_activations_note_check check (note is null or char_length(note) <= 2000),
  constraint marketing_activations_id_org_key unique (id, organization_id),
  constraint marketing_activations_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint marketing_activations_deliverable_same_org foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete set null (deliverable_id),
  constraint marketing_activations_lever_same_org foreign key (lever_id, organization_id)
    references public.levers (id, organization_id) on delete set null (lever_id)
);
create index marketing_activations_project_idx on public.marketing_activations (project_id, created_at);

-- A deliverable or a lever of the same project; who archived is the database's.
create function public.marketing_activations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and not exists (
       select 1 from public.strategy_deliverables d
        where d.id = new.deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_other_project' using errcode = '23514';
  end if;
  if new.lever_id is not null and not exists (
       select 1 from public.levers l where l.id = new.lever_id and l.project_id = new.project_id) then
    raise exception 'lever_other_project' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.archived_at := null;
    new.archived_by := null;
  elsif new.archived_at is distinct from old.archived_at then
    new.archived_at := case when new.archived_at is null then null else now() end;
    new.archived_by := case when new.archived_at is null then null else public.auth_person_id() end;
  else
    new.archived_by := old.archived_by;
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_activations_check() from public, anon, authenticated;
create trigger a_check before insert or update on public.marketing_activations
  for each row execute function public.marketing_activations_check();
create trigger a_set_created_by before insert on public.marketing_activations
  for each row execute function public.set_created_by();
create trigger b_updated_at before update on public.marketing_activations
  for each row execute function public.set_updated_at();

alter table public.marketing_activations enable row level security;
alter table public.marketing_activations force row level security;
revoke all on table public.marketing_activations from anon, authenticated;
grant select on public.marketing_activations to authenticated;
grant insert (organization_id, project_id, title, kind, status, owner_person_id, deliverable_id,
              lever_id, starts_on, ends_on, note)
  on public.marketing_activations to authenticated;
grant update (title, kind, status, owner_person_id, deliverable_id, lever_id, starts_on, ends_on,
              note, archived_at)
  on public.marketing_activations to authenticated;
create policy marketing_activations_select on public.marketing_activations
  for select to authenticated using (public.can_see_project(project_id));
create policy marketing_activations_insert on public.marketing_activations
  for insert to authenticated with check (public.marketing_can_contribute(project_id));
create policy marketing_activations_update on public.marketing_activations
  for update to authenticated
  using (public.marketing_can_contribute(project_id))
  with check (public.marketing_can_contribute(project_id));

-- 3. Evidence ------------------------------------------------------------------------

create table public.marketing_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  kind text not null,
  label text not null,
  url text,
  platform text,
  -- A statistic: what is counted, its value, the period it covers.
  metric text,
  value numeric(16, 2),
  period_start date,
  period_end date,
  availability text,
  -- Provenance: who declared it (author or organism) and when it was seen.
  reported_by text,
  observed_on date,
  verification text not null default 'declared',
  verified_by uuid references public.people (id),
  verified_at timestamptz,
  link_unreachable_at timestamptz,
  link_reported_by uuid references public.people (id),
  archived_at timestamptz,
  archived_by uuid references public.people (id),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_evidence_kind_check check (kind in ('publication', 'coverage', 'statistic')),
  constraint marketing_evidence_label_check check (btrim(label) <> '' and char_length(label) <= 200),
  constraint marketing_evidence_url_check
    check (url is null or (char_length(url) <= 2048 and url ~ '^https://\S+$')),
  constraint marketing_evidence_texts_check check (
    char_length(coalesce(platform, '')) <= 80 and char_length(coalesce(metric, '')) <= 80
    and char_length(coalesce(reported_by, '')) <= 200),
  constraint marketing_evidence_verification_check
    check (verification in ('declared', 'to_verify', 'verified')),
  -- Only a statistic has an availability, a metric and a value; an unavailable
  -- figure has no value (never a zero), an available or partial one has one.
  constraint marketing_evidence_statistic_check check (
    case when kind = 'statistic' then
      availability in ('available', 'partial', 'unavailable')
      and metric is not null and btrim(metric) <> ''
      and ((availability = 'unavailable') = (value is null))
    else availability is null and value is null and metric is null
         and period_start is null and period_end is null end),
  constraint marketing_evidence_period_check
    check (period_start is null or period_end is null or period_end >= period_start),
  constraint marketing_evidence_value_check check (value is null or value >= 0),
  -- A verified publication is a link someone opened; nothing unavailable is verified.
  constraint marketing_evidence_verified_check check (
    verification <> 'verified'
    or ((kind <> 'publication' or url is not null)
        and (availability is null or availability <> 'unavailable'))),
  constraint marketing_evidence_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint marketing_evidence_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade
);
create index marketing_evidence_activation_idx on public.marketing_evidence (activation_id, created_at);
create index marketing_evidence_project_idx on public.marketing_evidence (project_id);

-- Same project as its activation; who verified, flagged or archived is the
-- database's; a changed link or figure must be checked again.
create function public.marketing_evidence_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.marketing_activations a
                  where a.id = new.activation_id and a.project_id = new.project_id) then
    raise exception 'activation_other_project' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.activation_id <> old.activation_id or new.kind <> old.kind) then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.verification = 'verified' and old.verification = 'verified'
     and (new.url is distinct from old.url or new.value is distinct from old.value
          or new.availability is distinct from old.availability) then
    new.verification := 'to_verify';
  end if;
  if new.verification = 'verified' then
    if tg_op = 'INSERT' or old.verification <> 'verified' then
      new.verified_by := public.auth_person_id();
      new.verified_at := now();
    else
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
    end if;
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;
  -- A new link clears the « unreachable » flag of the old one.
  if tg_op = 'UPDATE' and new.url is distinct from old.url then
    new.link_unreachable_at := null;
  end if;
  if tg_op = 'INSERT' then
    new.link_unreachable_at := null;
    new.archived_at := null;
  end if;
  if new.link_unreachable_at is not null and new.url is null then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' or new.link_unreachable_at is distinct from old.link_unreachable_at then
    new.link_unreachable_at := case when new.link_unreachable_at is null then null else now() end;
    new.link_reported_by := case when new.link_unreachable_at is null then null
                                 else public.auth_person_id() end;
  else
    new.link_reported_by := old.link_reported_by;
  end if;
  if tg_op = 'INSERT' or new.archived_at is distinct from old.archived_at then
    new.archived_at := case when new.archived_at is null then null else now() end;
    new.archived_by := case when new.archived_at is null then null else public.auth_person_id() end;
  else
    new.archived_by := old.archived_by;
  end if;
  return new;
end;
$$;
revoke execute on function public.marketing_evidence_check() from public, anon, authenticated;
create trigger a_check before insert or update on public.marketing_evidence
  for each row execute function public.marketing_evidence_check();
create trigger a_set_created_by before insert on public.marketing_evidence
  for each row execute function public.set_created_by();
create trigger b_updated_at before update on public.marketing_evidence
  for each row execute function public.set_updated_at();

alter table public.marketing_evidence enable row level security;
alter table public.marketing_evidence force row level security;
revoke all on table public.marketing_evidence from anon, authenticated;
grant select on public.marketing_evidence to authenticated;
grant insert (organization_id, project_id, activation_id, kind, label, url, platform, metric, value,
              period_start, period_end, availability, reported_by, observed_on, verification)
  on public.marketing_evidence to authenticated;
grant update (label, url, platform, metric, value, period_start, period_end, availability,
              reported_by, observed_on, verification, link_unreachable_at, archived_at)
  on public.marketing_evidence to authenticated;
create policy marketing_evidence_select on public.marketing_evidence
  for select to authenticated using (public.can_see_project(project_id));
create policy marketing_evidence_insert on public.marketing_evidence
  for insert to authenticated with check (public.marketing_can_contribute(project_id));
create policy marketing_evidence_update on public.marketing_evidence
  for update to authenticated
  using (public.marketing_can_contribute(project_id))
  with check (public.marketing_can_contribute(project_id));

-- 4. Audit ---------------------------------------------------------------------------

create table public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- activation.created / updated / archived / restored,
  -- evidence.created / updated / verified / unverified / link_unreachable /
  -- link_restored / archived (the next lots add theirs).
  kind text not null,
  subject_id uuid,
  activation_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  actor uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint marketing_events_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index marketing_events_project_idx on public.marketing_events (project_id, created_at desc);
create index marketing_events_subject_idx on public.marketing_events (subject_id, created_at desc);
alter table public.marketing_events enable row level security;
alter table public.marketing_events force row level security;
revoke all on table public.marketing_events from anon, authenticated;
grant select on public.marketing_events to authenticated;
create policy marketing_events_select on public.marketing_events
  for select to authenticated using (public.can_see_project(project_id));

create function public.marketing_log(
  p_org uuid, p_project uuid, p_kind text, p_subject uuid, p_activation uuid,
  p_old jsonb, p_new jsonb, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.marketing_events
    (organization_id, project_id, kind, subject_id, activation_id, old_value, new_value, reason, actor)
  values (p_org, p_project, p_kind, p_subject, p_activation, p_old, p_new, p_reason,
          public.auth_person_id());
$$;
revoke execute on function public.marketing_log(uuid, uuid, text, uuid, uuid, jsonb, jsonb, text)
  from public, anon, authenticated;

-- The fields that changed, before and after (bookkeeping columns left out).
create function public.marketing_diff(p_old jsonb, p_new jsonb, p_skip text[])
returns table (old_value jsonb, new_value jsonb)
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(n.key, o.value) filter (where n.key is not null), '{}'::jsonb),
         coalesce(jsonb_object_agg(n.key, n.value) filter (where n.key is not null), '{}'::jsonb)
    from jsonb_each(p_new) n
    join jsonb_each(p_old) o on o.key = n.key
   where n.value is distinct from o.value and not (n.key = any (p_skip));
$$;
revoke execute on function public.marketing_diff(jsonb, jsonb, text[]) from public, anon, authenticated;

create function public.marketing_activity_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_skip text[] := array['updated_at', 'archived_by', 'verified_by', 'verified_at',
                         'link_reported_by'];
  v_kind text;
  v_activation uuid;
begin
  v_activation := case tg_table_name when 'marketing_activations' then new.id
                                     else (to_jsonb(new) ->> 'activation_id')::uuid end;
  if tg_op = 'INSERT' then
    perform public.marketing_log(new.organization_id, new.project_id,
                                 case tg_table_name when 'marketing_activations' then 'activation.created'
                                                    else 'evidence.created' end,
                                 new.id, v_activation, null,
                                 to_jsonb(new) - array['organization_id', 'project_id', 'created_by',
                                                       'created_at', 'updated_at'], null);
    return null;
  end if;
  select d.old_value, d.new_value into v_old, v_new
    from public.marketing_diff(to_jsonb(old), to_jsonb(new), v_skip) d;
  if v_new = '{}'::jsonb then
    return null;
  end if;
  if tg_table_name = 'marketing_activations' then
    v_kind := case when v_new ? 'archived_at' then
                     case when new.archived_at is null then 'activation.restored'
                          else 'activation.archived' end
                   else 'activation.updated' end;
  else
    v_kind := case when v_new ? 'archived_at' then 'evidence.archived'
                   when v_new ? 'link_unreachable_at' and (v_new - 'link_unreachable_at') = '{}'::jsonb then
                     case when new.link_unreachable_at is null then 'evidence.link_restored'
                          else 'evidence.link_unreachable' end
                   when v_new ? 'verification' and new.verification = 'verified' then 'evidence.verified'
                   when v_new ? 'verification' and old.verification = 'verified' then 'evidence.unverified'
                   else 'evidence.updated' end;
  end if;
  perform public.marketing_log(new.organization_id, new.project_id, v_kind, new.id, v_activation,
                               v_old, v_new, null);
  return null;
end;
$$;
revoke execute on function public.marketing_activity_events_write() from public, anon, authenticated;
create trigger z_events after insert or update on public.marketing_activations
  for each row execute function public.marketing_activity_events_write();
create trigger z_events after insert or update on public.marketing_evidence
  for each row execute function public.marketing_activity_events_write();
