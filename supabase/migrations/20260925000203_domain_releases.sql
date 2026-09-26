-- Releases, detected platform links, share links, and the public smartlink.
--
-- Detection columns and release_links are written by the daily job only
-- (server-side, service role, never triggered by a user).

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null,
  isrc text,
  upc text,
  planned_release_date date,
  -- Entered at framing: the label usually knows it before release day.
  spotify_url text,
  -- Written by the detection job.
  online_detected_at timestamptz,
  last_checked_at timestamptz,
  -- Public smartlink: unguessable token, off until explicitly enabled.
  smartlink_token uuid not null default gen_random_uuid(),
  smartlink_enabled boolean not null default false,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint releases_title_not_blank check (btrim(title) <> ''),
  constraint releases_isrc_format check (isrc is null or isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  constraint releases_spotify_url_format
    check (spotify_url is null or spotify_url ~ '^https://open\.spotify\.com/'),
  constraint releases_smartlink_token_key unique (smartlink_token),
  constraint releases_id_org_key unique (id, organization_id),
  constraint releases_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create unique index releases_org_isrc_key on public.releases (organization_id, isrc)
  where isrc is not null;

create table public.release_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  release_id uuid not null,
  platform text not null,
  url text not null,
  source text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint release_links_platform_check check (platform in (
    'spotify', 'appleMusic', 'deezer', 'youtubeMusic', 'youtube',
    'tidal', 'amazonMusic', 'soundcloud')),
  constraint release_links_source_check
    check (source in ('deezer', 'itunes', 'musicbrainz', 'odesli', 'manual')),
  constraint release_links_url_https check (url ~ '^https://'),
  constraint release_links_unique unique (release_id, platform),
  constraint release_links_release_same_org
    foreign key (release_id, organization_id) references public.releases (id, organization_id)
    on delete cascade
);

-- External read-only views of a document, by token, without an account.
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  scope text not null,
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint share_links_scope_check check (scope in ('brief', 'strategy', 'design_doc')),
  constraint share_links_token_key unique (token),
  constraint share_links_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

-- Public smartlink. The only data anon can reach, and only through this
-- function: title, artist and platform links of an enabled release.
create or replace function public.get_smartlink(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', r.title,
    'artist', a.name,
    'links', coalesce((
      select jsonb_agg(jsonb_build_object('platform', l.platform, 'url', l.url) order by l.platform)
      from public.release_links l
      where l.release_id = r.id
    ), '[]'::jsonb)
  )
  from public.releases r
  join public.projects p on p.id = r.project_id
  join public.artists a on a.id = p.artist_id
  where r.smartlink_token = p_token
    and r.smartlink_enabled;
$$;

revoke execute on function public.get_smartlink(uuid) from public;
grant execute on function public.get_smartlink(uuid) to anon, authenticated;
