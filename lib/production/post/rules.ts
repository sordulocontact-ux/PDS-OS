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

// What the version form asks for: keep it a draft, or submit it.
export const VERSION_TARGETS = ["draft", "review", "final"] as const;
export type VersionTarget = (typeof VERSION_TARGETS)[number];

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

/** What a version's status lets this person do. Only a draft is edited or
 * removed; a version under review may still go to the final validation (a V1
 * may go there directly); a decision is taken in final validation only. */
export function versionActions(status: VersionStatus, role: PostRole) {
  const draft = status === "draft";
  return {
    edit: role.canOrganize && draft,
    remove: role.canOrganize && draft,
    submitReview: role.canOrganize && draft,
    submitFinal: role.canOrganize && (draft || status === "in_review"),
    requestChanges: role.canReview && status === "in_review",
    decide: role.canReview && status === "final_review",
    comment:
      role.canReview &&
      (status === "in_review" ||
        status === "changes_requested" ||
        status === "final_review"),
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
