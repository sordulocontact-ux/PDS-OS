// Project types and pure helpers. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";

export const RELEASE_TYPES = ["single", "ep", "album"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const STAGE_STATES = [
  "not_started",
  "in_progress",
  "awaiting_validation",
  "validated",
] as const;
export type StageState = (typeof STAGE_STATES)[number];

export function isReleaseType(value: unknown): value is ReleaseType {
  return (
    typeof value === "string" &&
    (RELEASE_TYPES as readonly string[]).includes(value)
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

export type ProjectListItem = {
  id: string;
  title: string;
  artistName: string;
  releaseType: ReleaseType;
  currentStage: ProjectStage | null;
  stageCount: number;
};

export type ProjectDetail = {
  id: string;
  title: string;
  releaseType: ReleaseType;
  createdAt: string;
  artistName: string;
  ownerName: string | null;
  stages: ProjectStage[];
  currentStage: ProjectStage | null;
};

export type ArtistOption = { id: string; name: string };
export type OwnerOption = { personId: string; name: string };

export type CreateProjectState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    };

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

export function personName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}
