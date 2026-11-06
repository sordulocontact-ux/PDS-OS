// « Maintenant » of a call's page (proto `docs/protos/pages.html`, « Calls »):
// where the call stands, and what it asks of the person who works on it, in
// order. Computed by code (rule 6), client-safe.

import { callEndOf } from "@/lib/calls/format";
import { parisPlace } from "@/lib/utils/calendar-period";

/** planned: nothing recorded, not over · to_record: over, nothing recorded ·
 * processing: recorded (or its Meet transcript taken), report not ready ·
 * ready · closed. */
export type CallStage =
  "planned" | "to_record" | "processing" | "ready" | "closed";

/** The module where a call's proposals are settled (« le Cadrage »). */
export type CallModule = { href: string; name: string };

export type CallTodo =
  "record" | "meet" | "upload" | "proposals" | "tasks" | "summary" | "close";

// The recording opens from this long before the call.
const RECORD_OPEN_MS = 15 * 60_000;

type StageCall = {
  status: string;
  audioPath: string | null;
  occurredAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  // A transcript without audio: taken from the call's Meet.
  hasTranscript?: boolean;
};

export function callStage(
  call: StageCall,
  closed: boolean,
  now: Date,
): CallStage {
  if (closed) return "closed";
  if (!call.audioPath && !call.hasTranscript)
    return new Date(callEndOf(call)) > now ? "planned" : "to_record";
  return call.status === "ready" ? "ready" : "processing";
}

/** The call is today (Paris) or starts within a quarter of an hour. */
export function recordsToday(call: StageCall, now: Date): boolean {
  const start = new Date(call.occurredAt);
  return (
    parisPlace(start).day === parisPlace(now).day ||
    start.getTime() - now.getTime() < RECORD_OPEN_MS
  );
}

/**
 * What the call asks of its owner, in the proto's order: record it (today),
 * take its Meet transcript back, or else drop a missing recording, settle the proposals in their module, turn the
 * actions into tasks, send the summary, close it. Nothing for anyone else.
 */
export function callTodos(input: {
  stage: CallStage;
  owner: boolean;
  today: boolean;
  // A recording interrupted earlier: never hidden.
  interrupted: boolean;
  // Its Meet was made by PDS OS, which may read its transcript back.
  ownMeet: boolean;
  pendingProposals: number;
  tasksLeft: number;
  summarySent: boolean;
  // Someone to send the summary to.
  recipients: number;
}): CallTodo[] {
  const { stage } = input;
  if (!input.owner) return [];
  if (stage === "planned")
    return input.today || input.interrupted ? ["record"] : [];
  if (stage === "to_record")
    return [input.interrupted ? "record" : input.ownMeet ? "meet" : "upload"];
  if (stage !== "ready") return [];
  const todos: CallTodo[] = [];
  if (input.pendingProposals > 0) todos.push("proposals");
  if (input.tasksLeft > 0) todos.push("tasks");
  if (!input.summarySent && input.recipients > 0) todos.push("summary");
  if (todos.length === 0) todos.push("close");
  return todos;
}
