import "server-only";

import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadMembers, type Member } from "@/lib/framing/related";
import { todayInParis } from "@/lib/insights/dates";
import {
  dueStatus,
  sortWork,
  type WorkItem,
} from "@/lib/project-work/workload";
import { legalTaskInfo } from "@/lib/legal/tasks";
import { taskHref } from "@/lib/project-work/task-href";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { progressLabel } from "@/lib/projects/progress";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { stageHref } from "@/lib/work/next-action";

export type WorkPersonRole = "owner" | "creative" | "member";
export type WorkPerson = {
  personId: string;
  name: string;
  role: WorkPersonRole;
};
export type OpenPoint = { id: string; question: string };

export type ProjectWork = {
  error: boolean;
  today: string;
  items: WorkItem[];
  // Owner first, then creative directors, then anyone else with work.
  people: WorkPerson[];
  openPoints: OpenPoint[];
  // Display name of every person involved, by person id.
  names: Record<string, string>;
  // Who a task can be given to (approved members).
  members: Member[];
  // What a task can be about (the project's committed deliverables).
  deliverables: { id: string; title: string }[];
};

/**
 * The work of a launched project, per person, read with the viewer's session
 * (RLS). Tasks, strategy deliverables and pending validations become items
 * whose status is decided by code; open points stay apart (no owner).
 */
export async function loadProjectWork(
  project: ProjectDetail,
  access: Access,
): Promise<ProjectWork> {
  const supabase = await createClient();
  const today = todayInParis();
  const projectId = project.id;

  const [tasks, deliverables, validations, points, creatives, members] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, project_id, title, assignee_person_id, due_date, status, done_at, legal_plan_item_id, master_question_id, deliverable_id, activation_id",
        )
        .eq("project_id", projectId),
      supabase
        .from("strategy_deliverables")
        .select("id, title, assignee_person_id, due_date")
        .eq("project_id", projectId),
      supabase
        .from("validations")
        .select(
          "id, requested_by, validator_person_id, project_stages!inner(project_id, stage_definitions!inner(key, label))",
        )
        .eq("project_stages.project_id", projectId)
        .eq("state", "pending"),
      supabase
        .from("open_points")
        .select("id, question")
        .eq("project_id", projectId)
        .eq("status", "open")
        .order("created_at"),
      listProjectCreatives(projectId),
      loadMembers(access),
    ]);

  const items: WorkItem[] = [];
  const base = { doneAt: null, otherPersonId: null };
  const legal = await legalTaskInfo(supabase, tasks.data ?? []);

  for (const t of tasks.data ?? []) {
    const fromPlan = legal.get(t.id);
    items.push({
      ...base,
      id: t.id,
      kind: "task",
      title: t.title,
      personId: t.assignee_person_id,
      status:
        t.status === "done"
          ? "done"
          : fromPlan?.waitingOn
            ? "waiting"
            : dueStatus(t.due_date, today),
      dueDate: t.due_date,
      doneAt: t.done_at,
      // A task leads where it is done.
      href: taskHref(t, fromPlan?.href, true),
      waitingOn: fromPlan?.waitingOn ?? null,
    });
  }

  const strategy = routes.projectStrategy(projectId);
  for (const d of deliverables.data ?? []) {
    if (d.assignee_person_id)
      items.push({
        ...base,
        id: d.id,
        kind: "deliverable",
        title: d.title,
        personId: d.assignee_person_id,
        status: dueStatus(d.due_date, today),
        dueDate: d.due_date,
        // Designed version after version in the Conception.
        href: routes.projectDesignDeliverable(projectId, d.id),
      });
    // Nobody on it yet: the owner has to staff it.
    else if (project.ownerPersonId)
      items.push({
        ...base,
        id: `staff-${d.id}`,
        kind: "staff",
        title: d.title,
        personId: project.ownerPersonId,
        status: "todo",
        dueDate: d.due_date,
        href: strategy,
      });
  }

  for (const v of validations.data ?? []) {
    const stage = v.project_stages.stage_definitions;
    const href = stageHref(projectId, stage.key);
    // In the words of the workflows (UX test of 09/10/2026).
    const title = progressLabel({ key: stage.key, state: "in_progress" });
    items.push({
      ...base,
      id: `validate-${v.id}`,
      kind: "validate",
      title,
      personId: v.validator_person_id,
      status: "todo",
      dueDate: null,
      otherPersonId: v.requested_by,
      href,
    });
    items.push({
      ...base,
      id: `await-${v.id}`,
      kind: "awaitValidation",
      title,
      personId: v.requested_by,
      status: "waiting",
      dueDate: null,
      otherPersonId: v.validator_person_id,
      href,
    });
  }

  const names = new Map(members.map((m) => [m.personId, m.name]));
  for (const c of creatives) if (c.name) names.set(c.personId, c.name);
  if (project.ownerPersonId && project.ownerName)
    names.set(project.ownerPersonId, project.ownerName);

  const people: WorkPerson[] = [];
  const seen = new Set<string>();
  const add = (personId: string, role: WorkPersonRole) => {
    if (seen.has(personId)) return;
    seen.add(personId);
    people.push({ personId, name: names.get(personId) ?? "", role });
  };
  if (project.ownerPersonId) add(project.ownerPersonId, "owner");
  for (const c of creatives) add(c.personId, "creative");
  for (const item of items) add(item.personId, "member");

  return {
    error: Boolean(
      tasks.error || deliverables.error || validations.error || points.error,
    ),
    today,
    items: sortWork(items),
    people,
    openPoints: points.data ?? [],
    names: Object.fromEntries(names),
    members,
    deliverables: (deliverables.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
    })),
  };
}
