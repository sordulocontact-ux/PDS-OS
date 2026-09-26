// Project types and pure helpers. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import type { MasterOption } from "@/lib/catalog/types";

export const PROJECT_TYPES = [
  "music_release",
  "partnership",
  "content",
  "event",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STAGE_STATES = [
  "not_started",
  "in_progress",
  "awaiting_validation",
  "validated",
] as const;
export type StageState = (typeof STAGE_STATES)[number];

export function isProjectType(value: unknown): value is ProjectType {
  return (
    typeof value === "string" &&
    (PROJECT_TYPES as readonly string[]).includes(value)
  );
}

export function isPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" &&
    (PRIORITIES as readonly string[]).includes(value)
  );
}

export function isStageState(value: unknown): value is StageState {
  return (
    typeof value === "string" &&
    (STAGE_STATES as readonly string[]).includes(value)
  );
}

export type ProjectStage = {
  id: string;
  key: string;
  label: string;
  position: number;
  state: StageState;
  stateChangedAt: string | null;
};

export const ASSIGNMENT_STATUSES = [
  "pending",
  "accepted",
  "refused",
  "clarification_requested",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export type ProjectStatus =
  | "not_transmitted"
  | "pending"
  | "refused"
  | "clarification_requested"
  | "launched";

export type Assignment = {
  id: string;
  status: AssignmentStatus;
  assigneePersonId: string;
  assigneeName: string;
  assignedByName: string;
  note: string | null;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export function isAssignmentStatus(value: unknown): value is AssignmentStatus {
  return (
    typeof value === "string" &&
    (ASSIGNMENT_STATUSES as readonly string[]).includes(value)
  );
}

// Computed, never stored: a project with stages is launched; otherwise its
// latest transmission says where it stands.
export function projectStatusOf(
  stageCount: number,
  latest: { status: AssignmentStatus } | null,
): ProjectStatus {
  if (stageCount > 0) return "launched";
  if (!latest) return "not_transmitted";
  // An accepted transmission always comes with stages; defensive fallback.
  return latest.status === "accepted" ? "launched" : latest.status;
}

export type ProjectListItem = {
  id: string;
  title: string;
  // Main credit of the first master; empty when the project has no master.
  artistName: string;
  type: ProjectType;
  status: ProjectStatus;
  // Who runs the launched project (null before acceptance).
  ownerPersonId: string | null;
  // Latest transmission, if any: who it waits on, for the home cards.
  latestAssignment: Pick<Assignment, "status" | "assigneePersonId"> | null;
  currentStage: ProjectStage | null;
  stageCount: number;
};

export type ProjectDetail = {
  id: string;
  title: string;
  type: ProjectType;
  createdAt: string;
  artistName: string;
  ownerName: string | null;
  ownerPersonId: string | null;
  status: ProjectStatus;
  // Newest first.
  assignments: Assignment[];
  dueDate: string | null;
  budgetCents: number | null;
  priority: Priority | null;
  framingNotes: string | null;
  masters: MasterOption[];
  stages: ProjectStage[];
  currentStage: ProjectStage | null;
};

export type CreateProjectState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  // Saved from a side panel (intent=dialog), or edited: the page stays.
  | { status: "saved"; project: { id: string; title: string } };

export const idleCreateProjectState: CreateProjectState = { status: "idle" };

export function sortStages(stages: ProjectStage[]): ProjectStage[] {
  return [...stages].sort((a, b) => a.position - b.position);
}

// Current stage = first stage (by position) that is not validated yet.
// Null when every stage is validated (or the project has none).
export function currentStageOf(stages: ProjectStage[]): ProjectStage | null {
  return (
    sortStages(stages).find((stage) => stage.state !== "validated") ?? null
  );
}

// The Strategy (and the steps after it) opens only once the Cadrage is
// validated; the database holds the same rule for writes.
export function isFramingValidated(stages: ProjectStage[]): boolean {
  return stages.some(
    (stage) => stage.key === "framing" && stage.state === "validated",
  );
}

export function personName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}
