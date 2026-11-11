-- Budget, lot BUD 1 (Ibé, 11/11/2026: « un bouton : ajouter une nouvelle
-- dépense, puis l'associer soit à un projet, soit à un artiste »;
-- docs/ARCHITECTURE.md § 8 ter, « Budget »).
--
-- A spend is one row of budget_lines, never a second table (the
-- artist_expenses of 08/11 were dropped on 09/11): it belongs to a project OR
-- to an artist, exactly one of the two.
--
--   1. Permission « read_artist_budgets »: reads the artists' budgets and
--      their direct spends, and enters those spends. The direction, the
--      project managers and the business managers (BIZ 1). A project's own
--      lines keep their rule (can_read_project_budget, owner writes).
--   2. budget_lines: artist_id, the date the money was spent (spent_on, what
--      an artist's envelope period reads in BUD 2), the proof of an artist's
--      spend (artist_attachment_file_id).
--   3. The proof of an artist's spend is a file of the artist's library,
--      category « receipt » (as a project's spend keeps its proof in the
--      project's Files: never a second storage), read only by whoever reads
--      the artists' budgets, kept out of the activity feed.
--   4. An artist with spends is not deleted (artist_in_use).

-- 1. Permission ------------------------------------------------------------------

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets']
    when 'business' then array['negotiate', 'manage_network']
    else array[]::text[]
  end;
$$;

-- 2. A spend of a project or of an artist ---------------------------------------

alter table public.budget_lines alter column project_id drop not null;

alter table public.budget_lines
  add column artist_id uuid,
  add column spent_on date,
  add column artist_attachment_file_id uuid
    references public.artist_files (id) on delete set null,
  add constraint budget_lines_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id),
  add constraint budget_lines_one_owner
    check (num_nonnulls(project_id, artist_id) = 1);

-- The date of the existing lines: the day they were entered (Paris). The
-- triggers stay quiet: nothing changed for whoever reads these lines.
alter table public.budget_lines disable trigger user;
update public.budget_lines
   set spent_on = (created_at at time zone 'Europe/Paris')::date;
alter table public.budget_lines enable trigger user;

alter table public.budget_lines
  alter column spent_on set default ((now() at time zone 'Europe/Paris')::date),
  alter column spent_on set not null;

create index budget_lines_artist_idx on public.budget_lines (artist_id, spent_on)
  where artist_id is not null;
create index budget_lines_spent_on_idx on public.budget_lines (organization_id, spent_on);

-- A line's links stay with what it belongs to: a deliverable and a proof of
-- the project for a project's line, a receipt of the artist for an artist's.
-- (Levers and activations already ask the same project: a null project
-- refuses them.)
create or replace function public.check_budget_line_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and not exists (
    select 1 from public.strategy_deliverables d
     where d.id = new.deliverable_id and d.project_id = new.project_id) then
    raise exception 'deliverable_not_in_project' using errcode = 'P0001';
  end if;
  if new.attachment_file_id is not null and not exists (
    select 1 from public.project_files f
     where f.id = new.attachment_file_id and f.project_id = new.project_id) then
    raise exception 'attachment_not_in_project' using errcode = 'P0001';
  end if;
  if new.artist_attachment_file_id is not null and not exists (
    select 1 from public.artist_files f
     where f.id = new.artist_attachment_file_id and f.artist_id = new.artist_id
       and f.category = 'receipt') then
    raise exception 'attachment_not_of_artist' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_budget_line_links() from public, anon, authenticated;

drop trigger budget_lines_check_links on public.budget_lines;
create trigger budget_lines_check_links
  before insert or update of deliverable_id, attachment_file_id, artist_attachment_file_id
  on public.budget_lines
  for each row execute function public.check_budget_line_links();

-- What a line belongs to is chosen once: no update grant on project_id nor
-- artist_id.
grant insert (artist_id, spent_on, artist_attachment_file_id) on public.budget_lines to authenticated;
grant update (spent_on, artist_attachment_file_id) on public.budget_lines to authenticated;

-- Is this artist one a spend may be added to (same organization, not
-- archived)?
create or replace function public.is_open_artist(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.artists a
                  where a.id = p_artist_id and a.archived_at is null);
$$;
revoke execute on function public.is_open_artist(uuid) from public, anon;
grant execute on function public.is_open_artist(uuid) to authenticated;

-- An artist's spends: read and written by whoever reads the artists' budgets.
-- The project rules (budget_lines_*_owner, _select_budget_readers) are not
-- touched: a null project passes none of them.
create policy budget_lines_select_artist on public.budget_lines
  for select to authenticated
  using (artist_id is not null
         and public.has_permission(organization_id, 'read_artist_budgets'));

create policy budget_lines_insert_artist on public.budget_lines
  for insert to authenticated
  with check (artist_id is not null
              and public.has_permission(organization_id, 'read_artist_budgets')
              and public.is_open_artist(artist_id));

create policy budget_lines_update_artist on public.budget_lines
  for update to authenticated
  using (artist_id is not null
         and public.has_permission(organization_id, 'read_artist_budgets'))
  with check (artist_id is not null
              and public.has_permission(organization_id, 'read_artist_budgets'));

create policy budget_lines_delete_artist on public.budget_lines
  for delete to authenticated
  using (artist_id is not null
         and public.has_permission(organization_id, 'read_artist_budgets'));

-- 3. The receipt of an artist's spend --------------------------------------------

alter table public.artist_files drop constraint artist_files_category_check;
alter table public.artist_files add constraint artist_files_category_check
  check (category in ('press', 'photo', 'contract', 'audio', 'moodboard', 'other', 'receipt'));

drop policy artist_files_select_members on public.artist_files;
create policy artist_files_select_members on public.artist_files
  for select to authenticated
  using (public.is_active_member(organization_id)
         and (category <> 'contract' or public.has_permission(organization_id, 'manage_catalog'))
         and (category <> 'receipt'
              or public.has_permission(organization_id, 'read_artist_budgets')));

create policy artist_files_insert_receipt on public.artist_files
  for insert to authenticated
  with check (category = 'receipt'
              and public.has_permission(organization_id, 'read_artist_budgets'));

create policy artist_files_delete_receipt on public.artist_files
  for delete to authenticated
  using (category = 'receipt'
         and public.has_permission(organization_id, 'read_artist_budgets'));

-- The object, in the artist's folder of the private bucket (the row says
-- what it is; reading goes through the row, as for every artist file).
create policy artist_files_objects_insert_receipt on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artist-files'
    and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'read_artist_budgets')
    and exists (select 1 from public.artists a
                 where a.id = public.try_uuid((storage.foldername(name))[2])
                   and a.organization_id = public.try_uuid((storage.foldername(name))[1])));

create policy artist_files_objects_delete_receipt on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artist-files'
    and owner_id = (auth.uid())::text
    and public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'read_artist_budgets'));

-- A receipt is the budget's, not news of the artist's library.
create or replace function public.artist_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_files := coalesce(new, old);
begin
  if v_row.category = 'receipt' or (tg_op = 'UPDATE' and old.category = 'receipt') then
    return null;
  end if;
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

-- 4. An artist with spends stays ---------------------------------------------------

create or replace function public.delete_artist_row(p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.master_artists where artist_id = p_artist_id)
     or exists (select 1 from public.projects where artist_id = p_artist_id)
     or exists (select 1 from public.contracts where artist_id = p_artist_id)
     or exists (select 1 from public.budget_lines where artist_id = p_artist_id) then
    raise exception 'artist_in_use';
  end if;
  update public.master_splits set artist_id = null where artist_id = p_artist_id;
  update public.network_contacts set artist_id = null where artist_id = p_artist_id;
  delete from public.artist_contacts where artist_id = p_artist_id;
  delete from public.artist_files where artist_id = p_artist_id;
  delete from public.activity_events where artist_id = p_artist_id;
  delete from public.artists where id = p_artist_id;
end;
$$;
