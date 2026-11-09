import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PersonalTask } from "@/lib/work/personal-tasks";
import { isTaskPage } from "@/lib/work/task-pages";

// The done ones kept on the page: enough to undo a tick, not an archive.
const DONE_SHOWN = 30;

/**
 * The signed-in person's « Mes tâches »: every one still to do, and the
 * latest done. Read with their session: the RLS gives their own only.
 */
export async function loadMyPersonalTasks(): Promise<{
  todo: PersonalTask[];
  done: PersonalTask[];
  error: boolean;
}> {
  const supabase = await createClient();
  const columns =
    "id, title, due_date, important, urgent, project_id, project_page, status, done_at, source_call:calls!personal_tasks_call_same_org(id, title), project:projects!personal_tasks_project_same_org(title)";
  const [todoRes, doneRes] = await Promise.all([
    supabase
      .from("personal_tasks")
      .select(columns)
      .eq("status", "todo")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase
      .from("personal_tasks")
      .select(columns)
      .eq("status", "done")
      .order("done_at", { ascending: false })
      .limit(DONE_SHOWN),
  ]);
  const failed = todoRes.error ?? doneRes.error;
  if (failed) console.error("loadMyPersonalTasks:", failed.message);
  const toTask = (row: NonNullable<typeof todoRes.data>[number]) => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    important: row.important,
    urgent: row.urgent,
    projectId: row.project_id,
    projectTitle: row.project?.title ?? null,
    page: isTaskPage(row.project_page) ? row.project_page : null,
    done: row.status === "done",
    doneAt: row.done_at,
    source: row.source_call
      ? { callId: row.source_call.id, callTitle: row.source_call.title }
      : null,
  });
  return {
    todo: (todoRes.data ?? []).map(toTask),
    done: (doneRes.data ?? []).map(toTask),
    error: Boolean(failed),
  };
}
