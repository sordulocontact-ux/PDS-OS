import "server-only";

import { z } from "zod";

import { fetchJson } from "@/lib/integrations/http";

/**
 * iTunes Lookup — no authentication. It does NOT search by ISRC (checked
 * 2026-09-25: always 0 result), only by album UPC. The track is then picked
 * by disc and track number, never by fuzzy title matching.
 */

const resultSchema = z.object({
  results: z.array(
    z.object({
      wrapperType: z.string(),
      trackViewUrl: z.url().optional(),
      collectionViewUrl: z.url().optional(),
      trackNumber: z.number().optional(),
      discNumber: z.number().optional(),
    }),
  ),
});

export async function findAppleMusicTrack(
  upc: string,
  position: { track: number; disc: number },
): Promise<string | null> {
  const url = new URL("https://itunes.apple.com/lookup");
  url.search = new URLSearchParams({
    upc,
    entity: "song",
    country: "FR",
  }).toString();

  const parsed = resultSchema.safeParse(await fetchJson("itunes", url));
  if (!parsed.success) return null;

  const track = parsed.data.results.find(
    (r) =>
      r.wrapperType === "track" &&
      r.trackNumber === position.track &&
      (r.discNumber ?? 1) === position.disc,
  );
  return track?.trackViewUrl ?? null;
}

/** The album itself, by its UPC (a collective's compilation, lot 13). */
export async function findAppleMusicAlbum(upc: string): Promise<string | null> {
  const url = new URL("https://itunes.apple.com/lookup");
  url.search = new URLSearchParams({ upc, country: "FR" }).toString();
  const parsed = resultSchema.safeParse(await fetchJson("itunes", url));
  if (!parsed.success) return null;
  return (
    parsed.data.results.find((r) => r.wrapperType === "collection")
      ?.collectionViewUrl ?? null
  );
}
