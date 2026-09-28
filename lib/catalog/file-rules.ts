// Files of an artist, a title ("master") or a launched project: buckets,
// limits and categories. One library for all three (feedback n°6).
// Client-safe (the browser checks before uploading; the database enforces
// the same rules).

import type { AudioState } from "@/lib/catalog/title-rules";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** What a file is attached to. */
export type FileOwnerKind = "artist" | "master" | "project";
export type FileOwner = { kind: FileOwnerKind; id: string };

export const FILE_BUCKETS = {
  artist: "artist-files",
  master: "master-files",
  project: "project-files",
} as const satisfies Record<FileOwnerKind, string>;

export const FILE_CATEGORIES = {
  artist: ["press", "photo", "contract", "audio", "other"],
  // `audio`: a successive audio version of the title, with its audio state
  // (Audio tab); the others are the Files tab's.
  master: ["audio", "stems", "artwork", "contract", "other"],
  // Call recordings and design versions have their own tables and sections.
  project: ["brief", "visual", "contract", "press", "other"],
} as const satisfies Record<FileOwnerKind, readonly string[]>;

/** Categories offered by the Files tab: audio versions have their own tab. */
export const FILES_TAB_CATEGORIES = {
  artist: FILE_CATEGORIES.artist,
  master: ["stems", "artwork", "contract", "other"],
  project: FILE_CATEGORIES.project,
} as const satisfies { [K in FileOwnerKind]: readonly FileCategory<K>[] };

/** Free precision beside the category ("Contrat artiste 2026"), as in SQL. */
export const MAX_DESCRIPTION_LENGTH = 200;

/**
 * A view of the library (feedback n°6): every file, or one category. Views
 * filter the same rows; a file exists once. `canReadContracts`: without it
 * (RLS hides contracts) the Contracts view is not offered at all.
 */
export type FileView = "all" | string;

export function fileViewsOf(
  kind: FileOwnerKind,
  canReadContracts: boolean,
): string[] {
  return [
    "all",
    ...FILES_TAB_CATEGORIES[kind].filter(
      (category) => canReadContracts || category !== "contract",
    ),
  ];
}

export function fileViewOf(
  kind: FileOwnerKind,
  canReadContracts: boolean,
  value: unknown,
): FileView {
  return typeof value === "string" &&
    fileViewsOf(kind, canReadContracts).includes(value)
    ? value
    : "all";
}

/** Categories a file of the Files tab can be classified in. */
export function isLibraryCategory(kind: FileOwnerKind, value: unknown) {
  return (
    typeof value === "string" &&
    (FILES_TAB_CATEGORIES[kind] as readonly string[]).includes(value)
  );
}

/**
 * The category offered first for new files: the view they were dropped on,
 * else what their type says (an image is a photo or an artwork, a sound is
 * audio on an artist), else none: the person chooses.
 */
export function suggestedCategory(
  kind: FileOwnerKind,
  view: FileView,
  files: { name: string; type: string }[],
): string | null {
  if (view !== "all") return view;
  const guess = (file: { name: string; type: string }) =>
    file.type.startsWith("image/")
      ? IMAGE_CATEGORY[kind]
      : kind === "artist" && isAudioFile(file)
        ? "audio"
        : null;
  const guesses = new Set(files.map(guess));
  const [only] = guesses;
  return guesses.size === 1 ? (only ?? null) : null;
}

// Where an image goes by default.
const IMAGE_CATEGORY = {
  artist: "photo",
  master: "artwork",
  project: "visual",
} as const satisfies { [K in FileOwnerKind]: FileCategory<K> };

/** "PDF", "JPG": the extension, else the MIME subtype. */
export function fileFormat(fileName: string, mime: string): string {
  const ext = fileExtension(fileName);
  if (ext) return ext.toUpperCase();
  const subtype = mime.split("/")[1];
  return subtype && subtype !== "octet-stream"
    ? subtype.split(/[.+;-]/)[0].toUpperCase()
    : "";
}

/** What the file's icon shows. */
export function fileKind(file: {
  fileName: string;
  mime: string;
}): "image" | "audio" | "document" {
  if (file.mime.startsWith("image/")) return "image";
  if (isAudioFile({ name: file.fileName, type: file.mime })) return "audio";
  return "document";
}

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
  // Free precision ("Portrait presse — septembre 2026"), null when none.
  description: string | null;
  fileName: string;
  mime: string;
  bytes: number;
  // Audio versions of a title only.
  audioState: AudioState | null;
  durationSeconds: number | null;
  createdAt: string;
  // Empty when the author's name cannot be read.
  authorName: string;
  // Short-lived signed URLs: open in the browser (preview), or download
  // under the original name.
  openUrl: string | null;
  downloadUrl: string | null;
};
