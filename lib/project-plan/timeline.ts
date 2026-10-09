import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProjectPlan } from "@/lib/project-plan/queries";

export type TimelineKind =
  | "milestone"
  | "call"
  | "deliverable"
  | "upstream"
  | "task"
  | "release"
  | "project_due";

export type TimelineItem = {
  key: string;
  date: string;
  kind: TimelineKind;
  title: string;
  // Milestone type key (strategy calendar kinds), for its badge.
  milestoneKind?: string;
  done?: boolean;
  // An upstream deadline already passed with no approved version.
  late?: boolean;
  // A call's timestamp, for its time of day.
  occurredAt?: string;
  href: string;
};

export type TimelineMonth = { month: string; items: TimelineItem[] };

// Same day: the release and the project's due date first, then the rest.
const kindOrder: Record<TimelineKind, number> = {
  release: 0,
  project_due: 1,
  milestone: 2,
  call: 3,
  deliverable: 4,
  upstream: 5,
  task: 6,
};

/** Every dated thing of the project, merged and grouped by month (code). */
export function buildTimeline(
  projectId: string,
  plan: ProjectPlan,
  releaseTitle: string,
  projectDueTitle: string,
): TimelineMonth[] {
  const strategy = routes.projectStrategyDimension(projectId, "calendar");
  const items: TimelineItem[] = [
    ...plan.milestones.map((m) => ({
      key: `m-${m.id}`,
      date: m.occursOn,
      kind: "milestone" as const,
      title: m.title,
      milestoneKind: m.kind,
      href: strategy,
    })),
    ...plan.calls.map((c) => ({
      key: `c-${c.id}`,
      date: c.date,
      kind: "call" as const,
      title: c.title,
      occurredAt: c.occurredAt,
      href: routes.projectCall(projectId, c.id),
    })),
    ...plan.deliverables.flatMap((d) =>
      d.dueDate
        ? [
            {
              key: `d-${d.id}`,
              date: d.dueDate,
              kind: "deliverable" as const,
              title: d.title,
              href: routes.projectDeliverables(projectId),
            },
          ]
        : [],
    ),
    // Conception, production, validation before a deliverable goes out.
    ...plan.upstream.flatMap((chain) =>
      chain.steps
        .filter((step) => step.step !== "publication")
        .map((step) => ({
          key: `u-${chain.deliverableId}-${step.step}`,
          date: step.date,
          kind: "upstream" as const,
          title: `${fr.strategyFlow.calendar.steps[step.step]} · ${chain.title}`,
          late: step.late,
          href: routes.projectDeliverables(projectId),
        })),
    ),
    ...plan.tasks.map((t) => ({
      key: `t-${t.id}`,
      date: t.dueDate,
      kind: "task" as const,
      title: t.title,
      done: t.done,
      href: routes.projectWork(projectId),
    })),
  ];
  if (plan.plannedReleaseDate)
    items.push({
      key: "release",
      date: plan.plannedReleaseDate,
      kind: "release",
      title: releaseTitle,
      href: routes.projectRelease(projectId),
    });
  // One date, one truth: once the Release tab has its planned date, it
  // stands for the project's due date too (as for the strategy countdown).
  if (plan.projectDueDate && !plan.plannedReleaseDate)
    items.push({
      key: "project-due",
      date: plan.projectDueDate,
      kind: "project_due",
      title: projectDueTitle,
      href: routes.project(projectId),
    });

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || kindOrder[a.kind] - kindOrder[b.kind],
  );

  const months: TimelineMonth[] = [];
  for (const item of items) {
    const month = item.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.items.push(item);
    else months.push({ month, items: [item] });
  }
  return months;
}
