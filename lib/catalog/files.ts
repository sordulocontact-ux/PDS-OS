import "server-only";

import {
  FILE_BUCKETS,
  isFileCategory,
  type CatalogFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour, as the artist pictures.
const SIGNED_URL_SECONDS = 3600;

const SELECT = "id, category, path, file_name, mime, bytes, created_at";

// The two tables share their columns; only the owner column differs.
async function readRows(owner: FileOwner) {
  const supabase = await createClient();
  return owner.kind === "artist"
    ? supabase
        .from("artist_files")
        .select(
          `${SELECT}, author:people!artist_files_created_by_fkey(first_name, last_name)`,
        )
        .eq("artist_id", owner.id)
        .order("created_at", { ascending: false })
    : supabase
        .from("master_files")
        .select(
          `${SELECT}, author:people!master_files_created_by_fkey(first_name, last_name)`,
        )
        .eq("master_id", owner.id)
        .order("created_at", { ascending: false });
}

/**
 * Files of an artist or a master, newest first, with the viewer's session:
 * RLS hides contracts from a viewer without manage_catalog.
 */
export async function listCatalogFiles(
  owner: FileOwner,
): Promise<{ files: CatalogFile[]; error: boolean }> {
  const { data, error } = await readRows(owner);
  if (error) {
    console.error("listCatalogFiles:", error.message);
    return { files: [], error: true };
  }

  const supabase = await createClient();
  const bucket = supabase.storage.from(FILE_BUCKETS[owner.kind]);
  const files = await Promise.all(
    (data ?? []).map(async (row): Promise<CatalogFile> => {
      const signed = await bucket.createSignedUrl(
        row.path,
        SIGNED_URL_SECONDS,
        { download: row.file_name },
      );
      if (signed.error)
        console.error("listCatalogFiles (sign):", signed.error.message);
      return {
        id: row.id,
        category: isFileCategory(owner.kind, row.category)
          ? row.category
          : "other",
        fileName: row.file_name,
        mime: row.mime,
        bytes: row.bytes,
        createdAt: row.created_at,
        authorName: row.author
          ? personName(row.author.first_name, row.author.last_name)
          : "",
        downloadUrl: signed.data?.signedUrl ?? null,
      };
    }),
  );
  return { files, error: false };
}
