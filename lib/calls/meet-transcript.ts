import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActionResult, CallErrorCode } from "@/lib/calls/constants";
import { claim, finish } from "@/lib/calls/pipeline";
import { loadLatestTranscript } from "@/lib/calls/queries";
import { hasOwnMeet } from "@/lib/calls/own-meet";
import { GoogleMeetError } from "@/lib/integrations/google-meet";
import { fetchMeetTranscript } from "@/lib/integrations/google-meet-transcript";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The call's transcript taken from its Google Meet instead of the app's
 * recording (docs/ARCHITECTURE.md § 4 bis): PDS OS made the Meet (Calendar,
 * in po@'s name) and turned its transcription on, so po@ may read it back.
 * Saved as any transcript (`transcripts`, provider `google_meet`), then the
 * report follows the usual way (`runExtraction`). Runs with the user's
 * client: RLS decides who may write, never the service role.
 */

type Client = SupabaseClient<Database>;

function errorOf(error: unknown): CallErrorCode {
  if (!(error instanceof GoogleMeetError)) return "provider_error";
  switch (error.reason) {
    case "meet_pending":
    case "meet_no_conference":
    case "meet_no_transcript":
      return error.reason;
    case "unreachable":
      return "provider_error";
    default:
      // 401/403 (token without the scope, Workspace edition without
      // transcripts), 404, not configured.
      return "meet_unavailable";
  }
}

export async function runMeetTranscription(
  supabase: Client,
  callId: string,
): Promise<ActionResult> {
  const { data: row } = await supabase
    .from("calls")
    .select("meeting_url, google_event_id")
    .eq("id", callId)
    .maybeSingle();
  if (!row) return { ok: false, error: "not_found" };
  if (
    !(await hasOwnMeet({
      meetingUrl: row.meeting_url,
      googleEventId: row.google_event_id,
    }))
  )
    return { ok: false, error: "meet_unavailable" };
  // Read twice (two tabs): the first one wins, the second has nothing to do.
  if (await loadLatestTranscript(supabase, callId)) return { ok: true };

  const call = await claim(supabase, callId, "transcribing", {
    needsAudio: false,
  });
  if (typeof call === "string") return { ok: false, error: call };
  const fail = (error: CallErrorCode) => finish(supabase, callId, { error });

  const started = Date.now();
  let transcript: Awaited<ReturnType<typeof fetchMeetTranscript>>;
  try {
    transcript = await fetchMeetTranscript(row.meeting_url!);
  } catch (error) {
    console.error("[calls] meet transcript failed:", error);
    return fail(errorOf(error));
  }

  const { error } = await supabase.from("transcripts").insert({
    organization_id: call.organization_id,
    call_id: callId,
    text: transcript.text,
    language: transcript.language ?? null,
    duration_seconds: transcript.durationSeconds ?? null,
    segments: transcript.segments,
    provider: "google_meet",
    model: "meet-transcript",
    processing_ms: Date.now() - started,
  });
  if (error) {
    console.error("[calls] meet transcript insert failed:", error.message);
    return fail("save_failed");
  }
  return finish(supabase, callId, { status: "transcribed" });
}
