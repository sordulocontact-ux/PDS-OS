/** Outcome of a framing server action. Error codes are translated in fr.framing.errors. */
export type FramingErrorCode =
  | "invalid_input"
  | "not_found"
  | "already_imported"
  | "invalid_transition"
  | "validator_not_member"
  | "not_the_validator"
  | "reason_required"
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
    "not_the_validator",
  ] as const) {
    if (message.includes(code)) return fail(code);
  }
  if (
    message.includes("stage_not_found") ||
    message.includes("validation_not_found")
  )
    return fail("not_found");
  if (error?.code === "42501") return fail("forbidden");
  if (error?.code === "23514") return fail("invalid_input");
  return fail("generic");
}
