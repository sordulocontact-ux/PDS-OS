// An artist's moodboards as folders (retour du 10/11/2026): a « piste »
// with a title and an intention, holding its images (files of the artist's
// library, category « moodboard »). Client-safe: the forms check the same
// limits as the database (…20261110150101_artist_moodboard_folders.sql).

import type { CatalogFile } from "@/lib/catalog/file-rules";

export const MAX_MOODBOARD_TITLE = 120;
export const MAX_MOODBOARD_NOTE = 500;

export type ArtistMoodboard = {
  id: string;
  title: string;
  note: string | null;
  // The Figma frame it was imported from.
  sourceUrl: string | null;
  createdAt: string;
  authorName: string;
  authorPersonId: string | null;
  // Its images, in the order they were added (a Figma board's overview
  // first).
  files: CatalogFile[];
};

/**
 * Whether this viewer may rename or delete the folder: the Catalogue on
 * every folder (no scope), a creative director on his own (RLS says the
 * same).
 */
export function canWriteMoodboard(
  moodboard: { authorPersonId: string | null },
  scope: { personId: string } | null,
): boolean {
  return !scope || moodboard.authorPersonId === scope.personId;
}
