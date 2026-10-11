// A proof attached to a declaration (supabase/migrations/20261011100301):
// private bucket distribution-proofs, "<organization_id>/<project_id>/<uuid>[.<ext>]".
// Client-safe.

export const PROOF_BUCKET = "distribution-proofs";
// A screenshot, a PDF, an email export: 50 MB is plenty.
export const MAX_PROOF_BYTES = 50 * 1024 * 1024;

const NAME = /^[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/;

export function isProofPath(
  path: string,
  organizationId: string,
  projectId: string,
): boolean {
  const [org, project, name, ...rest] = path.split("/");
  return (
    rest.length === 0 &&
    org === organizationId &&
    project === projectId &&
    typeof name === "string" &&
    NAME.test(name)
  );
}
