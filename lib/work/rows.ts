import { routes } from "@/lib/auth/redirects";
import { journey } from "@/lib/i18n/fr/journey";
import { work } from "@/lib/i18n/fr/work";
import {
  actionHref,
  nextOf,
  withModule,
  type JourneyStep,
} from "@/lib/ui/journey";
import { addDays, weekStartOf } from "@/lib/utils/calendar-period";
import type { MyJourneyWork } from "@/lib/work/journeys";
import type { MyWork } from "@/lib/work/queries";

const fr = { journey, work };

/** The tabs of the global Travail, « Tout » first. What is late is a group
 * of the list, not a tab: it is always seen first. */
export const WORK_VIEWS = ["all", "todo", "validate"] as const;
export type WorkView = (typeof WORK_VIEWS)[number];

/** The groups of the list, in order: by when, then what waits for others. */
export const WORK_GROUPS = [
  "overdue",
  "week",
  "later",
  "undated",
  "others",
] as const;
export type WorkGroup = (typeof WORK_GROUPS)[number];

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

/** One line of the global Travail, computed by code. */
export type WorkRow = {
  key: string;
  kind: WorkRowKind;
  group: WorkGroup;
  href: string;
  // The action's wording, when the code already wrote it (a journey's step,
  // a task); else the page words it from `kind`.
  title: string | null;
  // « Master › Mixage », an artist's name.
  place: string | null;
  projectTitle: string;
  due: string | null;
  overdue: boolean;
  // The five questions (docs/VISION-UX.md § 2), for the row in the lead:
  // why (the step's sentence, else the kind's), who validates, what follows.
  why: string;
  validator: string | null;
  then: string[];
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
  view === "all" || viewsOf[row.kind].includes(view);

/** The viewer's own move (not a project waiting for someone else). */
export const isMine = (row: WorkRow) => row.kind !== "awaiting";

/** Late, this week (to Sunday), later, undated; others' moves apart. */
function groupOf(
  row: Pick<WorkRow, "kind" | "due" | "overdue">,
  today: string,
): WorkGroup {
  if (row.kind === "awaiting") return "others";
  if (row.overdue) return "overdue";
  if (!row.due) return "undated";
  return row.due <= addDays(weekStartOf(today), 6) ? "week" : "later";
}

// Overdue first, then the earliest due date, undated after, what waits for
// someone else last; then the project's title.
const rank = (row: WorkRow) =>
  `${WORK_GROUPS.indexOf(row.group)}${row.due ?? "9999"}`;

/** Who validates the step, when it is not the viewer's own decision. */
function validatorOf(step: JourneyStep): string | null {
  if (step.actor?.kind === "validate") return null;
  const names =
    step.roles?.filter((r) => r.kind === "valid").map((r) => r.name) ?? [];
  return names.length > 0 ? names.join(", ") : (step.validator?.name ?? null);
}

/** What the step unlocks, « Mastering · Karim Haddou » (StepMeta's words). */
function thenOf(step: JourneyStep, steps: JourneyStep[]): string[] {
  return nextOf(step, steps).map((n) =>
    n.who ? fr.journey.nextBy(withModule(n), n.who) : withModule(n),
  );
}

type Draft = Omit<WorkRow, "group">;

/**
 * Every row of the global Travail in one list (docs/VISION-UX.md § 3, « Une
 * seule source »): the journeys' actions (lib/work/journeys.ts) and what
 * comes before or beside them (lib/work/queries.ts), grouped by when.
 */
export function workRowsOf(
  work: MyWork,
  journeys: MyJourneyWork,
  today: string,
): WorkRow[] {
  const why = fr.work.lead.why;
  const drafts: Draft[] = [
    ...journeys.projects.flatMap((project) =>
      project.mine.map((a): Draft => ({
        key: `step|${project.projectId}|${a.place}|${a.step.key}|${a.step.href}`,
        kind: a.step.actor?.kind === "validate" ? "validate" : "do",
        // The gesture's own section when the step shows it first.
        href: actionHref(a.step),
        title: a.step.actor?.todo ?? a.step.title,
        place: `${a.place} › ${a.step.title}`,
        projectTitle: project.projectTitle,
        due: a.step.due ?? null,
        overdue: a.step.alert === "overdue",
        why: a.step.why,
        validator: validatorOf(a.step),
        then: thenOf(a.step, project.stepsByPlace[a.place] ?? []),
      })),
    ),
    ...work.tasks.map((task): Draft => ({
      key: `task|${task.id}`,
      kind: task.kind,
      href: task.href,
      title: task.title,
      place: null,
      projectTitle: task.projectTitle,
      due: task.dueDate,
      overdue: task.overdue,
      why: why[task.kind],
      validator: null,
      then: [],
    })),
    ...(
      [
        ["accept", work.toAccept],
        ["retransmit", work.toRetransmit],
        ["awaiting", work.awaitingAcceptance],
      ] as const
    ).flatMap(([kind, projects]) =>
      projects.map((p): Draft => ({
        key: `${kind}|${p.id}`,
        kind,
        href: routes.project(p.id),
        title: null,
        place: p.artistName || null,
        projectTitle: p.title,
        due: null,
        overdue: false,
        why: why[kind],
        validator: null,
        then: [],
        projectStatus: p.status,
      })),
    ),
    ...work.proposals.map((p): Draft => ({
      key: `proposals|${p.projectId}`,
      kind: "proposals",
      href: p.href,
      title: null,
      place: null,
      projectTitle: p.projectTitle,
      due: null,
      overdue: false,
      why: why.proposals,
      validator: null,
      then: [],
      proposalCount: p.count,
    })),
  ];
  return drafts
    .map((row): WorkRow => ({ ...row, group: groupOf(row, today) }))
    .sort(
      (a, b) =>
        rank(a).localeCompare(rank(b)) ||
        a.projectTitle.localeCompare(b.projectTitle, "fr"),
    );
}
