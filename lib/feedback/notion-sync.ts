import "server-only";

import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { isFeedbackKind, isFeedbackPriority } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import {
  createFeedbackPage,
  notionConfigured,
  updateFeedbackPage,
  type FeedbackOriginal,
} from "@/lib/integrations/notion";
import { formatLongDay, formatTime } from "@/lib/project-history/format";
import type { createClient } from "@/lib/supabase/server";

export type NotionSync = "synced" | "failed" | "off";

const fullName = (
  p: { first_name: string | null; last_name: string | null } | null,
) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—";

/**
 * Publishes a sent topic to Notion, or updates its page: properties (title,
 * summary, priority, count) and the feedback that joined since the last
 * update. Read and recorded with the director's session (RLS,
 * record_feedback_notion); only the Notion call uses the app's token. A
 * failure never undoes the sending: the page shows it, with a retry.
 */
export async function syncTopicToNotion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicId: string,
): Promise<NotionSync> {
  if (!notionConfigured()) return "off";

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
    return "failed";

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
      return "failed";
    }
    return "synced";
  } catch (error) {
    console.error("syncTopicToNotion:", error);
    return "failed";
  }
}
