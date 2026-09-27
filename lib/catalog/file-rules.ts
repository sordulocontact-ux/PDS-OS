// Files of an artist or a title ("master"): buckets, limits and categories.
// Client-safe (the browser checks before uploading; the database enforces
// the same rules).

import type { AudioState } from "@/lib/catalog/title-rules";

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
  // `audio`: a successive audio version of the title, with its audio state
  // (Audio tab); the others are the Files tab's.
  master: ["audio", "stems", "artwork", "contract", "other"],
} as const satisfies Record<FileOwnerKind, readonly string[]>;

/** Categories offered by the Files tab: audio versions have their own tab. */
export const FILES_TAB_CATEGORIES = {
  artist: FILE_CATEGORIES.artist,
  master: ["stems", "artwork", "contract", "other"],
} as const satisfies { [K in FileOwnerKind]: readonly FileCategory<K>[] };

/** Audio files the browser can usually read (its duration included). */
export const AUDIO_ACCEPT = "audio/*,.wav,.aif,.aiff,.mp3,.flac,.m4a,.aac,.ogg";

export function isAudioFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = fileExtension(file.name);
  return ext !== null && AUDIO_EXTENSIONS.has(ext);
}

const AUDIO_EXTENSIONS = new Set([
  "wav",
  "aif",
  "aiff",
  "mp3",
  "flac",
  "m4a",
  "aac",
  "ogg",
]);

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
  // Audio versions of a title only.
  audioState: AudioState | null;
  durationSeconds: number | null;
  createdAt: string;
  // Empty when the author's name cannot be read.
  authorName: string;
  // Short-lived signed URL that downloads under the original name.
  downloadUrl: string | null;
};
