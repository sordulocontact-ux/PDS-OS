// The Brief de sortie consolidé (ticket Stratégie § 8): when it can be
// established, and what is still to arbitrate in it — both decided by code
// from what the strategy holds, never by the model (CLAUDE.md, rule 6).
// Client-safe.

import { formatEuros } from "@/lib/budget/types";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { StrategyBudget } from "@/lib/strategy/budget";
import type { ChoiceSuggestion } from "@/lib/strategy/choices";
import type {
  DimensionStatus,
  StrategyDimension,
} from "@/lib/strategy/dimensions";
import {
  upstreamChains,
  type UpstreamDeliverable,
} from "@/lib/strategy/upstream";
import { formatBriefDate } from "@/lib/framing/assess";

/**
 * The Brief is established once every dimension is at least started: none
 * left « À compléter ». The missing ones are named, in the pilotage's order.
 */
export function briefReadiness(statuses: DimensionStatus[]): {
  ready: boolean;
  missing: StrategyDimension[];
} {
  const missing = statuses
    .filter((d) => d.state === "to_complete")
    .map((d) => d.key);
  return { ready: missing.length === 0, missing };
}

export type Arbitration = {
  key: string;
  dimension: StrategyDimension;
  text: string;
};

export type ArbitrationInput = {
  fields: FieldState<"positioning" | "audiences" | "narrative">[];
  narrativeParts: FieldState[];
  strategicObjective: FieldState;
  suggestions: Record<
    "positioning" | "audiences" | "narrative",
    ChoiceSuggestion[]
  >;
  levers: Array<{
    id: string;
    label: string;
    state: string;
    review_status: string;
  }>;
  deliverables: UpstreamDeliverable[];
  milestones: Array<{
    id: string;
    title: string;
    occurs_on: string;
    deliverable_id: string | null;
  }>;
  budget: StrategyBudget;
  today: string;
};

/** Only what still waits for a decision, dimension by dimension. */
export function arbitrations(input: ArbitrationInput): Arbitration[] {
  const t = fr.strategyBrief.toDecide;
  const dims = fr.strategyPilot.dimensions;
  const parts = fr.strategyPilot.narrative.parts;
  const items: Arbitration[] = [];

  for (const field of input.fields) {
    if (field.status === "proposed")
      items.push({
        key: `field-${field.key}`,
        dimension: field.key,
        text: t.proposedField(dims[field.key]),
      });
    else if (input.suggestions[field.key].length > 0)
      items.push({
        key: `suggestions-${field.key}`,
        dimension: field.key,
        text: t.suggestions(dims[field.key]),
      });
  }
  for (const part of input.narrativeParts)
    if (part.status === "proposed")
      items.push({
        key: `field-${part.key}`,
        dimension: "narrative",
        text: t.proposedField(parts[part.key as keyof typeof parts]),
      });
  if (input.strategicObjective.status === "proposed")
    items.push({
      key: "field-strategic-objective",
      dimension: "objectives",
      text: t.proposedField(fr.strategyBrief.sections.objective),
    });

  for (const lever of input.levers)
    if (
      lever.review_status !== "rejected" &&
      (lever.state === "to_decide" || lever.review_status === "proposed")
    )
      items.push({
        key: `lever-${lever.id}`,
        dimension: "levers",
        text: t.lever(lever.label),
      });

  const late = upstreamChains(
    input.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    input.deliverables,
    input.today,
  );
  for (const chain of late)
    for (const step of chain.steps.filter((s) => s.late))
      items.push({
        key: `late-${chain.deliverableId}-${step.key}`,
        dimension: "calendar",
        // The whole calculation, so a « déjà passée » can be checked.
        text: t.late({
          step: fr.strategyCalendar.upstream.steps[step.key],
          deliverable: chain.deliverableTitle,
          milestone: chain.milestoneTitle,
          milestoneDate: formatBriefDate(chain.milestoneDate),
          date: formatBriefDate(step.date),
          leadDays: step.leadDays,
          overdueDays: -step.marginDays,
        }),
      });

  const { budget } = input;
  // Never blocking (MKT-S1-02): an unknown or unconfirmed envelope is said.
  if (budget.envelope === "undefined")
    items.push({
      key: "budget-envelope",
      dimension: "budget",
      text: t.envelopeUndefined,
    });
  if (budget.envelope === "to_confirm")
    items.push({
      key: "budget-envelope",
      dimension: "budget",
      text: t.envelopeToConfirm(
        budget.envelopeCents === null
          ? null
          : formatEuros(budget.envelopeCents),
      ),
    });
  if (budget.toDecideCents > 0)
    items.push({
      key: "budget-to-decide",
      dimension: "budget",
      text: t.budget(formatEuros(budget.toDecideCents)),
    });
  if (budget.remainingCents !== null && budget.remainingCents < 0)
    items.push({
      key: "budget-overrun",
      dimension: "budget",
      text: t.overrun(formatEuros(-budget.remainingCents)),
    });

  return items;
}
