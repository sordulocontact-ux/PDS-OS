-- Project creation follows the type chosen (feedback n°2, 27/09/2026,
-- docs/CONTEXTE-PROJET.md § 12 bis):
--
--   * three families only: music (stored `music_release`), content and event.
--     A partnership is not a project: the type goes, existing ones become
--     content. Event stays in the model but no new one is created in V1;
--   * a music project names its format (single, EP…). A single links exactly
--     one master; the others at least one (the existing commit-time rule);
--   * a content project is either an edition of a reusable PDS format
--     (content_formats, "PDS Mic": data, never code) or a one-off content, and
--     may name one artist. Format ≠ project: each edition is a new project;
--   * "Notes de cadrage" becomes the initial context (initial_context): what is
--     known when the project is transmitted, not the framing Brief.

-- ---------------------------------------------------------------------------
-- Reusable content formats
-- ---------------------------------------------------------------------------

create table public.content_formats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  description text,
  created_by uuid references public.people (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_formats_name_not_blank check (btrim(name) <> ''),
  constraint content_formats_name_length check (char_length(name) <= 120),
  constraint content_formats_description_length
    check (description is null or char_length(description) <= 2000),
  constraint content_formats_id_org_key unique (id, organization_id)
);

create unique index content_formats_org_name_key
  on public.content_formats (organization_id, lower(btrim(name)));

create trigger a_set_created_by before insert on public.content_formats
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.content_formats
  for each row execute function public.set_updated_at();

alter table public.content_formats enable row level security;
alter table public.content_formats force row level security;
revoke all on table public.content_formats from anon, authenticated;
grant select on table public.content_formats to authenticated;
grant insert (organization_id, name, description) on public.content_formats to authenticated;
grant update (name, description) on public.content_formats to authenticated;

-- Every member reads the formats (a project shows its format); whoever
-- creates projects creates and edits them.
create policy content_formats_select_members on public.content_formats
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy content_formats_insert_creators on public.content_formats
  for insert to authenticated
  with check (public.has_permission(organization_id, 'create_projects'));

create policy content_formats_update_creators on public.content_formats
  for update to authenticated
  using (public.has_permission(organization_id, 'create_projects'))
  with check (public.has_permission(organization_id, 'create_projects'));

-- ---------------------------------------------------------------------------
-- Projects: types, formats, initial context
-- ---------------------------------------------------------------------------

update public.projects set type = 'content' where type = 'partnership';

alter table public.projects drop constraint projects_type_check;
alter table public.projects
  add constraint projects_type_check check (type in ('music_release', 'content', 'event'));

alter table public.projects rename column framing_notes to initial_context;
alter table public.projects rename constraint projects_framing_notes_length to projects_initial_context_length;

alter table public.projects
  add column music_format text,
  add column content_format_id uuid,
  add constraint projects_music_format_check
    check (music_format is null or music_format in ('single', 'ep', 'album', 'mixtape', 'compilation', 'other')),
  add constraint projects_music_format_type check (music_format is null or type = 'music_release'),
  add constraint projects_content_format_type check (content_format_id is null or type = 'content'),
  add constraint projects_content_format_same_org
    foreign key (content_format_id, organization_id)
    references public.content_formats (id, organization_id);

create index projects_content_format_idx on public.projects (content_format_id)
  where content_format_id is not null;

grant insert (music_format, content_format_id, artist_id) on public.projects to authenticated;
grant update (music_format, content_format_id, artist_id) on public.projects to authenticated;

-- ---------------------------------------------------------------------------
-- Creation and editing (before launch)
-- ---------------------------------------------------------------------------

-- The rules of the type, shared by creation and editing. Masters are counted
-- once each, as they are linked.
create or replace function public.check_project_shape(
  p_type text,
  p_master_ids uuid[],
  p_music_format text
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_masters integer := (select count(distinct m) from unnest(coalesce(p_master_ids, '{}'::uuid[])) m);
begin
  if p_type = 'music_release' then
    if v_masters = 0 then
      raise exception 'music_release_requires_master';
    end if;
    if p_music_format is null then
      raise exception 'music_format_required';
    end if;
    if p_music_format = 'single' and v_masters > 1 then
      raise exception 'single_requires_one_master';
    end if;
  end if;
end;
$$;

revoke execute on function public.check_project_shape(text, uuid[], text) from public, anon;
grant execute on function public.check_project_shape(text, uuid[], text) to authenticated;

drop function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[]);

create or replace function public.create_project(
  p_organization_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  -- Transmitted right away when given (transmit_project checks the rights).
  p_assignee_person_id uuid default null,
  p_creative_person_ids uuid[] default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_artist_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_creative uuid;
begin
  -- The event branch is closed in V1: the type exists, no new project uses it.
  if p_type = 'event' then
    raise exception 'project_type_unavailable';
  end if;
  perform public.check_project_shape(p_type, p_master_ids, p_music_format);

  insert into public.projects (organization_id, title, type, due_date, budget_cents, priority,
                               initial_context, music_format, content_format_id, artist_id)
  values (p_organization_id, btrim(p_title), p_type, p_due_date, p_budget_cents, p_priority,
          nullif(btrim(p_initial_context), ''),
          case when p_type = 'music_release' then p_music_format end,
          case when p_type = 'content' then p_content_format_id end,
          case when p_type = 'content' then p_artist_id end)
  returning id into v_id;

  -- A content project links no master; a music one, those chosen.
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select p_organization_id, v_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;

  if p_assignee_person_id is not null then
    perform public.transmit_project(v_id, p_assignee_person_id, null);
  end if;

  foreach v_creative in array coalesce(p_creative_person_ids, array[]::uuid[])
  loop
    perform public.add_project_creative(v_id, v_creative);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[], text, uuid, uuid)
  from public, anon;
grant execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[], text, uuid, uuid)
  to authenticated;

drop function public.update_project(uuid, text, text, uuid[], date, bigint, text, text);

create or replace function public.update_project(
  p_project_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_artist_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_current_type text;
begin
  select type into v_current_type from public.projects where id = p_project_id;
  -- An existing event stays one; no project becomes an event in V1.
  if p_type = 'event' and v_current_type is distinct from 'event' then
    raise exception 'project_type_unavailable';
  end if;
  perform public.check_project_shape(p_type, p_master_ids, p_music_format);

  update public.projects
     set title = btrim(p_title),
         type = p_type,
         due_date = p_due_date,
         budget_cents = p_budget_cents,
         priority = p_priority,
         initial_context = nullif(btrim(p_initial_context), ''),
         music_format = case when p_type = 'music_release' then p_music_format end,
         content_format_id = case when p_type = 'content' then p_content_format_id end,
         -- A project from before the catalogue keeps the artist it was made with.
         artist_id = case when p_type = 'content' then p_artist_id else artist_id end
   where id = p_project_id
  returning organization_id into v_org;

  -- RLS filtered the row out: launched, invisible, or no right.
  if v_org is null then
    raise exception 'project_not_editable';
  end if;

  delete from public.project_masters where project_id = p_project_id;
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select v_org, p_project_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;
end;
$$;

revoke execute on function public.update_project(uuid, text, text, uuid[], date, bigint, text, text, text, uuid, uuid)
  from public, anon;
grant execute on function public.update_project(uuid, text, text, uuid[], date, bigint, text, text, text, uuid, uuid)
  to authenticated;
