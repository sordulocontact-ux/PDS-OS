// Conception, étape 6: what a reference file may be, where it lives, how a
// target is named in forms. The same rules as the database
// (supabase/migrations/20261010005001_conception_direction_sheets.sql § 5).
// Client-safe.

export const REFERENCE_BUCKET = "design-references";
export const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

// Images, PDF (a whole moodboard) and short videos.
export const REFERENCE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const REFERENCE_ACCEPT = REFERENCE_MIMES.join(",");

export function isReferenceMime(value: string): boolean {
  return (REFERENCE_MIMES as readonly string[]).includes(value);
}

/** What a file shows as: a thumbnail, or an icon. */
export function referenceMediaOf(
  mime: string | null,
): "image" | "pdf" | "video" | "other" {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

// "<organization_id>/<project_id>/<uuid>[.<ext>]", as the database checks.
export function isReferencePath(
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

export const isSha256 = (value: string) => /^[0-9a-f]{64}$/.test(value);

// A target in forms and URLs: « direction », or a design_deliverables id.
export const DIRECTION_TARGET = "direction";

export function toLink(target: string): {
  target: "direction" | "deliverable";
  deliverableId: string | null;
} {
  return target === DIRECTION_TARGET
    ? { target: "direction", deliverableId: null }
    : { target: "deliverable", deliverableId: target };
}

export function targetKeyOf(link: { deliverableId: string | null }): string {
  return link.deliverableId ?? DIRECTION_TARGET;
}
