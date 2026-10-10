// Upstream deadlines of the launch calendar (ticket Stratégie § 5): when a
// content must come out on a milestone, its conception, production and
// validation are due before. Pure date arithmetic, written by code — never
// by PO (CLAUDE.md, rule 6). Client-safe.

import { addDays } from "@/lib/strategy/calendar";

// Lead times before the content goes out, in days (defaults of the label,
// the same for every deliverable until the team asks for finer ones):
// - conception done three weeks before: room for one round of changes;
// - production done ten days before: shooting, editing, exports;
// - validation four days before: last checks and upload to the platforms.
export const UPSTREAM_LEAD_DAYS = {
  conception: 21,
  production: 10,
  validation: 4,
} as const;
export type UpstreamStepKey = keyof typeof UPSTREAM_LEAD_DAYS;
export const UPSTREAM_STEPS = Object.keys(
  UPSTREAM_LEAD_DAYS,
) as UpstreamStepKey[];

export type UpstreamStep = {
  key: UpstreamStepKey;
  date: string;
  // The deadline has passed while the content is still to come out.
  late: boolean;
};

export type UpstreamChain = {
  deliverableId: string;
  deliverableTitle: string;
  // The first milestone the deliverable comes out on drives the chain.
  milestoneId: string;
  milestoneTitle: string;
  milestoneDate: string;
  steps: UpstreamStep[];
};

/**
 * One chain per deliverable linked to a milestone, counted back from its
 * earliest milestone, sorted by first deadline. `today` is "YYYY-MM-DD".
 */
export function upstreamChains(
  milestones: Array<{
    id: string;
    title: string;
    occursOn: string;
    deliverableId: string | null;
  }>,
  deliverables: Array<{ id: string; title: string }>,
  today: string,
): UpstreamChain[] {
  const titles = new Map(deliverables.map((d) => [d.id, d.title]));
  const first = new Map<string, (typeof milestones)[number]>();
  for (const m of milestones) {
    if (!m.deliverableId || !titles.has(m.deliverableId)) continue;
    const known = first.get(m.deliverableId);
    if (!known || m.occursOn < known.occursOn) first.set(m.deliverableId, m);
  }
  return [...first.entries()]
    .map(([deliverableId, m]) => ({
      deliverableId,
      deliverableTitle: titles.get(deliverableId)!,
      milestoneId: m.id,
      milestoneTitle: m.title,
      milestoneDate: m.occursOn,
      steps: UPSTREAM_STEPS.map((key) => {
        const date = addDays(m.occursOn, -UPSTREAM_LEAD_DAYS[key]);
        return { key, date, late: date < today && m.occursOn >= today };
      }),
    }))
    .sort((a, b) => a.steps[0].date.localeCompare(b.steps[0].date));
}
