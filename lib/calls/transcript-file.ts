import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_TRANSCRIPT_BYTES,
  transcriptExtensionOf,
  type ActionResult,
  type CallErrorCode,
} from "@/lib/calls/constants";
import { claim, finish } from "@/lib/calls/pipeline";
import { loadLatestTranscript } from "@/lib/calls/queries";
import { sourceText } from "@/lib/legal/contracts/source-text";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Subtitles (.vtt, .srt) without their numbers, timings and header: the
 * words only, one cue per line. */
function subtitleText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter(
      (line) =>
        !/^WEBVTT/.test(line) &&
        !/^NOTE\b/.test(line) &&
        !/^\d+$/.test(line.trim()) &&
        !line.includes("-->"),
    )
    .join("\n");
}

/**
 * A transcript dropped instead of a recording (Sacha 07/11/2026: « des PDF,
 * des textes … pour une transcription »): its words are read here (PDF,
 * Word, text, subtitles) and saved as the call's transcript (provider
 * `file`), then the report follows the usual way (`runExtraction`). The text
 * is data, never instructions: it only ever reaches the model as the
 * transcript. Runs with the user's client: RLS decides who may write.
 */
export async function runFileTranscript(
  supabase: Client,
  callId: string,
  file: File,
): Promise<ActionResult> {
  const ext = transcriptExtensionOf(file.name);
  if (!ext) return { ok: false, error: "unsupported_type" };
  if (file.size === 0) return { ok: false, error: "transcript_empty" };
  if (file.size > MAX_TRANSCRIPT_BYTES)
    return { ok: false, error: "file_too_large" };
  if (await loadLatestTranscript(supabase, callId))
    return { ok: false, error: "transcript_exists" };

  const started = Date.now();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string | null;
  try {
    text =
      ext === "vtt" || ext === "srt"
        ? await sourceText(
            Buffer.from(subtitleText(buffer.toString("utf8"))),
            "txt",
          )
        : await sourceText(buffer, ext);
  } catch (error) {
    console.error("[calls] transcript file unreadable:", error);
    return { ok: false, error: "unsupported_type" };
  }
  if (!text) return { ok: false, error: "transcript_empty" };

  const call = await claim(supabase, callId, "transcribing", {
    needsAudio: false,
  });
  if (typeof call === "string") return { ok: false, error: call };
  const fail = (error: CallErrorCode) => finish(supabase, callId, { error });

  const { error } = await supabase.from("transcripts").insert({
    organization_id: call.organization_id,
    call_id: callId,
    text,
    language: null,
    duration_seconds: null,
    segments: [],
    provider: "file",
    model: ext,
    processing_ms: Date.now() - started,
  });
  if (error) {
    console.error("[calls] transcript file insert failed:", error.message);
    return fail("save_failed");
  }
  return finish(supabase, callId, { status: "transcribed" });
}
