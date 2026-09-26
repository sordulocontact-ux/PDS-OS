-- Artist profile: identity, a hand-written biography, an uploaded picture and
-- the artist's contacts (manager, booker…).
--
--   * identity: civil name and country of origin (ISO 3166-1 alpha-2);
--   * bio: written by the team, it takes precedence over the biography read
--     live from Deezer / Wikipedia; null = the automatic one;
--   * picture_path: a picture uploaded to the private `artist-pictures`
--     bucket, taking precedence over the Deezer picture (picture_url, which
--     is kept so removing the upload brings it back);
--   * artist_contacts: read and written only with manage_catalog (DG,
--     project manager). A creative director sees the artist, never the
--     contacts' email or phone.
-- Everything is written with the user's session, as the rest of the catalog.

-- ---------------------------------------------------------------------------
-- Artists
-- ---------------------------------------------------------------------------

alter table public.artists
  add column legal_name text,
  add column country_code text,
  add column bio text,
  add column picture_path text;

alter table public.artists
  add constraint artists_legal_name_length
    check (legal_name is null or (btrim(legal_name) <> '' and char_length(legal_name) <= 200)),
  add constraint artists_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  add constraint artists_bio_length
    check (bio is null or (btrim(bio) <> '' and char_length(bio) <= 5000)),
  -- "<organization_id>/<artist_id>/<uuid>.<ext>": the object belongs to
  -- this very artist, never to another one or another organization.
  add constraint artists_picture_path_format
    check (picture_path is null
           or picture_path ~ ('^' || organization_id::text || '/' || id::text
                              || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));

grant insert (legal_name, country_code, bio, picture_path) on public.artists to authenticated;
grant update (legal_name, country_code, bio, picture_path) on public.artists to authenticated;

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

create table public.artist_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  role text not null,
  name text not null,
  email text,
  phone text,
  -- One primary contact per artist, kept by the triggers below.
  is_primary boolean not null default false,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_contacts_role_check
    check (role in ('manager', 'booker', 'press', 'legal', 'other')),
  constraint artist_contacts_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint artist_contacts_email_check
    check (email is null or (char_length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint artist_contacts_phone_check
    check (phone is null or phone ~ '^[0-9+(). -]{3,40}$'),
  constraint artist_contacts_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index artist_contacts_artist_idx on public.artist_contacts (artist_id, created_at);
create unique index artist_contacts_one_primary
  on public.artist_contacts (artist_id) where is_primary;

create trigger a_set_updated_at before update on public.artist_contacts
  for each row execute function public.set_updated_at();
create trigger a_set_created_by before insert on public.artist_contacts
  for each row execute function public.set_created_by();

-- The first contact of an artist is its primary one; marking another one
-- primary releases the previous one (before the row is written, so the
-- unique index never sees two).
create or replace function public.artist_contacts_keep_primary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not new.is_primary and not exists (
    select 1 from public.artist_contacts c
     where c.artist_id = new.artist_id and c.is_primary
  ) then
    new.is_primary := true;
  end if;
  if new.is_primary then
    update public.artist_contacts
       set is_primary = false
     where artist_id = new.artist_id and is_primary and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger b_keep_primary before insert or update of is_primary on public.artist_contacts
  for each row execute function public.artist_contacts_keep_primary();

-- Removing the primary contact promotes the oldest remaining one.
create or replace function public.artist_contacts_promote_primary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_primary then
    update public.artist_contacts
       set is_primary = true
     where id = (select c.id from public.artist_contacts c
                  where c.artist_id = old.artist_id
                  order by c.created_at, c.id
                  limit 1);
  end if;
  return null;
end;
$$;

create trigger b_promote_primary after delete on public.artist_contacts
  for each row execute function public.artist_contacts_promote_primary();

alter table public.artist_contacts enable row level security;
alter table public.artist_contacts force row level security;
revoke all on public.artist_contacts from anon, authenticated;

create policy artist_contacts_select_catalog on public.artist_contacts
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));
create policy artist_contacts_insert_catalog on public.artist_contacts
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy artist_contacts_update_catalog on public.artist_contacts
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog'));
create policy artist_contacts_delete_catalog on public.artist_contacts
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

grant select, delete on public.artist_contacts to authenticated;
grant insert (organization_id, artist_id, role, name, email, phone, is_primary)
  on public.artist_contacts to authenticated;
grant update (role, name, email, phone, is_primary) on public.artist_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- Pictures
-- ---------------------------------------------------------------------------

-- Private bucket, objects under "<organization_id>/<artist_id>/<uuid>.<ext>".
-- Every member reads them (the catalog is shared), manage_catalog writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artist-pictures', 'artist-pictures', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy artist_pictures_select_members
  on storage.objects for select to authenticated
  using (bucket_id = 'artist-pictures'
         and public.is_active_member(public.try_uuid((storage.foldername(name))[1])));

create policy artist_pictures_insert_catalog
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artist-pictures'
    and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_catalog')
    -- objects.name spelled out: inside the subquery a bare `name` would be
    -- the artist's name.
    and exists (
      select 1 from public.artists a
       where a.id = public.try_uuid((storage.foldername(objects.name))[2])
         and a.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
    )
  );

create policy artist_pictures_delete_catalog
  on storage.objects for delete to authenticated
  using (bucket_id = 'artist-pictures'
         and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_catalog'));
