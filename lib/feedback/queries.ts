import "server-only";

import {
  isFeedbackKind,
  type Feedback,
  type FeedbackTopic,
} from "@/lib/feedback/types";
import { createClient } from "@/lib/supabase/server";

const MAX_FEEDBACK = 500;

type Row = {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  created_at: string;
  created_by: string | null;
  topic_id: string | null;
  author: { first_name: string | null; last_name: string | null } | null;
};

const SELECT =
  "id, kind, message, page_path, created_at, created_by, topic_id, author:people!feedback_created_by_fkey(first_name, last_name)";

function toFeedback(
  row: Row,
  personId: string,
  titles: Map<string, string>,
): Feedback {
  return {
    id: row.id,
    kind: isFeedbackKind(row.kind) ? row.kind : "other",
    message: row.message,
    pagePath: row.page_path,
    createdAt: row.created_at,
    authorName:
      row.created_by === personId
        ? null
        : [row.author?.first_name, row.author?.last_name]
            .filter(Boolean)
            .join(" ") || "—",
    topicId: row.topic_id,
    topicTitle: row.topic_id ? (titles.get(row.topic_id) ?? null) : null,
  };
}

export type MyFeedback = { error: boolean; items: Feedback[] };

/** The viewer's own feedback, newest first. */
export async function listMyFeedback(personId: string): Promise<MyFeedback> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select(SELECT)
    .eq("created_by", personId)
    .order("created_at", { ascending: false })
    .limit(MAX_FEEDBACK);
  if (error) console.error("listMyFeedback:", error.message);
  return {
    error: Boolean(error),
    items: (data ?? []).map((row) => toFeedback(row, personId, new Map())),
  };
}

export type FeedbackInbox = {
  error: boolean;
  // Topics by their latest feedback, newest first.
  topics: FeedbackTopic[];
  // Waiting for PO to file them.
  unfiled: Feedback[];
  // Every feedback as sent, newest first: PO may group wrongly.
  all: Feedback[];
};

/**
 * Everyone's feedback and its topics, for whoever holds read_feedback (RLS
 * returns nothing more to anyone else). Grouping and counts are code.
 */
export async function loadFeedbackInbox(
  personId: string,
): Promise<FeedbackInbox> {
  const supabase = await createClient();
  const [feedbackRes, topicsRes] = await Promise.all([
    supabase
      .from("feedback")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(MAX_FEEDBACK),
    supabase.from("feedback_topics").select("id, kind, title, summary"),
  ]);
  const error = feedbackRes.error ?? topicsRes.error;
  if (error) console.error("loadFeedbackInbox:", error.message);

  const topicRows = topicsRes.data ?? [];
  const titles = new Map(topicRows.map((t) => [t.id, t.title]));
  const all = (feedbackRes.data ?? []).map((row) =>
    toFeedback(row, personId, titles),
  );

  const byTopic = new Map<string, Feedback[]>();
  for (const item of all) {
    if (!item.topicId) continue;
    byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);
  }
  // `all` is newest first, so each topic's first item is its latest.
  const topics = topicRows
    .flatMap((row): FeedbackTopic[] => {
      const items = byTopic.get(row.id);
      if (!items) return [];
      return [
        {
          id: row.id,
          kind: isFeedbackKind(row.kind) ? row.kind : "other",
          title: row.title,
          summary: row.summary,
          items,
        },
      ];
    })
    .sort((a, b) => b.items[0].createdAt.localeCompare(a.items[0].createdAt));

  return {
    error: Boolean(error),
    topics,
    unfiled: all.filter((item) => !item.topicId),
    all,
  };
}
