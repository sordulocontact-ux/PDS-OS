-- Titles (docs/ARCHITECTURE.md § 2 septies). In the interface the catalog
-- object is now a "Titre": the lasting musical object of PDS, created as soon
-- as a song exists (a demo straight out of the studio) and enriched without
-- ever being recreated. The table keeps its name (`masters`): renaming it
-- would touch every foreign key for no change of meaning.
--
-- What changes:
--   * audio_state: how far the song has come — demo (Maquette), rough_mix
--     (Mise à plat), master, final_master. Optional: unknown stays null,
--     never guessed;
--   * variant replaces the free `version` text: original (default),
--     radio_edit, instrumental, acapella, remix, other; `other` may carry a
--     label of its own. Audio state and variant are two separate facts;
--   * successive audio versions: an audio file of a title (category `audio`)
--     carries the audio state it stands for and, when the browser could
--     read it, its duration. A new audio file never creates a title;
--   * adding an audio file moves the title forward (never back) to that
--     state, and takes its duration when it is the title's latest state.
--
-- Title and main artist stay the only required fields; ISRC and duration
-- stay optional. create_master is the single way in: a future automatic
-- creation from a Studio session will call it as the catalog form does.

-- ---------------------------------------------------------------------------
-- Audio state and variant
-- ---------------------------------------------------------------------------

-- Order of the audio states, for "never back". Null for an unknown state.
create or replace function public.audio_state_rank(p_state text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_state
    when 'demo' then 1
    when 'rough_mix' then 2
    when 'master' then 3
    when 'final_master' then 4
  end;
$$;

grant execute on function public.audio_state_rank(text) to authenticated;

alter table public.masters
  add column audio_state text
    constraint masters_audio_state_check check (audio_state is null or public.audio_state_rank(audio_state) is not null),
  add column variant text not null default 'original'
    constraint masters_variant_check
      check (variant in ('original', 'radio_edit', 'instrumental', 'acapella', 'remix', 'other')),
  -- "Version live", "Slowed"… only for `other`.
  add column variant_label text
    constraint masters_variant_label_check
      check (variant_label is null
             or (variant = 'other' and btrim(variant_label) <> '' and char_length(variant_label) <= 100));

-- The free version text, read into the variant. Anything not recognised
-- stays readable as "Autre" with its own words.
update public.masters
   set variant = case lower(btrim(version))
         when 'radio edit' then 'radio_edit'
         when 'radio' then 'radio_edit'
         when 'instrumental' then 'instrumental'
         when 'instrumentale' then 'instrumental'
         when 'instru' then 'instrumental'
         when 'acapella' then 'acapella'
         when 'a cappella' then 'acapella'
         when 'a capella' then 'acapella'
         when 'remix' then 'remix'
         else 'other' end,
       variant_label = case when lower(btrim(version)) in (
           'radio edit', 'radio', 'instrumental', 'instrumentale', 'instru',
           'acapella', 'a cappella', 'a capella', 'remix') then null
         else left(btrim(version), 100) end
 where version is not null;

create index masters_org_audio_state_idx on public.masters (organization_id, audio_state)
  where archived_at is null;

grant insert (audio_state, variant, variant_label) on public.masters to authenticated;
grant update (audio_state, variant, variant_label) on public.masters to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers reading the old version column
-- ---------------------------------------------------------------------------

create or replace function public.masters_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    perform public.log_master_event(new.organization_id, new.id, 'master_created', new.id,
                                    jsonb_build_object('title', new.title, 'variant', new.variant,
                                                       'audio_state', new.audio_state));
    return null;
  end if;
  if (new.title, new.variant, new.variant_label, new.isrc, new.duration_seconds)
     is distinct from (old.title, old.variant, old.variant_label, old.isrc, old.duration_seconds) then
    v_fields := array_append(v_fields, 'identity');
  end if;
  if new.audio_state is distinct from old.audio_state then
    v_fields := array_append(v_fields, 'audio');
  end if;
  if (new.iswc, new.rights_holder, new.rights_year)
     is distinct from (old.iswc, old.rights_holder, old.rights_year) then
    v_fields := array_append(v_fields, 'rights');
  end if;
  if cardinality(v_fields) > 0 then
    perform public.log_master_event(new.organization_id, new.id, 'master_updated', new.id,
                                    jsonb_build_object('fields', to_jsonb(v_fields),
                                                       'audio_state', new.audio_state));
  end if;
  return null;
end;
$$;

create or replace function public.master_artists_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.masters;
begin
  if exists (
    select 1 from public.activity_events e
     where e.artist_id = new.artist_id and e.subject_id = new.master_id
       and e.kind in ('master_created', 'master_credited')
  ) then
    return null;
  end if;
  select * into v_master from public.masters where id = new.master_id;
  perform public.log_artist_event(
    new.organization_id, new.artist_id,
    case when v_master.created_at = now() then 'master_created' else 'master_credited' end,
    new.master_id,
    jsonb_build_object('title', v_master.title, 'variant', v_master.variant, 'role', new.role));
  return null;
end;
$$;

alter table public.masters drop column version;

-- ---------------------------------------------------------------------------
-- Creation and edition: one function each, whoever calls it
-- ---------------------------------------------------------------------------

drop function public.create_master(uuid, text, jsonb, text, text, integer);
drop function public.update_master(uuid, text, jsonb, text, text, integer);

-- p_credits: [{"artist_id": uuid, "role": "main"|"featuring"}, …] in display order.
create or replace function public.create_master(
  p_organization_id uuid,
  p_title text,
  p_credits jsonb,
  p_variant text default 'original',
  p_isrc text default null,
  p_duration_seconds integer default null,
  p_variant_label text default null,
  p_audio_state text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) = 0 then
    raise exception 'master_requires_artist';
  end if;

  insert into public.masters (organization_id, title, variant, variant_label, audio_state,
                              isrc, duration_seconds)
  values (
    p_organization_id,
    btrim(p_title),
    coalesce(p_variant, 'original'),
    case when p_variant = 'other' then nullif(btrim(p_variant_label), '') end,
    p_audio_state,
    nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
    p_duration_seconds
  )
  returning id into v_id;

  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select p_organization_id, v_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
  from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);

  return v_id;
