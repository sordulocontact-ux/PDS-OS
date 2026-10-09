import "server-only";

import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 3600;

/**
 * The project's cover for its header: the latest artwork image filed on its
 * titles (`master_files`, category « artwork »), the first title first. A
 * short-lived signed URL made with the viewer's session (storage RLS); null
 * when there is none, and the header shows a disc. Never invented.
 */
export async function loadProjectCover(
  masterIds: string[],
): Promise<string | null> {
  if (masterIds.length === 0) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_files")
    .select("master_id, path")
    .in("master_id", masterIds)
    .eq("category", "artwork")
    .like("mime", "image/%")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("loadProjectCover:", error.message);
    return null;
  }
  // The first title's latest artwork, else any title's in their order.
  const file = masterIds
    .map((id) => data.find((row) => row.master_id === id))
    .find(Boolean);
  if (!file) return null;
  const signed = await supabase.storage
    .from(FILE_BUCKETS.master)
    .createSignedUrl(file.path, SIGNED_URL_SECONDS);
  if (signed.error) {
    console.error("loadProjectCover (sign):", signed.error.message);
    return null;
  }
  return signed.data.signedUrl;
}
