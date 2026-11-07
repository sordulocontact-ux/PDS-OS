// Files of an artist, a title ("master"), a launched project or a contract:
// buckets, limits and categories. One library for all four (feedback n°6),
// each file versioned (a new version keeps the previous ones).
// Client-safe (the browser checks before uploading; the database enforces
// the same rules).

import type { AudioState } from "@/lib/catalog/title-rules";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
// A title's files (stems, audio versions, deliveries) are big: 500 Mo, as the
// production files. The master-files bucket and its bytes check say the same.
export const MAX_MASTER_FILE_BYTES = 500 * 1024 * 1024;

/** The size limit of a file of this owner (the bucket enforces the same). */
export function maxFileBytes(kind: FileOwnerKind): number {
  return kind === "master" ? MAX_MASTER_FILE_BYTES : MAX_FILE_BYTES;
}

/** What a file is attached to. */
export type FileOwnerKind = "artist" | "master" | "project" | "contract";
export type FileOwner = { kind: FileOwnerKind; id: string };

export const FILE_BUCKETS = {
  artist: "artist-files",
  master: "master-files",
  project: "project-files",
  contract: "contract-files",
} as const satisfies Record<FileOwnerKind, string>;

export const FILE_CATEGORIES = {
  artist: ["press", "photo", "contract", "audio", "other"],
  // `audio`: a successive audio version of the title, with its audio state
  // (Audio tab); the others are the Files tab's.
  master: ["audio", "stems", "artwork", "contract", "other"],
  // Call recordings and design versions have their own tables and sections.
  project: ["brief", "visual", "contract", "press", "other"],
  // The drafts exchanged, the signed copy, its proof (Juridique 03), annexes.
  // « pds_signed »: the PDF the direction signed for PDS, sent to the person.
  contract: ["draft", "signed", "evidence", "annex", "other", "pds_signed"],
} as const satisfies Record<FileOwnerKind, readonly string[]>;

/** Categories offered by the Files tab: audio versions have their own tab. */
export const FILES_TAB_CATEGORIES = {
  artist: FILE_CATEGORIES.artist,
  master: ["stems", "artwork", "contract", "other"],
  project: FILE_CATEGORIES.project,
  contract: FILE_CATEGORIES.contract,
} as const satisfies { [K in FileOwnerKind]: readonly FileCategory<K>[] };

/**
 * A writer limited to some categories and to her own files: the creative
 * team in a project's library (Visuels and Autres, UX test of 09/10/2026).
 */
export type FileWriteScope = {
  categories: readonly string[];
  personId: string;
};

export const CREATIVE_PROJECT_CATEGORIES = ["visual", "other"] as const;

/** Whether a scoped writer may edit or delete this file (RLS says the same). */
export function canWriteFile(
  file: { category: string; authorPersonId: string | null },
  scope: FileWriteScope | null | undefined,
): boolean {
  return (
    !scope ||
    (file.authorPersonId === scope.personId &&
      scope.categories.includes(file.category))
  );
}

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
  contract: "annex",
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

// Images every browser shows: a PSD, a TIFF or a HEIC keeps the icon.
const SHOWN_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** An image the browser can show as a thumbnail (or as a title's cover). */
export function isShownImage(mime: string): boolean {
  return SHOWN_IMAGES.has(mime);
}

/** The thumbnail picker's `accept`: what `isShownImage` takes. */
export const SHOWN_IMAGE_ACCEPT = [...SHOWN_IMAGES].join(",");

/** What the file's icon shows. */
export function fileKind(file: {
  fileName: string;
  mime: string;
}): "image" | "audio" | "document" {
  if (file.mime.startsWith("image/")) return "image";
  if (isAudioFile({ name: file.fileName, type: file.mime })) return "audio";
  return "document";
}

// The audio formats accepted for a title's versions (retour Catalogue 20):
// one list for the file picker, the check before upload, the server and the
// help text, so what is said is what is accepted.
export const AUDIO_FORMATS = {
  WAV: ["wav"],
  AIFF: ["aif", "aiff"],
  FLAC: ["flac"],
  MP3: ["mp3"],
  M4A: ["m4a"],
  AAC: ["aac"],
  OGG: ["ogg"],
} as const;

const AUDIO_EXTENSIONS = new Set<string>(Object.values(AUDIO_FORMATS).flat());

/** « WAV, AIFF, FLAC, MP3, M4A, AAC ou OGG ». */
export const AUDIO_FORMAT_LIST = new Intl.ListFormat("fr-FR", {
  type: "disjunction",
}).format(Object.keys(AUDIO_FORMATS));

/** The file picker offers exactly the accepted formats. */
export const AUDIO_ACCEPT = [...AUDIO_EXTENSIONS]
  .map((ext) => `.${ext}`)
  .join(",");

/** An accepted audio file, by its extension (its type varies by browser). */
export function isAudioFile(file: { name: string; type: string }): boolean {
  const ext = fileExtension(file.name);
  return ext !== null && AUDIO_EXTENSIONS.has(ext);
}

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

/**
 * A signed URL that downloads under the file's own name: the name is a plain
 * query parameter beside the token (as storage-js adds it), so the same
 * signature serves both opening and downloading.
 */
export function withDownloadName(url: string, fileName: string): string {
  const signed = new URL(url);
  signed.searchParams.set("download", fileName);
  return signed.toString();
}

const sizeFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** "2,4 Mo", "830 Ko". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024)
    return `${sizeFormat.format(Math.max(1, bytes / 1024))} Ko`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} Mo`;
}

/** An earlier version of a file, kept when a new one replaced it. */
export type CatalogFileVersion = {
  id: string;
  version: number;
  fileName: string;
  mime: string;
  bytes: number;
  createdAt: string;
  authorName: string;
  openUrl: string | null;
  downloadUrl: string | null;
};

export type CatalogFile = {
  id: string;
  // Its series (every version of the same file) and its number in it.
  seriesId: string;
  version: number;
  // Every version of the series, newest first, this one included; a single
  // entry when the file was never replaced.
  versions: CatalogFileVersion[];
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
  // Who added this version (a creative director edits only her own files).
  authorPersonId: string | null;
  // Short-lived signed URLs: open in the browser (preview), or download
  // under the original name.
  openUrl: string | null;
  downloadUrl: string | null;
  // A small copy shown in place of its icon (an image's own URL, or a
  // title cover's 320 px copy); null when it is not a shown image.
  previewUrl: string | null;
};
