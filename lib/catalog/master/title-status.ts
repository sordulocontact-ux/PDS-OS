// Where a title stands, for the head of its overview (retours Catalogue 01,
// 11 et 12 du 11/10/2026): its distribution state, kept apart from its
// audio state, and the next action, decided here from what the title holds
// (never by the model). Pure, client-safe.

import type { NumberedVersion } from "@/lib/catalog/audio-versions";
import { AUDIO_STATES, type AudioState } from "@/lib/catalog/title-rules";

export const DISTRIBUTION_STATES = [
  "not_prepared",
  "preparing",
  "delivered",
  "available",
] as const;
export type DistributionState = (typeof DISTRIBUTION_STATES)[number];

/**
 * The most advanced state among the title's live projects: online on a
 * platform (Disponible), deposited with the distributor (Livré), a
 * distribution dossier or a planned release (En préparation), else nothing.
 */
export function distributionStateOf(input: {
  online: boolean;
  delivered: boolean;
  preparing: boolean;
}): DistributionState {
  if (input.online) return "available";
  if (input.delivered) return "delivered";
  if (input.preparing) return "preparing";
  return "not_prepared";
}

export type TitleNextAction =
  | { kind: "add_first_version" }
  | { kind: "review"; version: NumberedVersion }
  | { kind: "awaiting_review"; version: NumberedVersion }
  | { kind: "deposit_correction"; version: NumberedVersion }
  | { kind: "deposit_next"; state: AudioState }
  | { kind: "link_project" }
  | { kind: "complete"; key: string }
  | { kind: "none" };

/**
 * The one thing to do next on a title, in this order: a first audio
 * version; a version waiting for a decision (to take, or to wait for); the
 * corrected version after a change request; the next audio step until a
 * Master final is validated; a project for a finalised title; then the
 * first missing piece of the dossier, the most important first.
 */
export function titleNextAction(input: {
  versions: readonly NumberedVersion[];
  canReview: boolean;
  finalValidated: boolean;
  projectCount: number;
  // The dossier's missing pieces, most important first.
  missing: readonly string[];
}): TitleNextAction {
  const { versions } = input;
  if (versions.length === 0) return { kind: "add_first_version" };
  // `versions` come most advanced step first, newest first.
  const pending = versions.find((v) => v.validation === "pending");
  if (pending)
    return input.canReview
      ? { kind: "review", version: pending }
      : { kind: "awaiting_review", version: pending };
  const top = versions[0];
  if (top.review === "changes_requested")
    return { kind: "deposit_correction", version: top };
  if (!input.finalValidated) {
    const next = AUDIO_STATES[AUDIO_STATES.indexOf(top.audioState) + 1];
    if (next) return { kind: "deposit_next", state: next };
  }
  if (input.finalValidated && input.projectCount === 0)
    return { kind: "link_project" };
  const [first] = input.missing;
  return first ? { kind: "complete", key: first } : { kind: "none" };
}
