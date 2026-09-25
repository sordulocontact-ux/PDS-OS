import "server-only";

import { z } from "zod";

import { fetchJson, IntegrationError } from "@/lib/integrations/http";

/**
 * MusicBrainz — open music database, no key, 1 request / s. Its streaming
 * links are community-maintained: complete for known titles, often empty
 * on release day.
 */

const schema = z.object({
  recordings: z.array(
    z.object({
      relations: z
        .array(z.object({ url: z.object({ resource: z.url() }).optional() }))
        .optional(),
    }),
  ),
});

export async function findStreamingUrls(isrc: string): Promise<string[]> {
  const url = `https://musicbrainz.org/ws/2/isrc/${isrc}?inc=url-rels&fmt=json`;
  let body: unknown;
  try {
    body = await fetchJson("musicbrainz", url);
  } catch (error) {
    // 404 means "unknown ISRC", not a failure.
    if (error instanceof IntegrationError && error.reason === "http_404")
      return [];
    throw error;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return [];

  return parsed.data.recordings.flatMap((recording) =>
    (recording.relations ?? []).flatMap((r) => (r.url ? [r.url.resource] : [])),
  );
}
