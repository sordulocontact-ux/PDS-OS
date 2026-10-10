import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LocatedCallReport } from "@/lib/ai/call-report";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import {
  AUDIO_BUCKET,
  asCallStatus,
  type CallStatus,
} from "@/lib/calls/constants";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { routes } from "@/lib/auth/redirects";
import { personName } from "@/lib/projects/types";
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
  // Video link (Meet, Zoom…): "Rejoindre" opens it. Null when none.
  meetingUrl: string | null;
};

export type CallAttendee = { personId: string; name: string };

export type CallDetail = CallSummary & {
  organizationId: string;
  // Null: an internal meeting, outside any project.
  projectId: string | null;
  createdBy: string | null;
  // Members invited to an internal meeting (none on a project call).
  attendees: CallAttendee[];
  audioPath: string | null;
  audioMime: string | null;
  audioBytes: number | null;
  errorCode: string | null;
  agenda: AgendaItem[] | null;
  durationMinutes: number | null;
  // Prepared from the Cadrage (« Préparer un échange »): its purpose, who
  // takes part, the documents that go with it.
  framing: {
    purpose: string;
    participants: string[];
    documents: Array<{ id: string; name: string }>;
  } | null;
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

export async function listCalls(
  supabase: Client,
  projectId: string,
): Promise<CallSummary[]> {
  const { data, error } = await supabase
    .from("calls")
    .select("id, title, occurred_at, status, meeting_url")
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`listCalls: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    status: asCallStatus(row.status),
    meetingUrl: row.meeting_url,
  }));
}

export type CallListItem = CallSummary & {
  // Null for an internal meeting.
  projectId: string | null;
  projectTitle: string | null;
  // The call's own page: inside its project, or the meeting's page.
  href: string;
};

// Most recent first; a team of 3 to 5 people stays far below this.
const ALL_CALLS_LIMIT = 500;

/**
 * Every call the user may see (Calls page of the main navigation): those of
 * visible projects and the internal meetings they created or were invited
 * to. RLS decides (can_see_call).
 */
export async function listAllCalls(supabase: Client): Promise<CallListItem[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, title, occurred_at, status, meeting_url, project_id, project:projects!calls_project_same_org(title)",
    )
    .order("occurred_at", { ascending: false })
    .limit(ALL_CALLS_LIMIT);
  if (error) throw new Error(`listAllCalls: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    status: asCallStatus(row.status),
    meetingUrl: row.meeting_url,
    projectId: row.project_id,
    projectTitle: row.project?.title ?? null,
    href: row.project_id
      ? routes.projectCall(row.project_id, row.id)
      : routes.meeting(row.id),
  }));
}

function toAgenda(value: unknown): AgendaItem[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { topic, minutes, questions } = item as Record<string, unknown>;
    const asked = Array.isArray(questions)
      ? questions.filter((q): q is string => typeof q === "string")
      : [];
    return typeof topic === "string" && typeof minutes === "number"
      ? [{ topic, minutes, ...(asked.length ? { questions: asked } : {}) }]
      : [];
  });
  return items.length > 0 ? items : null;
}

/**
 * One call: of this project, or (`projectId` null) an internal meeting —
 * a project call is never read through the meeting page, nor the reverse.
 */
export async function getCall(
  supabase: Client,
  projectId: string | null,
  callId: string,
): Promise<CallDetail | null> {
  const query = supabase
    .from("calls")
    .select(
      "*, call_attendees(person_id, person:people!call_attendees_person_id_fkey(first_name, last_name))",
    )
    .eq("id", callId);
  const { data } = await (
    projectId ? query.eq("project_id", projectId) : query.is("project_id", null)
  ).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    occurredAt: data.occurred_at,
    status: asCallStatus(data.status),
    meetingUrl: data.meeting_url,
    organizationId: data.organization_id,
    projectId: data.project_id,
    createdBy: data.created_by,
    attendees: data.call_attendees
      .map((a) => ({
        personId: a.person_id,
        name: a.person
          ? personName(a.person.first_name, a.person.last_name)
          : "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    audioPath: data.audio_path,
    audioMime: data.audio_mime,
    audioBytes: data.audio_bytes,
    errorCode: data.error_code,
    agenda: toAgenda(data.agenda),
    durationMinutes: data.duration_minutes,
    framing: await framingOfCall(supabase, data.id),
  };
}

async function framingOfCall(
  supabase: Client,
  callId: string,
): Promise<CallDetail["framing"]> {
  const { data } = await supabase
    .from("framing_calls")
    .select("purpose, participants, document_ids")
    .eq("call_id", callId)
    .maybeSingle();
  if (!data) return null;
  const { data: files } = data.document_ids.length
    ? await supabase
        .from("project_files")
        .select("id, file_name")
        .in("id", data.document_ids)
    : { data: [] };
  const participants = Array.isArray(data.participants)
    ? data.participants.flatMap((p) =>
        p && typeof p === "object" && "name" in p && typeof p.name === "string"
          ? [p.name]
          : [],
      )
    : [];
  return {
    purpose: data.purpose,
    participants,
    documents: (files ?? []).map((f) => ({ id: f.id, name: f.file_name })),
  };
}

/**
 * Short-lived URL for the audio player; with `download`, the file is served
 * as an attachment under that name (Fichiers page).
 */
export async function getAudioUrl(
  supabase: Client,
  path: string,
  download?: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, 15 * 60, download ? { download } : undefined);
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
