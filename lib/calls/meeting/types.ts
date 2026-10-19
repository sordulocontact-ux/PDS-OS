// A meeting held, as its step shows it (docs/ARCHITECTURE.md § 4 ter):
// its facts, what was said point by point, and what became of each line —
// the state comes from the module that settled it, never from the report.
// Client-safe.

import type { PrepPerson } from "@/lib/calls/prep/types";

export type MeetingLineKind =
  "decision" | "hypothesis" | "action" | "arbitrate";

/** What became of a line in the step (Confirmé, Corrigé, Écarté, À confirmer). */
export type MeetingLineState =
  | { kind: "confirmed"; by: string }
  | { kind: "corrected"; by: string }
  | { kind: "discarded"; by: string }
  | { kind: "pending" };

export type MeetingLine = {
  id: string;
  // The agenda point it belongs to (its words); null = outside the agenda.
  topic: string | null;
  kind: MeetingLineKind | null;
  who: string | null;
  // As said or decided, short (« 13/11 »): copied by code, never computed.
  due: string | null;
  // The line as PO filed it; `became` once a person corrected it.
  text: string;
  became: string | null;
  quote: string | null;
  state: MeetingLineState;
  // Added after the meeting (not said in it).
  added?: boolean;
  // Kept out of the participants' summary (the internal budget).
  internal?: boolean;
};

export type MeetingData = {
  callId: string;
  projectId: string | null;
  noun: "exchange" | "call";
  // « Échange stratégique », « Call de production »…
  name: string;
  occurredAt: string;
  format: "video" | "in_person" | null;
  minutes: number | null;
  participants: PrepPerson[];
  agenda: string[];
  lines: MeetingLine[];
  // The report exists (recorded, transcribed, filed by PO).
  reportReady: boolean;
};

export type SummaryVersion = {
  version: number;
  text: string;
  sentAt: string;
  sentBy: string | null;
  count: number;
};
