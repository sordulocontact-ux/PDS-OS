-- Master, Source step (docs/projet-complet/master.md § 1, sub-lot M2; proto
-- `master-v2.html`, ticket « Workflow Master » § 2: « Attendre / Anticiper…
-- surveiller… proposer le remplacement… notifier le Mixeur »).
--
-- 1. A confirmation says whether the vocals of that version are final
--    (declared by the person who confirms: no field of the Cadrage carries
--    it, docs/CONTEXTE-PROJET.md § 2) and, when they are not, what is left
--    to record and the choice made: wait for them (the Mixage stays locked)
--    or anticipate with this working version (no mix can be validated
--    before the final vocals replace it).
-- 2. Each version of the mix remembers the source it was made on, so a mix
--    of a working version can never become the Mix final (decide_mix_version
--    refuses 'working_source').
-- 3. An existing mix declared Mix final always says why (rule 6).
-- 4. A newer audio version of a title whose vocals were awaited notifies the
--    project's owner (« PDS OS surveille le Catalogue »).
-- 5. Replacing the source of a package already sent updates the live link
--    (same token): the engineer reads « Nouvelle source le … ».

-- 1 --------------------------------------------------------------------------
alter table public.master_flow_sources
  add column vocals_final boolean,
  add column vocals_pending text,
  add column plan text,
  add constraint master_flow_sources_plan_check
    check (plan is null or plan in ('wait', 'anticipate')),
  add constraint master_flow_sources_vocals_check check (
    (vocals_final is distinct from false and plan is null and vocals_pending is null)
    or (vocals_final = false and plan is not null
        and (vocals_pending is null or char_length(btrim(vocals_pending)) between 1 and 200)));

grant insert (vocals_final, vocals_pending, plan)
  on public.master_flow_sources to authenticated;

-- 2 --------------------------------------------------------------------------
alter table public.master_mix_versions
  add column source_file_id uuid references public.master_files (id) on delete set null;

-- The source in force when the version arrives (the latest confirmation).
create or replace function public.master_mix_versions_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage = 'mix' and new.source_file_id is null then
    select s.file_id into new.source_file_id
      from public.master_flow_sources s
     where s.project_id = new.project_id and s.master_id = new.master_id
     order by s.created_at desc
     limit 1;
  end if;
  return new;
end;
$$;
revoke execute on function public.master_mix_versions_source() from public, anon, authenticated;
create trigger a_master_mix_versions_source before insert on public.master_mix_versions
  for each row execute function public.master_mix_versions_source();

-- Whether a version of the mix was made on a working version (vocals not
-- final when its source was confirmed).
create or replace function public.master_mix_on_working_source(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.vocals_final = false
      from public.master_mix_versions v
      join public.master_flow_sources s
        on s.project_id = v.project_id and s.master_id = v.master_id
       and s.file_id = v.source_file_id
     where v.id = p_version_id
     order by s.created_at desc
     limit 1), false);
$$;
revoke execute on function public.master_mix_on_working_source(uuid) from public, anon;
grant execute on function public.master_mix_on_working_source(uuid) to authenticated;

create or replace function public.decide_mix_version(p_version_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_validator uuid;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_message text;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select b.validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p
    left join public.master_briefs b on b.project_id = p.id
   where p.id = v_row.project_id;
  if v_actor is null
     or v_actor is distinct from coalesce(v_validator, v_owner)
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is not null then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.stage = v_row.stage and v.number > v_row.number) then
    raise exception 'not_latest';
  end if;
  if p_decision = 'approved' and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = v_row.project_id and v.master_id = v_row.master_id
          and v.stage = v_row.stage and v.decision = 'approved') then
    raise exception 'already_final';
  end if;
  -- A mix made on a working version never becomes the Mix final.
  if p_decision = 'approved' and v_row.stage = 'mix'
     and public.master_mix_on_working_source(v_row.id) then
    raise exception 'working_source' using errcode = '23514';
  end if;

  -- A change request always tells the engineer what to change: the feedback
  -- already sent, or else the synthesis saved, or else this note, sent now.
  if p_decision = 'changes_requested' and v_row.feedback_sent_at is null then
    v_message := coalesce(nullif(btrim(coalesce(v_row.feedback_summary, '')), ''), v_note);
    if v_message is null then
      raise exception 'note_required' using errcode = '23514';
    end if;
    update public.master_mix_versions
       set feedback_summary = v_message, status = 'feedback_sent',
           feedback_sent_at = now(), feedback_sent_by = v_actor
     where id = p_version_id;
    if v_message = v_note then
      v_note := null;
    end if;
  end if;

  update public.master_mix_versions
     set decision = p_decision, decision_note = v_note,
         decided_by = v_actor, decided_at = now()
   where id = p_version_id;

  if p_decision = 'approved' and v_row.stage = 'mastering' then
    update public.master_files set audio_state = 'final_master'
     where id = v_row.file_id and audio_state <> 'final_master';
    update public.masters set audio_state = 'final_master'
     where id = v_row.master_id;
  end if;

  if v_owner is not null and v_owner <> v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, v_actor,
            case
              when p_decision = 'approved' and v_row.stage = 'mix' then 'master_mix_approved'
              when p_decision = 'approved' then 'master_final_approved'
              when v_row.stage = 'mix' then 'master_mix_changes_requested'
              else 'master_mastering_changes_requested' end,
            v_row.project_id, v_row.id);
  end if;
