// Where each activation stands for the Suivi & bilan (proto `phaseOf`,
// `proofOf`, `statsOf`), computed here from the Activations' own records as
// they are (marketing_activations, activation_evidence and its checks,
// activation_metrics), never stored. The Activations zone keeps its own
// states (lib/activations/states.ts): the frise below follows the same
// rules and is to be unified with it (docs/ARCHITECTURE.md § 8 terdecies).
// Pure, client-safe.

/** The raw statuses of marketing_activations. */
export type RawActivationStatus =
  | "draft"
  | "to_prepare"
  | "ready"
  | "in_progress"
  | "done_declared"
  | "closed"
  | "cancelled"
  | "suspended"
  | "blocked";

export type ReviewProof =
  | "not_expected"
  | "to_provide"
  | "provided_unverified"
  | "verified"
  | "contested"
  | "unavailable";

export type ReviewMeasure =
  "not_expected" | "to_collect" | "available_declared" | "available_verified";

/** The frise: À préparer, À réaliser, À prouver, À mesurer, À clôturer,
 * Clôturées (0 to 5); a cancelled activation is apart. */
export const PHASES = [0, 1, 2, 3, 4, 5] as const;
export type Phase = (typeof PHASES)[number];

export type ReviewActivation = {
  id: string;
  title: string;
  status: RawActivationStatus;
  // Why it is cancelled, suspended or blocked.
  reason: string | null;
  ownerName: string | null;
  hasOwner: boolean;
  hasDue: boolean;
  // Its start, else the day it was created: the bilan's period begins at
  // the first one.
  startsOn: string;
  proof: ReviewProof;
  measure: ReviewMeasure;
};

export type ActivationRecords = {
  status: string;
  evidenceExpected: boolean;
  metricsExpected: boolean;
  // Live evidence (not withdrawn): its latest check, null if never checked.
  evidence: Array<{ lastCheck: string | null }>;
  // Valid metrics (not invalidated).
  metrics: Array<{ verification: string }>;
};

export function proofOf(r: ActivationRecords): ReviewProof {
  if (!r.evidenceExpected) return "not_expected";
  if (r.evidence.length === 0) return "to_provide";
  const checks = r.evidence.map((e) => e.lastCheck);
  if (checks.includes("contested")) return "contested";
  if (checks.includes("unavailable")) return "unavailable";
  if (checks.includes(null)) return "provided_unverified";
  return "verified";
}

export function measureOf(r: ActivationRecords): ReviewMeasure {
  if (!r.metricsExpected) return "not_expected";
  if (r.metrics.length === 0) return "to_collect";
  return r.metrics.every((m) => m.verification === "verified")
    ? "available_verified"
    : "available_declared";
}

/** Done: its action took place (declared done, or closed). */
export const isRealised = (a: ReviewActivation) =>
  a.status === "done_declared" || a.status === "closed";

/** The frise of an activation; null when cancelled. */
export function phaseOf(a: ReviewActivation): Phase | null {
  if (a.status === "closed") return 5;
  if (a.status === "cancelled") return null;
  if (
    !a.hasOwner ||
    !a.hasDue ||
    a.status === "draft" ||
    a.status === "to_prepare" ||
    a.status === "ready" ||
    a.status === "blocked"
  )
    return 0;
  if (a.status === "in_progress" || a.status === "suspended") return 1;
  if (a.proof !== "verified" && a.proof !== "not_expected") return 2;
  if (a.measure === "to_collect") return 3;
  return 4;
}

/** The proof as « Où on en est » counts it: vérifiée (or not expected), à
 * vérifier (provided, or a link found unreachable), manquante. */
export const proofBucket = (p: ReviewProof) =>
  p === "verified" || p === "not_expected"
    ? "verified"
    : p === "provided_unverified" || p === "unavailable"
      ? "to_verify"
      : "missing";
