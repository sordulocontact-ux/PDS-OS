"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved, requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  isAppPath,
  type FeedbackState,
} from "@/lib/feedback/types";
import { triageUnfiledFeedback } from "@/lib/feedback/triage";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Written with the user's session: any active member, for themself (RLS);
// authorship is set by the database.

const feedbackInput = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(1).max(FEEDBACK_MESSAGE_MAX),
  pagePath: z
    .string()
    .optional()
    // An unknown page is dropped, never a reason to refuse the feedback.
    .transform((v) => (v && isAppPath(v) ? v : null)),
});

export async function sendFeedback(
  _previous: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const access = await requireApproved();
  const t = fr.feedback.errors;
  const raw = {
    kind: String(formData.get("kind") ?? ""),
    message: String(formData.get("message") ?? ""),
    pagePath: String(formData.get("pagePath") ?? ""),
  };

  const parsed = feedbackInput.safeParse(raw);
  if (!parsed.success) {
    const issues = new Set(parsed.error.issues.map((i) => i.path[0]));
    return {
      status: "error",
      error: t.invalid,
      fieldErrors: {
        kind: issues.has("kind") ? t.kind : undefined,
        message: issues.has("message")
          ? raw.message.trim()
            ? t.messageTooLong
            : t.messageRequired
          : undefined,
      },
      values: raw,
    };
  }
  if (!access.organizationId) {
    return { status: "error", error: t.generic, values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    organization_id: access.organizationId,
    kind: parsed.data.kind,
    message: parsed.data.message,
    page_path: parsed.data.pagePath,
  });
  if (error) {
    console.error("sendFeedback:", error.message);
    return { status: "error", error: t.generic, values: raw };
  }

  revalidatePath(routes.feedback);
  return { status: "success", sentAt: Date.now() };
}

/**
 * Asks PO to file the feedback still waiting into topics, before the director
 * reads them. Run from the director's feedback page, with their session.
 */
export async function triageFeedback(): Promise<{ ok: boolean }> {
  const access = await requirePermission("read_feedback");
  if (!access.organizationId) return { ok: false };
  const { ok, filed } = await triageUnfiledFeedback(
    await createClient(),
    access.organizationId,
  );
  if (filed > 0) revalidatePath(routes.feedback);
  return { ok };
}
