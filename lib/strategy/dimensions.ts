// The eight dimensions of the Stratégie's pilotage (ticket Stratégie § 2),
// each with a state and a one-line summary, both written by code from what
// the strategy holds — never by PO (CLAUDE.md, rule 6). Client-safe.

import type { BudgetLine } from "@/lib/budget/types";
import { formatEuros } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceSuggestion, ChoiceValue } from "@/lib/strategy/choices";
import { strategyBudget } from "@/lib/strategy/budget";
import { upstreamChains } from "@/lib/strategy/upstream";

export const STRATEGY_DIMENSIONS = [
  "positioning",
  "audiences",
  "narrative",
  "levers",
  "deliverables",
  "calendar",
  "budget",
  "objectives",
] as const;
export type StrategyDimension = (typeof STRATEGY_DIMENSIONS)[number];

export function isStrategyDimension(
  value: unknown,
): value is StrategyDimension {
  return (
    typeof value === "string" &&
    (STRATEGY_DIMENSIONS as readonly string[]).includes(value)
  );
}

export const DIMENSION_STATES = [
  "to_complete",
  "in_progress",
  "to_decide",
  "complete",
] as const;
export type DimensionState = (typeof DIMENSION_STATES)[number];

export type DimensionStatus = {
  key: StrategyDimension;
  state: DimensionState;
  summary: string;
};

// What the strategy holds, as loadStrategy and loadBudget read it.
export type DimensionInput = {
  fields: FieldState<"positioning" | "audiences" | "narrative">[];
  narrativeParts: FieldState[];
  choices: Record<"positioning" | "audiences" | "narrative", ChoiceValue>;
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
  openNeeds: unknown[];
  deliverables: Array<{
    id: string;
    title: string;
    lever_id: string;
    assignee_person_id: string | null;
    due_date: string | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    occurs_on: string;
    deliverable_id: string | null;
  }>;
  referenceDate: string | null;
  // "YYYY-MM-DD" in Paris: an upstream deadline already past is late.
  today: string;
  strategicObjective: FieldState;
  objectives: Array<{ kind: string; target: number | null }>;
  budgetLines: Pick<BudgetLine, "amountCents" | "status" | "leverId">[];
  envelopeCents: number | null;
};

const s = fr.strategyPilot.summaries;
const join = (parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" · ");

function answer(
  key: "positioning" | "audiences",
  input: DimensionInput,
): Omit<DimensionStatus, "key"> {
  const field = input.fields.find((f) => f.key === key);
  const choice = input.choices[key];
  if (field?.status === "confirmed" && field.value)
    return { state: "complete", summary: field.value };
  if (field?.status === "proposed" && field.value)
    return { state: "to_decide", summary: s.proposed(field.value) };
  if (input.suggestions[key].length > 0)
    return { state: "to_decide", summary: s.toConfirm };
  if (choice.choices.length > 0 || choice.other)
    return { state: "in_progress", summary: s.notDefined };
  return { state: "to_complete", summary: s.notDefined };
}

function narrative(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const angle = input.fields.find((f) => f.key === "narrative");
  const all = [...input.narrativeParts, ...(angle ? [angle] : [])];
  const filled = all.filter((f) => f.status === "confirmed").length;
  const summary = s.narrative(filled, all.length);
  if (
    all.some((f) => f.status === "proposed") ||
    input.suggestions.narrative.length > 0
  )
    return { state: "to_decide", summary };
  if (filled === all.length) return { state: "complete", summary };
  return { state: filled > 0 ? "in_progress" : "to_complete", summary };
}

function levers(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const live = input.levers.filter((l) => l.state !== "rejected");
  if (live.length === 0 && input.openNeeds.length === 0)
    return { state: "to_complete", summary: s.noLever };
  const selected = live.filter((l) => l.state === "selected").length;
  const toDecide = live.filter(
    (l) => l.state === "to_decide" || l.review_status === "proposed",
  ).length;
  const summary =
    join([
      selected > 0 && s.levers.selected(selected),
      toDecide > 0 && s.levers.toDecide(toDecide),
      input.openNeeds.length > 0 && s.levers.openNeeds(input.openNeeds.length),
    ]) || s.noLever;
  if (toDecide > 0) return { state: "to_decide", summary };
  if (selected === 0) return { state: "to_complete", summary };
  if (input.openNeeds.length > 0) return { state: "in_progress", summary };
  return { state: "complete", summary };
}

