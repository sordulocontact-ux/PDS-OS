import { routes } from "@/lib/auth/redirects";
import type { MyJourneyWork } from "@/lib/work/journeys";
import type { MyWork } from "@/lib/work/queries";

/** The tabs of the global Travail, « Tout » first. */
export const WORK_VIEWS = ["all", "todo", "validate", "overdue"] as const;
export type WorkView = (typeof WORK_VIEWS)[number];

/**
 * What the row asks: a step to do or to decide (journeys), a task tied to no
 * workflow, a project to accept or to transmit again, one waiting for a
 * project manager, PO's proposals to review.
 */
export type WorkRowKind =
  | "do"
  | "validate"
  | "task"
  | "deliverable"
  | "accept"
  | "retransmit"
  | "awaiting"
  | "proposals";

/** One line of the global Travail's table, computed by code. */
export type WorkRow = {
  key: string;
  kind: WorkRowKind;
  href: string;
  // The action's wording, when the code already wrote it (a journey's step,
  // a task); else the page words it from `kind`.
  title: string | null;
  // « Marketing › Production › Pochette », an artist's name.
  place: string | null;
  projectTitle: string;
  due: string | null;
  overdue: boolean;
  // A project in the handover circuit: its status.
  projectStatus?: string;
  // PO's proposals waiting in the project.
  proposalCount?: number;
};

const viewsOf: Record<WorkRowKind, WorkView[]> = {
  do: ["todo"],
  validate: ["validate"],
  task: ["todo"],
  deliverable: ["todo"],
  accept: ["todo"],
  retransmit: ["todo"],
  // Someone else's move: listed, never counted as the viewer's.
  awaiting: [],
  proposals: ["validate"],
};

export const inView = (row: WorkRow, view: WorkView) =>
  view === "all" ||
  (view === "overdue" ? row.overdue : viewsOf[row.kind].includes(view));

// Overdue first, then the earliest due date, undated after, what waits for
// someone else last; then the project's title.
const rank = (row: WorkRow) =>
  `${row.kind === "awaiting" ? 1 : 0}${row.overdue ? 0 : 1}${row.due ?? "9999"}`;

/**
 * Every row of the global Travail in one list (docs/VISION-UX.md § 3, « Une
 * seule source »): the journeys' actions (lib/work/journeys.ts) and what
 * comes before or beside them (lib/work/queries.ts).
 */
export function workRowsOf(work: MyWork, journeys: MyJourneyWork): WorkRow[] {
  const rows: WorkRow[] = [
    ...journeys.projects.flatMap((project) =>
      project.mine.map((a): WorkRow => ({
        key: `step|${project.projectId}|${a.place}|${a.step.key}|${a.step.href}`,
        kind: a.step.actor?.kind === "validate" ? "validate" : "do",
        href: a.step.href,
        title: a.step.actor?.todo ?? a.step.title,
        place: `${a.place} › ${a.step.title}`,
        projectTitle: project.projectTitle,
        due: a.step.due ?? null,
        overdue: a.step.alert === "overdue",
      })),
    ),
    ...work.tasks.map((task): WorkRow => ({
      key: `task|${task.id}`,
      kind: task.kind,
      href: task.href,
      title: task.title,
      place: null,
      projectTitle: task.projectTitle,
      due: task.dueDate,
      overdue: task.overdue,
    })),
    ...(
      [
        ["accept", work.toAccept],
        ["retransmit", work.toRetransmit],
        ["awaiting", work.awaitingAcceptance],
      ] as const
    ).flatMap(([kind, projects]) =>
      projects.map((p): WorkRow => ({
        key: `${kind}|${p.id}`,
        kind,
        href: routes.project(p.id),
        title: null,
        place: p.artistName || null,
        projectTitle: p.title,
        due: null,
        overdue: false,
        projectStatus: p.status,
      })),
    ),
    ...work.proposals.map((p): WorkRow => ({
      key: `proposals|${p.projectId}`,
      kind: "proposals",
      href: p.href,
      title: null,
      place: null,
      projectTitle: p.projectTitle,
      due: null,
      overdue: false,
      proposalCount: p.count,
    })),
  ];
  return rows.sort(
    (a, b) =>
      rank(a).localeCompare(rank(b)) ||
      a.projectTitle.localeCompare(b.projectTitle, "fr"),
  );
}
