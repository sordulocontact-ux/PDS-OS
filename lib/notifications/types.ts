// Notification types and text. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

export const NOTIFICATION_KINDS = [
  "project_transmitted",
  "project_accepted",
  "project_refused",
  "project_clarification_requested",
  "validation_requested",
  "validation_approved",
  "validation_rejected",
  "task_assigned",
  "project_creative_added",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function isNotificationKind(value: unknown): value is NotificationKind {
  return (
    typeof value === "string" &&
    (NOTIFICATION_KINDS as readonly string[]).includes(value)
  );
}

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  text: string;
  href: string;
  createdAt: string;
  read: boolean;
};

// The text is written here, from the kind and the linked objects: the
// database stores identifiers only.
export function notificationText(
  kind: NotificationKind,
  actorName: string | null,
  projectTitle: string | null,
): string {
  const t = fr.notifications;
  return t.texts[kind](actorName || t.someone, projectTitle || t.aProject);
}

export function notificationHref(projectId: string | null): string {
  return projectId ? routes.project(projectId) : routes.app;
}
