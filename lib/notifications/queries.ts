import "server-only";

import {
  isNotificationKind,
  notificationHref,
  notificationText,
  type NotificationItem,
  type StageKey,
} from "@/lib/notifications/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// RLS returns the caller's own notifications only.

const SELECT =
  "id, kind, project_id, subject_id, read_at, created_at, project:projects!notifications_project_same_org(title), actor:people!notifications_actor_person_id_fkey(first_name, last_name)";

type Row = {
  id: string;
  kind: string;
  project_id: string | null;
  subject_id: string | null;
  read_at: string | null;
  created_at: string;
  project: { title: string } | null;
  actor: { first_name: string; last_name: string | null } | null;
};

// A validation's subject_id points at validations.id: resolved separately
// since the column has no single foreign key (its target depends on kind).
async function loadStageKeys(
  supabase: SupabaseClient<Database>,
  validationIds: string[],
): Promise<Map<string, StageKey>> {
  if (validationIds.length === 0) return new Map();
  const { data } = await supabase
    .from("validations")
    .select("id, project_stages!inner(stage_definitions!inner(key))")
    .in("id", validationIds);
  const map = new Map<string, StageKey>();
  for (const row of data ?? []) {
    const key = row.project_stages.stage_definitions.key;
    if (key === "framing" || key === "launch_strategy" || key === "design")
      map.set(row.id, key);
  }
  return map;
}

function toItem(row: Row, stageKey: StageKey | null): NotificationItem | null {
  if (!isNotificationKind(row.kind)) return null;
  const actor = row.actor
    ? personName(row.actor.first_name, row.actor.last_name)
    : null;
  return {
    id: row.id,
    kind: row.kind,
    text: notificationText(row.kind, actor, row.project?.title ?? null),
    href: notificationHref(row.kind, row.project_id, stageKey),
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
  const rows = (list.data ?? []) as Row[];
  const validationIds = rows
    .filter((r) => r.kind.startsWith("validation_") && r.subject_id)
    .map((r) => r.subject_id!);
  const stageKeys = await loadStageKeys(supabase, validationIds);
  return {
    items: rows.flatMap(
      (row) =>
        toItem(
          row,
          row.subject_id ? (stageKeys.get(row.subject_id) ?? null) : null,
        ) ?? [],
    ),
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
  const row = data as Row;
  const stageKeys = row.subject_id
    ? await loadStageKeys(supabase, [row.subject_id])
    : new Map<string, StageKey>();
  return toItem(
    row,
    row.subject_id ? (stageKeys.get(row.subject_id) ?? null) : null,
  );
}
