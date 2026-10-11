// What the project's overview shows besides the workflows' cards (ticket
// « Architecture globale », § 2): the next useful actions, the blockers with
// their cause, impact and source, the deadlines — all drawn from the
// workflows' states and sources (lib/workflow-status/load.ts), never a copy.
// Pure, unit-tested.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { TrackedItem } from "@/lib/legal/tracking/state";
import { legalActionHref } from "@/lib/legal/plan/where";
import { workflowStepHref } from "@/lib/ui/workflow-hrefs";
import type {
  Dependency,
  WorkflowKey,
  WorkflowState,
} from "@/lib/workflow-status/rules";

export type BoardAction = {
  key: string;
  workflow: WorkflowKey;
  title: string;
  detail: string | null;
  who: string | null;
  due: string | null;
  overdue: boolean;
  href: string;
};

export type BoardBlocker = {
  key: string;
  workflow: WorkflowKey;
  title: string;
  cause: string;
  impact: string;
  href: string;
};

export type BoardDeadline = {
  key: string;
  label: string;
  workflow: WorkflowKey | null;
  date: string;
  overdue: boolean;
  href: string;
};

export type BoardInput = {
  projectId: string;
  today: string;
  projectDueDate: string | null;
  // Its name: « Date de sortie visée » or « Échéance du projet ».
  projectDateLabel: string;
  workflows: WorkflowKey[];
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  dependencies: Dependency[];
  details: {
    masterDates: Record<string, string | null> | null;
    releaseDate: string | null;
    legalItems: TrackedItem[];
    // Rights constraints confirmed in the Cadrage: what the Plan du projet
    // calls « blocages juridiques », shown until the Juridique tracks them.
    rightsConstraints: Array<{ id: string; text: string }>;
  };
};

const CLOSED = new Set(["done", "obsolete"]);
const MASTER_ORDER = ["source", "brief", "mixing", "mastering", "final"];
// The last Master step during which each date of the Brief's calendar is
// still to meet: the Mix V1 until the mixing has a version (the loader
// drops the date then), the start of the mastering once it runs.
const DATE_STEP: Record<string, string> = {
  mixV1Due: "mixing",
  mixFinalDue: "mixing",
  masteringDue: "mixing",
  masterFinalDue: "mastering",
};

const stateOf = (input: BoardInput, workflow: WorkflowKey) => {
  const state = input.states[workflow];
  return state && state !== "restricted" ? state : null;
};

const itemTitle = (item: TrackedItem) =>
  item.subject ? `${item.label} · ${item.subject}` : item.label;

const legalHref = (projectId: string, item: TrackedItem) =>
  item.sourceHref ?? legalActionHref(projectId, item.kind);

/** The next useful actions: each workflow's own next step, and the
 * Juridique's free actions and decisions; late first, then by date. */
export function boardActions(input: BoardInput): BoardAction[] {
  const actions: BoardAction[] = [];
  const legalItems = input.details.legalItems;
  for (const workflow of input.workflows) {
    const state = stateOf(input, workflow);
    // A blocked workflow is listed in the blockers, with what it waits for.
    if (
      !state ||
      state.status === "done" ||
      state.status === "not_started" ||
      state.status === "blocked"
    )
      continue;
    // The launched plan's actions speak for the Juridique.
    if (workflow === "legal" && legalItems.length > 0) continue;
    const due =
      workflow === "master"
        ? state.step === "mixing"
          ? (input.details.masterDates?.mixFinalDue ?? null)
          : state.step === "mastering"
            ? (input.details.masterDates?.masterFinalDue ?? null)
            : null
        : workflow === "distribution" &&
            (state.step === "tracking" || state.step === "online")
          ? input.details.releaseDate
          : null;
    actions.push({
      key: `${workflow}:${state.step}`,
      workflow,
      title: state.reason,
      detail: state.progress,
      who: null,
      due,
      overdue: due !== null && due < input.today,
      href: workflowStepHref(input.projectId, workflow, state.step),
    });
  }
  for (const item of legalItems) {
    if (CLOSED.has(item.current)) continue;
    if (item.group !== "decision" && item.group !== "now") continue;
    actions.push({
      key: `legal:${item.id}`,
      workflow: "legal",
      title: itemTitle(item),
      detail: item.reason,
      who: item.responsibleName,
      due: item.dueOn,
      overdue: item.overdue,
      href: legalHref(input.projectId, item),
    });
  }
  return actions.sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999"),
  );
}

