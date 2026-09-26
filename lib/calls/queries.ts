import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LocatedCallReport } from "@/lib/ai/call-report";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import {
  AUDIO_BUCKET,
  asCallStatus,
  type CallStatus,
} from "@/lib/calls/constants";
import {
  fromReportItemRows,
  type ReportItemRow,
} from "@/lib/calls/report-mapping";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Read side of calls. Every query runs with the user's client: RLS decides
 * what is visible, so "not found" also covers "not allowed".
 */

type Client = SupabaseClient<Database>;

export type CallSummary = {
  id: string;
  title: string;
  occurredAt: string;
  status: CallStatus;
};

export type CallDetail = CallSummary & {
  organizationId: string;
  projectId: string;
  audioPath: string | null;
  audioMime: string | null;
  audioBytes: number | null;
  errorCode: string | null;
};

export type StoredTranscript = {
  id: string;
  transcript: Transcript;
  provider: string;
  model: string;
  processingMs: number | null;
  createdAt: string;
};

export type StoredReport = {
  id: string;
  transcriptId: string;
  report: LocatedCallReport;
  /** Raw rows, with their ids: what step 5 links Brief values to. */
  items: ReportItemRow[];
  model: string;
  processingMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
  /** Number of reports extracted for this call, history included. */
  count: number;
};

export async function getProjectTitle(
  supabase: Client,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .maybeSingle();
  return data?.title ?? null;
}

export async function listCalls(
  supabase: Client,
  projectId: string,
): Promise<CallSummary[]> {
  const { data, error } = await supabase
    .from("calls")
    .select("id, title, occurred_at, status")
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`listCalls: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    status: asCallStatus(row.status),
  }));
}

export async function getCall(
  supabase: Client,
  projectId: string,
  callId: string,
): Promise<CallDetail | null> {
  const { data } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    occurredAt: data.occurred_at,
    status: asCallStatus(data.status),
    organizationId: data.organization_id,
    projectId: data.project_id,
    audioPath: data.audio_path,
    audioMime: data.audio_mime,
    audioBytes: data.audio_bytes,
    errorCode: data.error_code,
  };
}

/** Short-lived URL for the audio player. */
export async function getAudioUrl(
  supabase: Client,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, 15 * 60);
  return data?.signedUrl ?? null;
}

type Segment = Transcript["segments"][number];

function toSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { start, end, text } = item as Record<string, unknown>;
    return typeof start === "number" &&
      typeof end === "number" &&
      typeof text === "string"
      ? [{ start, end, text }]
      : [];
  });
}

export async function loadLatestTranscript(
  supabase: Client,
  callId: string,
): Promise<StoredTranscript | null> {
  const { data } = await supabase
    .from("transcripts")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    transcript: {
      text: data.text,
      language: data.language ?? undefined,
      durationSeconds: data.duration_seconds ?? undefined,
      segments: toSegments(data.segments),
    },
    provider: data.provider,
    model: data.model,
    processingMs: data.processing_ms,
    createdAt: data.created_at,
  };
}

/** Latest report of a call, mapped back to the LocatedCallReport shape. */
export async function loadLatestReport(
  supabase: Client,
  callId: string,
): Promise<StoredReport | null> {
  const { data, count } = await supabase
    .from("call_reports")
    .select(
      "id, transcript_id, summary, model, processing_ms, input_tokens, output_tokens, created_at, report_items(id, kind, position, what, who, why, need_family, quote, located, start_seconds, end_seconds)",
      { count: "exact" },
    )
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    transcriptId: row.transcript_id,
    report: fromReportItemRows(row.summary, row.report_items),
    items: row.report_items,
    model: row.model,
    processingMs: row.processing_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
    count: count ?? 1,
  };
}
