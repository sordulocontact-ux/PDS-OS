// PO's one question in « Les 8 dimensions » (Sacha 06/11/2026: « pourquoi
// il n'y a pas des questions que PO nous pose, comme au Cadrage ? »). The
// code decides what is asked, never the model (CLAUDE.md rule 6): the
// written points nothing answers yet, then the levers left to arbitrate,
// in the order of the dimensions. What PO already proposed is not asked:
// it is confirmed in its dimension, as the Cadrage's proposals are. The
// lists (publics, deliverables, milestones, budget lines, KPIs) stay in
// their dimension, with « Ajouter … ». Pure, client-safe.

import {
  NARRATIVE_PARTS,
  POSITIONING_PARTS,
  STRATEGIC_OBJECTIVE,
  type FieldState,
  type Provenance,
} from "@/lib/framing/brief";
import type { DimensionView } from "@/lib/strategy/dimension-model";
import { isDraftField } from "@/lib/strategy/draft-plan";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

export const QUESTION_FIELDS = [
  "positioning",
  ...POSITIONING_PARTS,
  "audiences",
  "narrative",
  ...NARRATIVE_PARTS,
  STRATEGIC_OBJECTIVE,
] as const;
export type QuestionField = (typeof QUESTION_FIELDS)[number];

export function isQuestionField(value: unknown): value is QuestionField {
  return (
    typeof value === "string" &&
    (QUESTION_FIELDS as readonly string[]).includes(value)
  );
}

const DIMENSION_OF: Record<QuestionField, StrategyDimension> = {
  positioning: "positioning",
  positioning_promise: "positioning",
  positioning_difference: "positioning",
  positioning_proof: "positioning",
  positioning_tone: "positioning",
  audiences: "audiences",
  narrative: "narrative",
  narrative_origin: "narrative",
  narrative_story: "narrative",
  narrative_context: "narrative",
  narrative_why_now: "narrative",
  strategic_objective: "objectives",
};

export type StrategyQuestion =
  | {
      kind: "text";
      key: QuestionField;
      dimension: StrategyDimension;
      // Missing: asked; proposed: PO's answer to confirm (« M'aider à
      // définir » on this very question).
      value: string | null;
      provenance: Provenance | null;
      proposed: boolean;
      // PO may draft it from the Brief and the calls.
      canHelp: boolean;
    }
  | {
      kind: "lever";
      // `lever:<id>` or `need:<id>`, as in the URL.
      key: string;
      dimension: "levers";
      name: string;
      source: string;
      quote: string | null;
      action: { type: "lever" | "need"; id: string };
    };

/** Everything the strategy says of its written points. */
export type QuestionInput = {
  fields: FieldState[];
  dimensions: DimensionView[];
};

const filled = (f: FieldState | undefined) =>
  Boolean(f?.status && f.value?.trim());

/**
 * The questions still to ask, in order: a written point with no value
 * (never one PO proposed, nor one of a complete dimension), then the levers
 * to arbitrate.
 */
export function strategyQuestions(input: QuestionInput): StrategyQuestion[] {
  const byKey = new Map(input.fields.map((f) => [f.key, f]));
  const complete = new Set(
    input.dimensions.filter((d) => d.state === "complete").map((d) => d.key),
  );
  const texts: StrategyQuestion[] = QUESTION_FIELDS.filter(
    (key) => !complete.has(DIMENSION_OF[key]) && !filled(byKey.get(key)),
  ).map((key) => textQuestion(key, byKey.get(key)));
  const levers: StrategyQuestion[] = (
    input.dimensions.find((d) => d.key === "levers")?.levers ?? []
  ).flatMap((l) =>
    l.kind === "lever" && l.state === "to_decide" && l.action
      ? [
          {
            kind: "lever" as const,
            key: `${l.action.type}:${l.action.id}`,
            dimension: "levers" as const,
            name: l.name,
            source: l.source,
            quote: l.quote,
            action: l.action,
          },
        ]
      : [],
  );
  return [...texts, ...levers];
}

function textQuestion(
  key: QuestionField,
  field: FieldState | undefined,
): StrategyQuestion {
  return {
    kind: "text",
    key,
    dimension: DIMENSION_OF[key],
    value: field?.value ?? null,
    provenance: field?.provenance ?? null,
    proposed: field?.status === "proposed",
    canHelp: isDraftField(key),
  };
}

/**
 * The question shown: the one asked (`?q=`) — still open, or the written
 * point PO just proposed on it —, else the next one after `after` (the
 * answer just given), else the first.
 */
export function currentQuestion(
  queue: StrategyQuestion[],
  input: QuestionInput,
  asked: string | undefined,
  after: string | undefined,
): StrategyQuestion | null {
  const open = queue.find((q) => q.key === asked);
  if (open) return open;
  if (isQuestionField(asked)) {
    const field = input.fields.find((f) => f.key === asked);
    if (field?.status === "proposed") return textQuestion(asked, field);
  }
  if (after) {
    const keys = [
      ...QUESTION_FIELDS,
      ...queue.filter((q) => q.kind === "lever").map((q) => q.key),
    ] as string[];
    const from = keys.indexOf(after);
    const next = queue.find((q) => keys.indexOf(q.key) > from);
    if (next) return next;
  }
  return queue[0] ?? null;
}

/**
 * The questions the arrows walk: the queue, with the question shown in its
 * place when PO just proposed it (no longer missing, still asked).
 */
export function walkedQuestions(
  queue: StrategyQuestion[],
  current: StrategyQuestion,
): StrategyQuestion[] {
  if (queue.some((q) => q.key === current.key)) return queue;
  const rank = (q: StrategyQuestion) => {
    const at = (QUESTION_FIELDS as readonly string[]).indexOf(q.key);
    return at < 0 ? QUESTION_FIELDS.length : at;
  };
  const at = queue.findIndex((q) => rank(q) > rank(current));
  return at < 0
    ? [...queue, current]
    : [...queue.slice(0, at), current, ...queue.slice(at)];
}
