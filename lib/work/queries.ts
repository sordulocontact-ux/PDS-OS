import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { isOverdue } from "@/lib/insights/dates";
import { loadMyTodo, type Todo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import {
  isOwnerTurn,
  nextActionOf,
  type NextAction,
} from "@/lib/work/next-action";

export type WorkDeliverable = {
  id: string;
  title: string;
  dueDate: string | null;
  overdue: boolean;
  hasAssignee: boolean;
  projectId: string;
  projectTitle: string;
  href: string;
};

export type OwnedProject = { project: ProjectListItem; action: NextAction };

export type MyWork = {
  error: boolean;
  tasks: Todo["tasks"];
  toAccept: ProjectListItem[];
  // validate
  validations: Todo["validations"];
  // assign_projects
  toRetransmit: ProjectListItem[];
  awaitingAcceptance: ProjectListItem[];
  // pilot_projects: launched projects the viewer runs
  ownedProjects: OwnedProject[];
  deliverablesToStaff: WorkDeliverable[];
  proposals: Todo["proposals"];
  // creative_work
  myDeliverables: WorkDeliverable[];
  creativeProjects: ProjectListItem[];
};

type RawDeliverable = {
  id: string;
  title: string;
  due_date: string | null;
  assignee_person_id: string | null;
  project_id: string;
};

/**
 * The work page of the signed-in person: every list is computed by code and
 * read with the user's session (RLS). Which lists apply is decided by
 * permissions, never by the position name.
 */
export async function loadMyWork(access: Access): Promise<MyWork> {
  const supabase = await createClient();
  const me = access.personId ?? "";
  const pilots = can(access, "pilot_projects");
  const creative = can(access, "creative_work");

  const [todo, { projects, error }, creativesRes, myDeliverablesRes] =
    await Promise.all([
      loadMyTodo(access),
      listProjects(),
      creative
        ? supabase
            .from("project_creatives")
            .select("project_id")
            .eq("person_id", me)
        : Promise.resolve({ data: [] as { project_id: string }[] }),
      creative
        ? supabase
            .from("strategy_deliverables")
            .select("id, title, due_date, assignee_person_id, project_id")
            .eq("assignee_person_id", me)
        : Promise.resolve({ data: [] as RawDeliverable[] }),
    ]);

  const today = todo.today;
  const titles = new Map(projects.map((p) => [p.id, p.title]));
  // Staffed in the Strategy, designed (versions deposited) in the Conception.
  const toDeliverable = (
    d: RawDeliverable,
    href: (projectId: string) => string,
  ): WorkDeliverable => ({
    id: d.id,
    title: d.title,
    dueDate: d.due_date,
    overdue: d.due_date ? isOverdue(d.due_date, today) : false,
    hasAssignee: d.assignee_person_id !== null,
    projectId: d.project_id,
    projectTitle: titles.get(d.project_id) ?? "—",
    href: href(d.project_id),
  });
  // Overdue first, then by due date, undated last.
  const byDue = (a: WorkDeliverable, b: WorkDeliverable) =>
    Number(b.overdue) - Number(a.overdue) ||
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");

  const owned = pilots
    ? projects.filter((p) => p.status === "launched" && p.ownerPersonId === me)
    : [];
  const ownedIds = owned.map((p) => p.id);

  const [reportsRes, staffRes] = ownedIds.length
    ? await Promise.all([
        supabase
          .from("calls")
          .select("project_id")
          .in("project_id", ownedIds)
          .eq("status", "ready"),
        // Committed but not staffed yet: no one, or no due date.
        supabase
          .from("strategy_deliverables")
          .select("id, title, due_date, assignee_person_id, project_id")
          .in("project_id", ownedIds)
          .or("assignee_person_id.is.null,due_date.is.null"),
      ])
    : [{ data: [] }, { data: [] as RawDeliverable[] }];

  const withReport = new Set((reportsRes.data ?? []).map((c) => c.project_id));
  const ownedProjects = owned
    .map((project) => ({
      project,
      action: nextActionOf(
        project.id,
        project.currentStage,
        withReport.has(project.id),
      ),
    }))
    .sort(
      (a, b) => Number(isOwnerTurn(b.action)) - Number(isOwnerTurn(a.action)),
    );

  const creativeIds = new Set(
    (creativesRes.data ?? []).map((row) => row.project_id),
  );
  const ownedSet = new Set(ownedIds);
  const { toAccept, toRetransmit, awaitingAcceptance } = handoverOf(
    projects,
    access,
  );

  return {
    error,
    tasks: todo.tasks,
    toAccept,
    // A document's review is for whoever was named, with or without
    // « validate » (the project's creative directors).
    validations: can(access, "validate")
      ? todo.validations
      : todo.validations.filter((v) => v.source === "document"),
    toRetransmit,
    awaitingAcceptance,
    ownedProjects,
    deliverablesToStaff: (staffRes.data ?? [])
      .map((d) => toDeliverable(d, routes.projectStrategy))
      .sort(byDue),
    // Only the owner writes in a launched project, so only they review.
    proposals: todo.proposals.filter((p) => ownedSet.has(p.projectId)),
    myDeliverables: (myDeliverablesRes.data ?? [])
      .map((d) => toDeliverable(d, routes.projectDesign))
      .sort(byDue),
    creativeProjects: projects.filter(
      (p) => p.status === "launched" && creativeIds.has(p.id),
    ),
  };
}
