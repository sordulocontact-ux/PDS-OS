import "server-only";

import { getAudioUrl } from "@/lib/calls/queries";
import { createClient } from "@/lib/supabase/server";

export type ProjectFile = {
  callId: string;
  callTitle: string;
  occurredAt: string;
  mime: string | null;
  bytes: number | null;
  // Short-lived signed URL (attachment), null when storage refused it.
  downloadUrl: string | null;
  hasTranscript: boolean;
  hasReport: boolean;
};

// "…/call.m4a" → "m4a": the downloaded file keeps its extension.
const extensionOf = (path: string) => path.split(".").pop() ?? "";

/**
 * Files stored for the project today: the call recordings. Read with the
 * user's session, so storage RLS decides who may download.
 */
export async function listProjectFiles(
  projectId: string,
): Promise<ProjectFile[]> {
  const supabase = await createClient();
  const { data: calls, error } = await supabase
    .from("calls")
    .select("id, title, occurred_at, audio_path, audio_mime, audio_bytes")
    .eq("project_id", projectId)
    .not("audio_path", "is", null)
    .order("occurred_at", { ascending: false });
  if (error) console.error("listProjectFiles:", error.message);
  if (!calls?.length) return [];

  const ids = calls.map((c) => c.id);
  const [transcripts, reports, urls] = await Promise.all([
    supabase.from("transcripts").select("call_id").in("call_id", ids),
    supabase.from("call_reports").select("call_id").in("call_id", ids),
    Promise.all(
      calls.map((c) =>
        c.audio_path
          ? getAudioUrl(
              supabase,
              c.audio_path,
              `${c.title}.${extensionOf(c.audio_path)}`,
            )
          : null,
      ),
    ),
  ]);
  const transcribed = new Set((transcripts.data ?? []).map((t) => t.call_id));
  const reported = new Set((reports.data ?? []).map((r) => r.call_id));

  return calls.map((c, i) => ({
    callId: c.id,
    callTitle: c.title,
    occurredAt: c.occurred_at,
    mime: c.audio_mime,
    bytes: c.audio_bytes,
    downloadUrl: urls[i] ?? null,
    hasTranscript: transcribed.has(c.id),
    hasReport: reported.has(c.id),
  }));
}
