-- Editing what was created: an artist (column grants already exist), a master
-- and a project that is not launched yet. Written with the user's session, as
-- the creation: PO proposes, a person reviews and saves (docs/ASSISTANT.md).
--
--   * a project is editable by whoever may create projects, while it has no
--     stage (not launched: not transmitted, pending, refused or returned).
--     Once launched, its content lives in the stages, written by its owner;
--   * update_master replaces the credits in one transaction (the deferred
--     credits check still requires one artist at commit);
--   * update_project replaces the linked masters the same way (the deferred
--     master check still applies to a music release).

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create or replace function public.is_project_launched(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_stages s where s.project_id = p_project_id);
$$;

revoke execute on function public.is_project_launched(uuid) from public, anon;
grant execute on function public.is_project_launched(uuid) to authenticated;

-- Left over from the first domain migration: any active member could update
-- the granted columns (title, budget…) of any project, launched or not.
drop policy if exists projects_update_members on public.projects;

create policy projects_update_before_launch on public.projects
  for update to authenticated
  using (public.has_permission(organization_id, 'create_projects')
         and public.can_see_project_row(organization_id, id, owner_person_id)
         and not public.is_project_launched(id))
  with check (public.has_permission(organization_id, 'create_projects')
              and not public.is_project_launched(id));

create or replace function public.update_project(
  p_project_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_framing_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_type = 'music_release' and coalesce(cardinality(p_master_ids), 0) = 0 then
    raise exception 'music_release_requires_master';
  end if;

  update public.projects
     set title = btrim(p_title),
         type = p_type,
         due_date = p_due_date,
         budget_cents = p_budget_cents,
         priority = p_priority,
         framing_notes = nullif(btrim(p_framing_notes), '')
   where id = p_project_id
  returning organization_id into v_org;

  -- RLS filtered the row out: launched, invisible, or no right.
  if v_org is null then
    raise exception 'project_not_editable';
  end if;

  delete from public.project_masters where project_id = p_project_id;
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select v_org, p_project_id, m.id, m.ordinality::integer
    from unnest(coalesce(p_master_ids, '{}'::uuid[])) with ordinality as m (id, ordinality);
end;
$$;

revoke execute on function public.update_project(uuid, text, text, uuid[], date, bigint, text, text) from public, anon;
grant execute on function public.update_project(uuid, text, text, uuid[], date, bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------

create or replace function public.update_master(
  p_master_id uuid,
  p_title text,
  p_credits jsonb,
  p_version text default null,
  p_isrc text default null,
  p_duration_seconds integer default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) = 0 then
    raise exception 'master_requires_artist';
  end if;

  update public.masters
     set title = btrim(p_title),
         version = nullif(btrim(p_version), ''),
         isrc = nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
         duration_seconds = p_duration_seconds
   where id = p_master_id
  returning organization_id into v_org;

  if v_org is null then
    raise exception 'master_not_editable';
  end if;

  delete from public.master_artists where master_id = p_master_id;
  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select v_org, p_master_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
    from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);
end;
$$;

revoke execute on function public.update_master(uuid, text, jsonb, text, text, integer) from public, anon;
grant execute on function public.update_master(uuid, text, jsonb, text, text, integer) to authenticated;
