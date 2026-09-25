import type { LocatedCallReport } from "@/lib/ai/call-report";
import type { PreparedCall } from "@/lib/ai/call-prep";
import type { Extraction } from "@/lib/ai/llm";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import type { Transcription } from "@/lib/ai/transcribe";
import type { LaboErrorCode } from "@/lib/labo/guard";
import type { ReleaseDetection } from "@/lib/release/detect";

/** Browser-side calls to the labo routes. No secret involved. */

export type ReportResult = Extraction<LocatedCallReport>;
export type LaboResult<T> =
  { ok: true; data: T } | { ok: false; error: LaboErrorCode | "network" };

async function call<T>(
  input: string,
  init: RequestInit,
): Promise<LaboResult<T>> {
  try {
    const response = await fetch(input, init);
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = (body as { error?: LaboErrorCode }).error;
      return { ok: false, error: error ?? "provider_error" };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function requestTranscription(file: File) {
  const form = new FormData();
  form.append("audio", file);
  return call<Transcription>("/api/labo/transcribe", {
    method: "POST",
    body: form,
  });
}

export function requestReport(transcript: Transcript) {
  return call<ReportResult>("/api/labo/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(transcript),
  });
}

export function requestRelease(isrc: string) {
  const query = new URLSearchParams({ isrc }).toString();
  return call<ReleaseDetection>(`/api/labo/release?${query}`, {
    method: "GET",
  });
}

export function requestCallPrep(report: LocatedCallReport) {
  return call<{ prepared: PreparedCall | null }>("/api/labo/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(report),
  });
}
