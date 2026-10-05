import "server-only";

import { silentWav, tinyPng } from "@/lib/assistant/test-data/fake-master";
import type { Step } from "@/lib/assistant/test-data/fill-master";
import { logged, type Supabase } from "@/lib/assistant/test-data/writes";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import type { MasterDetail } from "@/lib/catalog/types";

type FileRow = {
  category: "audio" | "artwork";
  file_name: string;
  audio_state?: "final_master";
  duration_seconds?: number;
};

/**
 * Files of a title filled with test data: a final master (one second of
 * silence, a real WAV) and an artwork, each only if none exists. Same bucket,
 * path and row as an upload from the page (lib/catalog/upload-file.ts).
 */
export async function fillMasterFiles(
  supabase: Supabase,
  organizationId: string,
  master: MasterDetail,
  durationSeconds: number,
): Promise<{ audio: Step; artwork: Step }> {
  const { data: files } = await supabase
    .from("master_files")
    .select("category, audio_state")
    .eq("master_id", master.id);

  const upload = async (file: Blob, ext: string, row: FileRow) => {
    const path = `${organizationId}/${master.id}/${crypto.randomUUID()}.${ext}`;
    const bucket = supabase.storage.from(FILE_BUCKETS.master);
    const stored = await bucket.upload(path, file, { contentType: file.type });
    if (!logged(stored, "upload")) return false;
    const saved = await supabase.from("master_files").insert({
      ...row,
      organization_id: organizationId,
      master_id: master.id,
      path,
      mime: file.type,
      bytes: file.size,
    });
    // Not recorded: the object would be orphaned, remove it.
    if (!logged(saved, "file")) await bucket.remove([path]);
    return !saved.error;
  };

  return {
    audio: files?.some((f) => f.audio_state === "final_master")
      ? null
      : await upload(silentWav(), "wav", {
          category: "audio",
          file_name: `${master.title} - master final.wav`,
          audio_state: "final_master",
          duration_seconds: durationSeconds,
        }),
    artwork: files?.some((f) => f.category === "artwork")
      ? null
      : await upload(tinyPng(), "png", {
          category: "artwork",
          file_name: `${master.title} - pochette.png`,
        }),
  };
}
