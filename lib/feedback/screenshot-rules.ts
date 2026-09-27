// Screenshots attached to a feedback: bucket and accepted files. Client-safe
// (the browser checks before uploading; the bucket enforces the same limits).

export const FEEDBACK_SCREENSHOT_BUCKET = "feedback-screenshots";
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const SCREENSHOT_EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// "<organization_id>/<person_id>/<uuid>.<ext>", as the database checks.
export function isFeedbackScreenshotPath(
  path: string,
  organizationId: string,
  personId: string,
): boolean {
  const prefix = `${organizationId}/${personId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path.slice(prefix.length))
  );
}
