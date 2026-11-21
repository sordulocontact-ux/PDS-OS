-- Projet collectif, retours d'Ibé du 18/11/2026 (lot L0, SQL): the collective's
-- recap of its titles and guests.
--
--   1. project_titles.release_decision: does the title come out, yes or no
--      (null: not decided). set_project_title_release, by who writes the
--      collective's titles (lock_project_title, as rename_project_title),
--      never on an abandoned title, refused when unchanged; journal
--      « release_decided » ({from, to}). Nothing else follows: neither the
--      abandonment nor the releases (lot 13) read it.
--   2. set_title_participation_contact: the participation's interlocutor
--      (null: none), by who writes the titles. Written, never read: the
--      foreign key checks the organization (décision 5: no network_contacts
--      read, no contact_id returned).
--   3. set_title_participation_note: the participation's note (trimmed,
--      blank = none, 2000 at most), by who writes the titles. No journal.
--   4. Notifications « participation_confirmed » / « participation_declined »
--      to the project's owner (projects.owner_person_id, as
--      deal_events_notify_owner) when a participation becomes confirmed or
--      declined, whatever the path (trigger on title_participations);
--      notify() never writes to the author.
--   5. The Catalogue refuses an artist whose name, normalized (trimmed,
--      case and inner spaces ignored; accents kept: no unaccent extension
--      here), is already a live artist's of the organization, whatever the
--      path (trigger on artists): « artist_name_taken » (23505, as the
--      index artists_org_name_key it comes before), the existing name in
--      DETAIL. The homonyms already there are left as they are (a rename
--      that keeps the normalized name passes).
--   6. project_title_label: what a title is called in SQL texts, as the app
--      (projectTitleLabel, titleGuestNames, joinArtistNames): its working
--      title, else its master's (never a provisional one), else its guests
--      still in play (« Titre de Jay (à nommer) », « Titre d'Iris Moon &
--      Jay (à nommer) », « Titre de A, B & C (à nommer) »), else its number
--      (« Titre 3 (à nommer) »). Read by contract_gaps_text,
--      release_contract_gaps_text, release_provisional_titles_text and
--      title_release_name. title_release_name is stored (releases.title of
--      a title's release, written by ensure_title_release): the names
--      already stored stay as they are until ensure_title_release runs again
--      for their title (title live, master, rename); a guest added later
--      does not rename a stored release.
--   7. The same artist on two titles stays allowed (the form confirms).

-- 1 ------------------------------------------------------------------------------------------
alter table public.project_titles add column release_decision boolean;

comment on column public.project_titles.release_decision is
  'Ibé 18/11: does the title come out (true / false); null = not decided. Written by set_project_title_release only; nothing else reads it in the database.';

alter table public.project_title_events drop constraint project_title_events_kind_check;
alter table public.project_title_events add constraint project_title_events_kind_check
  check (kind in ('added', 'renamed', 'abandoned', 'reactivated', 'participation_added',
                  'participation_status', 'main_artist_changed', 'cataloged',
                  'master_attached', 'waiver_granted', 'waiver_revoked',
                  'release_mode_changed', 'release_decided'));

create or replace function public.set_project_title_release(
  p_title_id uuid,
  p_release boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if p_release is not distinct from v_title.release_decision then
    raise exception 'release_unchanged' using errcode = 'P0001';
  end if;
  update public.project_titles set release_decision = p_release where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'release_decided',
    jsonb_build_object('from', v_title.release_decision, 'to', p_release));
end;
$$;
revoke execute on function public.set_project_title_release(uuid, boolean) from public, anon;
grant execute on function public.set_project_title_release(uuid, boolean) to authenticated;

-- 2 and 3 ------------------------------------------------------------------------------------
-- The participation, its title locked once its project is (who writes the
-- titles: lock_project_title); an abandoned title is not edited.
create or replace function public.lock_title_participation(p_participation_id uuid)
returns public.title_participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title_id uuid;
  v_project_id uuid;
  v_title public.project_titles%rowtype;
  v_part public.title_participations%rowtype;
begin
  select tp.title_id, tp.project_id into v_title_id, v_project_id
    from public.title_participations tp where tp.id = p_participation_id;
  if v_title_id is null or not public.can_see_project(v_project_id) then
    raise exception 'participation_not_found' using errcode = 'P0002';
  end if;
  v_title := public.lock_project_title(v_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  select * into v_part from public.title_participations
   where id = p_participation_id for update;
  return v_part;
end;
$$;
revoke execute on function public.lock_title_participation(uuid) from public, anon, authenticated;

-- Décision 5: the contact is written, never read here; its organization is
-- checked by title_participations_contact_same_org.
create or replace function public.set_title_participation_contact(
  p_participation_id uuid,
  p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.lock_title_participation(p_participation_id);
  begin
    update public.title_participations
       set contact_id = p_contact_id
     where id = p_participation_id
       and contact_id is distinct from p_contact_id;
  exception when foreign_key_violation then
    raise exception 'contact_not_found' using errcode = '23503';
  end;
end;
$$;
revoke execute on function public.set_title_participation_contact(uuid, uuid) from public, anon;
grant execute on function public.set_title_participation_contact(uuid, uuid) to authenticated;

create or replace function public.set_title_participation_note(
  p_participation_id uuid,
  p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := public.clean_participation_note(p_note);
begin
  perform public.lock_title_participation(p_participation_id);
  update public.title_participations
     set note = v_note
   where id = p_participation_id
     and note is distinct from v_note;
end;
$$;
revoke execute on function public.set_title_participation_note(uuid, text) from public, anon;
grant execute on function public.set_title_participation_note(uuid, text) to authenticated;

-- 4 ------------------------------------------------------------------------------------------
select public.add_notification_kinds(array['participation_confirmed', 'participation_declined']);

create or replace function public.title_participations_notify_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if new.status not in ('confirmed', 'declined')
     or (tg_op = 'UPDATE' and old.status = new.status) then
    return null;
  end if;
  select p.owner_person_id into v_owner from public.projects p where p.id = new.project_id;
  perform public.notify(new.organization_id, v_owner, 'participation_' || new.status,
                        new.project_id, new.id);
  return null;
end;
$$;
revoke execute on function public.title_participations_notify_owner() from public, anon, authenticated;
create trigger z_notify_owner after insert or update of status on public.title_participations
  for each row execute function public.title_participations_notify_owner();

-- 5 ------------------------------------------------------------------------------------------
create or replace function public.artist_name_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(btrim(p_name)), '\s+', ' ', 'g');
$$;
revoke execute on function public.artist_name_key(text) from public, anon, authenticated;

create or replace function public.artists_name_taken()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
begin
  if new.archived_at is not null then
    return new;
  end if;
  -- An artist already there keeps its name (homonyms before this guard).
  if tg_op = 'UPDATE' and old.archived_at is null
     and public.artist_name_key(new.name) = public.artist_name_key(old.name) then
    return new;
  end if;
  select a.name into v_existing
    from public.artists a
   where a.organization_id = new.organization_id
     and a.id <> new.id
     and a.archived_at is null
     and public.artist_name_key(a.name) = public.artist_name_key(new.name)
   order by a.created_at
   limit 1;
  if found then
    raise exception using errcode = '23505', message = 'artist_name_taken', detail = v_existing;
  end if;
  return new;
end;
$$;
revoke execute on function public.artists_name_taken() from public, anon, authenticated;
create trigger b_name_taken before insert or update of name, archived_at on public.artists
  for each row execute function public.artists_name_taken();

-- 6 ------------------------------------------------------------------------------------------
-- « A », « A & B », « A, B & C » (joinArtistNames).
create or replace function public.join_artist_names(p_names text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when coalesce(cardinality(p_names), 0) = 0 then null
           when cardinality(p_names) = 1 then p_names[1]
           else array_to_string(p_names[1:cardinality(p_names) - 1], ', ')
                || ' & ' || p_names[cardinality(p_names)]
         end;
$$;
revoke execute on function public.join_artist_names(text[]) from public, anon, authenticated;

-- « de Jay », « d'Iris Moon » (fr.projectTitles: elision before a vowel or h).
create or replace function public.french_of(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_name ~ '^[aeiouyàâéèêëîïôûühAEIOUYÀÂÉÈÊËÎÏÔÛÜH]'
              then 'd''' || p_name else 'de ' || p_name end;
$$;
revoke execute on function public.french_of(text) from public, anon, authenticated;

create or replace function public.project_title_label(p_title_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
           t.working_title,
           case when coalesce(m.title_is_provisional, false) then null else m.title end,
           'Titre ' || public.french_of(public.join_artist_names(array(
             select a.name
               from public.title_participations tp
               join public.artists a on a.id = tp.artist_id
              where tp.title_id = t.id and tp.status not in ('declined', 'withdrawn')
              order by tp.created_at, tp.id))) || ' (à nommer)',
           'Titre ' || t.position || ' (à nommer)')
    from public.project_titles t
    left join public.masters m on m.id = t.master_id
   where t.id = p_title_id;
$$;
revoke execute on function public.project_title_label(uuid) from public, anon, authenticated;

-- As 20261114110101, the title named by project_title_label.
create or replace function public.contract_gaps_text(
  p_project_id uuid, p_scope text, p_strategy_deliverable_id uuid default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(g.artist_name || ' (' || public.project_title_label(g.title_id) || ')',
           ', ' order by g.title_position, g.artist_name)
    from public.contract_gaps(p_project_id, p_scope, p_strategy_deliverable_id) g;
$$;
revoke execute on function public.contract_gaps_text(uuid, text, uuid) from public, anon, authenticated;

-- As 20261114120101, the title named by project_title_label.
create or replace function public.release_contract_gaps_text(p_release_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(g.artist_name || ' (' || public.project_title_label(g.title_id) || ')',
           ', ' order by g.title_position, g.artist_name)
    from public.releases r
    cross join lateral public.contract_gaps(r.project_id, 'release') g
   where r.id = p_release_id
     and (r.project_title_id is null or g.title_id = r.project_title_id);
$$;
revoke execute on function public.release_contract_gaps_text(uuid) from public, anon, authenticated;

-- As 20261114140101, the title named by project_title_label (its master is
-- provisional: never its name).
create or replace function public.release_provisional_titles_text(p_release_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(public.project_title_label(t.id), ', ' order by t.position)
    from public.release_titles(p_release_id) x
    join public.project_titles t on t.id = x.title_id
    join public.masters m on m.id = x.master_id
   where m.title_is_provisional;
$$;
revoke execute on function public.release_provisional_titles_text(uuid) from public, anon, authenticated;

-- As 20261114120101 (stored as a title's releases.title by
-- ensure_title_release: the names already written change only when it runs
-- again for their title).
create or replace function public.title_release_name(p_title_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.project_title_label(p_title_id);
$$;
revoke execute on function public.title_release_name(uuid) from public, anon, authenticated;
