// Upstream deadlines of the launch calendar (ticket Stratégie § 5): when a
// content must come out on a milestone, its conception, production and
// validation are due before. Pure date arithmetic, written by code — never
// by PO (CLAUDE.md, rule 6). Client-safe.

import { addDays, dayOffset } from "@/lib/strategy/calendar";

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
  // Days before the milestone (the default, or the deliverable's own).
  leadDays: number;
  // Days from today to the deadline: negative once it has passed.
  marginDays: number;
  // The deadline has passed while the content is still to come out.
  passed: boolean;
  // Passed, and nobody accepted the risk for this milestone date: what
  // asks for a decision (MKT-S1-04).
  late: boolean;
};

export type UpstreamChain = {
  deliverableId: string;
  deliverableTitle: string;
  // The first milestone the deliverable comes out on drives the chain.
  milestoneId: string;
  milestoneTitle: string;
  milestoneDate: string;
  // The late deadlines were accepted for this milestone's date.
  riskAccepted: boolean;
  // Lead times changed for this deliverable.
  customLeads: boolean;
  steps: UpstreamStep[];
};

// A strategy deliverable as the chains read it; the lead times and the
// accepted risk are optional (other modules pass only id and title).
export type UpstreamDeliverable = {
  id: string;
  title: string;
  conception_lead_days?: number | null;
  production_lead_days?: number | null;
  validation_lead_days?: number | null;
  upstream_risk_accepted_for?: string | null;
};

/** The lead time of a step for a deliverable: its own, else the default. */
export function leadDaysOf(
  deliverable: UpstreamDeliverable,
  key: UpstreamStepKey,
): number {
  return deliverable[`${key}_lead_days`] ?? UPSTREAM_LEAD_DAYS[key];
}

/**
 * One chain per deliverable linked to a milestone, counted back from its
 * earliest milestone, sorted by first deadline. `today` is "YYYY-MM-DD"
 * (Paris): dates without time compare as days, never as instants.
 */
export function upstreamChains(
  milestones: Array<{
    id: string;
    title: string;
    occursOn: string;
    deliverableId: string | null;
  }>,
  deliverables: UpstreamDeliverable[],
  today: string,
): UpstreamChain[] {
  const byId = new Map(deliverables.map((d) => [d.id, d]));
  const first = new Map<string, (typeof milestones)[number]>();
  for (const m of milestones) {
    if (!m.deliverableId || !byId.has(m.deliverableId)) continue;
    const known = first.get(m.deliverableId);
    if (!known || m.occursOn < known.occursOn) first.set(m.deliverableId, m);
  }
  return [...first.entries()]
    .map(([deliverableId, m]) => {
      const deliverable = byId.get(deliverableId)!;
      const riskAccepted =
        deliverable.upstream_risk_accepted_for === m.occursOn;
      return {
        deliverableId,
        deliverableTitle: deliverable.title,
        milestoneId: m.id,
        milestoneTitle: m.title,
        milestoneDate: m.occursOn,
        riskAccepted,
        customLeads: UPSTREAM_STEPS.some(
          (key) => deliverable[`${key}_lead_days`] != null,
        ),
        steps: UPSTREAM_STEPS.map((key) => {
          const leadDays = leadDaysOf(deliverable, key);
          const date = addDays(m.occursOn, -leadDays);
          const passed = date < today && m.occursOn >= today;
          return {
            key,
            date,
            leadDays,
            marginDays: dayOffset(date, today),
            passed,
            late: passed && !riskAccepted,
          };
        }),
      };
    })
    .sort((a, b) => a.steps[0].date.localeCompare(b.steps[0].date));
}

/**
 * The earliest date the milestone could keep with these lead times, from
 * today (MKT-S1-10): the impact of moving it, said before anything moves.
 * Null when no deadline has passed.
 */
export function firstFeasibleDate(
  chain: UpstreamChain,
  today: string,
): { date: string; shiftDays: number } | null {
  const passed = chain.steps.filter((s) => s.passed);
  if (passed.length === 0) return null;
  const longest = Math.max(...passed.map((s) => s.leadDays));
  const date = addDays(today, longest);
  return { date, shiftDays: dayOffset(date, chain.milestoneDate) };
}

export type UpstreamMilestone = {
  kind: "delivery" | "validation";
  date: string;
  deliverableId: string;
  deliverableTitle: string;
};

/**
 * The upstream milestones a chain calls for (MKT-S1-10): the delivery at the
 * end of production, the validation before going out — proposed by code,
 * created only once a person ticks them, never twice for the same
 * deliverable, never on a date already past.
 */
export function upstreamMilestones(
  chain: UpstreamChain,
  existing: Array<{ kind: string; deliverable_id: string | null }>,
  today: string,
): UpstreamMilestone[] {
  const has = (kind: string) =>
    existing.some(
      (m) => m.kind === kind && m.deliverable_id === chain.deliverableId,
    );
  const proposals: UpstreamMilestone[] = [];
  const step = (key: UpstreamStepKey) => chain.steps.find((s) => s.key === key);
  const production = step("production");
  const validation = step("validation");
  if (production && production.date >= today && !has("delivery"))
    proposals.push({
      kind: "delivery",
      date: production.date,
      deliverableId: chain.deliverableId,
      deliverableTitle: chain.deliverableTitle,
    });
  if (validation && validation.date >= today && !has("validation"))
    proposals.push({
      kind: "validation",
      date: validation.date,
      deliverableId: chain.deliverableId,
      deliverableTitle: chain.deliverableTitle,
    });
  return proposals;
}
