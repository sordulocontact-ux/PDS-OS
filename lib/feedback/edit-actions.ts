"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  isFeedbackScreenshotPath,
  MAX_SCREENSHOTS,
} from "@/lib/feedback/screenshot-rules";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  type EditFeedbackInput,
  type SendFeedbackResult,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const editInput = z.object({
  feedbackId: z.uuid(),
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(1).max(FEEDBACK_MESSAGE_MAX),
  screenshotPaths: z.array(z.string()).max(MAX_SCREENSHOTS),
});

/**
 * The author changes their own feedback after sending it: kind, message,
 * screenshots. RLS lets nobody else, the database dates the edit; the topic
 * PO filed it in and the page it came from never change.
 */
export async function editFeedback(
  input: EditFeedbackInput,
): Promise<SendFeedbackResult> {
  const access = await requireApproved();
  const t = fr.feedback.errors;

  const parsed = editInput.safeParse(input);
  if (!parsed.success) {
    const issues = new Set(parsed.error.issues.map((i) => i.path[0]));
    return {
      ok: false,
      error: t.invalid,
      fieldErrors: {
        kind: issues.has("kind") ? t.kind : undefined,
        message: issues.has("message")
          ? input.message.trim()
            ? t.messageTooLong
            : t.messageRequired
          : undefined,
      },
    };
  }
  const { organizationId, personId } = access;
  const { feedbackId, kind, message, screenshotPaths } = parsed.data;
  if (
    !organizationId ||
    !personId ||
    !screenshotPaths.every((path) =>
      isFeedbackScreenshotPath(path, organizationId, personId),
    )
  ) {
    return { ok: false, error: t.editFailed };
  }

  const { data, error } = await (
    await createClient()
  )
    .from("feedback")
    .update({ kind, message, screenshot_paths: screenshotPaths })
    .eq("id", feedbackId)
    .select("id");
  // Someone else's feedback is filtered out by RLS: nothing is updated.
  if (error || !data?.length) {
    console.error("editFeedback:", error?.message ?? "not the author");
    return { ok: false, error: t.editFailed };
  }
  revalidatePath(routes.feedback);
  return { ok: true };
}
