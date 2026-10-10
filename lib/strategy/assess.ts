// The state of each of the eight dimensions (ticket § 2): À compléter, En
// cours, À arbitrer, Complété — decided here by code from what is recorded,
// never by PO (CLAUDE.md, rule 6). Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { formatEuros } from "@/lib/budget/types";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { budgetSums } from "@/lib/strategy/budget";
import {
  STRATEGY_DIMENSIONS,
  type DimensionState,
  type StrategyDimension,
} from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

export type DimensionAssessment = {
  dimension: StrategyDimension;
  state: DimensionState;
  // One line written by code (counts, the answer's beginning).
  summary: string;
  // What remains to arbitrate, named: highlighted in the Brief de sortie.
  toDecide: string[];
};

export type StrategyAssessment = {
  dimensions: DimensionAssessment[];
  counts: Record<DimensionState, number>;
  // No dimension is « À compléter » nor « En cours »: the Brief can be made.
  ready: boolean;
};

const MAX_SUMMARY = 110;
const clip = (text: string) =>
  text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 1)}…` : text;

const answered = (f: FieldState | undefined) => Boolean(f?.value);
const confirmed = (f: FieldState | undefined) =>
  Boolean(f?.value) && f?.status === "confirmed";

function textDimension(
  field: FieldState | undefined,
  suggested: boolean,
): Pick<DimensionAssessment, "state" | "summary"> {
  const t = fr.strategyFlow.summaries;
  if (confirmed(field)) return { state: "done", summary: clip(field!.value!) };
  if (answered(field) || suggested)
    return { state: "in_progress", summary: t.proposed };
  return { state: "todo", summary: t.empty };
}

export const NARRATIVE_PARTS = [
  "narrative_origin",
  "narrative_story",
  "narrative_context",
  "narrative_why_now",
] as const;

export function assessStrategy(data: StrategyData): StrategyAssessment {
  const t = fr.strategyFlow.summaries;
  const field = (key: string) => data.fields.find((f) => f.key === key);

  const assess = (d: StrategyDimension): DimensionAssessment => {
    switch (d) {
      case "positioning":
      case "audiences": {
        const r = textDimension(field(d), data.suggestions[d].length > 0);
        return { dimension: d, ...r, toDecide: [] };
      }
      case "narrative": {
        const angle = field("narrative");
        const parts = NARRATIVE_PARTS.map((k) => data.extras[k]);
        const all = [angle, ...parts];
        const filled = all.filter(confirmed).length;
        const touched =
          all.some(answered) || data.suggestions.narrative.length > 0;
        const state: DimensionState =
          confirmed(angle) && confirmed(data.extras.narrative_story)
            ? "done"
            : touched
              ? "in_progress"
              : "todo";
        return {
          dimension: d,
          state,
          summary: touched ? t.narrative(filled, all.length) : t.empty,
          toDecide: [],
        };
      }
      case "setup": {
        const levers = data.levers;
        const pending = levers.filter(
          (l) => l.state === "to_decide" || l.review_status === "proposed",
        );
        const selected = levers.filter(
          (l) => l.state === "selected" && l.review_status === "confirmed",
        ).length;
        const rejected = levers.filter(
          (l) => l.state === "rejected" && l.review_status === "confirmed",
        ).length;
        const state: DimensionState =
          levers.length === 0
            ? "todo"
            : pending.length > 0
              ? "to_decide"
              : selected > 0
                ? "done"
                : "in_progress";
        return {
          dimension: d,
          state,
          summary:
            levers.length === 0
              ? t.empty
              : t.levers(selected, pending.length, rejected),
          toDecide: pending.map((l) => l.label),
        };
      }
      case "deliverables": {
        const n = data.deliverables.length;
        const names = data.deliverables
          .slice(0, 3)
          .map((x) => (x.quantity ? `${x.quantity} × ${x.title}` : x.title));
        return {
          dimension: d,
          state: n ? "done" : "todo",
          summary: n
            ? clip(`${t.deliverables(n)} · ${names.join(", ")}`)
            : t.empty,
          toDecide: [],
        };
      }
      case "calendar": {
        const n = data.milestones.length;
        const date = data.referenceDate
          ? t.releaseOn(formatDay(data.referenceDate))
          : t.noReleaseDate;
        return {
          dimension: d,
          state: n === 0 ? "todo" : data.referenceDate ? "done" : "in_progress",
          summary: n ? `${t.milestones(n)} · ${date}` : t.empty,
          toDecide: [],
        };
      }
      case "budget": {
        if (data.budgetNone)
          return {
            dimension: d,
            state: "done",
            summary: t.budgetNone,
            toDecide: [],
          };
        const lines = data.budgetLines;
        if (lines.length === 0)
          return {
            dimension: d,
            state: "todo",
            summary: t.empty,
            toDecide: [],
          };
        const sums = budgetSums(lines);
        const pending = lines.filter((l) => l.state === "to_decide");
        return {
          dimension: d,
          state: pending.length ? "to_decide" : "done",
          summary: t.budget(
            formatEuros(sums.proposed),
            formatEuros(sums.validated),
            formatEuros(sums.toDecide),
          ),
          toDecide: pending.map(
            (l) => `${l.label} (${formatEuros(l.amount_cents)})`,
          ),
        };
      }
      case "objectives": {
        const objective = data.extras.strategy_objective;
        const kpis = data.kpis.length;
        const state: DimensionState =
          confirmed(objective) && kpis > 0
            ? "done"
            : answered(objective) || kpis > 0
              ? "in_progress"
              : "todo";
        return {
          dimension: d,
          state,
          summary:
            state === "todo"
              ? t.empty
              : t.objectives(confirmed(objective), kpis),
          toDecide: [],
        };
      }
    }
  };

  const dimensions = STRATEGY_DIMENSIONS.map(assess);
  const counts = { todo: 0, in_progress: 0, to_decide: 0, done: 0 };
  for (const d of dimensions) counts[d.state] += 1;
  return {
    dimensions,
    counts,
    ready: counts.todo === 0 && counts.in_progress === 0,
  };
}
