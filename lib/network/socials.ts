/**
 * An artist's accounts as the Réseau keeps them (migration
 * 20261010008001): the platform's own identifier, never a free URL; the
 * links are built here. Pasting a profile link or typing "@handle" both
 * work. Pure, client-safe.
 */

import { deezerArtistIdOf } from "@/lib/catalog/deezer-link";

// TikTok and Instagram usernames: letters, digits, "." and "_".
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

export const tiktokUrl = (handle: string) =>
  `https://www.tiktok.com/@${handle}`;
export const instagramUrl = (handle: string) =>
  `https://www.instagram.com/${handle}/`;
export const spotifyUrl = (id: string) =>
  `https://open.spotify.com/artist/${id}`;
export const deezerUrl = (id: number) => `https://www.deezer.com/artist/${id}`;

export const asHandle = (value: string | null | undefined) => {
  const handle = value?.trim().replace(/^@/, "") ?? "";
  return HANDLE.test(handle) ? handle : null;
};

export const isSpotifyId = (value: string) => SPOTIFY_ID.test(value);

function urlOf(value: string): URL | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

const hostOf = (url: URL) => url.hostname.replace(/^(www|m)\./, "");

/**
 * "@Huntrill", "huntrill" or a profile link → "huntrill"; null if not.
 * Lowercased: TikTok and Instagram ignore case, the Réseau compares them so.
 */
export function parseHandle(
  value: string,
  host: "tiktok.com" | "instagram.com",
): string | null {
  const text = value.trim();
  if (!text) return null;
  if (!text.includes("/")) return asHandle(text)?.toLowerCase() ?? null;
  const url = urlOf(text);
  if (!url || hostOf(url) !== host) return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  return asHandle(first)?.toLowerCase() ?? null;
}

/** A Spotify artist link (or its bare id) → the id. */
export function parseSpotifyId(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (isSpotifyId(text)) return text;
  const url = urlOf(text);
  if (!url || url.hostname !== "open.spotify.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  // open.spotify.com/intl-fr/artist/<id>
  const index = parts.indexOf("artist");
  const id = index >= 0 ? parts[index + 1] : undefined;
  return id && isSpotifyId(id) ? id : null;
}

/** A Deezer artist page link (or its bare number) → the id. */
export function parseDeezerId(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const id = /^\d{1,12}$/.test(text) ? Number(text) : deezerArtistIdOf(text);
  return id && id > 0 ? id : null;
}

export type ContactSocials = {
  tiktok: string | null;
  instagram: string | null;
  spotifyId: string | null;
  deezerId: number | null;
};

/** The links of a contact's accounts, in a fixed order, present ones only. */
export function socialLinksOf(socials: ContactSocials) {
  return [
    socials.tiktok && {
      network: "tiktok" as const,
      label: `@${socials.tiktok}`,
      url: tiktokUrl(socials.tiktok),
    },
    socials.instagram && {
      network: "instagram" as const,
      label: `@${socials.instagram}`,
      url: instagramUrl(socials.instagram),
    },
    socials.spotifyId && {
      network: "spotify" as const,
      label: null,
      url: spotifyUrl(socials.spotifyId),
    },
    socials.deezerId && {
      network: "deezer" as const,
      label: null,
      url: deezerUrl(socials.deezerId),
    },
  ].filter((link) => !!link);
}
