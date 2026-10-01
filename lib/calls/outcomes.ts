import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoredReport } from "@/lib/calls/queries";
import { personName } from "@/lib/projects/types";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type CallDecision = {
  id: string;
  what: string;
  who: string | null;
  why: string | null;
};

export type CallAction = {
  id: string;
  what: string;
  who: string | null;
  // The task it became, when it did (and the viewer can read it).
  task: {
    assigneeName: string;
    dueDate: string;
    done: boolean;
    projectTitle: string;
  } | null;
};

export type CallOutcomes = {
  decisions: CallDecision[];
  actions: CallAction[];
};

/**
 * Decisions and next actions of a call's latest report, each action with the
 * task created from it. Read with the viewer's session: a task in a project
 * they do not see reads as not converted.
 */
export async function loadCallOutcomes(
  supabase: Client,
  report: StoredReport,
): Promise<CallOutcomes> {
  const byPosition = [...report.items].sort((a, b) => a.position - b.position);
  const decisions = byPosition
    .filter((item) => item.kind === "decided")
    .map((item) => ({
      id: item.id,
      what: item.what,
      who: item.who,
      why: item.why,
    }));
  const actionItems = byPosition.filter((item) => item.kind === "next_action");
  if (actionItems.length === 0) return { decisions, actions: [] };

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "source_report_item_id, due_date, status, assignee:people!tasks_assignee_person_id_fkey(first_name, last_name), project:projects!tasks_project_same_org(title)",
    )
    .in(
      "source_report_item_id",
      actionItems.map((item) => item.id),
    );
  if (error) console.error("loadCallOutcomes:", error.message);
  const taskOf = new Map(
    (tasks ?? []).map((task) => [task.source_report_item_id, task]),
  );

  return {
    decisions,
    actions: actionItems.map((item) => {
      const task = taskOf.get(item.id);
      return {
        id: item.id,
        what: item.what,
        who: item.who,
        task: task
          ? {
              assigneeName: task.assignee
                ? personName(task.assignee.first_name, task.assignee.last_name)
                : "",
              dueDate: task.due_date,
              done: task.status === "done",
              projectTitle: task.project?.title ?? "",
            }
          : null,
      };
    }),
  };
}

/**
 * Projects a task from an internal meeting can go to: the launched projects
 * the viewer owns (only a project's owner creates its tasks, tasks RLS).
 */
export async function listOwnedProjects(
  supabase: Client,
  personId: string | null,
): Promise<{ id: string; title: string }[]> {
  if (!personId) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, project_stages!inner(id)")
    .eq("owner_person_id", personId)
    .is("archived_at", null)
    .order("title");
  if (error) console.error("listOwnedProjects:", error.message);
  // One row per project, whatever its number of stages.
  const seen = new Map<string, string>();
  for (const row of data ?? []) seen.set(row.id, row.title);
  return [...seen].map(([id, title]) => ({ id, title }));
}
