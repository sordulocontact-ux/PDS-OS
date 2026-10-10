// The eight dimensions of the Stratégie's pilotage (ticket Stratégie § 2),
// each with a state and a one-line summary, both written by code from what
// the strategy holds — never by PO (CLAUDE.md, rule 6). Client-safe.

import type { BudgetLine } from "@/lib/budget/types";
import { formatEuros } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceSuggestion, ChoiceValue } from "@/lib/strategy/choices";

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
  levers: Array<{ id: string; state: string; review_status: string }>;
  openNeeds: unknown[];
  deliverables: Array<{
    lever_id: string;
    assignee_person_id: string | null;
    due_date: string | null;
  }>;
  milestones: unknown[];
  referenceDate: string | null;
  objectives: Array<{ target: number | null }>;
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
  return {
    state: input.referenceDate ? "complete" : "in_progress",
    summary: join([s.milestones(input.milestones.length), release]),
  };
}

function budget(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const lines = input.budgetLines;
  if (lines.length === 0) return { state: "to_complete", summary: s.noBudget };
  const sum = (statuses: string[]) =>
    lines
      .filter((l) => statuses.includes(l.status))
      .reduce((total, l) => total + l.amountCents, 0);
  const committed = sum(["committed", "paid"]);
  const planned = sum(["planned"]);
  const toAccept = lines.filter((l) => l.status === "proposed").length;
  const overrun =
    input.envelopeCents !== null && committed > input.envelopeCents;
  const budgeted = new Set(lines.map((l) => l.leverId));
  const uncovered = selectedLeverIds(input).filter(
    (id) => !budgeted.has(id),
  ).length;
  const summary = join([
    s.budget.committed(formatEuros(committed)),
    planned > 0 && s.budget.planned(formatEuros(planned)),
    input.envelopeCents !== null &&
      s.budget.envelope(formatEuros(input.envelopeCents)),
    toAccept > 0 && s.budget.toAccept(toAccept),
    overrun && s.budget.overrun,
    uncovered > 0 && s.budget.uncovered(uncovered),
  ]);
  if (toAccept > 0 || overrun) return { state: "to_decide", summary };
  return { state: uncovered > 0 ? "in_progress" : "complete", summary };
}

function objectives(input: DimensionInput): Omit<DimensionStatus, "key"> {
  const list = input.objectives;
  if (list.length === 0)
    return { state: "to_complete", summary: s.noObjective };
  const noTarget = list.filter((o) => o.target === null).length;
  return {
    state: noTarget > 0 ? "in_progress" : "complete",
    summary: join([
      s.objectives.count(list.length),
      noTarget > 0 && s.objectives.noTarget(noTarget),
    ]),
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