end;
$$;

revoke execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text)
  from public, anon;
grant execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text)
  to authenticated;

create or replace function public.update_master(
  p_master_id uuid,
  p_title text,
  p_credits jsonb,
  p_variant text default 'original',
  p_isrc text default null,
  p_duration_seconds integer default null,
  p_variant_label text default null,
  p_audio_state text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) = 0 then
    raise exception 'master_requires_artist';
  end if;

  update public.masters
     set title = btrim(p_title),
         variant = coalesce(p_variant, 'original'),
         variant_label = case when p_variant = 'other' then nullif(btrim(p_variant_label), '') end,
         audio_state = p_audio_state,
         isrc = nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
         duration_seconds = p_duration_seconds
   where id = p_master_id
  returning organization_id into v_org;

  if v_org is null then
    raise exception 'master_not_editable';
  end if;

  delete from public.master_artists where master_id = p_master_id;
  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select v_org, p_master_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
    from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);
end;
$$;

revoke execute on function public.update_master(uuid, text, jsonb, text, text, integer, text, text)
  from public, anon;
grant execute on function public.update_master(uuid, text, jsonb, text, text, integer, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Successive audio versions
-- ---------------------------------------------------------------------------

alter table public.master_files
  add column audio_state text,
  -- Read from the file by the browser when it can; null otherwise.
  add column duration_seconds integer
    constraint master_files_duration_range
      check (duration_seconds is null or duration_seconds between 1 and 86399);

alter table public.master_files drop constraint master_files_category_check;

-- The old "master" (labelled "Master final") and "mix" files become audio
-- versions of their state.
update public.master_files
   set audio_state = case category when 'master' then 'final_master' else 'rough_mix' end,
       category = 'audio'
 where category in ('master', 'mix');

alter table public.master_files
  add constraint master_files_category_check
    check (category in ('audio', 'stems', 'artwork', 'contract', 'other')),
  -- An audio version always says which state it is; nothing else has one.
  add constraint master_files_audio_state_check
    check (case when category = 'audio'
                then public.audio_state_rank(audio_state) is not null
                else audio_state is null and duration_seconds is null end);

create index master_files_audio_idx on public.master_files (master_id, created_at desc)
  where category = 'audio';

grant insert (audio_state, duration_seconds) on public.master_files to authenticated;

-- A new audio version moves its title forward to that state (never back),
-- and gives it its duration when it is the title's latest state. Security
-- invoker: the person adding the file writes the title with their own
-- rights (manage_catalog, live title), as the form would.
create or replace function public.master_files_advance_title()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category <> 'audio' then
    return null;
  end if;
  update public.masters m
     set audio_state = new.audio_state,
         duration_seconds = coalesce(new.duration_seconds, m.duration_seconds)
   where m.id = new.master_id
     and (m.audio_state is null
          or public.audio_state_rank(m.audio_state) <= public.audio_state_rank(new.audio_state))
     and (m.audio_state is distinct from new.audio_state
          or (new.duration_seconds is not null
              and m.duration_seconds is distinct from new.duration_seconds));
  return null;
end;
$$;

revoke execute on function public.master_files_advance_title() from public, anon, authenticated;

create trigger y_advance_title after insert on public.master_files
  for each row execute function public.master_files_advance_title();

-- The file event says which state an audio version stands for.
create or replace function public.master_files_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_files := coalesce(new, old);
begin
  perform public.log_master_event(
    v_row.organization_id, v_row.master_id,
    case tg_op when 'INSERT' then 'file_added' else 'file_removed' end,
    v_row.id, jsonb_build_object('name', v_row.file_name, 'category', v_row.category,
                                 'audio_state', v_row.audio_state),
    null, v_row.category = 'contract');
  return null;
end;
$$;