end;
$$;

-- 3 --------------------------------------------------------------------------
create or replace function public.declare_mix_final(
  p_project_id uuid, p_master_id uuid, p_file_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.master_files%rowtype;
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters
                 where project_id = p_project_id and master_id = p_master_id) then
    raise exception 'title_not_in_project';
  end if;
  select * into v_file from public.master_files
   where id = p_file_id and master_id = p_master_id;
  if not found or v_file.category <> 'audio' or v_file.audio_state is distinct from 'mix' then
    raise exception 'not_a_mix';
  end if;
  if exists (select 1 from public.master_mix_versions
              where project_id = p_project_id and master_id = p_master_id
                and stage = 'mix' and decision = 'approved') then
    raise exception 'already_final';
  end if;
  if exists (select 1 from public.master_mix_versions
              where project_id = p_project_id and file_id = p_file_id) then
    raise exception 'already_a_version';
  end if;
  -- « Pourquoi ce mix est le bon » (proto, rule 6): always said.
  if v_note is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  insert into public.master_mix_versions
    (organization_id, project_id, master_id, file_id, stage, number, created_by,
     decision, decision_note, decided_by, decided_at)
  select v_file.organization_id, p_project_id, p_master_id, p_file_id, 'mix',
         coalesce(max(v.number), 0) + 1, public.auth_person_id(),
         'approved', v_note, public.auth_person_id(), now()
    from public.master_mix_versions v
   where v.project_id = p_project_id and v.master_id = p_master_id and v.stage = 'mix'
  returning id into v_id;
  return v_id;
end;
$$;

-- 4 --------------------------------------------------------------------------
select public.add_notification_kinds(array['master_source_newer']);

-- A new maquette or mise à plat of a title whose final vocals are awaited:
-- the owner of each project waiting for it is told, once per file.
create or replace function public.master_files_notify_newer_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_owner uuid;
begin
  if new.category <> 'audio' or new.audio_state is null
     or new.audio_state in ('mix', 'master', 'final_master') then
    return null;
  end if;
  for v_project, v_owner in
    select s.project_id, p.owner_person_id
      from (select distinct on (f.project_id) f.project_id, f.vocals_final
              from public.master_flow_sources f
             where f.master_id = new.master_id
             order by f.project_id, f.created_at desc) s
      join public.projects p on p.id = s.project_id
     where s.vocals_final = false
  loop
    perform public.notify(new.organization_id, v_owner, 'master_source_newer',
                          v_project, new.master_id);
  end loop;
  return null;
end;
$$;
revoke execute on function public.master_files_notify_newer_source() from public, anon, authenticated;
create trigger z_notify_newer_source after insert on public.master_files
  for each row execute function public.master_files_notify_newer_source();

-- 5 --------------------------------------------------------------------------
-- The owner replaces a title's source in the package of the live mix link:
-- the source and its stems (signed by the owner's session, like the
-- sending), and the day it changed, read by the engineer on the same link.
create or replace function public.refresh_master_transmission_source(
  p_project_id uuid, p_master_id uuid, p_source jsonb, p_stems jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_titles jsonb;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_source is null or jsonb_typeof(p_source) <> 'object'
     or coalesce(p_source ->> 'fileName', '') = '' or coalesce(p_source ->> 'url', '') = ''
     or p_stems is null or jsonb_typeof(p_stems) <> 'array' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  select * into v_row from public.master_transmissions
   where project_id = p_project_id and role = 'mix' and revoked_at is null
     and expires_at > now()
   order by created_at desc limit 1
   for update;
  if not found then
    return false;
  end if;
  select coalesce(jsonb_agg(
           case when t ->> 'masterId' = p_master_id::text
                then t || jsonb_build_object('source', p_source, 'stems', p_stems,
                                             'sourceUpdatedAt', now())
                else t end), '[]'::jsonb)
    into v_titles
    from jsonb_array_elements(coalesce(v_row.package -> 'titles', '[]'::jsonb)) t;
  if not exists (select 1 from jsonb_array_elements(v_titles) t
                  where t ->> 'masterId' = p_master_id::text) then
    return false;
  end if;
  update public.master_transmissions
     set package = jsonb_set(package, '{titles}', v_titles)
   where id = v_row.id;
  return true;
end;
$$;
revoke execute on function public.refresh_master_transmission_source(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.refresh_master_transmission_source(uuid, uuid, jsonb, jsonb) to authenticated;
