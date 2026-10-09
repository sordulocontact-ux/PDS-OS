// Project types and pure helpers. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import type { MasterOption } from "@/lib/catalog/types";

// Three families (feedback n°2): music (stored `music_release`), content,
// event. A partnership is not a project. Event exists but is closed in V1:
// no new project uses it (create_project refuses it).
export const PROJECT_TYPES = ["music_release", "content", "event"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];
export const CREATABLE_PROJECT_TYPES = ["music_release", "content"] as const;

// Format of a music project. A single links exactly one master.
export const MUSIC_FORMATS = [
  "single",
  "ep",
  "album",
  "mixtape",
  "compilation",
  "other",
] as const;
export type MusicFormat = (typeof MUSIC_FORMATS)[number];

// A content project is an edition of a reusable PDS format, or a one-off
// content. Not stored: a project with a content format is an edition.
export const CONTENT_MODES = ["format", "one_off"] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];

// A reusable content format of PDS ("PDS Mic"): data, never code.
export type ContentFormatOption = {
  id: string;
  name: string;
  description: string | null;
};

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

export function isMusicFormat(value: unknown): value is MusicFormat {
  return (
    typeof value === "string" &&
    (MUSIC_FORMATS as readonly string[]).includes(value)
  );
}

export function isContentMode(value: unknown): value is ContentMode {
  return (
    typeof value === "string" &&
    (CONTENT_MODES as readonly string[]).includes(value)
  );
}

// A content project with a format is an edition of it; one without, created
// since formats exist, a one-off content. Older content projects: unknown.
export function contentModeOf(project: {
  type: ProjectType;
  contentFormat: { id: string } | null;
}): ContentMode | null {
  if (project.type !== "content") return null;
  return project.contentFormat ? "format" : "one_off";
}

// High first, then normal or none, then low: the order of the lists (home,
// Travail, Projets).
export function priorityRank(priority: Priority | null): number {
  return priority === "high" ? 0 : priority === "low" ? 2 : 1;
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
  musicFormat: MusicFormat | null;
  contentFormatName: string | null;
  priority: Priority | null;
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
  musicFormat: MusicFormat | null;
  contentFormat: ContentFormatOption | null;
  // Artist named by a content project (a music one reads its masters).
  artistId: string | null;
  createdAt: string;
  artistName: string;
  // The artist named first (the first title's first credit, else the
  // content project's): where the breadcrumb leads.
  mainArtistId: string | null;
  ownerName: string | null;
  ownerPersonId: string | null;
  status: ProjectStatus;
  // Newest first.
  assignments: Assignment[];
  dueDate: string | null;
  budgetCents: number | null;
  priority: Priority | null;
  // What was known when the project was transmitted; not the framing Brief.
  initialContext: string | null;
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

// A step opens only once the previous one is validated (the Strategy after
// the Cadrage, the Conception after the Strategy); the database holds the
// same rule for writes.
export function isStageValidated(stages: ProjectStage[], key: string): boolean {
  return stages.some(
    (stage) => stage.key === key && stage.state === "validated",
  );
}

export function isFramingValidated(stages: ProjectStage[]): boolean {
  return isStageValidated(stages, "framing");
}

export function personName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}
