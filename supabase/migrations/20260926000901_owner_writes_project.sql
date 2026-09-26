-- Only the project's owner writes inside a project; everyone else reads.
-- The owner is the project manager who accepted the project (and still holds
-- pilot_projects). The director reads and decides validations, never writes
-- the framing, the calls or the release. A validation is asked of a holder of
-- "validate" only.
--
-- Scope: framing (field_values, needs, project_team_members, open_points,
-- tasks), calls (calls, transcripts, call_reports, report_items, audio files),
-- release (releases, share_links, detection). Reading is unchanged.
-- Exception: whoever a task is assigned to may still tick it done.

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.owner_person_id is not null
      and p.owner_person_id = public.auth_person_id()
      and public.has_permission(p.organization_id, 'pilot_projects')
  );
$$;

revoke execute on function public.is_project_owner(uuid) from public, anon;
grant execute on function public.is_project_owner(uuid) to authenticated;

create or replace function public.is_call_owner(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.calls c
    where c.id = p_call_id and public.is_project_owner(c.project_id)
  );
$$;

revoke execute on function public.is_call_owner(uuid) from public, anon;
grant execute on function public.is_call_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Write policies: member → owner
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['field_values', 'needs', 'project_team_members', 'open_points', 'tasks', 'calls', 'releases', 'share_links']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_insert_members', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_members', t);
    execute format('create policy %I on public.%I for insert to authenticated
                    with check (public.is_project_owner(project_id))', t || '_insert_owner', t);
  end loop;

  foreach t in array array['needs', 'project_team_members', 'open_points', 'calls', 'releases', 'share_links']
  loop
    execute format('create policy %I on public.%I for update to authenticated
                    using (public.is_project_owner(project_id))
                    with check (public.is_project_owner(project_id))', t || '_update_owner', t);
  end loop;
end;
$$;

-- Tasks: the owner edits; the assignee may still tick their own task.
create policy tasks_update_owner_or_assignee on public.tasks
  for update to authenticated
  using (public.is_project_owner(project_id)
         or (assignee_person_id = public.auth_person_id() and public.is_active_member(organization_id)))
  with check (public.is_project_owner(project_id)
              or (assignee_person_id = public.auth_person_id() and public.is_active_member(organization_id)));

-- Tables reached through their call.
drop policy transcripts_insert_members on public.transcripts;
create policy transcripts_insert_owner on public.transcripts
  for insert to authenticated with check (public.is_call_owner(call_id));

drop policy call_reports_insert_members on public.call_reports;
create policy call_reports_insert_owner on public.call_reports
  for insert to authenticated with check (public.is_call_owner(call_id));

drop policy report_items_insert_members on public.report_items;
create policy report_items_insert_owner on public.report_items
  for insert to authenticated
  with check (exists (select 1 from public.call_reports r
                      where r.id = report_id and public.is_call_owner(r.call_id)));

-- Audio files: "<organization_id>/<call_id>/<file>".
drop policy call_audio_insert_members on storage.objects;
create policy call_audio_insert_owner
  on storage.objects for insert to authenticated
  with check (bucket_id = 'call-audio'
              and public.is_call_owner(public.try_uuid((storage.foldername(name))[2])));

-- ---------------------------------------------------------------------------
-- Stage transitions: the owner starts and submits, to a validator only
-- ---------------------------------------------------------------------------

create or replace function public.start_stage(p_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state not in ('not_started', 'validated') then
    raise exception 'invalid_transition';
  end if;
  update public.project_stages
     set state = 'in_progress', state_changed_at = now(), state_changed_by = public.auth_person_id()
   where id = p_stage_id;
end;
$$;

create or replace function public.request_validation(
  p_stage_id uuid,
  p_validator_person_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_id uuid;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'in_progress' then
    raise exception 'invalid_transition';
  end if;
  -- Only someone who validates (the director) is asked.
  if not public.person_has_permission(v_stage.organization_id, p_validator_person_id, 'validate') then
    raise exception 'validator_not_allowed';
  end if;

  insert into public.validations
    (organization_id, project_stage_id, requested_by, validator_person_id, request_note)
  values
    (v_stage.organization_id, p_stage_id, public.auth_person_id(), p_validator_person_id,
     nullif(btrim(p_note), ''))
  returning id into v_id;

  update public.project_stages
     set state = 'awaiting_validation', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = p_stage_id;
  return v_id;
end;
$$;

-- Validators offered to the owner when asking for a validation.
create or replace function public.list_validators(p_organization_id uuid)
returns table (person_id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name
  from public.people p
  where public.is_active_member(p_organization_id)
    and public.person_has_permission(p_organization_id, p.id, 'validate')
  order by p.first_name, p.last_name;
$$;

revoke execute on function public.list_validators(uuid) from public, anon;
grant execute on function public.list_validators(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Release detection ("vérifier maintenant"): the owner or the server job
-- ---------------------------------------------------------------------------

create or replace function public.record_release_detection(p_release_id uuid, p_links jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.releases%rowtype;
  v_link jsonb;
  v_platform text;
  v_url text;
  v_source text;
  v_platforms text[] := '{}';
  v_detected boolean := false;
begin
  select * into v_release from public.releases where id = p_release_id for update;
  if not found
     or not (auth.role() = 'service_role' or public.is_project_owner(v_release.project_id)) then
    raise exception 'release_not_found';
  end if;

  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    raise exception 'invalid_links';
  end if;

  -- Validate everything before writing anything.
  for v_link in select value from jsonb_array_elements(p_links) loop
    v_platform := v_link ->> 'platform';
    v_url := v_link ->> 'url';
    v_source := v_link ->> 'source';
    if jsonb_typeof(v_link) <> 'object'
       or v_platform is null or v_platform not in ('spotify', 'appleMusic', 'deezer',
         'youtubeMusic', 'youtube', 'tidal', 'amazonMusic', 'soundcloud')
       or v_url is null or v_url !~ '^https://[^\s]+$' or length(v_url) > 2048
       or v_source is null or v_source not in ('deezer', 'itunes', 'musicbrainz', 'odesli', 'manual')
       or v_platform = any (v_platforms) then
      raise exception 'invalid_link';
    end if;
    v_platforms := v_platforms || v_platform;
    v_detected := v_detected or v_source <> 'manual';
  end loop;

  -- A manual link no longer supplied (URL cleared or replaced by detection).
  delete from public.release_links l
   where l.release_id = p_release_id
     and l.source = 'manual'
     and not (l.platform = any (v_platforms));

  insert into public.release_links (organization_id, release_id, platform, url, source)
  select v_release.organization_id, p_release_id, e ->> 'platform', e ->> 'url', e ->> 'source'
    from jsonb_array_elements(p_links) e
  on conflict (release_id, platform) do update
    set url = excluded.url,
        source = excluded.source,
        last_seen_at = now();

  update public.releases
     set last_checked_at = now(),
         online_detected_at = case when v_detected then coalesce(online_detected_at, now())
                                   else online_detected_at end
   where id = p_release_id
  returning * into v_release;

  return jsonb_build_object(
    'online_detected_at', v_release.online_detected_at,
    'last_checked_at', v_release.last_checked_at,
    'link_count', jsonb_array_length(p_links)
  );
end;
$$;
