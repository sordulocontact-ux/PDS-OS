// Upstream deadlines (ticket § 5): when a content must be published on a
// date, its conception, production and validation come before. Date
// arithmetic in code (rule 6), from the earliest milestone linked to the
// deliverable, else from the deliverable's own due date. Client-safe.

export const UPSTREAM_STEPS = [
  "conception",
  "production",
  "validation",
  "publication",
] as const;
export type UpstreamStep = (typeof UPSTREAM_STEPS)[number];

// Days before publication each step must be finished. One place to change.
export const UPSTREAM_LEAD_DAYS: Record<UpstreamStep, number> = {
  conception: 14,
  production: 7,
  validation: 2,
  publication: 0,
};

export type UpstreamChain = {
  deliverableId: string;
  title: string;
  // The publication date the chain counts back from.
  publishOn: string;
  steps: Array<{ step: UpstreamStep; date: string; late: boolean }>;
};

const DAY_MS = 86_400_000;

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function upstreamChains(
  deliverables: Array<{ id: string; title: string; due_date: string | null }>,
  milestones: Array<{ occurs_on: string; deliverable_id: string | null }>,
  today: string,
  // Deliverables with an approved version: their steps are behind them.
  readyIds: ReadonlySet<string> = new Set(),
): UpstreamChain[] {
  return deliverables
    .flatMap((d) => {
      const linked = milestones
        .filter((m) => m.deliverable_id === d.id)
        .map((m) => m.occurs_on)
        .sort();
      const publishOn = linked[0] ?? d.due_date;
      if (!publishOn) return [];
      return [
        {
          deliverableId: d.id,
          title: d.title,
          publishOn,
          steps: UPSTREAM_STEPS.map((step) => {
            const date = shiftDate(publishOn, -UPSTREAM_LEAD_DAYS[step]);
            return {
              step,
              date,
              late:
                step !== "publication" && date < today && !readyIds.has(d.id),
            };
          }),
        },
      ];
    })
    .sort((a, b) => a.publishOn.localeCompare(b.publishOn));
}
