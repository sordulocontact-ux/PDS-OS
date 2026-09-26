// Work of a project, per person. Pure code, client-safe: every status and
// count is computed here, never by PO (CLAUDE.md, rule 6).

export const WORK_STATUSES = ["overdue", "todo", "waiting", "done"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export type WorkKind =
  | "task"
  | "deliverable"
  // A deliverable with no one on it: the owner staffs it.
  | "staff"
  // A stage waiting for this person's decision.
  | "validate"
  // A stage this person submitted, waiting for someone else.
  | "awaitValidation";

export type WorkItem = {
  id: string;
  kind: WorkKind;
  title: string;
  personId: string;
  status: WorkStatus;
  dueDate: string | null;
  // Tasks only: the day it was ticked.
  doneAt: string | null;
  // Validations: the other person of the circuit (validator).
  otherPersonId: string | null;
  href: string;
};

export type WorkCounts = Record<WorkStatus, number>;

const order: Record<WorkStatus, number> = {
  overdue: 0,
  todo: 1,
  waiting: 2,
  done: 3,
};

/** Late first, then to do, then waiting, then done; by due date inside. */
export function sortWork(items: WorkItem[]): WorkItem[] {
  return [...items].sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.title.localeCompare(b.title, "fr"),
  );
}

export function countWork(items: WorkItem[]): WorkCounts {
  const counts: WorkCounts = { overdue: 0, todo: 0, waiting: 0, done: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/** Counts of each person, the same numbers on the Travail and Équipe pages. */
export function countByPerson(items: WorkItem[]): Map<string, WorkCounts> {
  const byPerson = new Map<string, WorkItem[]>();
  for (const item of items)
    byPerson.set(item.personId, [...(byPerson.get(item.personId) ?? []), item]);
  return new Map([...byPerson].map(([id, list]) => [id, countWork(list)]));
}

/** A dated item is late once its day has passed (Paris calendar). */
export function dueStatus(
  dueDate: string | null,
  today: string,
): "overdue" | "todo" {
  return dueDate && dueDate < today ? "overdue" : "todo";
}
