// Postproduction of a production sheet (ticket « Workflow Production
// complet », parcours 14 à 18): the lists of the database
// (supabase/migrations/20261010006201_production_post.sql) and what the code
// decides from a status and a role. Client-safe.

export const POST_STEP_KEYS = [
  "files_prep",
  "edit",
  "live_mix",
  "grading",
  "subtitles",
  "exports_qc",
  "other",
] as const;
export type PostStepKey = (typeof POST_STEP_KEYS)[number];

export const POST_STEP_STATUSES = ["todo", "in_progress", "done"] as const;
export type PostStepStatus = (typeof POST_STEP_STATUSES)[number];

export const REFERENCE_KINDS = ["link", "file", "note"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export const VERSION_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "final_review",
  "approved",
  "refused",
] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

// What the version form asks for: keep it a draft, or submit it to the
// feedback (one cycle per version, PROD-033).
export const VERSION_TARGETS = ["draft", "review"] as const;
export type VersionTarget = (typeof VERSION_TARGETS)[number];

// « Demander des corrections » is a request addressed to someone
// (request_production_corrections), not a bare decision.
export const VERSION_DECISIONS = ["approve", "changes", "refuse"] as const;
export type VersionDecision = (typeof VERSION_DECISIONS)[number];

export const COMMENT_CATEGORIES = [
  "edit",
  "audio",
  "grading",
  "subtitles",
  "other",
] as const;
export type CommentCategory = (typeof COMMENT_CATEGORIES)[number];

export const COMMENT_STATUSES = [
  "open",
  "acknowledged",
  "declared_fixed",
  "to_verify",
  "resolved",
  "rejected",
] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/** A value of the list, or null when it is not one. */
export const oneOf =
  <T extends string>(list: readonly T[]) =>
  (value: unknown): T | null =>
    typeof value === "string" && (list as readonly string[]).includes(value)
      ? (value as T)
      : null;

export const postStepKeyOf = oneOf(POST_STEP_KEYS);
export const postStepStatusOf = oneOf(POST_STEP_STATUSES);
export const referenceKindOf = oneOf(REFERENCE_KINDS);
export const versionStatusOf = oneOf(VERSION_STATUSES);
export const commentCategoryOf = oneOf(COMMENT_CATEGORIES);
export const commentStatusOf = oneOf(COMMENT_STATUSES);

/** Who is looking: the owner organises (references, steps, versions) while
 * Production runs; the owner and the project's creative directors review
 * (feedback, corrections, final decision). */
export type PostRole = { canOrganize: boolean; canReview: boolean };

/** A version waiting for its one decision (« final_review » is the former
 * second submission, decided the same way). */
export const isUnderReview = (status: VersionStatus) =>
  status === "in_review" || status === "final_review";

/** What a version's status lets this person do (PROD-033): a draft is
 * edited, removed or submitted once; a version under review is commented,
 * then decided — valider, demander des corrections, refuser. */
export function versionActions(status: VersionStatus, role: PostRole) {
  const draft = status === "draft";
  return {
    edit: role.canOrganize && draft,
    remove: role.canOrganize && draft,
    submit: role.canOrganize && draft,
    decide: role.canReview && isUnderReview(status),
    comment:
      role.canReview &&
      (isUnderReview(status) || status === "changes_requested"),
  };
}

// A correction declared fixed by the provider is verified before it is
// resolved, never validated on its own; any settled feedback may reopen.
const NEXT_STATUSES: Record<CommentStatus, readonly CommentStatus[]> = {
  open: ["acknowledged", "declared_fixed", "rejected"],
  acknowledged: ["declared_fixed", "rejected", "open"],
  declared_fixed: ["to_verify", "open"],
  to_verify: ["resolved", "open"],
  resolved: ["open"],
  rejected: ["open"],
};

/** The statuses a feedback may move to from its own. */
export function commentMoves(status: CommentStatus): readonly CommentStatus[] {
  return NEXT_STATUSES[status];
}

/** Still to be handled by the provider: what « Corrections à transmettre »
 * gathers, and what the validator sees counted before deciding. */
export function isPendingCorrection(status: CommentStatus): boolean {
  return status === "open" || status === "acknowledged";
}

export type VersionActions = ReturnType<typeof versionActions>;
