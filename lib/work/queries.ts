import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { loadMyTodo, type Todo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";
import { fr } from "@/lib/i18n/fr";
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
  // Anyone (MKT-C2-08): what the person is responsible for in a Conception —
  // the release's direction, a Fiche Livrable — designated or delegated.
  myConception: WorkDeliverable[];
  // MKT-C2-11: the Conception's requests waiting for the person's decision.
  myDesignDecisions: WorkDeliverable[];
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

  const [
    todo,
    { projects, error },
    creativesRes,
    designRes,
    delegatedRes,
    validatorRes,
  ] = await Promise.all([
    loadMyTodo(access),
    listProjects(),
    creative
      ? supabase
          .from("project_creatives")
          .select("project_id")
          .eq("person_id", me)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
    supabase
      .from("design_assignments")
      .select(
        "project_id, scope, sheet_id, design_sheets(title, delivery_date)",
      )
      .eq("person_id", me)
      .is("ended_at", null),
    supabase
      .from("design_delegations")
      .select(
        "project_id, scope, sheet_id, role, ends_on, design_sheets(title, delivery_date)",
      )
      .eq("to_person_id", me)
      .is("revoked_at", null)
      .gte("ends_on", todayInParis()),
    supabase
      .from("design_validators")
      .select("project_id, scope, sheet_id")
      .eq("person_id", me),
  ]);
  // Where the person decides: named validator, or delegated.
  const decides = [
    ...(validatorRes.data ?? []),
    ...(delegatedRes.data ?? []).filter((d) => d.role === "validator"),
  ];
  const { data: requests } = decides.length
    ? await supabase
        .from("design_submissions")
        .select(
          "id, project_id, kind, sheet_id, number, due_on, submitted_by, design_sheets(title)",
        )
        .eq("status", "pending")
        .in("project_id", [...new Set(decides.map((d) => d.project_id))])
    : { data: [] };

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
    error: error || todo.error,
    tasks: todo.tasks,
    toAccept,
    validations: can(access, "validate") ? todo.validations : [],
    toRetransmit,
    awaitingAcceptance,
    ownedProjects,
    deliverablesToStaff: (staffRes.data ?? [])
      .map((d) => toDeliverable(d, routes.projectStrategy))
      .sort(byDue),
    // Only the owner writes in a launched project, so only they review.
    proposals: todo.proposals.filter((p) => ownedSet.has(p.projectId)),
    // The same list as the home's « Mes tâches » (still to design).
    myDeliverables: creative
      ? todo.deliverables.map((d) => ({
          id: d.id,
          title: d.title,
          dueDate: d.dueDate,
          overdue: d.overdue,
          hasAssignee: true,
          projectId: d.projectId,
          projectTitle: d.projectTitle,
          href: d.href,
        }))
      : [],
    creativeProjects: projects.filter(
      (p) => p.status === "launched" && creativeIds.has(p.id),
    ),
    myDesignDecisions: (requests ?? [])
      .filter(
        (r) =>
          r.submitted_by !== me &&
          decides.some(
            (d) =>
              d.project_id === r.project_id &&
              d.scope === r.kind &&
              d.sheet_id === r.sheet_id,
          ),
      )
      .map((r) => {
        const c = fr.conceptionRequests;
        return {
          id: r.id,
          title: c.decisionItem(
            r.kind === "sheet" && r.design_sheets
              ? c.sheetObject(r.design_sheets.title)
              : c.directionObject,
            r.number,
          ),
          dueDate: r.due_on,
          overdue: r.due_on ? isOverdue(r.due_on, today) : false,
          hasAssignee: true,
          projectId: r.project_id,
          projectTitle: titles.get(r.project_id) ?? "—",
          href: routes.projectDesignDecision(r.project_id, r.id),
        };
      })
      .sort(byDue),
    myConception: [
      ...(designRes.data ?? []).map((a) => ({ ...a, role: "responsible" })),
      ...(delegatedRes.data ?? []),
    ]
      .map((a) => {
        const sheetTitle = a.design_sheets?.title ?? null;
        const due = a.design_sheets?.delivery_date ?? null;
        const w = fr.work.conception;
        return {
          id: `${a.scope}-${a.sheet_id ?? a.project_id}-${a.role}`,
          title:
            a.role === "validator"
              ? w.decide(sheetTitle)
              : a.scope === "sheet" && sheetTitle
                ? w.sheet(sheetTitle)
                : w.direction,
          dueDate: due,
          overdue: due ? isOverdue(due, today) : false,
          hasAssignee: true,
          projectId: a.project_id,
          projectTitle: titles.get(a.project_id) ?? "—",
          href:
            a.scope === "sheet" && a.sheet_id
              ? routes.projectDesignSheet(a.project_id, a.sheet_id)
              : a.role === "validator"
                ? routes.projectDesignDirection(a.project_id)
                : routes.projectDesignWork(a.project_id, "direction"),
        };
      })
      .filter(
        (item, index, all) => all.findIndex((x) => x.id === item.id) === index,
      )
      .sort(byDue),
  };
}
