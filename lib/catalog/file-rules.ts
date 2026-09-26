// Artist files: bucket, limits and categories. Client-safe (the browser
// checks before uploading; the database enforces the same rules).

export const ARTIST_FILE_BUCKET = "artist-files";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const FILE_CATEGORIES = [
  "press",
  "photo",
  "contract",
  "audio",
  "other",
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export function isFileCategory(value: unknown): value is FileCategory {
  return (
    typeof value === "string" &&
    (FILE_CATEGORIES as readonly string[]).includes(value)
  );
}

/** Lowercase extension of a file name, when it is a plain one ("pdf"). */
export function fileExtension(fileName: string): string | null {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName);
  return match ? match[1].toLowerCase() : null;
}

// "<organization_id>/<artist_id>/<uuid>[.<ext>]", as the database checks.
export function isArtistFilePath(
  path: string,
  organizationId: string,
  artistId: string,
): boolean {
  const prefix = `${organizationId}/${artistId}/`;
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

export type ArtistFile = {
  id: string;
  category: FileCategory;
  fileName: string;
  mime: string;
  bytes: number;
  createdAt: string;
  // Empty when the author's name cannot be read.
  authorName: string;
  // Short-lived signed URL that downloads under the original name.
  downloadUrl: string | null;
};
