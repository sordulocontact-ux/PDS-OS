// The due date proposed for each action of the legal plan (UX test of
// 09/10/2026: every action was due on the release day). Pure code: a date
// is a fact computed here, never by PO; the person changes it in the plan.
//
// Decided 10/10/2026, no ticket says it (docs/ARCHITECTURE.md § 8 sexies):
// the fiches first (a week), then backwards from the release: borrowings
// 45 days before (the longest to secure), contracts and splits 30 days,
// the SACEM bulletin 15 days. Never sooner than three days from today.
// Never due before what it waits for either (Sacha, 11/10/2026: contracts due
// on the 13th, the fiches they wait for on the 17th): a week after the
// latest of its dependencies, even past the release date.

import type { PlanItemKind } from "@/lib/legal/plan/proposal";

const DAY_MS = 86_400_000;
const MIN_DAYS_AHEAD = 3;
const FICHES_DAYS = 7;
const AFTER_DEPENDENCY_DAYS = 7;
const BEFORE_RELEASE: Record<Exclude<PlanItemKind, "onboarding">, number> = {
  clearance: 45,
  contract: 30,
  splits: 30,
  formality: 15,
};

const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/**
 * "YYYY-MM-DD", or null when it depends on a release date the project does
 * not have yet. `today` and `releaseDate` are "YYYY-MM-DD" (Paris).
 */
export function defaultDueOn(
  kind: PlanItemKind,
  releaseDate: string | null,
  today: string,
): string | null {
  const floor = addDays(today, MIN_DAYS_AHEAD);
  const wanted =
    kind === "onboarding"
      ? addDays(today, FICHES_DAYS)
      : releaseDate
        ? addDays(releaseDate, -BEFORE_RELEASE[kind])
        : null;
  if (!wanted) return null;
  return wanted < floor ? floor : wanted;
}

/**
 * The due date of every action of a plan, by key: its kind's date, pushed
 * a week past the latest due date of what it depends on. `known` = due dates
 * of actions already in a launched plan (an action added since depends on
 * them).
 */
export function planDueDates(
  items: ReadonlyArray<{
    key: string;
    kind: PlanItemKind;
    dependsOn: string[];
  }>,
  releaseDate: string | null,
  today: string,
  known: ReadonlyMap<string, string | null> = new Map(),
): Map<string, string | null> {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const due = new Map<string, string | null>();
  const resolving = new Set<string>();

  const dueOf = (key: string): string | null => {
    if (due.has(key)) return due.get(key) ?? null;
    const item = byKey.get(key);
    if (!item) return known.get(key) ?? null;
    // A cycle never comes from the proposal; cut it rather than loop.
    if (resolving.has(key)) return null;
    resolving.add(key);
    let date = defaultDueOn(item.kind, releaseDate, today);
    if (date) {
      for (const dep of item.dependsOn) {
        const before = dueOf(dep);
        const after = before ? addDays(before, AFTER_DEPENDENCY_DAYS) : null;
        if (after && after > date) date = after;
      }
    }
    resolving.delete(key);
    due.set(key, date);
    return date;
  };

  for (const item of items) dueOf(item.key);
  return due;
}
