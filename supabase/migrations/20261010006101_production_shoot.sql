-- Production, lot 3 (ticket « Workflow Production complet », parcours 11 à
-- 13; docs/ARCHITECTURE.md § 8 nonies): the shoot of a deliverable.
--   1. production_shoots: the state of the shoot (prévu, en cours, terminé,
--      partiel, reporté, interrompu), observations, missing sequences,
--      deviations; then three separate declarations — video rushes received,
--      audio sources received, backup verified — each with who and when. A
--      declaration is a person's word, never a check of the files;
--   2. the shoot report: consolidated by the code, validated by the owner;
--   3. production_incidents: impact, who follows it, the follow-up and its
--      resolution; whether it blocks the administrative closing and/or the
--      postproduction is a person's choice (never automatic).
-- The equipment's return is tracked on production_equipment (lot 2).
-- The owner writes, while the « production » stage runs.

create table public.production_shoots (
  sheet_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  -- planned = prévu; in_progress = en cours; done = terminé; partial =
  -- partiel; postponed = reporté; interrupted = interrompu.
  state text not null default 'planned',
  observations text,
  missing_sequences text,
  deviations text,
  -- Declarations: set to true by a person, stamped by the database.
  video_rushes boolean not null default false,
  video_rushes_by uuid references public.people (id),
  video_rushes_at timestamptz,
  audio_sources boolean not null default false,
  audio_sources_by uuid references public.people (id),
  audio_sources_at timestamptz,
  backup_verified boolean not null default false,
  backup_verified_by uuid references public.people (id),
  backup_verified_at timestamptz,
  -- Where the files are (a Drive, a disk…): a description, never checked.
  files_location text,
  report_note text,
  report_validated_by uuid references public.people (id),
  report_validated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint production_shoots_state_check check (state in (
    'planned', 'in_progress', 'done', 'partial', 'postponed', 'interrupted')),
  constraint production_shoots_texts_check check (
    coalesce(char_length(observations), 0) <= 4000
    and coalesce(char_length(missing_sequences), 0) <= 2000
    and coalesce(char_length(deviations), 0) <= 2000
    and coalesce(char_length(files_location), 0) <= 1000
    and coalesce(char_length(report_note), 0) <= 4000),
  constraint production_shoots_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_shoots_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create trigger a_child before insert or update on public.production_shoots
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_shoots
  for each row execute function public.set_updated_at();

-- The shoot starts only once the sheet is « Prête pour tournage »; each
-- declaration is stamped with who and when; a partial or interrupted shoot
-- names what is missing. A change after the report's validation reopens it.
create function public.production_shoots_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.auth_person_id();
begin
  if new.state in ('in_progress', 'done', 'partial', 'interrupted')
     and (tg_op = 'INSERT' or old.state in ('planned', 'postponed'))
     and not exists (select 1 from public.production_sheets s
                      where s.id = new.sheet_id and s.ready_at is not null) then
    raise exception 'not_ready' using errcode = '23514';
  end if;
  if new.state in ('partial', 'interrupted') and btrim(coalesce(new.missing_sequences, '')) = '' then
    raise exception 'missing_sequences_required' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' or new.video_rushes is distinct from old.video_rushes then
    new.video_rushes_by := case when new.video_rushes then v_me end;
    new.video_rushes_at := case when new.video_rushes then now() end;
  end if;
  if tg_op = 'INSERT' or new.audio_sources is distinct from old.audio_sources then
    new.audio_sources_by := case when new.audio_sources then v_me end;
    new.audio_sources_at := case when new.audio_sources then now() end;
  end if;
  if tg_op = 'INSERT' or new.backup_verified is distinct from old.backup_verified then
    new.backup_verified_by := case when new.backup_verified then v_me end;
    new.backup_verified_at := case when new.backup_verified then now() end;
  end if;
  if tg_op = 'UPDATE' and old.report_validated_at is not null
     and (new.state, new.observations, new.missing_sequences, new.deviations, new.video_rushes,
          new.audio_sources, new.backup_verified, new.files_location, new.report_note)
         is distinct from
         (old.state, old.observations, old.missing_sequences, old.deviations, old.video_rushes,
          old.audio_sources, old.backup_verified, old.files_location, old.report_note)
     and new.report_validated_at is not distinct from old.report_validated_at then
    new.report_validated_by := null;
    new.report_validated_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_shoots_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_shoots
  for each row execute function public.production_shoots_check();

alter table public.production_shoots enable row level security;
alter table public.production_shoots force row level security;
revoke all on table public.production_shoots from anon, authenticated;
grant select on public.production_shoots to authenticated;
grant insert (sheet_id, organization_id, project_id, state, observations, missing_sequences,
              deviations, video_rushes, audio_sources, backup_verified, files_location,
              report_note)
  on public.production_shoots to authenticated;
grant update (state, observations, missing_sequences, deviations, video_rushes, audio_sources,
              backup_verified, files_location, report_note)
  on public.production_shoots to authenticated;
create policy production_shoots_select on public.production_shoots
  for select to authenticated using (public.can_see_project(project_id));
create policy production_shoots_insert on public.production_shoots
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_shoots_update on public.production_shoots
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));

