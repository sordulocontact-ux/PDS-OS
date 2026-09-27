// Archiving artists, masters and projects. Client-safe.

export const ARCHIVE_KINDS = ["artist", "master", "project"] as const;
export type ArchiveKind = (typeof ARCHIVE_KINDS)[number];

/** Translated in fr.records.errors. */
export type ArchiveErrorCode =
  | "forbidden"
  | "not_found"
  | "artist_in_use"
  | "master_in_use"
  | "project_launched"
  | "artist_name_taken"
  | "master_uses_archived"
  | "project_uses_archived"
  | "generic";

export type ArchiveResult =
  { ok: true } | { ok: false; error: ArchiveErrorCode };

/** `?view=archived` on a list page shows the archive (director only). */
export function isArchivedView(value: unknown): boolean {
  return value === "archived";
}

/** What the viewer may do on the rows of a list, decided by the page. */
export type RecordRights = {
  canEdit: boolean;
  canArchive: boolean;
  // The list shows the archive: rows can only be restored.
  archived: boolean;
};
