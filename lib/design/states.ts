// Conception (ticket « Conception », États et transitions): every state the
// screens show is computed here from facts read in the database, never
// stored nor decided by PO (CLAUDE.md, rule 6). Client-safe.

// ---------------------------------------------------------------- Intentions

// Brouillon → À confirmer → Confirmées → À réviser, per target (the
// direction, or one deliverable).
export type IntentionsState =
  "draft" | "to_confirm" | "confirmed" | "to_revise";

type Answer = { id: string; topic: string; value: string };

export function intentionsState({
  answers,
  proposals,
  confirmation,
}: {
  // The retained answers (status confirmed) of the target.
  answers: Answer[];
  // PO's proposals still waiting for a person.
  proposals: number;
  // The latest consolidation confirmed by the owner, if any.
  confirmation: { snapshot: Array<{ intention_id: string }> } | null;
}): IntentionsState {
  if (!confirmation)
    return answers.length === 0 && proposals === 0 ? "draft" : "to_confirm";
  const confirmed = new Set(confirmation.snapshot.map((s) => s.intention_id));
  const same =
    proposals === 0 &&
    answers.length === confirmed.size &&
    answers.every((a) => confirmed.has(a.id));
  return same ? "confirmed" : "to_revise";
}

// ---------------------------------------------------------------- Validation

export type SubmissionStatus =
  "pending" | "approved" | "changes_requested" | "rejected" | "withdrawn";

export function submissionStatusOf(value: string): SubmissionStatus {
  return value === "approved" ||
    value === "changes_requested" ||
    value === "rejected" ||
    value === "withdrawn"
    ? value
    : "pending";
}

// A withdrawn request (MKT-C2-11) counts as none: the work is back to
// preparing a new version.
const live = <T extends { status: SubmissionStatus }>(latest: T | null) =>
  latest?.status === "withdrawn" ? null : latest;

// ------------------------------------------------------- Direction artistique

// À attribuer → En préparation → Prête à soumettre → En attente →
// Validée / Modifications demandées / Refusée.
export type DirectionState =
  | "to_assign"
  | "in_preparation"
  | "ready"
  | Exclude<SubmissionStatus, "withdrawn">;

export function directionState({
  hasResponsible,
  hasValidators,
  hasContent,
  latest,
}: {
  hasResponsible: boolean;
  hasValidators: boolean;
  // At least one confirmed intention or one reference to submit.
  hasContent: boolean;
  // The latest submission of the direction, if any.
  latest: { status: SubmissionStatus } | null;
}): DirectionState {
  latest = live(latest);
  if (latest?.status === "pending") return "pending";
  if (latest?.status === "approved") return "approved";
  if (!hasResponsible) return "to_assign";
  if (latest && latest.status !== "withdrawn") return latest.status;
  return hasContent && hasValidators ? "ready" : "in_preparation";
}

// ------------------------------------------------------------ Fiche Livrable

// Brouillon → À compléter → Prête à soumettre → En attente de validation →
// Validée, Prête pour Production → Transférée. Changes requested go back to
// « À compléter »; a refusal is shown as such.
export type SheetStatus =
  | "draft"
  | "to_complete"
  | "ready"
  | "pending"
  | "ready_for_production"
  | "transferred"
  | "rejected";

export function sheetStatus({
  touched,
  blockers,
  latest,
  transferredVersion,
  editedSinceApproval,
}: {
  // Something was written beyond what the sheet was created with.
  touched: boolean;
  // Blocking checks still open (lib/design/sheet-checks.ts).
  blockers: number;
  latest: { number: number; status: SubmissionStatus } | null;
  // The version number last handed to Production, if any.
  transferredVersion: number | null;
  // The sheet changed after its latest validated version.
  editedSinceApproval: boolean;
}): SheetStatus {
  latest = live(latest);
  if (latest?.status === "pending") return "pending";
  if (latest?.status === "approved" && !editedSinceApproval)
    return transferredVersion === latest.number
      ? "transferred"
      : "ready_for_production";
  if (latest?.status === "rejected" && !editedSinceApproval) return "rejected";
  if (!touched && !latest) return "draft";
  return blockers === 0 ? "ready" : "to_complete";
}

// ----------------------------------------------------------------- Conception

// Non commencée → En cours → À arbitrer → Partiellement validée → Terminée.
export type ConceptionState =
  | "not_started"
  | "in_progress"
  | "to_arbitrate"
  | "partially_validated"
  | "done";

export function conceptionState({
  started,
  toArbitrate,
  sheets,
}: {
  started: boolean;
  // Proposals waiting, references to attach, changes asked, refusals.
  toArbitrate: number;
  sheets: SheetStatus[];
}): ConceptionState {
  if (!started) return "not_started";
  const validated = sheets.filter(
    (s) => s === "ready_for_production" || s === "transferred",
  ).length;
  if (sheets.length > 0 && validated === sheets.length) return "done";
  if (toArbitrate > 0) return "to_arbitrate";
  return validated > 0 ? "partially_validated" : "in_progress";
}
