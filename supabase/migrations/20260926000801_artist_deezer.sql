-- Artists imported from Deezer: the Deezer id, the profile picture and the
-- artist page. Filled by the server from Deezer itself (never from the
-- browser), all three optional: an artist not yet on the platforms is still
-- created by hand.

alter table public.artists
  add column deezer_id bigint,
  add column picture_url text,
  add column deezer_url text;

alter table public.artists
  add constraint artists_deezer_id_positive check (deezer_id is null or deezer_id > 0),
  add constraint artists_picture_url_https
    check (picture_url is null or (picture_url ~ '^https://' and char_length(picture_url) <= 500)),
  add constraint artists_deezer_url_https
    check (deezer_url is null or (deezer_url ~ '^https://' and char_length(deezer_url) <= 500));

-- One active artist per Deezer profile.
create unique index artists_org_deezer_key
  on public.artists (organization_id, deezer_id)
  where archived_at is null and deezer_id is not null;

grant insert (deezer_id, picture_url, deezer_url) on public.artists to authenticated;
grant update (deezer_id, picture_url, deezer_url) on public.artists to authenticated;
