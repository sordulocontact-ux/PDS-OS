-- Master workflow, lot 2: the source of a title's mix, confirmed by a person
-- (ticket "Workflow Master", § 1: "Utiliser cette version comme source ?" /
-- "Choisir une autre version"; docs/ARCHITECTURE.md § 8 septies).
--
-- One row per confirmation, never updated nor deleted by a user: the latest
-- row of a (project, title) is its current source, the earlier ones are its
-- history. Changing the source is a new confirmation, never a silent
-- replacement.
--
-- Read: whoever sees the project. Write: its owner only (is_project_owner),
-- like everything else in a launched project.
--
-- Rules checked by the database:
--   * the title belongs to the project (composite key on project_masters);
--   * the file is an audio version of that same title, and not a master
--     final (the master final is the workflow's result, never a mix source).
-- Unlinking the title from the project, or deleting the file, removes its
-- confirmations: the page then asks for the source again.

create table public.master_flow_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  master_id uuid not null,
  file_id uuid not null references public.master_files (id) on delete cascade,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_flow_sources_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_flow_sources_title_in_project
    foreign key (project_id, master_id) references public.project_masters (project_id, master_id)
    on delete cascade
);

create index master_flow_sources_project_idx
  on public.master_flow_sources (project_id, master_id, created_at desc);
create index master_flow_sources_file_idx on public.master_flow_sources (file_id);

-- The file is an audio version of the confirmed title, in the same
-- organization, and not its master final. Security definer: it reads the
-- file whatever the caller may read, and raises one stable message.
create or replace function public.check_master_flow_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.master_files f
    where f.id = new.file_id
      and f.master_id = new.master_id
      and f.organization_id = new.organization_id
      and f.category = 'audio'
      and f.audio_state <> 'final_master') then
    raise exception 'source_not_an_audio_version_of_title';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_master_flow_source() from public, anon, authenticated;

create trigger master_flow_sources_check
  before insert on public.master_flow_sources
  for each row execute function public.check_master_flow_source();

-- Authorship is set by the database, never by the client.
create trigger a_set_created_by before insert on public.master_flow_sources
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.master_flow_sources enable row level security;
alter table public.master_flow_sources force row level security;
revoke all on table public.master_flow_sources from anon, authenticated;
grant select on table public.master_flow_sources to authenticated;
grant insert (organization_id, project_id, master_id, file_id)
  on public.master_flow_sources to authenticated;

create policy master_flow_sources_select_visible on public.master_flow_sources
  for select to authenticated
  using (public.can_see_project(project_id));

create policy master_flow_sources_insert_owner on public.master_flow_sources
  for insert to authenticated
  with check (public.is_project_owner(project_id));
