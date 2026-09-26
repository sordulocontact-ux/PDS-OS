// "Single · 14 nov. 2025": kind and date of a Deezer release. Client-safe.

import type { ArtistRelease } from "@/lib/catalog/artist-types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

export function releaseMeta(
  release: Pick<ArtistRelease, "kind" | "releaseDate">,
): string {
  const t = fr.catalog.deezerProfile;
  const date = release.releaseDate
    ? formatShortDate(release.releaseDate)
    : t.discography.noDate;
  return `${t.kinds[release.kind]} · ${date}`;
}
