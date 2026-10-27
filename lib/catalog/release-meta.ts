// "Single · 14 nov. 2025": kind and date of a Deezer release. Client-safe.

import type { ArtistRelease } from "@/lib/catalog/artist-types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { formatShortDate } from "@/lib/release/format";

const fr = { catalog };

export function releaseMeta(
  release: Pick<ArtistRelease, "kind" | "releaseDate">,
): string {
  const t = fr.catalog.deezerProfile;
  const date = release.releaseDate
    ? formatShortDate(release.releaseDate)
    : t.discography.noDate;
  return `${t.kinds[release.kind]} · ${date}`;
}
