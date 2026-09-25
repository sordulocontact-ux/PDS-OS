import "server-only";

import { z } from "zod";

import { fetchJson } from "@/lib/integrations/http";

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
