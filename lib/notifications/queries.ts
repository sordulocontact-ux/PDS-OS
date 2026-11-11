import "server-only";

import { REQUEST_KINDS } from "@/lib/notifications/families";
import {
  isNotificationKind,
  notificationHref,
  notificationText,
  type NotificationItem,
  type StageKey,
} from "@/lib/notifications/types";
import { personName } from "@/lib/projects/types";
import { stepHref } from "@/lib/step-tools/href";
import { STEP_MODULES, type StepModule } from "@/lib/step-tools/model";
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

// A step's blocker or note: the step itself, resolved from its row (RLS:
// whoever sees the project); the project when it is gone.
async function loadStepTargets(
  supabase: SupabaseClient<Database>,
  rows: Row[],
): Promise<Map<string, string>> {
  const of = (prefix: string) =>
    rows
      .filter((r) => r.kind.startsWith(prefix) && r.subject_id)
      .map((r) => r.subject_id!);
  const blockerIds = of("step_blocker_");
  const noteIds = of("step_note_");
  if (blockerIds.length === 0 && noteIds.length === 0) return new Map();
  const cols = "id, project_id, module, step_key, subject_id";
  const [blockers, notes] = await Promise.all([
    blockerIds.length
      ? supabase.from("step_blockers").select(cols).in("id", blockerIds)
      : Promise.resolve({ data: [] }),
    noteIds.length
      ? supabase.from("step_notes").select(cols).in("id", noteIds)
      : Promise.resolve({ data: [] }),
  ]);
  const map = new Map<string, string>();
  for (const r of [...(blockers.data ?? []), ...(notes.data ?? [])])
    if ((STEP_MODULES as readonly string[]).includes(r.module))
      map.set(
        r.id,
        stepHref(r.project_id, {
          module: r.module as StepModule,
          stepKey: r.step_key,
          subjectId: r.subject_id,
        }),
      );
  return map;
}

// The names of the selections of artists handed over (lot 4 of
// docs/pds-mic-plan.md), read with the reader's session.
async function loadSelectionNames(
  supabase: SupabaseClient<Database>,
  rows: Row[],
): Promise<Map<string, string>> {
  const ids = rows
    .filter((r) => r.kind === "selection_transmitted" && r.subject_id)
    .map((r) => r.subject_id!);
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("artist_selections")
    .select("id, name")
    .in("id", ids);
  return new Map((data ?? []).map((r) => [r.id, r.name]));
}

function toItem(
  row: Row,
  stageKey: StageKey | null,
  target?: string,
  // What a notification without a project names (a selection of artists).
  subjectName?: string,
): NotificationItem | null {
  if (!isNotificationKind(row.kind)) return null;
  const actor = row.actor
    ? personName(row.actor.first_name, row.actor.last_name)
    : null;
  const project = row.project?.title ?? subjectName ?? null;
  const text = notificationText(row.kind, actor, project);
  const named = actor !== null && text.startsWith(`${actor} `);
  return {
    id: row.id,
    kind: row.kind,
    text,
    headline: named ? actor : project,
    action: named ? text.slice(actor.length + 1) : text,
    actor,
    href:
      target ??
      notificationHref(row.kind, row.project_id, stageKey, row.subject_id),
    createdAt: row.created_at,
    read: row.read_at !== null,
  };
}

// The latest notifications, and the latest requests read on their own so
// the « Demandes » tab is whole even under many others; the unread counts
// come from the database, not from what is loaded.
export async function loadNotifications(limit = 20): Promise<{
  items: NotificationItem[];
  unreadCount: number;
  requestCount: number;
}> {
  const supabase = await createClient();
  const latest = () =>
    supabase
      .from("notifications")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);
  const unreadOf = () =>
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
  const [list, requests, unread, unreadRequests] = await Promise.all([
    latest(),
    latest().in("kind", [...REQUEST_KINDS]),
    unreadOf(),
    unreadOf().in("kind", [...REQUEST_KINDS]),
  ]);
  const failed = [list, requests, unread, unreadRequests].find(
    (result) => result.error,
  );
  if (failed) {
    console.error("loadNotifications:", failed.error?.message);
    return { items: [], unreadCount: 0, requestCount: 0 };
  }
  const seen = new Set<string>();
  const rows = ([...(list.data ?? []), ...(requests.data ?? [])] as Row[])
    .filter((row) => !seen.has(row.id) && seen.add(row.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const validationIds = rows
    .filter((r) => r.kind.startsWith("validation_") && r.subject_id)
    .map((r) => r.subject_id!);
  const [stageKeys, targets, selections] = await Promise.all([
    loadStageKeys(supabase, validationIds),
    loadStepTargets(supabase, rows),
    loadSelectionNames(supabase, rows),
  ]);
  return {
    items: rows.flatMap(
      (row) =>
        toItem(
          row,
          row.subject_id ? (stageKeys.get(row.subject_id) ?? null) : null,
          row.subject_id ? targets.get(row.subject_id) : undefined,
          row.subject_id ? selections.get(row.subject_id) : undefined,
        ) ?? [],
    ),
    unreadCount: unread.count ?? 0,
    requestCount: unreadRequests.count ?? 0,
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
  const [stageKeys, targets, selections] = row.subject_id
    ? await Promise.all([
        loadStageKeys(supabase, [row.subject_id]),
        loadStepTargets(supabase, [row]),
        loadSelectionNames(supabase, [row]),
      ])
    : [
        new Map<string, StageKey>(),
        new Map<string, string>(),
        new Map<string, string>(),
      ];
  return toItem(
    row,
    row.subject_id ? (stageKeys.get(row.subject_id) ?? null) : null,
    row.subject_id ? targets.get(row.subject_id) : undefined,
    row.subject_id ? selections.get(row.subject_id) : undefined,
  );
}
