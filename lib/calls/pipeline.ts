import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { extractCallReport } from "@/lib/ai/call-report";
import { transcribe } from "@/lib/ai/transcribe";
import {
  AUDIO_BUCKET,
  type ActionResult,
  type CallErrorCode,
  type CallStatus,
} from "@/lib/calls/constants";
import { classifyProviderError } from "@/lib/calls/provider-error";
import { loadLatestTranscript } from "@/lib/calls/queries";
import { audioParts } from "@/lib/calls/recording-queries";
import { joinTranscripts } from "@/lib/calls/join-transcripts";
import { agendaTopicsOf, toReportItemRows } from "@/lib/calls/report-mapping";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Audio → transcript → report, one step per call. Runs with the user's
 * client: every read and write is subject to RLS, never the service role.
 * The status column doubles as a lock so a call is processed once at a time.
 */

type Client = SupabaseClient<Database>;

// A job older than this is considered dead (maxDuration is 300 s).
const STALE_AFTER_MS = 6 * 60 * 1000;

type Claimed = {
  id: string;
  organization_id: string;
  audio_path: string | null;
};

/** Moves the call to `status` unless another job holds it. Transcribing the
 * app's recording needs its audio; reading a Meet transcript or writing the
 * report from a transcript does not (`needsAudio: false`). */
export async function claim(
  supabase: Client,
  callId: string,
  status: CallStatus,
  { needsAudio = true }: { needsAudio?: boolean } = {},
): Promise<Claimed | CallErrorCode> {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const base = supabase
    .from("calls")
    .update({ status, error_code: null })
    .eq("id", callId)
    .eq("consent", "granted");
  const { data, error } = await (
    needsAudio ? base.not("audio_path", "is", null) : base
  )
    .or(
      `status.not.in.(transcribing,extracting),updated_at.lt."${staleBefore}"`,
    )
    .select("id, organization_id, audio_path");
  if (error) {
    console.error("[calls] claim failed:", error.message);
    return "save_failed";
  }
  if (data[0]) return data[0];

  const { data: call } = await supabase
    .from("calls")
    .select("audio_path")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return "not_found";
  return call.audio_path || !needsAudio ? "busy" : "audio_missing";
}

export async function finish(
  supabase: Client,
  callId: string,
  outcome: { status: CallStatus } | { error: CallErrorCode },
): Promise<ActionResult> {
  const update =
    "error" in outcome
      ? { status: "failed", error_code: outcome.error }
      : { status: outcome.status, error_code: null };
  const { error } = await supabase
    .from("calls")
    .update(update)
    .eq("id", callId);
  if (error) console.error("[calls] status update failed:", error.message);
  return "error" in outcome
    ? { ok: false, error: outcome.error }
    : { ok: true };
}

export async function runTranscription(
  supabase: Client,
  callId: string,
): Promise<ActionResult> {
  const call = await claim(supabase, callId, "transcribing");
  if (typeof call === "string") return { ok: false, error: call };
  const fail = (error: CallErrorCode) => finish(supabase, callId, { error });

  // Recorded in the app across several takes (a reload, a lost microphone):
  // each take is its own file, transcribed in order (PROJ-BUG-01).
  let paths: string[];
  try {
    const parts = await audioParts(supabase, callId, call.audio_path!);
    paths = parts.length > 1 ? parts : [call.audio_path!];
  } catch {
    return fail("audio_unavailable");
  }

  const results: Awaited<ReturnType<typeof transcribe>>[] = [];
  for (const path of paths) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(path);
    if (downloadError || !blob) {
      console.error("[calls] audio download failed:", downloadError?.message);
      return fail("audio_unavailable");
    }
    try {
      results.push(await transcribe(new Uint8Array(await blob.arrayBuffer())));
    } catch (error) {
      // The cause carries the real reason (HTTP status, schema path), no content.
      const cause =
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message.slice(0, 500)
          : undefined;
      console.error(
        "[calls] transcription failed:",
        error,
        cause ? `cause: ${cause}` : "",
      );
      return fail(classifyProviderError(error));
    }
  }
  const result = {
    ...results[0]!,
    transcript: joinTranscripts(results.map((r) => r.transcript)),
  };
  if (!result.transcript.text.trim()) return fail("transcript_empty");

  const { transcript } = result;
  const { error } = await supabase.from("transcripts").insert({
    organization_id: call.organization_id,
    call_id: callId,
    text: transcript.text,
    language: transcript.language ?? null,
    duration_seconds: transcript.durationSeconds ?? null,
    segments: transcript.segments,
    provider: result.provider,
    model: result.model,
    processing_ms: results.reduce((sum, r) => sum + r.durationMs, 0),
  });
  if (error) {
    console.error("[calls] transcript insert failed:", error.message);
    return fail("save_failed");
  }
  return finish(supabase, callId, { status: "transcribed" });
}

/** Extracts a new report from the latest transcript. History is kept. */
export async function runExtraction(
  supabase: Client,
  callId: string,
): Promise<ActionResult> {
  const stored = await loadLatestTranscript(supabase, callId);
  if (!stored) return { ok: false, error: "no_transcript" };

  // A Meet transcript has no audio in PDS OS: the transcript is what counts.
  const call = await claim(supabase, callId, "extracting", {
    needsAudio: false,
  });
  if (typeof call === "string") return { ok: false, error: call };
  const fail = (error: CallErrorCode) => finish(supabase, callId, { error });

  // The agenda the call was prepared with: each line is filed under its point.
  const { data: callRow } = await supabase
    .from("calls")
    .select("agenda")
    .eq("id", callId)
    .maybeSingle();
  const agenda = agendaTopicsOf(callRow?.agenda ?? null);

  let extraction: Awaited<ReturnType<typeof extractCallReport>>;
  try {
    extraction = await extractCallReport(stored.transcript, agenda);
  } catch (error) {
    console.error("[calls] extraction failed:", error);
    return fail(classifyProviderError(error));
  }

  // Report and items are saved in one transaction (save_call_report): a
  // failure leaves no report without items. Runs under the user's RLS.
  const items = toReportItemRows(
    extraction.output,
    { organizationId: call.organization_id, reportId: "" },
    agenda,
  ).map((row) => ({
    kind: row.kind,
    position: row.position,
    what: row.what,
    who: row.who ?? null,
    why: row.why ?? null,
    need_family: row.need_family ?? null,
    quote: row.quote,
    located: row.located,
    start_seconds: row.start_seconds ?? null,
    end_seconds: row.end_seconds ?? null,
    agenda_topic: row.agenda_topic ?? null,
  }));
  const { error: saveError } = await supabase.rpc("save_call_report", {
    p_call_id: callId,
    p_transcript_id: stored.id,
    p_summary: extraction.output.summary,
    p_provider: extraction.provider,
    p_model: extraction.model,
    p_processing_ms: extraction.durationMs,
    p_input_tokens: extraction.inputTokens ?? undefined,
    p_output_tokens: extraction.outputTokens ?? undefined,
    p_items: items,
  });
  if (saveError) {
    console.error("[calls] report save failed:", saveError.message);
    return fail("save_failed");
  }
  return finish(supabase, callId, { status: "ready" });
}
