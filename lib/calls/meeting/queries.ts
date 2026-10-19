import "server-only";

import type {
  MeetingData,
  MeetingLine,
  MeetingLineKind,
  SummaryVersion,
} from "@/lib/calls/meeting/types";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The report's kinds a meeting's lines come from, and their nature.
const KINDS: Record<string, MeetingLineKind> = {
  decided: "decision",
  open: "arbitrate",
  next_action: "action",
};

/**
 * A meeting held, read from its call and its latest report: every decision,
 * open question and action, filed under its agenda point. Their state is
 * « À confirmer » until the module says what became of them (`states`, by
 * report item id): the module settles the lines, the report does not.
 */
export async function loadMeeting(
  callId: string,
  info: {
    name: string;
    noun: "exchange" | "call";
    format?: "video" | "in_person" | null;
    states?: Record<string, MeetingLine["state"]>;
  },
): Promise<MeetingData | null> {
  const supabase = await createClient();
  const [planned, report, transcript] = await Promise.all([
    loadPlannedCall(callId),
    supabase
      .from("call_reports")
      .select(
        "id, report_items(id, kind, position, what, who, quote, agenda_topic)",
      )
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transcripts")
      .select("duration_seconds")
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!planned) return null;
  const items = (report.data?.report_items ?? [])
    .filter((item) => item.kind in KINDS)
    .sort((a, b) => a.position - b.position);
  const seconds = transcript.data?.duration_seconds ?? null;
  return {
    callId,
    projectId: planned.projectId,
    noun: info.noun,
    name: info.name,
    occurredAt: planned.occurredAt,
    format: info.format ?? (planned.meetingUrl ? "video" : null),
    minutes: seconds ? Math.max(1, Math.round(Number(seconds) / 60)) : null,
    participants: planned.people,
    agenda: planned.agenda,
    reportReady: Boolean(report.data),
    lines: items.map((item) => ({
      id: item.id,
      topic: item.agenda_topic,
      kind: KINDS[item.kind],
      who: item.who,
      due: null,
      text: item.what,
      became: null,
      quote: item.quote,
      state: info.states?.[item.id] ?? { kind: "pending" },
    })),
  };
}

/** The summaries sent for a call, latest first (every version kept). */
export async function loadCallSummaries(
  callId: string,
): Promise<SummaryVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("call_summaries")
    .select(
      "version, text, sent_at, recipients, sender:people!call_summaries_sent_by_fkey(first_name, last_name)",
    )
    .eq("call_id", callId)
    .order("version", { ascending: false });
  if (error) console.error("[calls] summaries:", error.message);
  return (data ?? []).map((s) => ({
    version: s.version,
    text: s.text,
    sentAt: s.sent_at,
    sentBy: s.sender
      ? personName(s.sender.first_name, s.sender.last_name)
      : null,
    count: Array.isArray(s.recipients) ? s.recipients.length : 0,
  }));
}
