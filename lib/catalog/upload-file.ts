import { recordArtistFile } from "@/lib/catalog/file-actions";
import {
  ARTIST_FILE_BUCKET,
  MAX_FILE_BYTES,
  fileExtension,
  type FileCategory,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the private bucket (storage
 * RLS: manage_catalog), then records it through a server action. Same flow
 * as the artist picture (lib/catalog/upload-picture.ts).
 */
export async function uploadArtistFile(input: {
  organizationId: string;
  artistId: string;
  category: FileCategory;
  file: File;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.artistFiles;
  if (input.file.size === 0) return { ok: false, error: t.empty };
  if (input.file.size > MAX_FILE_BYTES) return { ok: false, error: t.tooLarge };

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.artistId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(ARTIST_FILE_BUCKET);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[catalog] file upload failed:", error.message);
    return { ok: false, error: t.failed };
  }

  const result = await recordArtistFile({
    artistId: input.artistId,
    path,
    category: input.category,
    fileName: input.file.name,
    mime,
    bytes: input.file.size,
  });
  // Not recorded: the object would be orphaned, remove it.
  if (!result.ok) await bucket.remove([path]);
  return result;
}
