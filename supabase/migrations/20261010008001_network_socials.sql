-- Réseau: an artist's accounts (TikTok, Instagram, Spotify, Deezer). Asked by
-- Sacha on 10/10/2026: an artist spotted on a TikTok screenshot in the Labo
-- is saved to the Réseau with everything found about them, to be contacted
-- later. Stored as the platform's own identifiers (handle, artist id), never
-- as free URLs: the app builds the links. Additive: every row still passes.

alter table public.network_contacts
  add column tiktok_handle text,
  add column instagram_handle text,
  add column spotify_artist_id text,
  add column deezer_artist_id bigint,
  -- TikTok and Instagram usernames: letters, digits, "." and "_".
  add constraint network_contacts_tiktok_check
    check (tiktok_handle is null or tiktok_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint network_contacts_instagram_check
    check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint network_contacts_spotify_check
    check (spotify_artist_id is null or spotify_artist_id ~ '^[A-Za-z0-9]{22}$'),
  add constraint network_contacts_deezer_check
    check (deezer_artist_id is null or deezer_artist_id > 0);

-- The Labo looks a spotted artist up by account before offering to add them.
create index network_contacts_tiktok_idx
  on public.network_contacts (organization_id, lower(tiktok_handle))
  where tiktok_handle is not null;
create index network_contacts_deezer_idx
  on public.network_contacts (organization_id, deezer_artist_id)
  where deezer_artist_id is not null;

grant insert (tiktok_handle, instagram_handle, spotify_artist_id, deezer_artist_id)
  on public.network_contacts to authenticated;
grant update (tiktok_handle, instagram_handle, spotify_artist_id, deezer_artist_id)
  on public.network_contacts to authenticated;
