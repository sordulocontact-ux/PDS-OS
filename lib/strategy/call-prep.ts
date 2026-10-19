// « Préparer un échange » of the Stratégie: PO compares what the strategy
// needs with what the project already holds and prepares only the topics
// still open — a question to answer, or a proposal to confirm. Written by
// code, no model (the same idea as the Cadrage's, lib/framing/call-prep.ts).
// Client-safe.

import type {
  FieldState,
  NarrativePart,
  StrategyFieldState,
} from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import {
  STRATEGY_DIMENSIONS,
  type StrategyDimension,
} from "@/lib/strategy/dimensions";

// One topic per dimension of the pilotage still open.
export const STRATEGY_TOPICS = STRATEGY_DIMENSIONS;
export type StrategyTopicKey = StrategyDimension;

export type StrategyTopic = {
  key: StrategyTopicKey;
  topic: string;
  minutes: number;
  questions: string[];
};

// What the strategy holds, as loadStrategy reads it.
export type StrategyPrepInput = {
  fields: StrategyFieldState[];
  narrativeParts: FieldState<NarrativePart>[];
  levers: Array<{ id: string; label: string; state: string }>;
  openNeeds: Array<{ label: string }>;
  deliverables: Array<{ lever_id: string | null }>;
  milestones: unknown[];
  referenceDate: string | null;
  strategicObjective: { status: "proposed" | "confirmed" | null };
  objectives: Array<{ label: string; kind: string; target: number | null }>;
  // Budget lines: only their status, label and lever, never an amount.
  budgetLines: Array<{
    label: string;
    status: string;
    leverId: string | null;
  }>;
};

const MINUTES_PER_QUESTION = 4;
// A long list (many needs) stays one topic of reasonable length.
const MAX_QUESTIONS = 6;

function questionsOf(
  key: StrategyTopicKey,
  input: StrategyPrepInput,
): string[] {
  const q = fr.strategyEntry.questions;
  switch (key) {
    case "levers": {
      const open = [
        ...input.openNeeds.map((n) => q.leverForNeed(n.label)),
        ...input.levers
          .filter((l) => l.state === "to_decide")
          .map((l) => q.leverToDecide(l.label)),
      ];
      return open.length || input.levers.length ? open : [q.noLever];
    }
    case "deliverables": {
      const covered = new Set(input.deliverables.map((d) => d.lever_id));
      return input.levers
        .filter((l) => l.state === "selected" && !covered.has(l.id))
        .map((l) => q.deliverablesFor(l.label));
    }
    case "narrative":
      return [
        ...input.narrativeParts
          .filter((p) => p.status !== "confirmed")
          .map((p) =>
            p.status === "proposed" && p.value
              ? q.confirm(fr.strategyPilot.narrative.parts[p.key], p.value)
              : q.narrativeParts[p.key],
          ),
        ...textQuestion("narrative", input),
      ];
    case "budget": {
      const budgeted = new Set(input.budgetLines.map((l) => l.leverId));
      const selected = input.levers.filter((l) => l.state === "selected");
      return [
        ...(input.budgetLines.length === 0 ? [q.noBudget] : []),
        ...input.budgetLines
          .filter((l) => l.status === "proposed")
          .map((l) => q.quoteToAccept(l.label)),
        ...(input.budgetLines.length > 0
          ? selected
              .filter((l) => !budgeted.has(l.id))
              .map((l) => q.budgetFor(l.label))
          : []),
      ];
    }
    case "objectives":
      return [
        ...(input.strategicObjective.status === "confirmed"
          ? []
          : [q.strategicObjective]),
        ...(input.objectives.length === 0
          ? [q.noObjective]
          : input.objectives
              .filter((o) => o.kind === "quantitative" && o.target === null)
              .map((o) => q.targetFor(o.label))),
      ];
    case "calendar":
      return [
        ...(input.referenceDate ? [] : [q.releaseDate]),
        ...(input.milestones.length ? [] : [q.milestones]),
      ];
    default:
      return textQuestion(key, input);
  }
}

/** A closed question still open: to answer, or a proposal to confirm. */
function textQuestion(
  key: "positioning" | "audiences" | "narrative",
  input: StrategyPrepInput,
): string[] {
  const q = fr.strategyEntry.questions;
  const field = input.fields.find((f) => f.key === key);
  if (field?.status === "confirmed") return [];
  if (field?.status === "proposed" && field.value)
    return [q.confirm(fr.strategy.fields[key], field.value)];
  return [fr.strategy.choices.questions[key]];
}

/**
 * The agenda of a strategy exchange (proto PREP_CALL.strat): the 8
 * dimensions, one per point, and under each — folded under « Préparer en
 * détail » — the questions of what is still missing (ticket § 1: « PO
 * réutilise les informations connues pour proposer les sujets »).
 */
export function strategyCallTopics(input: StrategyPrepInput): StrategyTopic[] {
  return STRATEGY_TOPICS.map((key) => {
    const questions = questionsOf(key, input).slice(0, MAX_QUESTIONS);
    return {
      key,
      topic: fr.strategyDimensions.names[key],
      minutes: Math.min(
        15,
        Math.max(5, questions.length * MINUTES_PER_QUESTION),
      ),
      questions,
    };
  });
}

export const CALL_FORMATS = ["video", "in_person", "phone"] as const;
export type CallFormat = (typeof CALL_FORMATS)[number];

export function isCallFormat(value: unknown): value is CallFormat {
  return (
    typeof value === "string" &&
    (CALL_FORMATS as readonly string[]).includes(value)
  );
}
