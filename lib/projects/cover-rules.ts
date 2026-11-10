// The project's cover (supabase/migrations/20261110100101_project_cover.sql):
// bucket and accepted files. Client-safe (the
// browser checks before uploading; the bucket enforces the same limits).
import {
  MAX_PICTURE_BYTES,
  PICTURE_EXTENSIONS,
} from "@/lib/catalog/picture-rules";

export const PROJECT_COVER_BUCKET = "project-covers";
// Same files and size as an artist's picture.
export const MAX_COVER_BYTES = MAX_PICTURE_BYTES;
export const COVER_EXTENSIONS = PICTURE_EXTENSIONS;
export const COVER_ACCEPT = Object.keys(COVER_EXTENSIONS).join(",");

// "<organization_id>/<project_id>/<uuid>.<ext>", as the database checks.
export function isProjectCoverPath(
  path: string,
  organizationId: string,
  projectId: string,
): boolean {
  const prefix = `${organizationId}/${projectId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path.slice(prefix.length))
  );
}

/** Why a file is refused, before any upload; null when it fits. */
export function coverFileProblem(file: File): "type" | "size" | null {
  if (!COVER_EXTENSIONS[file.type]) return "type";
  if (file.size > MAX_COVER_BYTES) return "size";
  return null;
}
