/**
 * Outcome of a project work action (framing, strategy). Error codes are
 * translated in fr.framing.errors.
 */
export type FramingErrorCode =
  | "invalid_input"
  | "legal_not_lever"
  | "not_found"
  | "already_imported"
  | "invalid_transition"
  | "no_validator"
  | "multiple_validators"
  | "not_the_validator"
  | "reason_required"
  | "previous_stage_not_validated"
  | "framing_requires_call"
  | "stage_locked"
  | "lever_not_selected"
  | "lever_has_deliverables"
  | "nothing_to_import"
  | "version_superseded"
  | "cannot_deposit"
  | "file_too_large"
  | "upload_failed"
  | "forbidden"
  | "brief_incomplete"
  | "brief_outdated"
  | "brief_required"
  | "dimensions_required"
  | "plan_required"
  | "plan_already_launched"
  | "framing_not_validated"
  | "invalid_owner"
  | "deliveries_open"
  | "review_required"
  | "already_decided"
  | "reminder_too_soon"
  | "invalid_reviewer"
  | "brief_not_validated"
  | "brief_pending"
  | "strategy_incomplete"
  | "not_shareable"
  | "requests_required"
  | "requests_open"
  | "brief_unchanged"
  | "justification_required"
  | "item_not_found"
  | "critical_alert_unaccepted"
  | "invalid_reserve"
  | "deliverable_not_planned"
  | "recommendation_settled"
  | "generic";

export type ActionResult =
  { ok: true } | { ok: false; error: FramingErrorCode };

export const ok: ActionResult = { ok: true };
export const fail = (error: FramingErrorCode): ActionResult => ({
  ok: false,
  error,
});

/** Maps a database error (trigger exceptions, RLS, constraints) to a code. */
export function fromDatabaseError(
  error: { code?: string; message?: string } | null,
): ActionResult {
  const message = error?.message ?? "";
  for (const code of [
    "invalid_transition",
    "no_validator",
    "multiple_validators",
    "not_the_validator",
    "previous_stage_not_validated",
    "framing_requires_call",
    "lever_not_selected",
    "lever_has_deliverables",
    "version_superseded",
    "reason_required",
    "stage_locked",
    "brief_required",
    "dimensions_required",
    "plan_required",
    "plan_already_launched",
    "framing_not_validated",
    "invalid_owner",
    "deliveries_open",
    "review_required",
    "already_decided",
    "reminder_too_soon",
    "invalid_reviewer",
    "brief_not_validated",
    "brief_pending",
    "not_shareable",
    "requests_required",
    "requests_open",
    "brief_unchanged",
    "justification_required",
    "critical_alert_unaccepted",
    "invalid_reserve",
    "deliverable_not_planned",
    "recommendation_settled",
  ] as const) {
    if (message.includes(code)) return fail(code);
  }
  // A recommendation applied or ignored twice (two tabs, two clicks).
  if (message.includes("strategy_recommendations_key"))
    return fail("recommendation_settled");
  if (
    message.includes("stage_not_found") ||
    message.includes("validation_not_found") ||
    message.includes("version_not_found") ||
    message.includes("brief_not_found") ||
    message.includes("document_not_found") ||
    message.includes("review_not_found") ||
    message.includes("request_not_found") ||
    message.includes("reserve_not_found") ||
    message.includes("item_not_found")
  )
    return fail("not_found");
  if (error?.code === "42501") return fail("forbidden");
  if (error?.code === "23514") return fail("invalid_input");
  return fail("generic");
}
