-- Relation of an artist with PDS (docs/ARCHITECTURE.md § 2 quinquies).
--
--   * signed: part of the PDS roster, followed over time;
--   * collaboration: worked with on one-off projects (a PDS Mic…), without
--     joining the roster.
-- It describes the artist, not the record: archiving (archived_at) is a
-- separate axis. One artist row either way, so moving from collaboration to
-- signed keeps masters, projects, contacts, files and activity.
-- Written like the rest of the profile (manage_catalog, live rows only).

alter table public.artists
  add column relation text not null default 'signed'
    constraint artists_relation_check check (relation in ('signed', 'collaboration'));

-- Existing artists were the roster (backfilled above); from now on the form
-- always says which one it is.
alter table public.artists alter column relation drop default;

grant insert (relation) on public.artists to authenticated;
grant update (relation) on public.artists to authenticated;

-- Artists: creation, and which parts of the profile changed. The relation is
-- copied at the time, so the journal reads "Signé" even after a change.
-- array_append, not `v_fields || 'bio'`: an untyped literal next to a text[]
-- is read as an array literal, which failed every profile update.
create or replace function public.artists_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[] := array[]::text[];
  v_detail jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.log_artist_event(new.organization_id, new.id, 'artist_created', new.id,
                                    jsonb_build_object('name', new.name, 'relation', new.relation));
    return null;
  end if;
  if (new.name, new.legal_name, new.country_code)
     is distinct from (old.name, old.legal_name, old.country_code) then
    v_fields := array_append(v_fields, 'identity');
  end if;
  if new.relation is distinct from old.relation then
    v_fields := array_append(v_fields, 'relation');
    v_detail := jsonb_build_object('relation', new.relation);
  end if;
  if new.bio is distinct from old.bio then v_fields := array_append(v_fields, 'bio'); end if;
  if new.notes is distinct from old.notes then v_fields := array_append(v_fields, 'notes'); end if;
  if (new.picture_path, new.picture_url) is distinct from (old.picture_path, old.picture_url) then
    v_fields := array_append(v_fields, 'picture');
  end if;
  if new.deezer_id is distinct from old.deezer_id then v_fields := array_append(v_fields, 'deezer'); end if;
  if cardinality(v_fields) > 0 then
    perform public.log_artist_event(new.organization_id, new.id, 'artist_updated', new.id,
                                    v_detail || jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

revoke execute on function public.artists_log() from public, anon, authenticated;
