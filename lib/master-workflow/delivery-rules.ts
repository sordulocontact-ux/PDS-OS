// What an engineer may deposit through their link (PROJ-BUG-08): an audio
// file, named like one. The same rules as the database
// (master_delivery_name_ok, open_master_delivery). Client-safe.

import { fileExtension } from "@/lib/catalog/file-rules";

export const DELIVERY_EXTENSIONS: readonly string[] = [
  "wav",
  "aif",
  "aiff",
  "flac",
  "mp3",
  "m4a",
  "aac",
  "ogg",
];

/** A few words and an audio extension, nothing that reads as a path. */
export function deliveryNameOk(fileName: string): boolean {
  const name = fileName.trim();
  const extension = fileExtension(name);
  return (
    name.length >= 3 &&
    name.length <= 200 &&
    !/[/\\\u0000-\u001f\u007f]/.test(name) &&
    extension !== null &&
    DELIVERY_EXTENSIONS.includes(extension)
  );
}