function selectedLeverIds(input: DimensionInput): string[] {
  return input.levers.filter((l) => l.state === "selected").map((l) => l.id);
}

function deliverables(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const selected = selectedLeverIds(input);
  const list = input.deliverables;
  if (list.length === 0)
    return {
      state: "to_complete",
      summary: selected.length ? s.noDeliverable : s.noSelectedLever,
    };
  const covered = new Set(list.map((d) => d.lever_id));
  const uncovered = selected.filter((id) => !covered.has(id)).length;
  const unassigned = list.filter((d) => !d.assignee_person_id).length;
  const undated = list.filter((d) => !d.due_date).length;
  const summary = join([
    s.deliverables.count(list.length),
    unassigned > 0 && s.deliverables.unassigned(unassigned),
    undated > 0 && s.deliverables.undated(undated),
    uncovered > 0 && s.deliverables.uncovered(uncovered),
  ]);
  const done = uncovered === 0 && unassigned === 0 && undated === 0;
  return { state: done ? "complete" : "in_progress", summary };
}

function calendar(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const release = input.referenceDate
    ? s.release(formatBriefDate(input.referenceDate))
    : s.noReleaseDate;
  if (input.milestones.length === 0)
    return { state: "to_complete", summary: join([s.noMilestone, release]) };
  const late = upstreamChains(
    input.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    input.deliverables,
    input.today,
  ).flatMap((chain) => chain.steps.filter((step) => step.late)).length;
  const summary = join([
    s.milestones(input.milestones.length),
    release,
    late > 0 && s.lateUpstream(late),
  ]);
  // A deadline already missed asks for a decision (move the milestone…).
  if (late > 0) return { state: "to_decide", summary };
  return {
    state: input.referenceDate ? "complete" : "in_progress",
    summary,
  };
}

function budget(input: DimensionInput): Omit<DimensionStatus, "key"> {
  if (input.budgetLines.length === 0)
    return { state: "to_complete", summary: s.noBudget };
  const b = strategyBudget(
    input.budgetLines,
    input.levers,
    input.envelopeCents,
  );
  const overrun = b.remainingCents !== null && b.remainingCents < 0;
  const selected = new Set(selectedLeverIds(input));
  const uncovered = b.byLever.filter(
    (l) =>
      l.leverId !== null && selected.has(l.leverId) && l.validatedCents === 0,
  ).length;
  const summary = join([
    s.budget.validated(formatEuros(b.validatedCents)),
    b.toDecideCents > 0 && s.budget.toDecide(formatEuros(b.toDecideCents)),
    b.envelopeCents !== null && s.budget.envelope(formatEuros(b.envelopeCents)),
    overrun && s.budget.overrun,
    uncovered > 0 && s.budget.uncovered(uncovered),
  ]);
  if (b.toDecideCents > 0 || overrun) return { state: "to_decide", summary };
  return { state: uncovered > 0 ? "in_progress" : "complete", summary };
}

function objectives(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const list = input.objectives;
  const defined = input.strategicObjective.status === "confirmed";
  if (list.length === 0 && !input.strategicObjective.value)
    return { state: "to_complete", summary: s.noObjective };
  // A qualitative signal has no figure: it never lacks a target.
  const noTarget = list.filter(
    (o) => o.kind === "quantitative" && o.target === null,
  ).length;
  const summary = join([
    defined ? s.objectives.defined : s.objectives.undefined,
    s.objectives.count(list.length),
    noTarget > 0 && s.objectives.noTarget(noTarget),
  ]);
  if (input.strategicObjective.status === "proposed")
    return { state: "to_decide", summary };
  return {
    state:
      defined && list.length > 0 && noTarget === 0 ? "complete" : "in_progress",
    summary,
  };
}

/** Each dimension's state and summary, in the pilotage's order. */
export function dimensionStatuses(input: DimensionInput): DimensionStatus[] {
  const of: Record<
    StrategyDimension,
    (input: DimensionInput) => Omit<DimensionStatus, "key">
  > = {
    positioning: (i) => answer("positioning", i),
    audiences: (i) => answer("audiences", i),
    narrative,
    levers,
    deliverables,
    calendar,
    budget,
    objectives,
  };
  return STRATEGY_DIMENSIONS.map((key) => ({ key, ...of[key](input) }));
}
