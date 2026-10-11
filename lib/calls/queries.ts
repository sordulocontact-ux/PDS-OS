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
import {
  loadCallRecording,
  type CallRecordingState,
} from "@/lib/calls/recording-queries";
import { routes } from "@/lib/auth/redirects";
import { personName } from "@/lib/projects/types";
import { isCallFormat, type CallFormat } from "@/lib/strategy/call-prep";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
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
  // End of its slot; null for a call planned before slots (or prepared
  // from a workflow), which then lasts its agenda, or an hour.
  endsAt: string | null;
  durationMinutes: number | null;
};

export type CallAttendee = { personId: string; name: string };

export type CallDetail = CallSummary & {
  organizationId: string;
  // Null: an internal meeting, outside any project.
  projectId: string | null;
  createdBy: string | null;
  // Members invited (the project's team on a project call).
  attendees: CallAttendee[];
  // People outside the team, invited by e-mail.
  guests: Array<{ email: string; name: string | null }>;
  audioPath: string | null;
  audioMime: string | null;
  audioBytes: number | null;
  // Saved while recording in the app (PROJ-BUG-01): unsent takes, or the
  // files of a recording sent in several takes.
  recording: CallRecordingState;
  errorCode: string | null;
  agenda: AgendaItem[] | null;
  // The agenda's last change after creation (PROJ-UX-03).
  agendaEdited: { at: string; by: string | null } | null;
  // Prepared from the Cadrage, the Stratégie or the Conception (« Préparer un
  // échange »):
  // its purpose, who takes part, the documents that go with it, and how a
  // strategy or creative call is held, and the deliverables a creative
  // call (Conception) is about.
  prepared: {
    kind: "framing" | "strategy" | "design" | "production";
    purpose: string;
    participants: string[];
    documents: Array<{ id: string; name: string }>;
    format: CallFormat | null;
    deliverables: string[];
    // A production call: the deliverable whose preparation it serves.
    productionDeliverableId: string | null;
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
    .select(
      "id, title, occurred_at, ends_at, duration_minutes, status, meeting_url",
    )
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`listCalls: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    status: asCallStatus(row.status),
    meetingUrl: row.meeting_url,
    endsAt: row.ends_at,
    durationMinutes: row.duration_minutes,
  }));
}

export type CallListItem = CallSummary & {
  // Null for an internal meeting.
  projectId: string | null;
  projectTitle: string | null;
  // The call's own page: inside its project, or the meeting's page.
  href: string;
  // Who works on it: the project's owner, or the meeting's creator.
  ownerPersonId: string | null;
};

// Most recent first; a team of 3 to 5 people stays far below this.
const ALL_CALLS_LIMIT = 500;

/**
 * Every call the user may see (Calls page of the main navigation): those of
 * visible projects and the internal meetings they created or were invited
 * to. RLS decides (can_see_call).
 */
export async function listAllCalls(
  supabase: Client,
  // The calendar's week: the calls that start within it.
  range?: { from: Date; to: Date },
): Promise<CallListItem[]> {
  let query = supabase
    .from("calls")
    .select(
      "id, title, occurred_at, ends_at, duration_minutes, status, meeting_url, project_id, created_by, project:projects!calls_project_same_org(title, owner_person_id)",
    );
  if (range)
    query = query
      .gte("occurred_at", range.from.toISOString())
      .lt("occurred_at", range.to.toISOString());
  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(ALL_CALLS_LIMIT);
  if (error) throw new Error(`listAllCalls: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurred_at,
    status: asCallStatus(row.status),
    meetingUrl: row.meeting_url,
    endsAt: row.ends_at,
    durationMinutes: row.duration_minutes,
    projectId: row.project_id,
    projectTitle: row.project?.title ?? null,
    href: row.project_id
      ? routes.projectCall(row.project_id, row.id)
      : routes.meeting(row.id),
    ownerPersonId: row.project_id
      ? (row.project?.owner_person_id ?? null)
      : row.created_by,
  }));
}

