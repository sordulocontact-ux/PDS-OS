import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActionResult } from "@/lib/calls/constants";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Gives a call its audio, once: the file uploaded by the browser, or the
 * recording assembled from its saved pieces. Under the user's RLS.
 */
export async function setCallAudio(
  supabase: SupabaseClient<Database>,
  callId: string,
  audio: { path: string; mime: string; bytes: number },
): Promise<ActionResult> {
  const { data: call } = await supabase
    .from("calls")
    .select("consent, audio_path")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return { ok: false, error: "not_found" };
  if (call.consent !== "granted")
    return { ok: false, error: "consent_required" };
  if (call.audio_path) return { ok: false, error: "audio_exists" };

  const { data: updated, error } = await supabase
    .from("calls")
    .update({
      audio_path: audio.path,
      audio_mime: audio.mime,
      audio_bytes: audio.bytes,
      status: "uploaded",
      error_code: null,
    })
    .eq("id", callId)
    .is("audio_path", null)
    .eq("consent", "granted")
    .select("id");
  if (error || !updated?.length) {
    console.error("[calls] attach audio failed:", error?.message);
    return { ok: false, error: "save_failed" };
  }
  return { ok: true };
}
