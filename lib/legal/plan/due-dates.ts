// The due date proposed for each action of the legal plan (UX test of
// 09/10/2026: every action was due on the release day). Pure code: a date
// is a fact computed here, never by PO; the person changes it in the plan.
//
// Decided 10/10/2026, no ticket says it (docs/ARCHITECTURE.md § 8 sexies):
// the fiches first (a week), then backwards from the release: borrowings
// 45 days before (the longest to secure), contracts and splits 30 days,
// the SACEM bulletin 15 days. Never sooner than three days from today.

import type { PlanItemKind } from "@/lib/legal/plan/proposal";

const DAY_MS = 86_400_000;
const MIN_DAYS_AHEAD = 3;
const FICHES_DAYS = 7;
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