function toAgenda(value: unknown): AgendaItem[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { topic, minutes, questions, dimension } = item as Record<
      string,
      unknown
    >;
    const asked = Array.isArray(questions)
      ? questions.filter((q): q is string => typeof q === "string")
      : [];
    return typeof topic === "string" && typeof minutes === "number"
      ? [
          {
            topic,
            minutes,
            ...(asked.length ? { questions: asked } : {}),
            ...(typeof dimension === "string" ? { dimension } : {}),
          },
        ]
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
      "*, call_attendees(person_id, person:people!call_attendees_person_id_fkey(first_name, last_name)), call_guests(email, name), agenda_editor:people!calls_agenda_edited_by_fkey(first_name, last_name)",
    )
    .eq("id", callId);
  const { data } = await (
    projectId ? query.eq("project_id", projectId) : query.is("project_id", null)
  ).maybeSingle();
  if (!data) return null;
  const [prepared, recording] = await Promise.all([
    preparedOfCall(supabase, data.id),
    loadCallRecording(supabase, data.id, data.audio_path),
  ]);
  return {
    id: data.id,
    title: data.title,
    occurredAt: data.occurred_at,
    status: asCallStatus(data.status),
    meetingUrl: data.meeting_url,
    endsAt: data.ends_at,
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
    guests: data.call_guests
      .map((g) => ({ email: g.email, name: g.name }))
      .sort((a, b) =>
        (a.name ?? a.email).localeCompare(b.name ?? b.email, "fr"),
      ),
    audioPath: data.audio_path,
    audioMime: data.audio_mime,
    audioBytes: data.audio_bytes,
    errorCode: data.error_code,
    agenda: toAgenda(data.agenda),
    agendaEdited: data.agenda_edited_at
      ? {
          at: data.agenda_edited_at,
          by: data.agenda_editor
            ? personName(
                data.agenda_editor.first_name,
                data.agenda_editor.last_name,
              )
            : null,
        }
      : null,
    durationMinutes: data.duration_minutes,
    prepared,
    recording,
  };
}

async function preparedOfCall(
  supabase: Client,
  callId: string,
): Promise<CallDetail["prepared"]> {
  const [framing, strategy, design, production] = await Promise.all([
    supabase
      .from("framing_calls")
      .select("purpose, participants, document_ids")
      .eq("call_id", callId)
      .maybeSingle(),
    supabase
      .from("strategy_calls")
      .select("purpose, participants, document_ids, format")
      .eq("call_id", callId)
      .maybeSingle(),
    supabase
      .from("design_calls")
      .select("purpose, participants, document_ids, format, deliverable_ids")
      .eq("call_id", callId)
      .maybeSingle(),
    // A production call (Production, a deliverable's preparation): no
    // documents, the deliverable it prepares.
    supabase
      .from("production_calls")
      .select(
        "purpose, participants, format, production_sheets(deliverable_id, strategy_deliverables(title))",
      )
      .eq("call_id", callId)
      .maybeSingle(),
  ]);
  const data =
    design.data ??
    strategy.data ??
    framing.data ??
    (production.data
      ? { ...production.data, document_ids: [] as string[] }
      : null);
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
  const productionTitle =
    production.data?.production_sheets?.strategy_deliverables?.title ?? null;
  const deliverables = design.data?.deliverable_ids.length
    ? await deliverableTitles(supabase, design.data.deliverable_ids)
    : productionTitle
      ? [productionTitle]
      : [];
  return {
    kind: design.data
      ? "design"
      : strategy.data
        ? "strategy"
        : production.data
          ? "production"
          : "framing",
    purpose: data.purpose,
    participants,
    documents: (files ?? []).map((f) => ({ id: f.id, name: f.file_name })),
    format: "format" in data && isCallFormat(data.format) ? data.format : null,
    deliverables,
    productionDeliverableId:
      production.data?.production_sheets?.deliverable_id ?? null,
  };
}

/** The titles of the Conception deliverables a creative call is about. */
async function deliverableTitles(
  supabase: Client,
  ids: string[],
): Promise<string[]> {
  const { data } = await supabase
    .from("design_deliverables")
    .select("id, title, strategy_deliverables(title, quantity)")
    .in("id", ids);
  return ids.flatMap((id) => {
    const row = (data ?? []).find((d) => d.id === id);
    if (!row) return [];
    const committed = row.strategy_deliverables;
    return [
      committed
        ? deliverableTitle(committed.title, committed.quantity)
        : (row.title ?? ""),
    ];
  });
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

/** URLs of the call's audio for the player: each take when recorded in parts. */
export async function getCallAudioUrls(
  supabase: Client,
  call: CallDetail,
): Promise<Array<string | null>> {
  const paths =
    call.recording.parts.length > 1
      ? call.recording.parts
      : call.audioPath
        ? [call.audioPath]
        : [];
  return Promise.all(paths.map((path) => getAudioUrl(supabase, path)));
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
