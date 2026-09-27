import "server-only";

import {
  FILE_BUCKETS,
  isFileCategory,
  type CatalogFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { audioStateOf } from "@/lib/catalog/title-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour, as the artist pictures.
const SIGNED_URL_SECONDS = 3600;

const SELECT = "id, category, path, file_name, mime, bytes, created_at";
const MASTER_SELECT = `${SELECT}, audio_state, duration_seconds`;

/**
 * Which files of a title: its audio versions (Audio tab), or everything
 * else (Files tab). Artists have no audio versions.
 */
export type FileScope = "audio" | "other";

// The two tables share their columns; only the owner column differs.
async function readRows(owner: FileOwner, scope?: FileScope) {
  const supabase = await createClient();
  if (owner.kind === "master") {
    const query = supabase
      .from("master_files")
      .select(
        `${MASTER_SELECT}, author:people!master_files_created_by_fkey(first_name, last_name)`,
      )
      .eq("master_id", owner.id);
    const scoped =
      scope === "audio"
        ? query.eq("category", "audio")
        : scope === "other"
          ? query.neq("category", "audio")
          : query;
    return scoped.order("created_at", { ascending: false });
  }
  return supabase
    .from("artist_files")
    .select(
      `${SELECT}, author:people!artist_files_created_by_fkey(first_name, last_name)`,
    )
    .eq("artist_id", owner.id)
    .order("created_at", { ascending: false });
}

/**
 * Files of an artist or a master, newest first, with the viewer's session:
 * RLS hides contracts from a viewer without manage_catalog.
 */
export async function listCatalogFiles(
  owner: FileOwner,
  scope?: FileScope,
): Promise<{ files: CatalogFile[]; error: boolean }> {
  const { data, error } = await readRows(owner, scope);
  if (error) {
    console.error("listCatalogFiles:", error.message);
    return { files: [], error: true };
  }

  const supabase = await createClient();
  const bucket = supabase.storage.from(FILE_BUCKETS[owner.kind]);
  const files = await Promise.all(
    (data ?? []).map(async (row): Promise<CatalogFile> => {
      // Only a title's files have these columns.
      const audio = row as {
        audio_state?: string | null;
        duration_seconds?: number | null;
      };
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
        audioState: audioStateOf(audio.audio_state ?? null),
        durationSeconds: audio.duration_seconds ?? null,
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
