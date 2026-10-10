// Production files (quotes, captures, references, version files,
// attachments): private bucket production-files, path checked by the
// database (supabase/migrations/20261010006001_production_preproduction.sql).
// Client-safe.

export const PRODUCTION_FILE_BUCKET = "production-files";
// Rushes and masters stay elsewhere (a link): 500 MB covers review exports.
export const MAX_PRODUCTION_FILE_BYTES = 500 * 1024 * 1024;

export const PRODUCTION_FILE_KINDS = [
  "quote",
  "capture",
  "reference",
  "version",
  "attachment",
  "other",
] as const;
export type ProductionFileKind = (typeof PRODUCTION_FILE_KINDS)[number];

const PATH = /^[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/;

/** "<organization_id>/<project_id>/<uuid>[.<ext>]", as the database checks. */
export function isProductionFilePath(
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
    PATH.test(name)
  );
}
