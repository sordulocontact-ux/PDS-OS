// A collective's releases (lot 13 of docs/pds-mic-plan.md, décision 7):
// its mode and what each mode makes. Pure, client-safe.

import type { ContractGap } from "@/lib/legal/contract-gaps";
import type { Tone } from "@/lib/ui/state-tones";

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

/** Where a release's deposit stands in the Distribution (lot 15). */
export type ReleaseDistributionKey =
  | "to_prepare"
  | "pending"
  | "rejected"
  | "approved"
  | "deposited"
  | "accepted"
  | "closing"
  | "closed";

export type ReleaseDistribution = {
  key: ReleaseDistributionKey;
  // The version it is about (Vn à valider, refusée, validée).
  number: number | null;
};

export const releaseDistributionTone: Record<ReleaseDistributionKey, Tone> = {
  to_prepare: "neutral",
  pending: "info",
  rejected: "danger",
  approved: "info",
  deposited: "info",
  accepted: "success",
  closing: "warning",
  closed: "success",
};

/** A release's deposit, read on release_distribution_states. */
export function releaseDistributionOf(
  row:
    | {
        version_number: number | null;
        version_status: string | null;
        superseded: boolean;
        deposited: boolean;
        accepted: boolean;
        closure_status: string | null;
      }
    | undefined,
): ReleaseDistribution {
  if (!row) return { key: "to_prepare", number: null };
  if (row.closure_status === "closed") return { key: "closed", number: null };
  if (row.closure_status === "pending") return { key: "closing", number: null };
  const n = row.version_number;
  if (n === null || row.superseded) return { key: "to_prepare", number: null };
  if (row.version_status === "pending") return { key: "pending", number: n };
  if (row.version_status === "rejected") return { key: "rejected", number: n };
  if (row.accepted) return { key: "accepted", number: n };
  if (row.deposited) return { key: "deposited", number: n };
  return { key: "approved", number: n };
}

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
  // Its title, or one of the compilation's, still under a provisional name
  // (lot 7): never submitted (lot 15).
  provisional: string[];
  // Its deposit in the Distribution (lot 15).
  distribution: ReleaseDistribution;
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
