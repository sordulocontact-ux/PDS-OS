-- Distribution, lot 5 (ticket « Distribution » § 6.11, § 7, § 12, CA10, CA16):
-- the platforms, one by one, and the public availability.
--
-- 1. distribution_declarations gains « available » (« disponibilité publique
--    déclarée »): said by a person, never read as verified.
-- 2. distribution_platforms: Spotify, Apple Music, Deezer, YouTube Music and
--    Amazon Music by default, others added by name (§ 12: extensible). Each
--    keeps its official link, whether its availability is declared (who,
--    when), and two separate results recorded by a person who opened the
--    link: verification (available or not) and compliance (right version,
--    artist, cover, metadata), each with who, when and a note. The automatic
--    detection (release_links) only suggests a link: it fills nothing here.
-- Written by the owner (links, declared availability) and by the owner or
-- the designated validator (verification), through these functions.

alter table public.distribution_declarations
  drop constraint distribution_declarations_kind_check,
  add constraint distribution_declarations_kind_check check (kind in (
    'deposit', 'received', 'corrections_requested', 'accepted',
    'platforms_delivered', 'available'));

create table public.distribution_platforms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- spotify, apple_music, deezer, youtube_music, amazon_music, or other_<n>.
  platform text not null,
  -- The name shown for a platform added by hand.
  label text,
  url text,
  available_declared_at timestamptz,
  available_declared_by uuid references public.people (id),
  verification text not null default 'unchecked',
  verification_note text,
  verified_by uuid references public.people (id),
  verified_at timestamptz,
  compliance text not null default 'unchecked',
  compliance_note text,
  compliance_by uuid references public.people (id),
  compliance_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distribution_platforms_key unique (project_id, platform),
  constraint distribution_platforms_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_platforms_platform_check check (
    platform in ('spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music')
    or platform ~ '^other_[a-z0-9]{8}$'),
  constraint distribution_platforms_label_check check (
    (platform like 'other\_%') = (label is not null)
    and (label is null or char_length(btrim(label)) between 1 and 80)),
  constraint distribution_platforms_url_check check (
    url is null or (char_length(url) <= 2048 and url ~ '^https://\S+$')),
  constraint distribution_platforms_declared check (
    (available_declared_at is null) = (available_declared_by is null)),
  constraint distribution_platforms_verification_check check (
    verification in ('unchecked', 'verified', 'unavailable')
    and (verification = 'unchecked') = (verified_at is null)
    and (verification <> 'unavailable' or char_length(btrim(coalesce(verification_note, ''))) > 0)),
  constraint distribution_platforms_compliance_check check (
    compliance in ('unchecked', 'compliant', 'non_compliant')
    and (compliance = 'unchecked') = (compliance_at is null)
    and (compliance <> 'non_compliant' or char_length(btrim(coalesce(compliance_note, ''))) > 0)),
  constraint distribution_platforms_notes_length check (
    (verification_note is null or char_length(verification_note) <= 1000)
    and (compliance_note is null or char_length(compliance_note) <= 1000))
);

alter table public.distribution_platforms enable row level security;
alter table public.distribution_platforms force row level security;
revoke all on table public.distribution_platforms from anon, authenticated;
grant select on table public.distribution_platforms to authenticated;

create policy distribution_platforms_select on public.distribution_platforms
  for select to authenticated
  using (public.can_see_project(project_id));

-- The link and the declared availability of one platform (the owner). A new
-- link resets the verification and compliance: they were about the old one.
create or replace function public.save_distribution_platform(
  p_project_id uuid,
  p_platform text,
  p_label text,
  p_url text,
  p_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_old public.distribution_platforms%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_existed boolean;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_old from public.distribution_platforms
   where project_id = p_project_id and platform = p_platform for update;
  v_existed := found;
  if not v_existed then
    insert into public.distribution_platforms (organization_id, project_id, platform,
      label, url, available_declared_at, available_declared_by)
    values (v_org, p_project_id, p_platform, nullif(btrim(coalesce(p_label, '')), ''), v_url,
      case when p_available then now() end,
      case when p_available then public.auth_person_id() end);
  else
    update public.distribution_platforms
       set label = case when platform like 'other\_%'
                        then coalesce(nullif(btrim(coalesce(p_label, '')), ''), label) else null end,
           url = v_url,
           available_declared_at = case when not p_available then null
             else coalesce(available_declared_at, now()) end,
           available_declared_by = case when not p_available then null
             else coalesce(available_declared_by, public.auth_person_id()) end,
           verification = case when v_url is distinct from v_old.url then 'unchecked' else verification end,
           verification_note = case when v_url is distinct from v_old.url then null else verification_note end,
           verified_by = case when v_url is distinct from v_old.url then null else verified_by end,
           verified_at = case when v_url is distinct from v_old.url then null else verified_at end,
           compliance = case when v_url is distinct from v_old.url then 'unchecked' else compliance end,
           compliance_note = case when v_url is distinct from v_old.url then null else compliance_note end,
           compliance_by = case when v_url is distinct from v_old.url then null else compliance_by end,
           compliance_at = case when v_url is distinct from v_old.url then null else compliance_at end,
           updated_at = now()
     where id = v_old.id;
  end if;
  perform public.distribution_log(v_org, p_project_id, 'platform.saved',
    jsonb_build_object('platform', p_platform, 'url', v_url, 'available', p_available,
      'reset', v_existed and v_url is distinct from v_old.url));
end;
$$;

revoke execute on function public.save_distribution_platform(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.save_distribution_platform(uuid, text, text, text, boolean) to authenticated;

-- What a person saw when opening the link: available or not, compliant or
-- not. The owner or the designated validator.
create or replace function public.verify_distribution_platform(
  p_project_id uuid,
  p_platform text,
  p_verification text,
  p_verification_note text,
  p_compliance text,
  p_compliance_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_platforms%rowtype;
begin
  if not public.can_check_distribution(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and platform = p_platform for update;
  if not found or v_row.url is null then
    raise exception 'no_link' using errcode = 'P0001';
  end if;
  update public.distribution_platforms
     set verification = p_verification,
         verification_note = nullif(btrim(coalesce(p_verification_note, '')), ''),
         verified_by = case when p_verification = 'unchecked' then null else public.auth_person_id() end,
         verified_at = case when p_verification = 'unchecked' then null else now() end,
         compliance = p_compliance,
         compliance_note = nullif(btrim(coalesce(p_compliance_note, '')), ''),
         compliance_by = case when p_compliance = 'unchecked' then null else public.auth_person_id() end,
         compliance_at = case when p_compliance = 'unchecked' then null else now() end,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_row.organization_id, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform, 'verification', p_verification,
      'compliance', p_compliance, 'url', v_row.url));
end;
$$;

revoke execute on function public.verify_distribution_platform(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.verify_distribution_platform(uuid, text, text, text, text, text) to authenticated;
