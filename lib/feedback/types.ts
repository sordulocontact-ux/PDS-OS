// Feedback about the app itself. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_MESSAGE_MAX = 4000;

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return (
    typeof value === "string" &&
    (FEEDBACK_KINDS as readonly string[]).includes(value)
  );
}

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
  // The topic PO filed it in; null while it waits to be sorted.
  topicId: string | null;
  topicTitle: string | null;
};

/** Similar feedback gathered by PO, read by the director only. */
export type FeedbackTopic = {
  id: string;
  kind: FeedbackKind;
  // Written by PO.
  title: string;
  summary: string;
  // Newest first; their count and the latest date are read from here.
  items: Feedback[];
};

export type FeedbackState =
  | { status: "idle" }
  | {
      status: "error";
      error: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  // `sentAt` changes on every success: it remounts an empty form.
  | { status: "success"; sentAt: number };

export const idleFeedbackState: FeedbackState = { status: "idle" };
