// A collective's main artist in the Juridique (§ 3.3 of Ibé's 18/11/2026):
// credited « main » on every title (credit_title_participations), it was
// repeated per title at the Cadrage, the Confirmation and the État des
// lieux. There it is said once (« PDS · Artiste principal · tous les
// titres »), the guests staying per title. Only for a collective: a project
// of its own keeps its artists per title. Pure, client-safe.

import { normalizeSearch } from "@/lib/utils/search";

export type MainArtist = { id: string | null; name: string };

/** The project's main artist, for a collective only. */
export function mainArtistOf(project: {
  collective?: boolean;
  artistId?: string | null;
  artistName?: string | null;
}): MainArtist | null {
  if (!project.collective) return null;
  const name = project.artistName?.trim() ?? "";
  if (!project.artistId && !name) return null;
  return { id: project.artistId ?? null, name };
}

/** An artist of a title is the main artist: by its page when both are
 * known, else by name. */
export function isMainArtist(
  main: MainArtist | null,
  artist: { artistId?: string | null; name: string },
): boolean {
  if (!main) return false;
  if (main.id && artist.artistId) return main.id === artist.artistId;
  return (
    main.name !== "" &&
    normalizeSearch(main.name) === normalizeSearch(artist.name.trim())
  );
}
