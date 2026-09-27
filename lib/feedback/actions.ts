"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved, requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { syncTopicToNotion, type NotionSync } from "@/lib/feedback/notion-sync";
import { proposeRewrite, type RewriteResult } from "@/lib/feedback/rewrite";
import {
  isFeedbackScreenshotPath,
  MAX_SCREENSHOTS,
} from "@/lib/feedback/screenshot-rules";
import { triageUnfiledFeedback } from "@/lib/feedback/triage";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_PRIORITIES,
  isAppPath,
  TOPIC_SUMMARY_MAX,
  TOPIC_TITLE_MAX,
  type SendFeedbackInput,
  type SendFeedbackResult,
  type TopicAction,
} from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Written with the user's session: any active member sends, for themself
// (RLS, authorship set by the database); the director (read_feedback) files
// and reviews through SQL functions.

const feedbackInput = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(1).max(FEEDBACK_MESSAGE_MAX),
  // An unknown page is dropped, never a reason to refuse the feedback.
  pagePath: z
    .string()
    .nullable()
    .transform((v) => (v && isAppPath(v) ? v : null)),
  screenshotPaths: z.array(z.string()).max(MAX_SCREENSHOTS),
});

export async function sendFeedback(
  input: SendFeedbackInput,
): Promise<SendFeedbackResult> {
  const access = await requireApproved();
  const t = fr.feedback.errors;

  const parsed = feedbackInput.safeParse(input);
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
  const screenshotPaths = parsed.data.screenshotPaths;
  if (
    !organizationId ||
    !personId ||
    !screenshotPaths.every((path) =>
      isFeedbackScreenshotPath(path, organizationId, personId),
    )
  ) {
    return { ok: false, error: t.generic };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    organization_id: organizationId,
    kind: parsed.data.kind,
    message: parsed.data.message,
    page_path: parsed.data.pagePath,
    screenshot_paths: screenshotPaths,
  });
  if (error) {
    console.error("sendFeedback:", error.message);
    return { ok: false, error: t.generic };
  }

  revalidatePath(routes.feedback);
  return { ok: true };
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

const reviewInput = z.object({
  topicId: z.uuid(),
  action: z.enum(["send", "prioritize", "dismiss", "reopen"]),
  priority: z.enum(FEEDBACK_PRIORITIES).optional(),
});

/** The director sends a topic with a priority, re-prioritizes, dismisses or
 * brings it back to review (review_feedback_topic checks everything). A sent
 * topic, or a new priority, is then published to Notion when configured. */
export async function reviewFeedbackTopic(
  topicId: string,
  action: TopicAction,
  priority?: string,
): Promise<{ ok: boolean; notion?: NotionSync }> {
  const parsed = reviewInput.safeParse({ topicId, action, priority });
  await requirePermission("read_feedback");
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_feedback_topic", {
    p_topic: parsed.data.topicId,
    p_action: parsed.data.action,
    p_priority: parsed.data.priority,
  });
  if (error) {
    console.error("reviewFeedbackTopic:", error.message);
    return { ok: false };
  }
  const notion =
    action === "send" || action === "prioritize"
      ? await syncTopicToNotion(supabase, parsed.data.topicId)
      : undefined;
  revalidatePath(routes.feedback);
  return { ok: true, notion };
}

/** Publishes a sent topic to Notion again: after a failure, or to add the
 * feedback that joined since. */
export async function syncFeedbackTopicToNotion(
  topicId: string,
): Promise<{ notion: NotionSync }> {
  await requirePermission("read_feedback");
  if (!z.uuid().safeParse(topicId).success)
    return {
      notion: { status: "failed", reason: fr.feedback.notion.reasons.notSent },
    };
  const notion = await syncTopicToNotion(await createClient(), topicId);
  revalidatePath(routes.feedback);
  return { notion };
}

const editInput = z.object({
  topicId: z.uuid(),
  kind: z.enum(FEEDBACK_KINDS),
  title: z.string().trim().min(1).max(TOPIC_TITLE_MAX),
  summary: z.string().trim().min(1).max(TOPIC_SUMMARY_MAX),
});

export type EditTopicResult =
  | { ok: true }
  | { ok: false; fieldErrors?: { title?: string; summary?: string } };

/** The director saves a topic's kind, title and summary before sending it
 * (edit_feedback_topic refuses a sent topic). */
export async function editFeedbackTopic(input: {
  topicId: string;
  kind: string;
  title: string;
  summary: string;
}): Promise<EditTopicResult> {
  await requirePermission("read_feedback");
  const t = fr.feedback.edit.errors;
  const parsed = editInput.safeParse(input);
  if (!parsed.success) {
    const issues = new Set(parsed.error.issues.map((i) => i.path[0]));
    return {
      ok: false,
      fieldErrors: {
        title: issues.has("title") ? t.title : undefined,
        summary: issues.has("summary") ? t.summary : undefined,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_feedback_topic", {
    p_topic: parsed.data.topicId,
    p_kind: parsed.data.kind,
    p_title: parsed.data.title,
    p_summary: parsed.data.summary,
  });
  if (error) {
    console.error("editFeedbackTopic:", error.message);
    return { ok: false };
  }
  revalidatePath(routes.feedback);
  return { ok: true };
}

/** PO proposes a new title and summary for a topic; nothing is saved. */
export async function proposeTopicRewrite(
  topicId: string,
  request: string,
): Promise<RewriteResult> {
  await requirePermission("read_feedback");
  if (!z.uuid().safeParse(topicId).success)
    return { ok: false, error: "not_found" };
  return proposeRewrite(
    await createClient(),
    topicId,
    request.trim().slice(0, 500),
  );
}
