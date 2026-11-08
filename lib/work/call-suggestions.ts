import "server-only";

import { matchByName } from "@/lib/assistant/fuzzy-name";
import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import { daysAgo } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";

/** A next action of a recent meeting, for the person it falls to. */
export type CallSuggestion = {
  itemId: string;
  callId: string;
  callTitle: string;
  occurredAt: string;
  what: string;
  // As the report wrote it (« Lina », « l'équipe »), when it named someone.
  who: string | null;
  quote: string | null;
};

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
 * « Suggérées par vos réunions » of « Mes tâches » (lot 4 of the retour du
 * 31/10/2026): the next actions of the latest report of each meeting of the
 * last 30 days the viewer sees, that fall to them: the member the report
 * names, spelling forgiven (as « Créer la tâche » of a call), else, when it
 * names nobody it knows, the call's owner (the project's owner, or who
 * created the internal meeting). Left out: what is already a project's task,
 * and what the viewer already added or set aside (same item, or the same
 * words from the same meeting, a report written again). Read with the
 * viewer's session: RLS gives only the calls they see.
 */
export async function loadMyCallSuggestions(access: Access): Promise<{
  suggestions: CallSuggestion[];
  error: boolean;
}> {
  const me = access.personId;
  if (!me) return { suggestions: [], error: false };
  const supabase = await createClient();

  const { data: calls, error: callsError } = await supabase
    .from("calls")
    .select(
      "id, title, occurred_at, created_by, project:projects!calls_project_same_org(owner_person_id)",
    )
    .gte("occurred_at", daysAgo(RECENT_DAYS))
    .order("occurred_at", { ascending: false });
  if (callsError) console.error("loadMyCallSuggestions:", callsError.message);
  if (!calls || calls.length === 0)
    return { suggestions: [], error: Boolean(callsError) };
  const callIds = calls.map((call) => call.id);

  const [reportsRes, members, answeredRes] = await Promise.all([
    supabase
      .from("call_reports")
      .select(
        "id, call_id, created_at, report_items(id, kind, what, who, quote)",
      )
      .in("call_id", callIds)
      .order("created_at", { ascending: false }),
    loadMembers(access),
    supabase
      .from("personal_tasks")
      .select("source_call_id, source_report_item_id, title")
      .in("source_call_id", callIds),
  ]);
  const failed = reportsRes.error ?? answeredRes.error;
  if (failed) console.error("loadMyCallSuggestions:", failed.message);

  // The latest report of each call (newest first in the read).
  const latest = new Map<string, NonNullable<typeof reportsRes.data>[number]>();
  for (const report of reportsRes.data ?? [])
    if (!latest.has(report.call_id)) latest.set(report.call_id, report);

  const actions = [...latest.values()].flatMap((report) =>
    report.report_items
      .filter((item) => item.kind === "next_action")
      .map((item) => ({ ...item, callId: report.call_id })),
  );
  if (actions.length === 0)
    return { suggestions: [], error: Boolean(callsError ?? failed) };

  const { data: converted, error: tasksError } = await supabase
    .from("tasks")
    .select("source_report_item_id")
    .in(
      "source_report_item_id",
      actions.map((item) => item.id),
    );
  if (tasksError) console.error("loadMyCallSuggestions:", tasksError.message);

  const projectTask = new Set(
    (converted ?? []).map((task) => task.source_report_item_id),
  );
  const answeredItems = new Set(
    (answeredRes.data ?? []).map((row) => row.source_report_item_id),
  );
  const answeredWords = new Set(
    (answeredRes.data ?? []).map(
      (row) => `${row.source_call_id}:${fold(row.title)}`,
    ),
  );
  const callOf = new Map(calls.map((call) => [call.id, call]));

  const suggestions = actions.flatMap((item) => {
    const call = callOf.get(item.callId);
    if (!call) return [];
    if (projectTask.has(item.id) || answeredItems.has(item.id)) return [];
    if (answeredWords.has(`${item.callId}:${fold(item.what)}`)) return [];
    const named = item.who
      ? matchByName(members, item.who, (member) => member.name)
      : null;
    const owner = call.project?.owner_person_id ?? call.created_by;
    if ((named?.personId ?? owner) !== me) return [];
    return [
      {
        itemId: item.id,
        callId: call.id,
        callTitle: call.title,
        occurredAt: call.occurred_at,
        what: item.what,
        who: item.who,
        quote: item.quote,
      },
    ];
  });

  return {
    suggestions,
    error: Boolean(callsError ?? failed ?? tasksError),
  };
}
