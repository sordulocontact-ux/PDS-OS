-- Artists, configurable stages, projects and their stage instances.
--
-- Stages are rows, not columns: whether a release has 7 or 5 stages, and what
-- "Défense" covers (docs/CONTEXTE-PROJET.md § 10), is a data change.

create table public.stage_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  key text not null,
  position integer not null,
  label text not null,
  -- Deliverable produced by the stage, if any.
  deliverable text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stage_definitions_org_key unique (organization_id, key),
  constraint stage_definitions_key_format check (key ~ '^[a-z][a-z_]*$'),
  constraint stage_definitions_deliverable_check
    check (deliverable is null or deliverable in ('brief', 'strategy', 'design_doc'))
);

insert into public.stage_definitions (organization_id, key, position, label, deliverable)
select o.id, s.key, s.position, s.label, s.deliverable
from public.organizations o
cross join (values
  ('framing', 1, 'Cadrage', 'brief'),
  ('launch_strategy', 2, 'Stratégie de lancement', 'strategy'),
  ('design', 3, 'Conception', 'design_doc'),
  ('production', 4, 'Production & préparation', null),
  ('delivery', 5, 'Livraison & lancement', null),
  ('defense', 6, 'Défense', null),
  ('review', 7, 'Bilan & clôture', null)
) as s (key, position, label, deliverable)
where o.slug = 'pds';

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  created_by uuid references public.people (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artists_name_not_blank check (btrim(name) <> ''),
  constraint artists_id_org_key unique (id, organization_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  title text not null,
  release_type text not null default 'single',
  -- The person who runs the project. Distinct from the artist.
  owner_person_id uuid references public.people (id),
  created_by uuid references public.people (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_not_blank check (btrim(title) <> ''),
  constraint projects_release_type_check check (release_type in ('single', 'ep', 'album')),
  constraint projects_id_org_key unique (id, organization_id),
  constraint projects_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index projects_org_idx on public.projects (organization_id, created_at desc);

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  stage_definition_id uuid not null references public.stage_definitions (id),
  state text not null default 'not_started',
  -- Set by the transition functions only.
  state_changed_at timestamptz,
  state_changed_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_stages_state_check
    check (state in ('not_started', 'in_progress', 'awaiting_validation', 'validated')),
  constraint project_stages_unique unique (project_id, stage_definition_id),
  constraint project_stages_id_org_key unique (id, organization_id),
  constraint project_stages_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

-- A new project gets one stage instance per active stage definition.
-- SECURITY DEFINER: clients have no INSERT right on project_stages.
create or replace function public.projects_create_stages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_stages (organization_id, project_id, stage_definition_id)
  select new.organization_id, new.id, d.id
  from public.stage_definitions d
  where d.organization_id = new.organization_id
    and d.archived_at is null;
  return new;
end;
$$;

revoke execute on function public.projects_create_stages() from public, anon, authenticated;

create trigger create_stages
  after insert on public.projects
  for each row execute function public.projects_create_stages();
