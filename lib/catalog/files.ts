import "server-only";

import {
  ARTIST_FILE_BUCKET,
  isFileCategory,
  type ArtistFile,
} from "@/lib/catalog/file-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour, as the artist pictures.
const SIGNED_URL_SECONDS = 3600;

/**
 * Files of the artist, newest first, with the viewer's session: RLS hides
 * contracts from a viewer without manage_catalog.
 */
export async function listArtistFiles(
  artistId: string,
): Promise<{ files: ArtistFile[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_files")
    .select(
      "id, category, path, file_name, mime, bytes, created_at, author:people!artist_files_created_by_fkey(first_name, last_name)",
    )
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listArtistFiles:", error.message);
    return { files: [], error: true };
  }

  const bucket = supabase.storage.from(ARTIST_FILE_BUCKET);
  const files = await Promise.all(
    (data ?? []).map(async (row): Promise<ArtistFile> => {
      const signed = await bucket.createSignedUrl(
        row.path,
        SIGNED_URL_SECONDS,
        { download: row.file_name },
      );
      if (signed.error)
        console.error("listArtistFiles (sign):", signed.error.message);
      return {
        id: row.id,
        category: isFileCategory(row.category) ? row.category : "other",
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
