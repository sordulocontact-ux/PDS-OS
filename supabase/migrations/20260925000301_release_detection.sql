-- Persistence of a release detection result.
--
-- The single write path for release_links and the detection columns of
-- releases. Called by the "Vérifier maintenant" action (user session, active
-- member of the release's organization) and by the daily job (service role).
-- The payload is a list of links computed by code; the database validates
-- every entry again and derives the timestamps itself.
--
-- Online status: a release is online once at least one link was *detected*
-- (any source but 'manual'). The Spotify URL entered by hand at framing may
-- exist before release day, so it is stored as a link but never marks a
-- release online.

create or replace function public.record_release_detection(p_release_id uuid, p_links jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.releases%rowtype;
  v_link jsonb;
  v_platform text;
  v_url text;
  v_source text;
  v_platforms text[] := '{}';
  v_detected boolean := false;
begin
  select * into v_release from public.releases where id = p_release_id for update;
  if not found
     or not (auth.role() = 'service_role' or public.is_active_member(v_release.organization_id)) then
    raise exception 'release_not_found';
  end if;

  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    raise exception 'invalid_links';
  end if;

  -- Validate everything before writing anything.
  for v_link in select value from jsonb_array_elements(p_links) loop
    v_platform := v_link ->> 'platform';
    v_url := v_link ->> 'url';
    v_source := v_link ->> 'source';
    if jsonb_typeof(v_link) <> 'object'
       or v_platform is null or v_platform not in ('spotify', 'appleMusic', 'deezer',
         'youtubeMusic', 'youtube', 'tidal', 'amazonMusic', 'soundcloud')
       or v_url is null or v_url !~ '^https://[^\s]+$' or length(v_url) > 2048
       or v_source is null or v_source not in ('deezer', 'itunes', 'musicbrainz', 'odesli', 'manual')
       or v_platform = any (v_platforms) then
      raise exception 'invalid_link';
    end if;
    v_platforms := v_platforms || v_platform;
    v_detected := v_detected or v_source <> 'manual';
  end loop;

  -- A manual link no longer supplied (URL cleared or replaced by detection).
  delete from public.release_links l
   where l.release_id = p_release_id
     and l.source = 'manual'
     and not (l.platform = any (v_platforms));

  insert into public.release_links (organization_id, release_id, platform, url, source)
  select v_release.organization_id, p_release_id, e ->> 'platform', e ->> 'url', e ->> 'source'
    from jsonb_array_elements(p_links) e
  on conflict (release_id, platform) do update
    set url = excluded.url,
        source = excluded.source,
        last_seen_at = now();

  update public.releases
     set last_checked_at = now(),
         online_detected_at = case when v_detected then coalesce(online_detected_at, now())
                                   else online_detected_at end
   where id = p_release_id
  returning * into v_release;

  return jsonb_build_object(
    'online_detected_at', v_release.online_detected_at,
    'last_checked_at', v_release.last_checked_at,
    'link_count', jsonb_array_length(p_links)
  );
end;
$$;

revoke execute on function public.record_release_detection(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_release_detection(uuid, jsonb) to authenticated, service_role;
