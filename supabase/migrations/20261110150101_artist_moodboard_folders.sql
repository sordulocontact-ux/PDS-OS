-- Moodboards of an artist as folders (retour du 10/11/2026) : « plutôt
-- différentes pistes, vues comme des dossiers. Dossier 1, le moodboard 1, et
-- à l'intérieur les images du moodboard. » Until now a moodboard was one file
-- of the artist's library (…20261108130101); it becomes a folder, a « piste »
-- with a title and an intention, holding its images (still files of the
-- library, category « moodboard », shown in the Fichiers too).
--
-- A folder may come from Figma: `source_url` keeps the frame it was imported
-- from (lib/integrations/figma.ts).
--
-- Same writers as the moodboard files: the Catalogue (manage_catalog) on
-- every folder, the creative director (creative_work) creates folders and
-- edits or deletes his own. Any of them adds images to any folder of the
-- artist: a piste is shared work.

create table public.artist_moodboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  title text not null,
  -- The intention of the piste (« Néons froids, nuit, grain »).
  note text,
  -- The Figma frame (or page) it was imported from.
  source_url text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint artist_moodboards_title_check
    check (btrim(title) <> '' and char_length(title) <= 120),
  constraint artist_moodboards_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 500)),
  constraint artist_moodboards_source_check
    check (source_url is null
           or (source_url ~ '^https://' and char_length(source_url) <= 1000)),
  constraint artist_moodboards_id_artist_key unique (id, artist_id),
  constraint artist_moodboards_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index artist_moodboards_artist_idx
  on public.artist_moodboards (artist_id, created_at desc);

create trigger a_set_created_by before insert on public.artist_moodboards
  for each row execute function public.set_created_by();

alter table public.artist_moodboards enable row level security;
alter table public.artist_moodboards force row level security;
revoke all on public.artist_moodboards from anon, authenticated;

create policy artist_moodboards_select_members on public.artist_moodboards
  for select to authenticated
  using (public.is_active_member(organization_id));

create policy artist_moodboards_insert_writers on public.artist_moodboards
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog')
              or public.has_permission(organization_id, 'creative_work'));

create policy artist_moodboards_update_catalog on public.artist_moodboards
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog'));

create policy artist_moodboards_update_creative on public.artist_moodboards
  for update to authenticated
  using (public.has_permission(organization_id, 'creative_work')
         and created_by = public.auth_person_id())
  with check (public.has_permission(organization_id, 'creative_work')
              and created_by = public.auth_person_id());

create policy artist_moodboards_delete_catalog on public.artist_moodboards
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

create policy artist_moodboards_delete_creative on public.artist_moodboards
  for delete to authenticated
  using (public.has_permission(organization_id, 'creative_work')
         and created_by = public.auth_person_id());

grant select, delete on public.artist_moodboards to authenticated;
grant insert (organization_id, artist_id, title, note, source_url)
  on public.artist_moodboards to authenticated;
grant update (title, note) on public.artist_moodboards to authenticated;

-- ---------------------------------------------------------------------------
-- The images of a folder: moodboard files of the same artist
-- ---------------------------------------------------------------------------

-- A folder is deleted once empty: the app removes its images first (rows and
-- objects, lib/catalog/moodboard-actions.ts), so no object is left behind.
alter table public.artist_files
  add column moodboard_id uuid,
  add constraint artist_files_moodboard_same_artist
    foreign key (moodboard_id, artist_id)
    references public.artist_moodboards (id, artist_id) on delete restrict,
  add constraint artist_files_moodboard_category
    check (moodboard_id is null or category = 'moodboard');

create index artist_files_moodboard_idx on public.artist_files (moodboard_id)
  where moodboard_id is not null;

grant insert (moodboard_id) on public.artist_files to authenticated;

-- A new version of an image stays in its folder; a file reclassified out of
-- « moodboard » (Fichiers tab) leaves it.
create or replace function public.artist_files_moodboard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category <> 'moodboard' then
    new.moodboard_id := null;
  elsif tg_op = 'INSERT' and new.moodboard_id is null and new.replaces_id is not null then
    select f.moodboard_id into new.moodboard_id
      from public.artist_files f
     where f.id = new.replaces_id and f.artist_id = new.artist_id;
  end if;
  return new;
end;
$$;

create trigger b_moodboard before insert or update of category on public.artist_files
  for each row execute function public.artist_files_moodboard();

-- The moodboards dropped before: each becomes a folder of its own, named as
-- it was shown (its precision, else its file name without the extension).
do $$
declare
  v_file record;
  v_folder uuid;
begin
  for v_file in
    select distinct on (f.series_id) f.series_id, f.organization_id, f.artist_id,
           f.created_by, f.created_at,
           coalesce(f.description,
                    nullif(regexp_replace(f.file_name, '\.[A-Za-z0-9]{1,10}$', ''), ''),
                    f.file_name) as title
      from public.artist_files f
     where f.category = 'moodboard'
     order by f.series_id, f.version
  loop
    insert into public.artist_moodboards
      (organization_id, artist_id, title, created_by, created_at)
    values (v_file.organization_id, v_file.artist_id, left(v_file.title, 120),
            v_file.created_by, v_file.created_at)
    returning id into v_folder;
    update public.artist_files set moodboard_id = v_folder
     where series_id = v_file.series_id;
  end loop;
end;
$$;

-- An artist deleted with its records (delete_artist_row, …20261006000301,
-- removes its files first): its folders go with it.
create or replace function public.artist_moodboards_before_artist_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.artist_moodboards where artist_id = old.id;
  return old;
end;
$$;

revoke execute on function public.artist_moodboards_before_artist_delete()
  from public, anon, authenticated;

create trigger b_delete_moodboards before delete on public.artists
  for each row execute function public.artist_moodboards_before_artist_delete();
