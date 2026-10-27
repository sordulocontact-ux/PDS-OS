// The one calculation of where an activation stands on its frieze
// Préparer → Réaliser → Prouver → Mesurer → Clôturer (proto « Projet
// complet » mk.js phaseOf), read by the Activations (list, open activation,
// journey) and by the Suivi & bilan (« Où on en est », the bilan's scope).
// Computed by code from the statuses, the proof and the statistics at each
// read, never stored. Pure, client-safe.

import type { ActivationStatus, LaunchGap } from "@/lib/activations/model";
import type { MeasureState, ProofState } from "@/lib/activations/states";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";

const fr = { activationJourney };

const t = fr.activationJourney;

/** -1 cancelled, 0 Préparer … 4 Clôturer, 5 closed. */
export type Phase = -1 | 0 | 1 | 2 | 3 | 4 | 5;

/** The phases a live activation can be in, then the closed ones. */
export const PHASES = [0, 1, 2, 3, 4, 5] as const;

export type PhaseInput = {
  status: ActivationStatus;
  statusBeforeSuspension: ActivationStatus | null;
  ownerPersonId: string | null;
  dueOn: string | null;
  launchGaps: readonly LaunchGap[];
  proof: ProofState;
  measure: MeasureState;
};

/** The status a suspended activation will return to. */
export const liveStatus = (a: PhaseInput): ActivationStatus =>
  a.status === "suspended"
    ? (a.statusBeforeSuspension ?? "to_prepare")
    : a.status;

/** Waiting for something outside it: an open blocker, a prerequisite not
 * there yet (« Elle commence quand le Clip officiel est livré. »). */
export const isGated = (a: PhaseInput) =>
  ["to_prepare", "blocked"].includes(liveStatus(a)) &&
  a.launchGaps.some((g) => g === "blocker" || g === "dependency");

export function phaseOf(a: PhaseInput): Phase {
  if (a.status === "closed") return 5;
  if (a.status === "cancelled") return -1;
  const s = liveStatus(a);
  if (!a.ownerPersonId || !a.dueOn || s === "to_prepare" || s === "blocked")
    return 0;
  if (s === "in_progress") return 1;
  if (["to_provide", "contested", "provided_unverified"].includes(a.proof))
    return 2;
  if (a.measure === "to_collect") return 3;
  return 4;
}

/** Where people may act with the creators (SQL `activation_is_live`,
 * 20261026400101): launched — an owner, a deadline, « En cours » or
 * « Réalisée déclarée ». Otherwise why not: not launched, suspended, closed
 * (closed or cancelled). */
export function collaborationGate(a: {
  status: ActivationStatus;
  ownerPersonId: string | null;
  dueOn: string | null;
}): "live" | "not_launched" | "suspended" | "closed" {
  if (a.status === "closed" || a.status === "cancelled") return "closed";
  if (a.status === "suspended") return "suspended";
  return (a.status === "in_progress" || a.status === "done_declared") &&
    a.ownerPersonId !== null &&
    a.dueOn !== null
    ? "live"
    : "not_launched";
}

/** Its action took place: declared done, or closed. */
export const isRealised = (a: { status: ActivationStatus }) =>
  a.status === "done_declared" || a.status === "closed";

/** « Mesurer », « Clôturée », « Annulée », « Réaliser · suspendue ». */
export function phaseLabel(a: PhaseInput): string {
  const phase = phaseOf(a);
  if (phase === -1) return t.phaseCancelled;
  const label: string = phase === 5 ? t.phaseClosed : t.phases[phase];
  return a.status === "suspended" ? `${label}${t.phaseSuspended}` : label;
}
