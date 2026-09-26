import "server-only";

import { z } from "zod";

import { RELEASE_KINDS, type ReleaseKind } from "@/lib/catalog/types";
import { deezerImage as image } from "@/lib/integrations/deezer";
import { fetchJson } from "@/lib/integrations/http";

/**
 * Deezer public API, artist page data: discography, top tracks, similar
 * artists. Same rules as `deezer.ts` (no key, 50 requests / 5 s, HTTP 200
 * with an `error` object when nothing matches).
 */

const BASE = "https://api.deezer.com";

export type DeezerRelease = {
  id: number;
  title: string;
  kind: ReleaseKind;
  // "YYYY-MM-DD", null when Deezer has no date ("0000-00-00").
  releaseDate: string | null;
  coverUrl: string | null;
  link: string;
};

export type DeezerTopTrack = {
  id: number;
  title: string;
  durationSeconds: number;
  link: string;
  album: string;
  coverUrl: string | null;
};

export type DeezerRelatedArtist = {
  id: number;
  name: string;
  link: string;
  pictureUrl: string | null;
  fans: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const albumSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  link: z.url(),
  cover_medium: z.string().optional(),
  release_date: z.string().optional(),
  record_type: z.string(),
});

const listSchema = z.object({
  data: z.array(z.unknown()),
  next: z.url().optional(),
});

function rows<T>(schema: z.ZodType<T>, data: unknown[]): T[] {
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

// Deezer pages by 25 by default; a prolific artist has a few hundred entries.
const ALBUM_PAGE = 100;
const ALBUM_PAGES_MAX = 5;

/** Every release of the artist, newest first (undated ones last). */
export async function listArtistReleases(
  deezerId: number,
): Promise<DeezerRelease[]> {
  const releases: DeezerRelease[] = [];
  let url: string | undefined =
    `${BASE}/artist/${deezerId}/albums?limit=${ALBUM_PAGE}`;
  for (let page = 0; url && page < ALBUM_PAGES_MAX; page++) {
    const parsed = listSchema.safeParse(await fetchJson("deezer", url));
    if (!parsed.success) break;
    for (const raw of rows(albumSchema, parsed.data.data)) {
      const kind = RELEASE_KINDS.find((k) => k === raw.record_type);
      if (!kind) continue;
      releases.push({
        id: raw.id,
        title: raw.title,
        kind,
        releaseDate:
          raw.release_date &&
          DATE.test(raw.release_date) &&
          !raw.release_date.startsWith("0000")
            ? raw.release_date
            : null,
        coverUrl: image(raw.cover_medium),
        link: raw.link,
      });
    }
    url = parsed.data.next;
  }
  return releases.sort((a, b) =>
    (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
  );
}

const trackSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  link: z.url(),
  duration: z.number().int().nonnegative(),
  album: z.object({
    title: z.string(),
    cover_medium: z.string().optional(),
  }),
});

export async function listTopTracks(
  deezerId: number,
  limit = 5,
): Promise<DeezerTopTrack[]> {
  const parsed = listSchema.safeParse(
    await fetchJson("deezer", `${BASE}/artist/${deezerId}/top?limit=${limit}`),
  );
  if (!parsed.success) return [];
  return rows(trackSchema, parsed.data.data).map((raw) => ({
    id: raw.id,
    title: raw.title,
    durationSeconds: raw.duration,
    link: raw.link,
    album: raw.album.title,
    coverUrl: image(raw.album.cover_medium),
  }));
}

const relatedSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  link: z.url(),
  picture_medium: z.string().optional(),
  nb_fan: z.number().int().nonnegative().optional(),
});

export async function listRelatedArtists(
  deezerId: number,
  limit = 8,
): Promise<DeezerRelatedArtist[]> {
  const parsed = listSchema.safeParse(
    await fetchJson(
      "deezer",
      `${BASE}/artist/${deezerId}/related?limit=${limit}`,
    ),
  );
  if (!parsed.success) return [];
  return rows(relatedSchema, parsed.data.data).map((raw) => ({
    id: raw.id,
    name: raw.name,
    link: raw.link,
    pictureUrl: image(raw.picture_medium),
    fans: raw.nb_fan ?? 0,
  }));
}
