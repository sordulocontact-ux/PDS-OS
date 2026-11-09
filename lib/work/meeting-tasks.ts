import "server-only";

import { matchByName } from "@/lib/assistant/fuzzy-name";
import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import { daysAgo } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";
import { suggestTaskPage } from "@/lib/work/task-pages";

// Meetings older than this are not dug up again.
const RECENT_DAYS = 30;

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * The next actions of the viewer's recent meetings, put straight into
 * « Mes tâches » (retour du 09/11/2026: « pas une bonne idée que PO nous
 * envoie les tâches possibles et qu'on doit les valider à la main »; before,
 * lot 4 of the retour du 31/10/2026, they waited as suggestions).
 *
 * Read: the next actions of the latest report of each meeting of the last 30
 * days the viewer sees, that fall to them: the member the report names,
 * spelling forgiven (as « Créer la tâche » of a call), else, when it names
 * nobody it knows, the call's owner (the project's owner, or who created the
 * internal meeting). Left out: what is already a project's task, and what
 * the viewer already has from it (same item, or the same words from the same
 * meeting, a report written again), done or deleted included: a deleted one
 * stays as a 'dismissed' row and never comes back.
 *
 * Run with the viewer's session before their tasks are read (the Travail,
 * the home): RLS gives only the calls they see and lets them write only
 * their own tasks. No date, not important: the matrix puts them in
 * « Plus tard » until the person sorts them. Each leads to the page of its
 * meeting's project its words name (lib/work/task-pages.ts). Returns whether
 * a read failed.
 */
export async function addMyMeetingTasks(access: Access): Promise<boolean> {
  const me = access.personId;
  const organizationId = access.organizationId;
  if (!me || !organizationId) return false;
  const supabase = await createClient();

  const { data: calls, error: callsError } = await supabase
    .from("calls")
    .select(
      "id, created_by, project_id, project:projects!calls_project_same_org(owner_person_id)",
    )
    .gte("occurred_at", daysAgo(RECENT_DAYS))
    .order("occurred_at", { ascending: false });
  if (callsError) console.error("addMyMeetingTasks:", callsError.message);
  if (!calls || calls.length === 0) return Boolean(callsError);
  const callIds = calls.map((call) => call.id);

  const [reportsRes, members, knownRes] = await Promise.all([
    supabase
      .from("call_reports")
      .select("id, call_id, created_at, report_items(id, kind, what, who)")
      .in("call_id", callIds)
      .order("created_at", { ascending: false }),
    loadMembers(access),
    supabase
      .from("personal_tasks")
      .select("source_call_id, source_report_item_id, title")
      .in("source_call_id", callIds),
  ]);
  const failed = reportsRes.error ?? knownRes.error;
  if (failed) console.error("addMyMeetingTasks:", failed.message);
  // Without what the viewer already has, nothing is written: it could double.
  if (knownRes.error) return true;

  // The latest report of each call (newest first in the read).
  const latest = new Map<string, NonNullable<typeof reportsRes.data>[number]>();
  for (const report of reportsRes.data ?? [])
    if (!latest.has(report.call_id)) latest.set(report.call_id, report);

  const actions = [...latest.values()].flatMap((report) =>
    report.report_items
      .filter((item) => item.kind === "next_action" && item.what.trim())
      .map((item) => ({ ...item, callId: report.call_id })),
  );
  if (actions.length === 0) return Boolean(callsError ?? failed);

  const { data: converted, error: tasksError } = await supabase
    .from("tasks")
    .select("source_report_item_id")
    .in(
      "source_report_item_id",
      actions.map((item) => item.id),
    );
  if (tasksError) {
    console.error("addMyMeetingTasks:", tasksError.message);
    return true;
  }

  const projectTask = new Set(
    (converted ?? []).map((task) => task.source_report_item_id),
  );
  const knownItems = new Set(
    (knownRes.data ?? []).map((row) => row.source_report_item_id),
  );
  const knownWords = new Set(
    (knownRes.data ?? []).map(
      (row) => `${row.source_call_id}:${fold(row.title)}`,
    ),
  );
  const callOf = new Map(calls.map((call) => [call.id, call]));

  const rows = actions.flatMap((item) => {
    const call = callOf.get(item.callId);
    if (!call) return [];
    if (projectTask.has(item.id) || knownItems.has(item.id)) return [];
    const words = `${item.callId}:${fold(item.what)}`;
    if (knownWords.has(words)) return [];
    const named = item.who
      ? matchByName(members, item.who, (member) => member.name)
      : null;
    const owner = call.project?.owner_person_id ?? call.created_by;
    if ((named?.personId ?? owner) !== me) return [];
    // The same words twice in one report: one task.
    knownWords.add(words);
    return [
      {
        organization_id: organizationId,
        title: item.what.trim().slice(0, 300),
        source_call_id: item.callId,
        source_report_item_id: item.id,
        // Its meeting's project, and the page its words name (« Valider le
        // budget du clip » opens the Budget), else the project's overview.
        project_id: call.project_id,
        project_page: call.project_id ? suggestTaskPage(item.what) : null,
      },
    ];
  });
  if (rows.length === 0) return Boolean(callsError ?? failed);

  const { error } = await supabase.from("personal_tasks").insert(rows);
  // Written meanwhile by another read (the home and the Travail at once):
  // one by one, each already there skipped.
  if (error?.code === "23505") {
    for (const row of rows) {
      const { error: one } = await supabase.from("personal_tasks").insert(row);
      if (one && one.code !== "23505")
        console.error("addMyMeetingTasks:", one.message);
    }
  } else if (error) {
    console.error("addMyMeetingTasks:", error.message);
    return true;
  }
  return Boolean(callsError ?? failed);
}
