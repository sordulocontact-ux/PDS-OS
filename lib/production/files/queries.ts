import "server-only";

import {
  PRODUCTION_FILE_BUCKET,
  type ProductionFileKind,
} from "@/lib/production/files/rules";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Signed URLs live one hour, as the design files.
const SIGNED_URL_SECONDS = 3600;

export type ProductionFile = {
  id: string;
  kind: ProductionFileKind;
  fileName: string;
  mime: string;
  bytes: number;
  note: string | null;
  createdAt: string;
  // A signed download URL, null when signing failed.
  href: string | null;
};

/** The sheet's files (of some kinds), newest first, with signed URLs. */
export async function listProductionFiles(
  supabase: Client,
  sheetId: string,
  kinds?: readonly ProductionFileKind[],
): Promise<ProductionFile[]> {
  let query = supabase
    .from("production_files")
    .select("id, kind, path, file_name, mime, bytes, note, created_at")
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false });
  if (kinds) query = query.in("kind", kinds);
  const { data, error } = await query;
  if (error) console.error("listProductionFiles:", error.message);
  const bucket = supabase.storage.from(PRODUCTION_FILE_BUCKET);
  return Promise.all(
    (data ?? []).map(async (row) => {
      const signed = await bucket.createSignedUrl(
        row.path,
        SIGNED_URL_SECONDS,
        { download: row.file_name },
      );
      return {
        id: row.id,
        kind: row.kind as ProductionFileKind,
        fileName: row.file_name,
        mime: row.mime,
        bytes: row.bytes,
        note: row.note,
        createdAt: row.created_at,
        href: signed.data?.signedUrl ?? null,
      };
    }),
  );
}
