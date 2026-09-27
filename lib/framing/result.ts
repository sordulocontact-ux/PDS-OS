/**
 * Outcome of a project work action (framing, strategy). Error codes are
 * translated in fr.framing.errors.
 */
export type FramingErrorCode =
  | "invalid_input"
  | "not_found"
  | "already_imported"
  | "invalid_transition"
  | "validator_not_member"
  | "validator_not_allowed"
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
    "validator_not_member",
    "validator_not_allowed",
    "not_the_validator",
    "previous_stage_not_validated",
    "framing_requires_call",
    "lever_not_selected",
    "lever_has_deliverables",
    "version_superseded",
    "reason_required",
    "stage_locked",
  ] as const) {
    if (message.includes(code)) return fail(code);
  }
  if (
    message.includes("stage_not_found") ||
    message.includes("validation_not_found") ||
    message.includes("version_not_found")
  )
    return fail("not_found");
  if (error?.code === "42501") return fail("forbidden");
  if (error?.code === "23514") return fail("invalid_input");
  return fail("generic");
}
