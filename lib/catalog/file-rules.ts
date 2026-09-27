// Files of an artist or a master: buckets, limits and categories.
// Client-safe (the browser checks before uploading; the database enforces
// the same rules).

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** What a file is attached to. */
export type FileOwnerKind = "artist" | "master";
export type FileOwner = { kind: FileOwnerKind; id: string };

export const FILE_BUCKETS = {
  artist: "artist-files",
  master: "master-files",
} as const satisfies Record<FileOwnerKind, string>;

export const FILE_CATEGORIES = {
  artist: ["press", "photo", "contract", "audio", "other"],
  master: ["master", "stems", "mix", "artwork", "contract", "other"],
} as const satisfies Record<FileOwnerKind, readonly string[]>;

export type FileCategory<K extends FileOwnerKind = FileOwnerKind> =
  (typeof FILE_CATEGORIES)[K][number];

export function isFileCategory<K extends FileOwnerKind>(
  kind: K,
  value: unknown,
): value is FileCategory<K> {
  return (
    typeof value === "string" &&
    (FILE_CATEGORIES[kind] as readonly string[]).includes(value)
  );
}

/** Lowercase extension of a file name, when it is a plain one ("pdf"). */
export function fileExtension(fileName: string): string | null {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName);
  return match ? match[1].toLowerCase() : null;
}

// "<organization_id>/<owner_id>/<uuid>[.<ext>]", as the database checks.
export function isCatalogFilePath(
  path: string,
  organizationId: string,
  ownerId: string,
): boolean {
  const prefix = `${organizationId}/${ownerId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/.test(path.slice(prefix.length))
  );
}

const sizeFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** "2,4 Mo", "830 Ko". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024)
    return `${sizeFormat.format(Math.max(1, bytes / 1024))} Ko`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} Mo`;
}

export type CatalogFile = {
  id: string;
  category: string;
  fileName: string;
  mime: string;
  bytes: number;
  createdAt: string;
  // Empty when the author's name cannot be read.
  authorName: string;
  // Short-lived signed URL that downloads under the original name.
  downloadUrl: string | null;
};
