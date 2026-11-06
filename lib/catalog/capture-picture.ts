import "server-only";

import type {
  CapturePicture,
  SocialLink,
} from "@/lib/catalog/capture-artist-types";
import { socialImageUrl } from "@/lib/integrations/social-page";
import { profilePictureUrl } from "@/lib/integrations/social-picture";
import { parseSpotifyId } from "@/lib/network/socials";

/**
 * An artist's picture in the Repérage, in the order the Réseau takes it on
 * saving (PROFILE_PICTURE_SOURCES, Sacha 06/11/2026: « vu que c'est une
 * artiste, récupère la photo de Spotify, sinon Deezer »): their Spotify,
 * else the Deezer account the code holds, else what TikTok or Instagram
 * gave. The contact form shows it before saving.
 */
export async function artistPicture(
  spotify: SocialLink | null,
  deezerPicture: string | null,
  fallback: CapturePicture | null,
): Promise<CapturePicture | null> {
  const spotifyId = spotify ? parseSpotifyId(spotify.url) : null;
  const fromSpotify = spotifyId
    ? await profilePictureUrl("spotify", spotifyId)
    : null;
  if (fromSpotify) return { url: fromSpotify, source: "spotify" };
  const fromDeezer = socialImageUrl(deezerPicture)?.href;
  if (fromDeezer) return { url: fromDeezer, source: "deezer" };
  return fallback;
}
