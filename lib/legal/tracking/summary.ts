// What the project's overview shows of the Juridique once its plan runs:
// how many actions wait in each attention group (ticket Juridique 07), what
// blocks the release, and the first things to do. Pure.
//
// Blocking: the only rule the tickets give is ticket Juridique 08's fixture,
// « Humanisme sans autorisation est OPEN et bloquant » — a clearance not
// secured blocks the release. The rest of its ReadinessPolicy (SACEM,
// contracts, invoices…) is still to decide (docs/CONTEXTE-PROJET.md § 2):
// nothing else is shown as blocking.

import type { TrackGroup, TrackedItem } from "@/lib/legal/tracking/state";

export type LegalSummary = {
  counts: Record<TrackGroup, number>;
  blocking: TrackedItem[];
  // Decisions first (they hold the others back), then what is free to do.
  next: TrackedItem[];
};

const CLOSED = new Set(["done", "obsolete"]);

export function summarizeTracking(
  items: TrackedItem[],
  limit = 4,
): LegalSummary {
  const counts: Record<TrackGroup, number> = {
    now: 0,
    decision: 0,
    waiting: 0,
    silent: 0,
  };
  for (const item of items) counts[item.group] += 1;
  return {
    counts,
    blocking: items.filter(
      (item) => item.kind === "clearance" && !CLOSED.has(item.current),
    ),
    next: [
      ...items.filter((item) => item.group === "decision"),
      ...items.filter((item) => item.group === "now"),
    ].slice(0, limit),
  };
}
