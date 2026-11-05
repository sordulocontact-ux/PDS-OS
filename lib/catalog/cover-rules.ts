// The cover of a title (retour « Ajouter une cover avec versions mises à
// jour », 01/11/2026): the latest image filed as « Pochette » (category
// `artwork`) in the title's Files. A new version of that file is a new
// version of the cover; the previous ones stay in the Files tab.
// Client-safe.

import { isShownImage, SHOWN_IMAGE_ACCEPT } from "@/lib/catalog/file-rules";

/** The file picker of the cover offers what the cover can show. */
export const COVER_ACCEPT = SHOWN_IMAGE_ACCEPT;

/** A file that can be shown as the title's cover. */
export function isCoverImage(file: { category: string; mime: string }) {
  return file.category === "artwork" && isShownImage(file.mime);
}

/**
 * The small copy made by the browser when the cover is filed, beside the
 * file in the same bucket: lists show it instead of a 3000 px original.
 * An older cover has none: the original is shown.
 */
export function coverThumbPath(path: string): string {
  return `${path}.thumb.jpg`;
}

// 2× the header's 80 px, sharp on a retina screen.
export const COVER_THUMB_PX = 320;

export type MasterCover = {
  // The cover's current version (a new one replaces it).
  fileId: string;
  version: number;
  fileName: string;
  // The small copy, else the original; the original opens in full.
  thumbUrl: string;
  fullUrl: string;
};
