import "server-only";

import {
  isNotificationKind,
  notificationHref,
  notificationText,
  type NotificationItem,
} from "@/lib/notifications/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// RLS returns the caller's own notifications only.

const SELECT =
  "id, kind, project_id, read_at, created_at, project:projects!notifications_project_same_org(title), actor:people!notifications_actor_person_id_fkey(first_name, last_name)";

type Row = {
  id: string;
  kind: string;
  project_id: string | null;
  read_at: string | null;
  created_at: string;
  project: { title: string } | null;
  actor: { first_name: string; last_name: string | null } | null;
};

function toItem(row: Row): NotificationItem | null {
  if (!isNotificationKind(row.kind)) return null;
  const actor = row.actor
    ? personName(row.actor.first_name, row.actor.last_name)
    : null;
  return {
    id: row.id,
    kind: row.kind,
    text: notificationText(row.kind, actor, row.project?.title ?? null),
    href: notificationHref(row.kind, row.project_id),
    createdAt: row.created_at,
    read: row.read_at !== null,
  };
}

export async function loadNotifications(limit = 20): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const supabase = await createClient();
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  if (list.error || unread.error) {
    console.error(
      "loadNotifications:",
      list.error?.message ?? unread.error?.message,
    );
    return { items: [], unreadCount: 0 };
  }
  return {
    items: (list.data ?? []).flatMap((row) => toItem(row as Row) ?? []),
    unreadCount: unread.count ?? 0,
  };
}

export async function loadNotification(
  id: string,
): Promise<NotificationItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toItem(data as Row);
}
