// What the Calendrier shows (docs/ARCHITECTURE.md § 8, « Calendrier »): the dates PDS OS
// already knows, each where it is decided. Client-safe.

/**
 * - release: the project's date (« Sortie », else « Échéance du projet »);
 * - master: the Brief Mix et Master's four dates;
 * - shoot: a deliverable's shoot (Production);
 * - milestone: a temps fort of the Stratégie's Calendrier de lancement;
 * - call: a call or an internal meeting;
 * - step: an open step of a journey with a due date (mine or someone's);
 * - task: one of the viewer's tasks tied to no workflow.
 */
export type CalendarItemKind =
  "release" | "master" | "shoot" | "milestone" | "call" | "step" | "task";

/** Same day: the release first, then what prepares it, then the actions. */
export const KIND_ORDER: Record<CalendarItemKind, number> = {
  release: 0,
  master: 1,
  shoot: 2,
  milestone: 3,
  call: 4,
  step: 5,
  task: 6,
};

export type CalendarItem = {
  key: string;
  kind: CalendarItemKind;
  // The Paris day, and its minute when it has an hour (a call, a shoot).
  day: string;
  minute: number | null;
  // What the date is, in the app's words (« Mix V1 attendu », a call's
  // title, « Valider le Mix V1 », « Nadia Benali : valider la pochette »).
  label: string;
  projectId: string | null;
  projectTitle: string | null;
  // Asks a gesture of the viewer (their action, their task, their call).
  mine: boolean;
  overdue: boolean;
  // Where the date is decided, or the gesture made.
  href: string;
};

/** A day's items in their reading order. */
export function sortItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.minute ?? -1) - (b.minute ?? -1) ||
      (a.projectTitle ?? "").localeCompare(b.projectTitle ?? "", "fr"),
  );
}
