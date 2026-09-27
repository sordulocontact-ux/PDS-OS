// Feedback about the app itself. Client-safe.

import type { FieldErrors } from "@/lib/auth/form-state";

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

// Chosen by the director when sending a topic, never by PO.
export const FEEDBACK_PRIORITIES = ["high", "normal", "low"] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

export const TOPIC_STATUSES = ["new", "sent", "dismissed"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export type TopicAction = "send" | "prioritize" | "dismiss" | "reopen";

export const FEEDBACK_MESSAGE_MAX = 4000;
// Same limits as the feedback_topics constraints.
export const TOPIC_TITLE_MAX = 200;
export const TOPIC_SUMMARY_MAX = 2000;

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (values as readonly string[]).includes(value);

export const isFeedbackKind = isOneOf(FEEDBACK_KINDS);
export const isFeedbackPriority = isOneOf(FEEDBACK_PRIORITIES);
export const isTopicStatus = isOneOf(TOPIC_STATUSES);

/** A path of the app, the only "page" a feedback may point to. */
export function isAppPath(value: string): boolean {
  return (value === "/app" || value.startsWith("/app/")) && value.length <= 500;
}

export type Feedback = {
  id: string;
  kind: FeedbackKind;
  message: string;
  pagePath: string | null;
  createdAt: string;
  // Null for the viewer's own feedback.
  authorName: string | null;
  // Short-lived signed URL of the attached screenshot.
  screenshotUrl: string | null;
  // The topic PO filed it in; null while it waits to be sorted.
  topicId: string | null;
  topicTitle: string | null;
};

/** Similar feedback gathered by PO, reviewed by the director. */
export type FeedbackTopic = {
  id: string;
  kind: FeedbackKind;
  // Written by PO.
  title: string;
  summary: string;
  status: TopicStatus;
  priority: FeedbackPriority | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  // Set once the director edited the text: it is no longer PO's.
  editedAt: string | null;
  editorName: string | null;
  // Newest first; their count and the latest date are read from here.
  items: Feedback[];
  // Feedback that joined after the topic was sent (code).
  newSinceReview: number;
  // Its Notion page once published, and the feedback not on it yet (code).
  notionUrl: string | null;
  notionSynced: boolean;
  newSinceSync: number;
};

export type SendFeedbackInput = {
  kind: string;
  message: string;
  pagePath: string | null;
  screenshotPath: string | null;
};

export type SendFeedbackResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

/** PO's text as plain text: Markdown emphasis and code marks removed. */
export function plainText(text: string): string {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}
