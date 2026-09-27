import "server-only";

import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { isFeedbackKind, isFeedbackPriority } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import {
  createFeedbackPage,
  NotionError,
  notionMissingSettings,
  updateFeedbackPage,
  type FeedbackOriginal,
} from "@/lib/integrations/notion";
import { formatLongDay, formatTime } from "@/lib/project-history/format";
import type { createClient } from "@/lib/supabase/server";

/** The outcome, with the reason in plain French when it is not on Notion. */
export type NotionSync =
  { status: "synced" } | { status: "off" | "failed"; reason: string };

/** Why Notion refused, said so the director knows what to fix. */
export function explainNotionError(error: unknown): string {
  const t = fr.feedback.notion.reasons;
  if (!(error instanceof NotionError)) return t.unknown;
  const detail = error.detail ? ` (${error.detail})` : "";
  switch (error.reason) {
    case "not_configured":
      return t.notConfigured(notionMissingSettings().join(", "));
    case "unreachable":
      return t.unreachable;
    case "http_401":
      return t.unauthorized;
    case "http_403":
      return t.forbidden;
    case "http_404":
      return t.notShared;
    case "http_400":
      return t.invalid + detail;
    case "http_409":
    case "http_429":
      return t.busy;
    default:
      return error.reason.startsWith("http_5")
        ? t.unreachable
        : `${t.unknown}${detail}`;
  }
}

const fullName = (
  p: { first_name: string | null; last_name: string | null } | null,
) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—";

/**
 * Publishes a sent topic to Notion, or updates its page: properties (title,
 * summary, priority, count) and the feedback that joined since the last
 * update. Read and recorded with the director's session (RLS,
 * record_feedback_notion); only the Notion call uses the app's token. A
 * failure never undoes the sending: its reason, in plain French, is returned
 * and kept on the topic (record_feedback_notion_error), shown with a retry.
 */
export async function syncTopicToNotion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicId: string,
): Promise<NotionSync> {
  const missing = notionMissingSettings();
  if (missing.length > 0)
    return {
      status: "off",
      reason: fr.feedback.notion.reasons.notConfigured(missing.join(", ")),
    };

  const [topicRes, feedbackRes] = await Promise.all([
    supabase
      .from("feedback_topics")
      .select(
        "title, summary, kind, status, priority, reviewed_at, notion_page_id, notion_synced_at, reviewer:people!feedback_topics_reviewed_by_fkey(first_name, last_name)",
      )
      .eq("id", topicId)
      .maybeSingle(),
    supabase
      .from("feedback")
      .select("message, page_path, created_at")
      .eq("topic_id", topicId)
      .order("created_at"),
  ]);
  const topic = topicRes.data;
  if (
    !topic ||
    topic.status !== "sent" ||
    !isFeedbackPriority(topic.priority) ||
    feedbackRes.error
  )
    return { status: "failed", reason: fr.feedback.notion.reasons.notSent };

  const items = feedbackRes.data ?? [];
  const original = (f: (typeof items)[number]): FeedbackOriginal => ({
    message: f.message,
    pagePath: f.page_path,
    when: `${formatLongDay(f.created_at)}, ${formatTime(f.created_at)}`,
  });
  const t = fr.feedback;
  const page = {
    title: topic.title,
    summary: topic.summary,
    kind: t.kinds[isFeedbackKind(topic.kind) ? topic.kind : "other"],
    priority: t.priorities[topic.priority],
    count: items.length,
  };

  try {
    let pageId = topic.notion_page_id;
    let url: string | null = null;
    if (!pageId) {
      const created = await createFeedbackPage(
        {
          ...page,
          sentBy: fullName(topic.reviewer),
          sentOn: (topic.reviewed_at ?? new Date().toISOString()).slice(0, 10),
          link: `${siteUrl()}${routes.feedback}?view=sent`,
        },
        items.map(original),
        t.notion.originalsHeading,
      );
      pageId = created.id;
      url = created.url;
    } else {
      const since = topic.notion_synced_at ?? "";
      await updateFeedbackPage(
        pageId,
        page,
        items.filter((f) => f.created_at > since).map(original),
      );
    }
    const { error } = await supabase.rpc("record_feedback_notion", {
      p_topic: topicId,
      p_page_id: pageId,
      p_url: url ?? undefined,
    });
    if (error) {
      console.error("syncTopicToNotion:", error.message);
      return {
        status: "failed",
        reason: fr.feedback.notion.reasons.notRecorded,
      };
    }
    return { status: "synced" };
  } catch (error) {
    console.error("syncTopicToNotion:", error);
    const reason = explainNotionError(error);
    // Kept on the topic until a later update succeeds.
    await supabase.rpc("record_feedback_notion_error", {
      p_topic: topicId,
      p_error: reason,
    });
    return { status: "failed", reason };
  }
}
