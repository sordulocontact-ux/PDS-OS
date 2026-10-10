/**
 * Call domain values shared by server and client code. They mirror the check
 * constraints of supabase/migrations/20260925000204_domain_calls.sql.
 */

export const CALL_STATUSES = [
  "draft",
  "uploaded",
  "transcribing",
  "transcribed",
  "extracting",
  "ready",
  "failed",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Statuses during which a job holds the call. */
export const RUNNING_STATUSES: readonly CallStatus[] = [
  "transcribing",
  "extracting",
];

export const AUDIO_BUCKET = "call-audio";
/** Matches the bucket's file_size_limit. */
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

/** Accepted extensions and the MIME type stored for each (bucket allow-list). */
export const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
] as const;

export type CallErrorCode =
  | "invalid_input"
  | "title_required"
  | "date_invalid"
  | "link_invalid"
  | "end_before_start"
  | "slot_too_long"
  | "guest_without_email"
  | "guest_email_invalid"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "consent_required"
  | "audio_exists"
  | "file_too_large"
  | "unsupported_type"
  | "busy"
  | "no_transcript"
  | "audio_missing"
  | "audio_unavailable"
  | "audio_too_large"
  | "provider_quota"
  | "provider_error"
  | "transcript_empty"
  | "save_failed"
  | "unknown";

// `id`: the meeting created from PO's panel, which stays open (`stay`).
export type ActionResult =
  { ok: true; id?: string } | { ok: false; error: CallErrorCode };

export function asCallStatus(value: string): CallStatus {
  return (CALL_STATUSES as readonly string[]).includes(value)
    ? (value as CallStatus)
    : "failed";
}
