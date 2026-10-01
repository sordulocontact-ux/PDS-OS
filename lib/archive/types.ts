// Archiving artists, masters, projects and network contacts. Client-safe.

export const ARCHIVE_KINDS = [
  "artist",
  "master",
  "project",
  "contact",
] as const;
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
  | "contact_in_use"
  | "generic";

export type ArchiveResult =
  { ok: true } | { ok: false; error: ArchiveErrorCode };

/** `?view=archived` on a list page shows the archive (director only). */
export function isArchivedView(value: unknown): boolean {
  return value === "archived";
}

/** Live and archived rows of a list, for its Actifs / Archivés tabs. */
export type RecordCounts = { live: number; archived: number };

/** What the viewer may do on the rows of a list, decided by the page. */
export type RecordRights = {
  canEdit: boolean;
  canArchive: boolean;
  // The list shows the archive: rows can only be restored.
  archived: boolean;
};
