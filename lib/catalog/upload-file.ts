import { recordCatalogFile } from "@/lib/catalog/file-actions";
import {
  FILE_BUCKETS,
  MAX_FILE_BYTES,
  fileExtension,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the owner's private bucket
 * (storage RLS: manage_catalog), then records it through a server action.
 * Same flow as the artist picture (lib/catalog/upload-picture.ts).
 */
export async function uploadCatalogFile(input: {
  organizationId: string;
  owner: FileOwner;
  category: string;
  file: File;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.catalogFiles;
  if (input.file.size === 0) return { ok: false, error: t.empty };
  if (input.file.size > MAX_FILE_BYTES) return { ok: false, error: t.tooLarge };

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.owner.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(FILE_BUCKETS[input.owner.kind]);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[catalog] file upload failed:", error.message);
    return { ok: false, error: t.failed };
  }

  const result = await recordCatalogFile({
    owner: input.owner,
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
