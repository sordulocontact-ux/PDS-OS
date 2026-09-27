// Conception: versions, limits and the design state of a deliverable.
// Client-safe (the browser checks before uploading; the database enforces the
// same rules, supabase/migrations/20260927000601_design_stage.sql).

export const DESIGN_FILE_BUCKET = "design-files";
export const MAX_DESIGN_FILE_BYTES = 50 * 1024 * 1024;

export type VersionStatus = "submitted" | "approved" | "changes_requested";

// Computed by code from the latest version, never stored.
export type DesignState = "to_design" | VersionStatus;

export function versionStatusOf(value: string): VersionStatus {
  return value === "approved" || value === "changes_requested"
    ? value
    : "submitted";
}

/** A deliverable's state is its latest version's; none yet = to design. */
export function designStateOf(
  latest: { status: VersionStatus } | undefined,
): DesignState {
  return latest?.status ?? "to_design";
}

// "<organization_id>/<project_id>/<uuid>[.<ext>]", as the database checks.
export function isDesignFilePath(
  path: string,
  organizationId: string,
  projectId: string,
): boolean {
  const prefix = `${organizationId}/${projectId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/.test(path.slice(prefix.length))
  );
}

/** A link version: https only, as the database checks. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/\s/.test(value);
  } catch {
    return false;
  }
}