/** What blocks: each missing dependency of a blocked workflow (its source
 * named, so the panel opens where it is made), and every borrowing not
 * secured (the only release blocker the tickets name: ticket Juridique 08,
 * one line per borrowing rather than the dependency that sums them up). */
export function boardBlockers(input: BoardInput): BoardBlocker[] {
  const t = fr.workflowStatus.board.blockers;
  const blockers: BoardBlocker[] = [];
  for (const dep of input.dependencies) {
    if (dep.state === "ready" || dep.key === "clearances-online") continue;
    if (stateOf(input, dep.to)?.status !== "blocked") continue;
    blockers.push({
      key: `dep:${dep.key}`,
      workflow: dep.from,
      title: t.waitingFor(dep.toWhat, dep.what),
      cause: dep.note,
      impact: t.dependencyImpact(fr.shell.project.sidebar[dep.to], dep.toWhat),
      href: dep.href,
    });
  }
  const clearances = input.details.legalItems.filter(
    (item) => item.kind === "clearance",
  );
  // Before the Juridique tracks a borrowing, what the Cadrage confirmed is
  // shown (the Plan du projet counts it as « blocage juridique »): never
  // « Aucun blocage » right after it (UX test of 09/10/2026).
  if (clearances.length === 0)
    for (const c of input.details.rightsConstraints)
      blockers.push({
        key: `rights:${c.id}`,
        workflow: "legal",
        title: c.text,
        cause: t.rightsCause,
        impact: t.clearanceImpact,
        href: routes.projectLegal(input.projectId),
      });
  for (const item of clearances) {
    if (CLOSED.has(item.current)) continue;
    blockers.push({
      key: `legal:${item.id}`,
      workflow: "legal",
      title: itemTitle(item),
      cause: item.reason,
      impact: t.clearanceImpact,
      href: legalHref(input.projectId, item),
    });
  }
  return blockers;
}

/** The dated milestones still ahead, and those passed while their step is
 * not done (late); earliest first. */
export function boardDeadlines(input: BoardInput, limit = 6): BoardDeadline[] {
  const t = fr.workflowStatus.board.deadlines;
  const deadlines: BoardDeadline[] = [];
  const push = (d: Omit<BoardDeadline, "overdue">, open: boolean) => {
    const overdue = d.date < input.today;
    if (!overdue || open) deadlines.push({ ...d, overdue });
  };
  if (input.projectDueDate)
    push(
      {
        key: "project",
        label: input.projectDateLabel,
        workflow: null,
        date: input.projectDueDate,
        href: workflowStepHref(input.projectId, "distribution", "prepare"),
      },
      true,
    );
  const master = stateOf(input, "master");
  if (master && input.details.masterDates)
    for (const [key, date] of Object.entries(input.details.masterDates)) {
      if (!date || !DATE_STEP[key]) continue;
      const step = DATE_STEP[key];
      push(
        {
          key: `master:${key}`,
          label: t.dates[key] ?? key,
          workflow: "master",
          date,
          href: workflowStepHref(input.projectId, "master", step),
        },
        master.status !== "done" &&
          MASTER_ORDER.indexOf(master.step) <= MASTER_ORDER.indexOf(step),
      );
    }
  for (const item of input.details.legalItems)
    if (item.dueOn && !CLOSED.has(item.current))
      push(
        {
          key: `legal:${item.id}`,
          label: itemTitle(item),
          workflow: "legal",
          date: item.dueOn,
          href: legalHref(input.projectId, item),
        },
        true,
      );
  const distribution = stateOf(input, "distribution");
  if (input.details.releaseDate)
    push(
      {
        key: "release",
        label: t.release,
        workflow: input.workflows.includes("distribution")
          ? "distribution"
          : null,
        date: input.details.releaseDate,
        href: workflowStepHref(input.projectId, "distribution", "online"),
      },
      distribution?.status !== "done",
    );
  return deadlines.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