-- « Valider le compte rendu de tournage »: the owner, once the shoot ended
-- (done, partial or interrupted).
create function public.validate_production_shoot_report(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_shoots%rowtype;
begin
  select * into v from public.production_shoots where sheet_id = p_sheet_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'shoot_not_found';
  end if;
  if not public.production_can_organize(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.state not in ('done', 'partial', 'interrupted') then
    raise exception 'shoot_not_ended';
  end if;
  update public.production_shoots
     set report_validated_by = public.auth_person_id(), report_validated_at = now()
   where sheet_id = p_sheet_id;
end;
$$;
revoke execute on function public.validate_production_shoot_report(uuid) from public, anon;
grant execute on function public.validate_production_shoot_report(uuid) to authenticated;

-- Incidents ----------------------------------------------------------------------

create table public.production_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  title text not null,
  impact text,
  -- Who follows it: a member or a Réseau contact.
  person_id uuid references public.people (id),
  contact_id uuid,
  follow_up text,
  -- A person's choice, never automatic.
  blocks_closing boolean not null default false,
  blocks_post boolean not null default false,
  resolution text,
  resolved_by uuid references public.people (id),
  resolved_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_incidents_title_check
    check (btrim(title) <> '' and char_length(title) <= 200),
  constraint production_incidents_texts_check check (
    coalesce(char_length(impact), 0) <= 2000
    and coalesce(char_length(follow_up), 0) <= 2000
    and coalesce(char_length(resolution), 0) <= 2000),
  constraint production_incidents_resolved_check
    check ((resolved_at is null) = (resolved_by is null)),
  constraint production_incidents_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_incidents_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_incidents_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index production_incidents_sheet_idx on public.production_incidents (sheet_id, created_at);
create trigger a_set_created_by before insert on public.production_incidents
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_incidents
  for each row execute function public.production_child_check();

-- Resolved = a resolution written by a person; who and when stamped here.
create function public.production_incidents_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.person_id, new.contact_id);
  new.resolution := nullif(btrim(coalesce(new.resolution, '')), '');
  if new.resolution is null then
    new.resolved_by := null;
    new.resolved_at := null;
  elsif tg_op = 'INSERT' or old.resolution is null then
    new.resolved_by := public.auth_person_id();
    new.resolved_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.production_incidents_check() from public, anon, authenticated;
create trigger b_check before insert or update on public.production_incidents
  for each row execute function public.production_incidents_check();

alter table public.production_incidents enable row level security;
alter table public.production_incidents force row level security;
revoke all on table public.production_incidents from anon, authenticated;
grant select, delete on public.production_incidents to authenticated;
grant insert (organization_id, project_id, sheet_id, title, impact, person_id, contact_id,
              follow_up, blocks_closing, blocks_post, resolution)
  on public.production_incidents to authenticated;
grant update (title, impact, person_id, contact_id, follow_up, blocks_closing, blocks_post,
              resolution)
  on public.production_incidents to authenticated;
create policy production_incidents_select on public.production_incidents
  for select to authenticated using (public.can_see_project(project_id));
create policy production_incidents_insert on public.production_incidents
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_incidents_update on public.production_incidents
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));
create policy production_incidents_delete on public.production_incidents
  for delete to authenticated using (public.production_can_organize(project_id));
