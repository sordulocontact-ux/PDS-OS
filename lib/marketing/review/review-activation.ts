// The activations as the Suivi & bilan reads them (proto `phaseOf`,
// `proofOf`, `statsOf`): each one's phase, proof and statistics are those
// of the Activations themselves — one calculation, lib/activations/phase.ts
// and states.ts —, never computed a second time here. Pure, client-safe.

import type { ActivationStatus } from "@/lib/activations/model";
import type { Phase } from "@/lib/activations/phase";
import type { MeasureState, ProofState } from "@/lib/activations/states";

export type ReviewActivation = {
  id: string;
  title: string;
  status: ActivationStatus;
  // Why it is cancelled, suspended or blocked.
  reason: string | null;
  ownerName: string | null;
  // Its start, else the day it was created: the bilan's period begins at
  // the first one.
  startsOn: string;
  phase: Phase;
  proof: ProofState;
  measure: MeasureState;
  // Its latest statistic (« 48 200 vues »), if any.
  lastFigure: string | null;
};

/** The proof as « Où on en est » counts it: vérifiée (or not expected), à
 * vérifier (provided, or a link found unreachable), manquante. */
export const proofBucket = (p: ProofState) =>
  p === "verified" || p === "not_expected"
    ? "verified"
    : p === "provided_unverified" || p === "unavailable"
      ? "to_verify"
      : "missing";
