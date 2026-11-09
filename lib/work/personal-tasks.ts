// « Mes tâches » of the Travail: what a task is, its place in the Eisenhower
// matrix and in which order the list shows them. Client-safe (the page's
// list sorts again after a change).

import { daysBetween } from "@/lib/utils/calendar-period";
import type { TaskPage } from "@/lib/work/task-pages";

export type PersonalTask = {
  id: string;
  title: string;
  dueDate: string | null;
  important: boolean;
  urgent: boolean;
  projectId: string | null;
  // Its project's title, when the person still sees it.
  projectTitle: string | null;
  // The page of its project it opens (lib/work/task-pages.ts); null: the
  // project's overview.
  page: TaskPage | null;
  done: boolean;
  doneAt: string | null;
  // The meeting it was suggested by (lot 4), when the person can still see it.
  source: { callId: string; callTitle: string } | null;
};

/** The four boxes of the matrix (retour du 31/10/2026, « comme l'app
 * Matrix »): urgent and important, important only, urgent only, neither. */
export const QUADRANTS = ["do", "plan", "delegate", "later"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/** A due date this many days away or less makes a task urgent (decided
 * 08/11/2026). */
export const URGENT_WITHIN_DAYS = 3;

/** Urgent when the person said so, or when its due date is near or past:
 * a task moves to « Faire » by itself as its day comes. */
export function isUrgent(task: PersonalTask, today: string): boolean {
  return (
    task.urgent ||
    (task.dueDate !== null &&
      daysBetween(today, task.dueDate) <= URGENT_WITHIN_DAYS)
  );
}

export function quadrantOf(task: PersonalTask, today: string): Quadrant {
  const urgent = isUrgent(task, today);
  if (task.important) return urgent ? "do" : "plan";
  return urgent ? "delegate" : "later";
}

/** What a box says of its tasks, to move one into it. */
export const BOX_FLAGS: Record<
  Quadrant,
  { important: boolean; urgent: boolean }
> = {
  do: { important: true, urgent: true },
  plan: { important: true, urgent: false },
  delegate: { important: false, urgent: true },
  later: { important: false, urgent: false },
};

/** Its due date alone makes it urgent: it cannot go to a box that is not. */
export function urgentByDate(task: PersonalTask, today: string): boolean {
  return isUrgent({ ...task, urgent: false }, today);
}

/** The nearest due date first (so the overdue ones), undated last; the
 * oldest written first among equals is kept by the query's order. */
export function byDue(a: PersonalTask, b: PersonalTask): number {
  return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
}

/** Done ones, the latest done first. */
export function byDoneAt(a: PersonalTask, b: PersonalTask): number {
  return (b.doneAt ?? "").localeCompare(a.doneAt ?? "");
}

/** What the home shows of « Mes tâches » (lot 5): the urgent ones (late, due
 * within three days, or said urgent), the nearest first. */
export function homeTasksOf(
  tasks: PersonalTask[],
  today: string,
): PersonalTask[] {
  return tasks
    .filter((task) => !task.done && isUrgent(task, today))
    .sort(byDue);
}
