-- Files of an artist or a title become a library (feedback n°6).
--
-- One file = one row: its category is a property (Tous, Presse, Photos…
-- are filtered views of the same rows, never copies). Each file gains a free
-- `description` ("Contrat artiste 2026", "Portrait presse — septembre
-- 2026"), and manage_catalog may now edit a file: its name, category and
-- description. Reclassifying a contract changes who reads it, exactly as
-- if it had been added under the new category (the read policies below
-- follow the row's current category).
--
-- A title's audio versions (category 'audio', with their audio state) are
-- not edited here: moving a file in or out of 'audio' would bypass the
-- audio state rules and the title's progression (docs/ARCHITECTURE.md
-- § 2 septies).
--
-- Also fixes master-files' object read policy, which still had the flaw
-- fixed for artist-files in 20260927001102 (the subquery runs under the
-- caller's RLS, which hides contract rows: without manage_catalog the
-- "no contract row" test was always true).

-- ---------------------------------------------------------------------------
-- Description
-- ---------------------------------------------------------------------------

alter table public.artist_files
  add column description text
    constraint artist_files_description_check
      check (description is null
             or (btrim(description) <> '' and char_length(description) <= 200));

alter table public.master_files
  add column description text
    constraint master_files_description_check
      check (description is null
             or (btrim(description) <> '' and char_length(description) <= 200));

grant insert (description) on public.artist_files to authenticated;
grant insert (description) on public.master_files to authenticated;

-- ---------------------------------------------------------------------------
-- Editing a file: name, category, description; manage_catalog only
-- ---------------------------------------------------------------------------

grant update (file_name, category, description) on public.artist_files to authenticated;
grant update (file_name, category, description) on public.master_files to authenticated;

create policy artist_files_update_catalog on public.artist_files
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog'));

create policy master_files_update_catalog on public.master_files
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog')
         and public.master_is_live(master_id)
         and category <> 'audio')
  with check (public.has_permission(organization_id, 'manage_catalog')
              and public.master_is_live(master_id)
              and category <> 'audio');

-- ---------------------------------------------------------------------------
-- master-files objects: positive read rule, as artist-files
-- ---------------------------------------------------------------------------

drop policy master_files_objects_select on storage.objects;

create policy master_files_objects_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'master-files'
    and public.is_active_member(public.try_uuid((storage.foldername(objects.name))[1]))
    and (
      public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]), 'manage_catalog')
      or exists (select 1 from public.master_files f where f.path = objects.name)
    )
  );

-- ---------------------------------------------------------------------------
-- Activity: "file updated"
-- ---------------------------------------------------------------------------

alter table public.activity_events drop constraint activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'artist_created', 'artist_updated',
  'contact_added', 'contact_updated', 'contact_removed',
  'file_added', 'file_updated', 'file_removed',
  'master_created', 'master_credited', 'master_updated',
  'master_item_added', 'master_item_updated', 'master_item_removed',
  'project_created', 'project_linked',
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested'));

-- An update is logged only when something visible changed. `previous_category`
-- when it was reclassified. A contract's event stays as private as the
-- contract, before or after the move.
create or replace function public.artist_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_files := coalesce(new, old);
begin
  if tg_op = 'UPDATE' then
    if (new.file_name, new.category, new.description)
       is not distinct from (old.file_name, old.category, old.description) then
      return null;
    end if;
    perform public.log_artist_event(
      new.organization_id, new.artist_id, 'file_updated', new.id,
      jsonb_strip_nulls(jsonb_build_object(
        'name', new.file_name, 'category', new.category,
        'previous_category', nullif(old.category, new.category))),
      null, 'contract' in (old.category, new.category));
    return null;
  end if;
  perform public.log_artist_event(
    v_row.organization_id, v_row.artist_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category),
    null, v_row.category = 'contract');
  return null;
end;
$$;

revoke execute on function public.artist_files_log() from public, anon, authenticated;

drop trigger z_log on public.artist_files;
create trigger z_log after insert or update or delete on public.artist_files
  for each row execute function public.artist_files_log();

create or replace function public.master_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_files := coalesce(new, old);
begin
  if tg_op = 'UPDATE' then
    if (new.file_name, new.category, new.description)
       is not distinct from (old.file_name, old.category, old.description) then
      return null;
    end if;
    perform public.log_master_event(
      new.organization_id, new.master_id, 'file_updated', new.id,
      jsonb_strip_nulls(jsonb_build_object(
        'name', new.file_name, 'category', new.category,
        'previous_category', nullif(old.category, new.category))),
      null, 'contract' in (old.category, new.category));
    return null;
  end if;
  perform public.log_master_event(
    v_row.organization_id, v_row.master_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category,
                                 'audio_state', v_row.audio_state),
    null, v_row.category = 'contract');
  return null;
end;
$$;

revoke execute on function public.master_files_log() from public, anon, authenticated;

drop trigger z_log on public.master_files;
create trigger z_log after insert or update or delete on public.master_files
  for each row execute function public.master_files_log();
