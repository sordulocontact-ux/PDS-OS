import { routes } from "@/lib/auth/redirects";
import type { ProjectPlan } from "@/lib/project-plan/queries";

export type TimelineKind =
  "milestone" | "deliverable" | "task" | "release" | "project_due";

export type TimelineItem = {
  key: string;
  date: string;
  kind: TimelineKind;
  title: string;
  // Milestone type key (strategy calendar kinds), for its badge.
  milestoneKind?: string;
  done?: boolean;
  href: string;
};

export type TimelineMonth = { month: string; items: TimelineItem[] };

// Same day: the release and the project's due date first, then the rest.
const kindOrder: Record<TimelineKind, number> = {
  release: 0,
  project_due: 1,
  milestone: 2,
  deliverable: 3,
  task: 4,
};

/** Every dated thing of the project, merged and grouped by month (code). */
export function buildTimeline(
  projectId: string,
  plan: ProjectPlan,
  releaseTitle: string,
  projectDueTitle: string,
): TimelineMonth[] {
  const strategy = routes.projectStrategy(projectId);
  const items: TimelineItem[] = [
    ...plan.milestones.map((m) => ({
      key: `m-${m.id}`,
      date: m.occursOn,
      kind: "milestone" as const,
      title: m.title,
      milestoneKind: m.kind,
      href: strategy,
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
  if (plan.projectDueDate)
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
