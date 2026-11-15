import "server-only";

import { z } from "zod";

import { deezerArtistIdOf } from "@/lib/catalog/deezer-link";
import { fetchJson, IntegrationError } from "@/lib/integrations/http";

/**
 * Deezer public API — no authentication, 50 requests / 5 s.
 * Answers HTTP 200 with an `error` object when nothing matches.
 */

const BASE = "https://api.deezer.com";

const trackSchema = z.object({
  id: z.number(),
  title: z.string(),
  isrc: z.string(),
  link: z.url(),
  release_date: z.string().optional(),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  artist: z.object({ name: z.string() }),
  album: z.object({
    id: z.number(),
    title: z.string(),
    cover_medium: z.url().optional(),
  }),
});

const albumSchema = z.object({ upc: z.string().optional() });

export type DeezerTrack = z.infer<typeof trackSchema>;

export async function findTrackByIsrc(
  isrc: string,
): Promise<DeezerTrack | null> {
  const body = await fetchJson("deezer", `${BASE}/track/isrc:${isrc}`);
  const parsed = trackSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export async function findAlbumUpc(albumId: number): Promise<string | null> {
  const parsed = albumSchema.safeParse(
    await fetchJson("deezer", `${BASE}/album/${albumId}`),
  );
  return parsed.success ? (parsed.data.upc ?? null) : null;
}

const albumByUpcSchema = z.object({
  id: z.number(),
  title: z.string(),
  link: z.url(),
  release_date: z.string().optional(),
  cover_medium: z.url().optional(),
  artist: z.object({ name: z.string() }),
});

export type DeezerAlbum = z.infer<typeof albumByUpcSchema>;

/** An album by its UPC (a collective's compilation, lot 13); null when
 * nothing matches. */
export async function findAlbumByUpc(upc: string): Promise<DeezerAlbum | null> {
  const parsed = albumByUpcSchema.safeParse(
    await fetchJson("deezer", `${BASE}/album/upc:${upc}`),
  );
  return parsed.success ? parsed.data : null;
}

// Artists ---------------------------------------------------------------------

const artistSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  link: z.url(),
  picture_medium: z.url().optional(),
  picture_big: z.url().optional(),
  nb_fan: z.number().int().nonnegative().optional(),
  nb_album: z.number().int().nonnegative().optional(),
});

export type DeezerArtist = {
  id: number;
  name: string;
  link: string;
  // Null when Deezer only has its grey placeholder.
  pictureMedium: string | null;
  pictureBig: string | null;
  fans: number;
  // Every release Deezer lists (albums, EPs, singles, compilations).
  releaseCount: number;
};

// Deezer serves a placeholder with an empty hash (".../images/artist//...",
// ".../images/cover//...") when there is no picture; only its own https CDN
// is kept.
export function deezerImage(url: string | undefined): string | null {
  if (!url || !url.startsWith("https://")) return null;
  return url.includes("//", "https://".length) ? null : url;
}

function toArtist(raw: z.infer<typeof artistSchema>): DeezerArtist {
  return {
    id: raw.id,
    name: raw.name,
    link: raw.link,
    pictureMedium: deezerImage(raw.picture_medium),
    pictureBig: deezerImage(raw.picture_big),
    fans: raw.nb_fan ?? 0,
    releaseCount: raw.nb_album ?? 0,
  };
}

const SEARCH_POOL = 25;

// Deezer's relevance ranks obscure homonyms first ("angele" puts the artist
// with 1.7 M fans sixth): a wider pool is fetched, then ordered by fans.
export async function searchArtists(
  query: string,
  limit = 8,
): Promise<DeezerArtist[]> {
  const url = new URL(`${BASE}/search/artist`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(SEARCH_POOL));
  const parsed = z
    .object({ data: z.array(z.unknown()) })
    .safeParse(await fetchJson("deezer", url));
  if (!parsed.success) return [];
  return parsed.data.data
    .flatMap((row) => {
      const artist = artistSchema.safeParse(row);
      return artist.success ? [toArtist(artist.data)] : [];
    })
    .sort((a, b) => b.fans - a.fans)
    .slice(0, limit);
}

/**
 * Artists of the tracks whose title matches `query` exactly (case, accents
 * and punctuation aside): a TikTok display name is often one of the
 * artist's songs ("Miss KITOKO" → Theodora). Ids only, most relevant first.
 */
export async function findArtistIdsByTrackTitle(
  query: string,
  sameTitle: (title: string) => boolean,
): Promise<number[]> {
  const url = new URL(`${BASE}/search/track`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "15");
  const parsed = z
    .object({
      data: z.array(
        z.object({ title: z.string(), artist: z.object({ id: z.number() }) }),
      ),
    })
    .safeParse(await fetchJson("deezer", url));
  if (!parsed.success) return [];
  return [
    ...new Set(
      parsed.data.data
        .filter((track) => sameTitle(track.title))
        .map((track) => track.artist.id),
    ),
  ];
}

export async function getDeezerArtist(
  id: number,
): Promise<DeezerArtist | null> {
  const parsed = artistSchema.safeParse(
    await fetchJson("deezer", `${BASE}/artist/${id}`),
  );
  return parsed.success ? toArtist(parsed.data) : null;
}

// A link.deezer.com share link answers one redirect to the deezer.com page;
// only that hop is followed, and only the artist id is kept from it.
export async function resolveDeezerShareLink(
  url: string,
): Promise<number | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError("deezer", "unreachable");
  }
  const location = response.headers.get("location");
  return location ? deezerArtistIdOf(location) : null;
}
