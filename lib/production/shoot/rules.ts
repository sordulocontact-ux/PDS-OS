// The shoot of a deliverable (ticket « Workflow Production », parcours 11 à
// 13): states, declarations and the equipment's return. Pure code, the same
// rules as the database (production_shoots_check), client-safe.

import type { Holder } from "@/lib/production/sheet";

export const SHOOT_STATES = [
  "planned",
  "in_progress",
  "done",
  "partial",
  "postponed",
  "interrupted",
] as const;
export type ShootState = (typeof SHOOT_STATES)[number];
export const isShootState = (value: string): value is ShootState =>
  (SHOOT_STATES as readonly string[]).includes(value);

// The shoot happened, fully or not: the report may be validated.
const ENDED: readonly ShootState[] = ["done", "partial", "interrupted"];
export const isShootEnded = (state: ShootState) => ENDED.includes(state);

// A partial or interrupted shoot names what is missing.
export const needsMissingSequences = (state: ShootState) =>
  state === "partial" || state === "interrupted";

/** Moving to `next` starts the shoot: allowed only on a sheet « Prête pour
 * tournage » (the database refuses it otherwise, `not_ready`). */
export function startsShoot(
  current: ShootState | null,
  next: ShootState,
): boolean {
  const started = next !== "planned" && next !== "postponed";
  return (
    started &&
    (current === null || current === "planned" || current === "postponed")
  );
}

export const DECLARATIONS = [
  "video_rushes",
  "audio_sources",
  "backup_verified",
] as const;
export type DeclarationKey = (typeof DECLARATIONS)[number];

/** A person's word, stamped who and when by the database; never a check of
 * the files. */
export type Declaration = {
  done: boolean;
  byName: string | null;
  at: string | null;
};

export type ShootRecord = {
  // False until something was saved (the shoot is then « Prévu »).
  saved: boolean;
  state: ShootState;
  observations: string | null;
  missingSequences: string | null;
  deviations: string | null;
  declarations: Record<DeclarationKey, Declaration>;
  filesLocation: string | null;
  // Who retrieves the rushes, who checks the backup, where the backup is,
  // the other media declared on their own (PROD-020).
  rushesHolder: Holder | null;
  backupHolder: Holder | null;
  backupLocation: string | null;
  otherMedia: Declaration;
  // Stamped by the database (PROD-019, PROD-023).
  startedAt: string | null;
  endedAt: string | null;
  reportNote: string | null;
  reportValidatedBy: string | null;
  reportValidatedAt: string | null;
};

export type ShootIncident = {
  id: string;
  title: string;
  impact: string | null;
  holder: Holder | null;
  followUp: string | null;
  blocksClosing: boolean;
  blocksPost: boolean;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  // PROD-021: what kind, and the areas it hits (none: a plain fact).
  category: IncidentCategory;
  impacts: IncidentImpact[];
};

export const INCIDENT_CATEGORIES = [
  "equipment",
  "people",
  "location",
  "weather",
  "technical",
  "other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export const INCIDENT_IMPACTS = [
  "safety",
  "schedule",
  "budget",
  "quality",
  "deliverables",
] as const;
export type IncidentImpact = (typeof INCIDENT_IMPACTS)[number];

// Equipment confirmed as rented or borrowed: from « Réservé confirmé » on.
export const RETURN_STATUSES = [
  "booked",
  "picked_up",
  "on_site",
  "to_return",
  "returned",
  "incident",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const isReturnStatus = (value: string): value is ReturnStatus =>
  (RETURN_STATUSES as readonly string[]).includes(value);

export type ReturnLine = {
  id: string;
  label: string;
  quantity: number | null;
  supplier: string | null;
  status: ReturnStatus;
  holder: Holder | null;
  returnDue: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  incidentNote: string | null;
  returnIssue: "missing" | "damaged" | null;
};

export type ReturnState =
  "none" | "to_return" | "partial" | "all_returned" | "incident";

/** The equipment's return as a whole, from its confirmed lines. */
export function returnStateOf(lines: { status: ReturnStatus }[]): ReturnState {
  if (lines.length === 0) return "none";
  if (lines.some((l) => l.status === "incident")) return "incident";
  const returned = lines.filter((l) => l.status === "returned").length;
  if (returned === lines.length) return "all_returned";
  return returned > 0 ? "partial" : "to_return";
}

export const isReturnPending = (line: { status: ReturnStatus }) =>
  line.status !== "returned" && line.status !== "incident";

/** Due before today (Paris) and not given back. */
export const isReturnOverdue = (line: ReturnLine, today: string) =>
  isReturnPending(line) && line.returnDue !== null && line.returnDue < today;
