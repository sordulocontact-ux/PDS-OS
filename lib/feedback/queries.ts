import "server-only";

import { FEEDBACK_SCREENSHOT_BUCKET } from "@/lib/feedback/screenshot-rules";
import {
  FEEDBACK_PRIORITIES,
  isFeedbackKind,
  isFeedbackPriority,
  isTopicStatus,
  type Feedback,
  type FeedbackTopic,
  type TopicStatus,
} from "@/lib/feedback/types";
import { createClient } from "@/lib/supabase/server";

const MAX_FEEDBACK = 500;
const SIGNED_URL_SECONDS = 3600;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Person = { first_name: string | null; last_name: string | null } | null;
type Row = {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  screenshot_paths: string[];
  created_at: string;
  created_by: string | null;
  topic_id: string | null;
  author: Person;
};

const SELECT =
  "id, kind, message, page_path, screenshot_paths, created_at, created_by, topic_id, author:people!feedback_created_by_fkey(first_name, last_name)";

const fullName = (person: Person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "—";

// Screenshots live in a private bucket: signed URLs, created with the
// viewer's session (storage RLS: the author and the director).
async function signScreenshots(
  supabase: Supabase,
  rows: Row[],
): Promise<Map<string, string>> {
  const paths = rows.flatMap((r) => r.screenshot_paths);
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const { data, error } = await supabase.storage
    .from(FEEDBACK_SCREENSHOT_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) console.error("signScreenshots:", error.message);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
  }
  return signed;
}

function toFeedback(
  row: Row,
  personId: string,
  titles: Map<string, string>,
  screenshots: Map<string, string>,
): Feedback {
  return {
    id: row.id,
    kind: isFeedbackKind(row.kind) ? row.kind : "other",
    message: row.message,
    pagePath: row.page_path,
    createdAt: row.created_at,
    authorName: row.created_by === personId ? null : fullName(row.author),
    screenshotUrls: row.screenshot_paths.flatMap((path) => {
      const url = screenshots.get(path);
      return url ? [url] : [];
    }),
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
  const rows = data ?? [];
  const screenshots = await signScreenshots(supabase, rows);
  return {
    error: Boolean(error),
    items: rows.map((row) => toFeedback(row, personId, new Map(), screenshots)),
  };
}

export type FeedbackInbox = {
  error: boolean;
  // By status; sent ones by priority, then everything by latest feedback.
  topics: Record<TopicStatus, FeedbackTopic[]>;
  // Waiting for PO to file them.
  unfiled: Feedback[];
  // Every feedback as sent, newest first: PO may group wrongly.
  all: Feedback[];
};

const byLatest = (a: FeedbackTopic, b: FeedbackTopic) =>
  b.items[0].createdAt.localeCompare(a.items[0].createdAt);
const priorityRank = (topic: FeedbackTopic) =>
  topic.priority ? FEEDBACK_PRIORITIES.indexOf(topic.priority) : Infinity;

/**
 * Everyone's feedback and its topics, for whoever holds read_feedback (RLS
 * returns nothing more to anyone else). Grouping, counts and order are code.
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
    supabase
      .from("feedback_topics")
      .select(
        "id, kind, title, summary, status, priority, reviewed_at, edited_at, notion_url, notion_page_id, notion_synced_at, reviewer:people!feedback_topics_reviewed_by_fkey(first_name, last_name), editor:people!feedback_topics_edited_by_fkey(first_name, last_name)",
      ),
  ]);
  const error = feedbackRes.error ?? topicsRes.error;
  if (error) console.error("loadFeedbackInbox:", error.message);

  const rows = feedbackRes.data ?? [];
  const topicRows = topicsRes.data ?? [];
  const titles = new Map(topicRows.map((t) => [t.id, t.title]));
  const screenshots = await signScreenshots(supabase, rows);
  const all = rows.map((row) => toFeedback(row, personId, titles, screenshots));

  const byTopic = new Map<string, Feedback[]>();
  for (const item of all) {
    if (!item.topicId) continue;
    byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);
  }

  const topics: Record<TopicStatus, FeedbackTopic[]> = {
    new: [],
    sent: [],
    dismissed: [],
  };
  for (const row of topicRows) {
    // `all` is newest first, so each topic's first item is its latest.
    const items = byTopic.get(row.id);
    if (!items) continue;
    const status = isTopicStatus(row.status) ? row.status : "new";
    const reviewedAt = row.reviewed_at;
    topics[status].push({
      id: row.id,
      kind: isFeedbackKind(row.kind) ? row.kind : "other",
      title: row.title,
      summary: row.summary,
      status,
      priority: isFeedbackPriority(row.priority) ? row.priority : null,
      reviewedAt,
      reviewerName: row.reviewer ? fullName(row.reviewer) : null,
      editedAt: row.edited_at,
      editorName: row.editor ? fullName(row.editor) : null,
      items,
      newSinceReview:
        status === "sent" && reviewedAt
          ? items.filter((i) => i.createdAt > reviewedAt).length
          : 0,
      notionUrl: row.notion_url,
      notionSynced: row.notion_page_id !== null,
      newSinceSync: row.notion_synced_at
        ? items.filter((i) => i.createdAt > row.notion_synced_at!).length
        : 0,
    });
  }
  topics.new.sort(byLatest);
  topics.dismissed.sort(byLatest);
  topics.sent.sort(
    (a, b) => priorityRank(a) - priorityRank(b) || byLatest(a, b),
  );

  return {
    error: Boolean(error),
    topics,
    unfiled: all.filter((item) => !item.topicId),
    all,
  };
}
