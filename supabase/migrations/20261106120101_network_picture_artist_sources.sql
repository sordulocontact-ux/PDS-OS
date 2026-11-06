-- Réseau: an artist's picture comes first from their Spotify, else their
-- Deezer profile, then TikTok or Instagram (Sacha, 06/11/2026: « vu que
-- c'est une artiste, récupère la photo de Spotify, sinon Deezer »). Two more
-- sources for picture_source. Additive: every row still passes.

alter table public.network_contacts
  drop constraint network_contacts_picture_source_check,
  add constraint network_contacts_picture_source_check
    check (picture_source is null
           or picture_source in ('upload', 'spotify', 'deezer', 'tiktok',
                                 'instagram', 'none'));
