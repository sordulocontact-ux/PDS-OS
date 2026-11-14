// A collective's releases (lot 13 of docs/pds-mic-plan.md, décision 7):
// its mode and what each mode makes. Pure, client-safe.

import type { ContractGap } from "@/lib/legal/contract-gaps";

export const RELEASE_MODES = [
  "singles",
  "compilation",
  "singles_then_compilation",
] as const;
export type ReleaseMode = (typeof RELEASE_MODES)[number];

export function isReleaseMode(value: unknown): value is ReleaseMode {
  return (RELEASE_MODES as readonly unknown[]).includes(value);
}

/** The mode has a release per title, a compilation. */
export const hasSingles = (mode: ReleaseMode) => mode !== "compilation";
export const hasCompilation = (mode: ReleaseMode) => mode !== "singles";

export type ReleaseState = "planned" | "delivered" | "online";

/** One live release of a collective: a title's, or the compilation. */
export type CollectiveRelease = {
  id: string;
  kind: "title" | "compilation";
  titleId: string | null;
  // The title's name in the project, or the project's for the compilation.
  label: string;
  position: number;
  // Its title abandoned: kept (history), out of the counts.
  abandoned: boolean;
  // The title's ISRC in the Catalogue (a compilation has none).
  isrc: string | null;
  upc: string | null;
  date: string | null;
  state: ReleaseState;
  // The compilation's titles: the live ones in the Catalogue, in order.
  tracks: string[];
  // The contracts it waits for (the release lock of lot 12).
  gaps: ContractGap[];
};

export type CollectiveReleases = {
  mode: ReleaseMode;
  // The plan launched: the releases exist.
  launched: boolean;
  releases: CollectiveRelease[];
  // Live titles not in the Catalogue yet (no release until their master).
  waiting: string[];
  canEdit: boolean;
  // The project's due date: the compilation's date.
  dueDate: string | null;
};
