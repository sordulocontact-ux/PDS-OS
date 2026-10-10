// Conception (ticket « Conception »): the closed vocabulary of the work —
// what a deliverable's intention covers, where a deliverable comes from, who
// asked for what. Same lists as the database
// (supabase/migrations/20261010000901_conception_entry.sql). Client-safe.

// What PO asks about a deliverable, or about the overall direction: what it
// tells, what it looks like, its tone, what it must (not) contain. A topic
// answered (one confirmed intention) is never asked again.
export const DESIGN_TOPICS = ["story", "look", "tone", "musts"] as const;
export type DesignTopic = (typeof DESIGN_TOPICS)[number];

export function isDesignTopic(value: unknown): value is DesignTopic {
  return (
    typeof value === "string" &&
    (DESIGN_TOPICS as readonly string[]).includes(value)
  );
}

// strategy = engagé par la Stratégie (confirmed); the others are late
// additions, always « à qualifier ».
export const DELIVERABLE_ORIGINS = [
  "strategy",
  "manual",
  "strategy_decision",
  "call",
] as const;
export type DeliverableOrigin = (typeof DELIVERABLE_ORIGINS)[number];
export const ADDITION_ORIGINS = [
  "manual",
  "strategy_decision",
  "call",
] as const;
export type AdditionOrigin = (typeof ADDITION_ORIGINS)[number];

export function isDeliverableOrigin(
  value: unknown,
): value is DeliverableOrigin {
  return (
    typeof value === "string" &&
    (DELIVERABLE_ORIGINS as readonly string[]).includes(value)
  );
}

export type DeliverableStatus = "confirmed" | "to_qualify";

// What an intention is about: the overall direction, one deliverable, or —
// for PO's proposals only — not known yet (a person attaches it).
export type IntentionTarget = "direction" | "deliverable" | "unassigned";
export type IntentionStatus = "proposed" | "confirmed" | "rejected";
export type IntentionSourceType = "manual" | "call" | "import";

/** The key of a work target in URLs and forms: a deliverable id, or this. */
export const DIRECTION_KEY = "direction";

/** Topics with no confirmed answer yet: the only questions PO still asks. */
export function missingTopics(
  confirmed: ReadonlyArray<{ topic: DesignTopic }>,
): DesignTopic[] {
  const answered = new Set(confirmed.map((i) => i.topic));
  return DESIGN_TOPICS.filter((topic) => !answered.has(topic));
}

// Imported briefs: pasted text, at most this long (the database checks it).
export const MAX_IMPORT_CHARS = 30000;
