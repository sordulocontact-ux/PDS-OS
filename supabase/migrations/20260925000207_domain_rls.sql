-- Row level security on business tables.
--
-- One rule everywhere: an active member of the organization reads and writes
-- its rows; nobody else sees anything. anon has no table access at all (the
-- public smartlink goes through get_smartlink()). Clients may only write the
-- columns granted below; authorship, timestamps, states and detection results
-- are set by triggers, functions or the server-side job.

do $$
declare
  t text;
begin
  -- Timestamps and authorship.
  foreach t in array array['stage_definitions', 'artists', 'projects', 'project_stages',
    'releases', 'calls', 'needs', 'project_team_members', 'tasks', 'open_points']
  loop
    execute format('create trigger a_set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array['artists', 'projects', 'releases', 'share_links', 'calls',
    'transcripts', 'call_reports', 'field_values', 'needs', 'project_team_members',
    'tasks', 'open_points']
  loop
    execute format('create trigger a_set_created_by before insert on public.%I
                    for each row execute function public.set_created_by()', t);
  end loop;

  -- RLS on, forced, default privileges revoked, members can read.
  foreach t in array array['stage_definitions', 'artists', 'projects', 'project_stages',
    'releases', 'release_links', 'share_links', 'calls', 'transcripts', 'call_reports',
    'report_items', 'field_values', 'needs', 'project_team_members', 'tasks',
    'open_points', 'validations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (public.is_active_member(organization_id))', t || '_select_members', t);
  end loop;

  -- Members can insert and update where columns are granted.
  foreach t in array array['artists', 'projects', 'releases', 'share_links', 'calls',
    'transcripts', 'call_reports', 'report_items', 'field_values', 'needs',
    'project_team_members', 'tasks', 'open_points']
  loop
    execute format('create policy %I on public.%I for insert to authenticated
                    with check (public.is_active_member(organization_id))', t || '_insert_members', t);
  end loop;

  foreach t in array array['artists', 'projects', 'releases', 'share_links', 'calls',
    'needs', 'project_team_members', 'tasks', 'open_points']
  loop
    execute format('create policy %I on public.%I for update to authenticated
                    using (public.is_active_member(organization_id))
                    with check (public.is_active_member(organization_id))', t || '_update_members', t);
  end loop;
end;
$$;

-- Stage definitions are configuration: admins only.
create policy stage_definitions_insert_admin on public.stage_definitions
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy stage_definitions_update_admin on public.stage_definitions
  for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
grant insert (organization_id, key, position, label, deliverable) on public.stage_definitions to authenticated;
grant update (label, position, deliverable, archived_at) on public.stage_definitions to authenticated;

-- Column grants: what a client may write.
grant insert (organization_id, name) on public.artists to authenticated;
grant update (name, archived_at) on public.artists to authenticated;

grant insert (organization_id, artist_id, title, release_type, owner_person_id) on public.projects to authenticated;
grant update (artist_id, title, release_type, owner_person_id, archived_at) on public.projects to authenticated;

grant insert (organization_id, project_id, title, isrc, upc, planned_release_date, spotify_url) on public.releases to authenticated;
grant update (title, isrc, upc, planned_release_date, spotify_url, smartlink_enabled) on public.releases to authenticated;

grant insert (organization_id, project_id, scope, expires_at) on public.share_links to authenticated;
grant update (expires_at, revoked_at) on public.share_links to authenticated;

grant insert (organization_id, project_id, title, occurred_at, consent, consent_note) on public.calls to authenticated;
grant update (title, occurred_at, consent, consent_note, audio_path, audio_mime, audio_bytes, status, error_code) on public.calls to authenticated;

grant insert (organization_id, call_id, text, language, duration_seconds, segments, provider, model, processing_ms) on public.transcripts to authenticated;

grant insert (organization_id, call_id, transcript_id, summary, provider, model, processing_ms, input_tokens, output_tokens) on public.call_reports to authenticated;

grant insert (organization_id, report_id, kind, position, what, who, why, need_family, quote, located, start_seconds, end_seconds) on public.report_items to authenticated;

grant insert (organization_id, project_id, deliverable, field_key, value, status, source_type, source_report_item_id, source_quote, source_start_seconds) on public.field_values to authenticated;

grant insert (organization_id, project_id, label, family, state, review_status, source_type, source_report_item_id, source_quote, source_start_seconds) on public.needs to authenticated;
grant update (label, family, state, review_status) on public.needs to authenticated;

grant insert (organization_id, project_id, person_id, display_name, role, review_status, source_type, source_report_item_id, source_quote, source_start_seconds) on public.project_team_members to authenticated;
grant update (person_id, display_name, role, review_status) on public.project_team_members to authenticated;

grant insert (organization_id, project_id, title, assignee_person_id, due_date, source_report_item_id) on public.tasks to authenticated;
grant update (title, assignee_person_id, due_date, status, done_at) on public.tasks to authenticated;

grant insert (organization_id, project_id, question, source_report_item_id) on public.open_points to authenticated;
grant update (question, status, resolution, resolved_at) on public.open_points to authenticated;

revoke all on public.current_field_values from anon, authenticated;
grant select on public.current_field_values to authenticated;
