// Shared model of the Stratégie's follow-up (lib/strategy/follow-up.ts holds
// the rules per area): states, areas, the input read from the project, and
// the per-deliverable rule. Client-safe, pure.

import type { DesignState } from "@/lib/design/rules";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { DeliveryState } from "@/lib/production/rules";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import { upstreamChains, type UpstreamStepKey } from "@/lib/strategy/upstream";

export const FOLLOW_UP_STATES = [
  "ready",
  "in_progress",
  "waiting",
  "blocked",
] as const;
export type FollowUpState = (typeof FOLLOW_UP_STATES)[number];

export const FOLLOW_UP_AREAS = [
  "contents",
  "influence",
  "press",
  "playlisting",
  "coordination",
  "validations",
] as const;
export type FollowUpArea = (typeof FOLLOW_UP_AREAS)[number];

export type FollowUpItem = {
  key: string;
  label: string;
  state: FollowUpState;
  reason: string;
};
export type FollowUpGroup = { area: FollowUpArea; items: FollowUpItem[] };

export type FollowUpInput = {
  today: string;
  levers: Array<{ id: string; label: string; state: string }>;
  deliverables: Array<{
    id: string;
    title: string;
    quantity: number | null;
    lever_id: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    occurs_on: string;
    deliverable_id: string | null;
    channel: string;
  }>;
  design: Record<string, DesignState>;
  delivery: Record<string, DeliveryState>;
  tasks: Array<{ status: string; due_date: string | null }>;
  documents: Array<{
    kind: "brief" | "release_plan" | "press_kit";
    version: number;
    state: string;
    pendingReviews: number;
  }>;
  pendingStages: string[];
};

const RANK: Record<FollowUpState, number> = {
  ready: 0,
  in_progress: 1,
  waiting: 2,
  blocked: 3,
};
const r = fr.strategyFollowUp.reasons;
const steps = fr.strategyCalendar.upstream.steps;

// The lever families PO watches by name (ticket: influence, RP, playlisting).
export const WATCHED: Array<{
  area: FollowUpArea;
  pattern: RegExp;
  channel?: string;
}> = [
  { area: "influence", pattern: /influen/i, channel: "influence" },
  { area: "press", pattern: /\b(rp|presse|m[ée]dias?)\b/i, channel: "press" },
  { area: "playlisting", pattern: /playlist/i },
];

/** Whether an upstream step is done, from the Conception and Production. */
export function stepDone(
  step: UpstreamStepKey,
  design: DesignState | undefined,
  delivery: DeliveryState | undefined,
): boolean {
  const d = delivery ?? "no_file";
  if (step === "conception") return design === "approved" || d !== "no_file";
  if (step === "production") return d !== "no_file";
  return d === "to_check" || d === "to_deliver" || d === "delivered";
}

/** Upstream deadlines passed while their step is not done. */
export function lateSteps(input: FollowUpInput) {
  return upstreamChains(
    input.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    input.deliverables,
    input.today,
  ).map((chain) => ({
    chain,
    late: chain.steps.filter(
      (s) =>
        s.late &&
        !stepDone(
          s.key,
          input.design[chain.deliverableId],
          input.delivery[chain.deliverableId],
        ),
    ),
  }));
}

export function contentItem(
  d: FollowUpInput["deliverables"][number],
  input: FollowUpInput,
  late: ReturnType<typeof lateSteps>,
): FollowUpItem {
  const label = deliverableTitle(d.title, d.quantity);
  const base = { key: `content-${d.id}`, label };
  const delivery = input.delivery[d.id] ?? "no_file";
  if (delivery === "delivered")
    return { ...base, state: "ready", reason: r.delivered };
  const passed = input.milestones.find(
    (m) => m.deliverable_id === d.id && m.occurs_on < input.today,
  );
  if (passed)
    return {
      ...base,
      state: "blocked",
      reason: r.milestonePassed(
        passed.title,
        formatBriefDate(passed.occurs_on),
      ),
    };
  const step = late.find((l) => l.chain.deliverableId === d.id)?.late[0];
  if (step)
    return {
      ...base,
      state: "blocked",
      reason: r.upstreamLate(steps[step.key], formatBriefDate(step.date)),
    };
  if (delivery === "to_approve")
    return { ...base, state: "waiting", reason: r.toApprove };
  if (delivery === "to_check")
    return { ...base, state: "waiting", reason: r.toCheck };
  if (delivery === "to_deliver")
    return { ...base, state: "waiting", reason: r.toDeliver };
  const design = input.design[d.id] ?? "to_design";
  if (design === "submitted")
    return { ...base, state: "waiting", reason: r.designSubmitted };
  return {
    ...base,
    state: "in_progress",
    reason:
      design === "approved"
        ? r.designApproved
        : design === "changes_requested"
          ? r.designChanges
          : r.toDesign,
  };
}

export const worst = (states: FollowUpState[]) =>
  states.reduce<FollowUpState>(
    (acc, s) => (RANK[s] > RANK[acc] ? s : acc),
    "ready",
  );
