import {
  FEEDBACK_SCREENSHOT_BUCKET,
  MAX_SCREENSHOT_BYTES,
  SCREENSHOT_EXTENSIONS,
} from "@/lib/feedback/screenshot-rules";
import { feedback } from "@/lib/i18n/fr/feedback";
import { createClient } from "@/lib/supabase/client";

const fr = { feedback };

/**
 * Browser-side: uploads the screenshot straight to the private bucket, into
 * the author's own folder (storage RLS), before the feedback is sent. Same
 * flow as the artist picture (lib/catalog/upload-picture.ts).
 */
export async function uploadFeedbackScreenshot(input: {
  organizationId: string;
  personId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const t = fr.feedback.screenshot;
  const ext = SCREENSHOT_EXTENSIONS[input.file.type];
  if (!ext) return { ok: false, error: t.badType };
  if (input.file.size > MAX_SCREENSHOT_BYTES)
    return { ok: false, error: t.tooLarge };

  const path = `${input.organizationId}/${input.personId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(FEEDBACK_SCREENSHOT_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (error) {
    console.error("[feedback] screenshot upload failed:", error.message);
    return { ok: false, error: t.failed };
  }
  return { ok: true, path };
}
