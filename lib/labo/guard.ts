/**
 * The labo is a local test bench for the AI chain. It has no authentication,
 * so it must never be reachable in production.
 */
export const isLaboEnabled = process.env.NODE_ENV !== "production";

export type LaboErrorCode =
  | "disabled"
  | "no_file"
  | "file_too_large"
  | "unsupported_type"
  | "invalid_input"
  | "invalid_isrc"
  | "provider_error";

export function laboError(code: LaboErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}
