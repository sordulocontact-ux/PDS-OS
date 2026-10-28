import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { ACTIVATION_FILE_BUCKET } from "@/lib/activations/model";
import { createClient } from "@/lib/supabase/server";

export type ActivationFile = {
  id: string;
  kind: string;
  fileName: string;
  // A signed link for an hour; null when it could not be signed.
  href: string | null;
};

const SIGNED_URL_SECONDS = 60 * 60;

/** An activation's files this session may read (restricted ones only for the
 * budget readers: RLS), each with a signed link. Cached per request. */
export const loadActivationFiles = trackedCache(
  async (activationId: string): Promise<Map<string, ActivationFile>> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activation_files")
      .select("id, kind, path, file_name")
      .eq("activation_id", activationId);
    if (error) console.error("loadActivationFiles:", error.message);
    const bucket = supabase.storage.from(ACTIVATION_FILE_BUCKET);
    const files = await Promise.all(
      (data ?? []).map(async (row) => {
        const signed = await bucket.createSignedUrl(
          row.path,
          SIGNED_URL_SECONDS,
        );
        return {
          id: row.id,
          kind: row.kind,
          fileName: row.file_name,
          href: signed.data?.signedUrl ?? null,
        };
      }),
    );
    return new Map(files.map((f) => [f.id, f]));
  },
);
