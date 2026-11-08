import "server-only";

import { parseDeezerLink } from "@/lib/catalog/deezer-link";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import type { DeezerArtistResult } from "@/lib/catalog/types";
import {
  getDeezerArtist,
  resolveDeezerShareLink,
  searchArtists,
  type DeezerArtist,
} from "@/lib/integrations/deezer";

// A pasted Deezer link answers that one artist, however few fans it has; a
// link to anything but an artist answers no result.
async function findArtists(query: string): Promise<DeezerArtist[]> {
  const link = parseDeezerLink(query);
  if (!link) return searchArtists(query);
  const id =
    link.kind === "artist"
      ? link.id
      : link.kind === "share"
        ? await resolveDeezerShareLink(link.url)
        : null;
  const artist = id ? await getDeezerArtist(id) : null;
  return artist ? [artist] : [];
}

/**
 * Deezer artists for a name or a Deezer artist link, most fans first, each
 * flagged when the catalog already holds that profile. Shared by the « Nouvel
 * artiste » search and PO's artist proposal. Throws when Deezer fails.
 */
export async function lookUpDeezerArtists(
  query: string,
): Promise<DeezerArtistResult[]> {
  const found = await findArtists(query);
  const existing = await findArtistsByDeezerIds(found.map((a) => a.id));
  return found.map((artist) => ({
    deezerId: artist.id,
    name: artist.name,
    pictureUrl: artist.pictureMedium,
    fans: artist.fans,
    existing: existing.get(artist.id) ?? null,
  }));
}

const folded = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The results named exactly `name` (case, accents and spaces aside). */
export function sameName(
  results: DeezerArtistResult[],
  name: string,
): DeezerArtistResult[] {
  const wanted = folded(name);
  return results.filter((r) => folded(r.name) === wanted);
}
