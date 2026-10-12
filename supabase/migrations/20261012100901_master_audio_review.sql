-- Retours Catalogue du 11/10/2026, retours 01, 07, 10, 13, 18, 19, 24, 25 et
-- 26 (docs/ARCHITECTURE.md § 2 septies, « Versions et validation »).
--
-- Depositing a file is not validating it. Each audio version of a title gets
-- its own review (null = not examined, changes requested with what to
-- change, approved), attached to that exact file; a decision is never
-- rewritten (a new version is deposited instead). The title is « Finalisé »
-- only once a Master final file is approved (final_validated_at), never
-- because one was deposited. A decision taken in a project's Master
-- workflow is the same decision, mirrored on the file.
--
-- Also: a version can be reclassified to its right state while nobody
-- examined or used it; an approved version, or one a project's workflow
-- uses, cannot be deleted; members comment a version at an instant of the
-- recording (timecoded, append-only).

-- ---------------------------------------------------------------------------
-- 1. Review of a version
-- ---------------------------------------------------------------------------

alter table public.master_files
  add column review_status text,
  add column review_note text,
  add column reviewed_by uuid references public.people (id),
  add column reviewed_at timestamptz;

alter table public.master_files
  add constraint master_files_review_status_check
    check (review_status is null or review_status in ('changes_requested', 'approved')),
  -- Only an audio version is reviewed; a decision says who and when.
  add constraint master_files_review_shape_check
    check (review_status is null
           or (category = 'audio' and reviewed_at is not null)),
  add constraint master_files_review_note_check
    check (review_note is null
           or (btrim(review_note) <> '' and char_length(review_note) <= 2000));

alter table public.masters
  add column final_validated_at timestamptz,
  add column final_validated_by uuid references public.people (id);

-- An approved Master final validates the title (once: the first approval
-- stays the date it was finalised).
create or replace function public.master_files_finalize_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category = 'audio' and new.review_status = 'approved'
     and new.audio_state = 'final_master'
     and (old.review_status is distinct from 'approved'
          or old.audio_state is distinct from 'final_master') then
    update public.masters
       set final_validated_at = coalesce(new.reviewed_at, now()),
           final_validated_by = new.reviewed_by
     where id = new.master_id and final_validated_at is null;
  end if;
  return null;
end;
$$;
revoke execute on function public.master_files_finalize_title() from public, anon, authenticated;
create trigger y_finalize_title after update of review_status, audio_state
  on public.master_files
  for each row execute function public.master_files_finalize_title();

-- « Valider cette version » / « Demander des corrections » from the title:
-- whoever writes the title (manage_catalog, live title). A change request
-- says what to change. Decided once.
create or replace function public.review_master_audio(
  p_file_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.master_files%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.master_files where id = p_file_id for update;
  if not found or v.category <> 'audio'
     or not public.has_permission(v.organization_id, 'manage_catalog')
     or not public.master_is_live(v.master_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if v.review_status is not null then
    raise exception 'already_reviewed' using errcode = 'P0001';
  end if;
  if p_decision = 'changes_requested' and v_note is null then
    raise exception 'note_required' using errcode = '23514';
  end if;
  update public.master_files
     set review_status = p_decision, review_note = v_note,
         reviewed_by = public.auth_person_id(), reviewed_at = now()
   where id = p_file_id;
end;
$$;
revoke execute on function public.review_master_audio(uuid, text, text) from public, anon;
grant execute on function public.review_master_audio(uuid, text, text) to authenticated;

-- A decision of a project's Master workflow (decide_mix_version) is the
-- file's decision too, unless the file was already examined.
create or replace function public.master_mix_versions_mirror_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.decision is not null and old.decision is null then
    update public.master_files
       set review_status = new.decision,
           review_note = coalesce(new.decision_note, new.feedback_summary),
           reviewed_by = new.decided_by,
           reviewed_at = coalesce(new.decided_at, now())
     where id = new.file_id and review_status is null;
  end if;
  return null;
end;
$$;
revoke execute on function public.master_mix_versions_mirror_review() from public, anon, authenticated;
create trigger z_mirror_review after update of decision on public.master_mix_versions
  for each row execute function public.master_mix_versions_mirror_review();

-- What the workflows already decided.
update public.master_files f
   set review_status = v.decision,
       review_note = coalesce(v.decision_note, v.feedback_summary),
       reviewed_by = v.decided_by,
       reviewed_at = coalesce(v.decided_at, now())
  from public.master_mix_versions v
 where v.file_id = f.id and v.decision is not null and f.review_status is null;

update public.masters m
   set final_validated_at = f.reviewed_at, final_validated_by = f.reviewed_by
  from (select distinct on (master_id) master_id, reviewed_at, reviewed_by
          from public.master_files
         where category = 'audio' and audio_state = 'final_master'
           and review_status = 'approved'
         order by master_id, reviewed_at) f
 where f.master_id = m.id and m.final_validated_at is null;

-- ---------------------------------------------------------------------------
-- 2. Reclassifying a version, deleting one
-- ---------------------------------------------------------------------------

-- A version is used when a project's workflow refers to it (a version of
-- the mix or the mastering, a confirmed source).
create or replace function public.master_file_in_use(p_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_mix_versions v where v.file_id = p_file_id)
      or exists (select 1 from public.master_flow_sources s where s.file_id = p_file_id);
$$;
revoke execute on function public.master_file_in_use(uuid) from public, anon;
grant execute on function public.master_file_in_use(uuid) to authenticated;

-- « Corriger l'étape » of a version deposited at the wrong state, while
-- nobody examined nor used it. The title follows its files: it takes the
-- most advanced state among them when that is higher, and goes back when
-- this file was the one that carried it.
create or replace function public.reclassify_master_audio(p_file_id uuid, p_state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.master_files%rowtype;
  v_top text;
begin
  select * into v from public.master_files where id = p_file_id for update;
  if not found or v.category <> 'audio'
     or not public.has_permission(v.organization_id, 'manage_catalog')
     or not public.master_is_live(v.master_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if public.audio_state_rank(p_state) is null then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if v.review_status is not null or public.master_file_in_use(p_file_id) then
    raise exception 'audio_locked' using errcode = 'P0001';
  end if;
  if v.audio_state = p_state then
    return;
  end if;
  update public.master_files set audio_state = p_state where id = p_file_id;

  select f.audio_state into v_top from public.master_files f
   where f.master_id = v.master_id and f.category = 'audio'
   order by public.audio_state_rank(f.audio_state) desc limit 1;
  update public.masters m
     set audio_state = v_top
   where m.id = v.master_id
     and m.audio_state is distinct from v_top
     and (m.audio_state is null
          or public.audio_state_rank(m.audio_state) < public.audio_state_rank(v_top)
          or m.audio_state = v.audio_state);
end;
$$;
revoke execute on function public.reclassify_master_audio(uuid, text) from public, anon;
grant execute on function public.reclassify_master_audio(uuid, text) to authenticated;

-- Deleting a version: never an approved one, nor one a workflow uses (the
-- history of decisions stays true). Other files keep the former rule.
drop policy master_files_delete_catalog on public.master_files;
create policy master_files_delete_catalog on public.master_files
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog')
         and public.master_is_live(master_id)
         and (category <> 'audio'
              or (review_status is distinct from 'approved'
                  and not public.master_file_in_use(id))));

-- The journal says each decision and each reclassification.
alter table public.activity_events drop constraint activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'artist_created', 'artist_updated',
  'contact_added', 'contact_updated', 'contact_removed',
  'file_added', 'file_updated', 'file_removed', 'audio_reviewed',
  'master_created', 'master_credited', 'master_updated',
  'master_item_added', 'master_item_updated', 'master_item_removed',
  'project_created', 'project_linked',
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested'));

create or replace function public.master_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_files := coalesce(new, old);
begin
  if tg_op = 'UPDATE' then
    if new.review_status is distinct from old.review_status then
      perform public.log_master_event(
        new.organization_id, new.master_id, 'audio_reviewed', new.id,
        jsonb_build_object('name', new.file_name, 'audio_state', new.audio_state,
                           'decision', new.review_status));
    end if;
    if (new.file_name, new.category, new.description, new.audio_state)
       is not distinct from (old.file_name, old.category, old.description, old.audio_state) then
      return null;
    end if;
    perform public.log_master_event(
      new.organization_id, new.master_id, 'file_updated', new.id,
      jsonb_strip_nulls(jsonb_build_object(
        'name', new.file_name, 'category', new.category,
        'previous_category', nullif(old.category, new.category),
        'audio_state', new.audio_state,
        'previous_audio_state', nullif(old.audio_state, new.audio_state))),
      null, 'contract' in (old.category, new.category));
    return null;
  end if;
  perform public.log_master_event(
    v_row.organization_id, v_row.master_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category,
                                 'audio_state', v_row.audio_state),
    null, v_row.category = 'contract');
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Timecoded comments on a version
-- ---------------------------------------------------------------------------

create table public.master_file_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  master_id uuid not null,
  file_id uuid not null references public.master_files (id) on delete cascade,
  -- The instant of the recording it is about, in seconds; null = the whole.
  at_seconds integer,
  body text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default clock_timestamp(),
  constraint master_file_comments_at_check
    check (at_seconds is null or at_seconds between 0 and 86399),
  constraint master_file_comments_body_check
    check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint master_file_comments_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
    on delete cascade
);
create index master_file_comments_file_idx on public.master_file_comments (file_id, created_at);

-- The comment is on an audio version of its title.
create or replace function public.master_file_comments_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.master_files f
                  where f.id = new.file_id and f.master_id = new.master_id
                    and f.category = 'audio') then
    raise exception 'comment_not_on_audio' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.master_file_comments_check() from public, anon, authenticated;
create trigger a_check before insert on public.master_file_comments
  for each row execute function public.master_file_comments_check();
create trigger a_set_created_by before insert on public.master_file_comments
  for each row execute function public.set_created_by();

alter table public.master_file_comments enable row level security;
alter table public.master_file_comments force row level security;
revoke all on table public.master_file_comments from anon, authenticated;
grant select on table public.master_file_comments to authenticated;
grant insert (organization_id, master_id, file_id, at_seconds, body)
  on public.master_file_comments to authenticated;

-- Every member listens and comments a live title; never rewritten.
create policy master_file_comments_select_members on public.master_file_comments
  for select to authenticated using (public.is_active_member(organization_id));
create policy master_file_comments_insert_members on public.master_file_comments
  for insert to authenticated
  with check (public.is_active_member(organization_id)
              and public.master_is_live(master_id));
