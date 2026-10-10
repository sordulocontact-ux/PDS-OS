// The Brief de sortie (ticket § 8): the eight dimensions as they stand,
// written by code into a snapshot the server stores per version. What the
// reviewers read is what was generated. The budget lives here only: the
// external documents are built elsewhere and never read it. Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import {
  NARRATIVE_PARTS,
  type StrategyAssessment,
} from "@/lib/strategy/assess";
import { budgetSums } from "@/lib/strategy/budget";
import { dayOffset } from "@/lib/strategy/calendar";
import type {
  DimensionState,
  StrategyDimension,
} from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

export type SnapshotItem = {
  label: string;
  value: string | null;
  lines: string[];
  toDecide?: boolean;
};

export type SnapshotSection = {
  dimension: StrategyDimension;
  state: DimensionState;
  items: SnapshotItem[];
};

export type StrategySnapshot = {
  kind: "strategy_brief";
  project: {
    title: string;
    artist: string;
    type: string;
    releaseDate: string | null;
  };
  sections: SnapshotSection[];
  toDecide: Array<{ dimension: StrategyDimension; label: string }>;
};

export type SnapshotProject = StrategySnapshot["project"];

export function buildStrategySnapshot(
  data: StrategyData,
  assessment: StrategyAssessment,
  project: SnapshotProject,
): StrategySnapshot {
  const t = fr.strategyFlow;
  const ts = fr.strategy;
  const field = (key: string) =>
    data.fields.find((f) => f.key === key)?.value ?? null;
  const leverName = new Map(data.levers.map((l) => [l.id, l.label]));
  const item = (label: string, value: string | null): SnapshotItem => ({
    label,
    value,
    lines: [],
  });

  const items: Record<StrategyDimension, SnapshotItem[]> = {
    positioning: [item(t.dimensions.positioning, field("positioning"))],
    audiences: [item(t.dimensions.audiences, field("audiences"))],
    narrative: [
      item(t.narrative.angleTitle, field("narrative")),
      ...NARRATIVE_PARTS.map((k) =>
        item(t.narrative.parts[k], data.extras[k].value),
      ),
    ],
    setup: (["selected", "to_decide", "rejected"] as const).flatMap((state) => {
      const lines = data.levers
        .filter((l) =>
          state === "to_decide"
            ? l.state === "to_decide" || l.review_status === "proposed"
            : l.state === state && l.review_status === "confirmed",
        )
        .map((l) => l.label);
      return lines.length
        ? [
            {
              label: ts.levers.states[state],
              value: null,
              lines,
              toDecide: state === "to_decide",
            },
          ]
        : [];
    }),
    deliverables: [
      {
        label: t.dimensions.deliverables,
        value: null,
        lines: data.deliverables.map((d) =>
          [
            d.quantity ? `${d.quantity} × ${d.title}` : d.title,
            leverName.get(d.lever_id),
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      },
    ],
    calendar: [
      item(
        fr.strategyDocs.content.releaseDate,
        data.referenceDate ? formatDay(data.referenceDate) : null,
      ),
      {
        label: t.calendar.milestonesTitle,
        value: null,
        lines: data.milestones.map((m) =>
          [
            data.referenceDate
              ? ts.calendar.dayOffset(
                  dayOffset(m.occurs_on, data.referenceDate),
                )
              : null,
            formatDay(m.occurs_on),
            m.title,
            t.calendar.channels[m.channel as keyof typeof t.calendar.channels],
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      },
    ],
    budget: data.budgetNone
      ? [item(t.dimensions.budget, t.summaries.budgetNone)]
      : (() => {
          const sums = budgetSums(data.budgetLines);
          return [
            item(t.budget.tiles.proposed, formatEuros(sums.proposed)),
            item(t.budget.tiles.validated, formatEuros(sums.validated)),
            {
              ...item(t.budget.tiles.toDecide, formatEuros(sums.toDecide)),
              toDecide: sums.toDecide > 0,
            },
            {
              label: t.budget.byLever,
              value: null,
              lines: data.budgetLines.map(
                (l) =>
                  `${l.label} · ${(l.lever_id && leverName.get(l.lever_id)) || t.budget.noLever} · ${formatEuros(l.amount_cents)} · ${t.budget.states[l.state as "validated" | "to_decide"]}`,
              ),
            },
          ];
        })(),
    objectives: [
      item(t.objectives.objectiveTitle, data.extras.strategy_objective.value),
      {
        label: t.objectives.kpisTitle,
        value: null,
        lines: data.kpis.map((k) => kpiLine(k)),
      },
    ],
  };

  return {
    kind: "strategy_brief",
    project,
    sections: assessment.dimensions.map((d) => ({
      dimension: d.dimension,
      state: d.state,
      items: items[d.dimension],
    })),
    toDecide: assessment.dimensions.flatMap((d) =>
      d.toDecide.map((label) => ({ dimension: d.dimension, label })),
    ),
  };
}

export function kpiLine(k: {
  label: string;
  target_value: number | null;
  target_text: string | null;
  unit: string | null;
}): string {
  const target =
    k.target_value !== null
      ? `${new Intl.NumberFormat("fr-FR").format(k.target_value)}${k.unit ? ` ${k.unit}` : ""}`
      : k.target_text;
  return target
    ? `${k.label} · ${target}`
    : `${k.label} · ${fr.strategyFlow.objectives.noTarget}`;
}

/** A stored snapshot, read defensively. */
export function strategySnapshotOf(raw: unknown): StrategySnapshot | null {
  const value = raw as Partial<StrategySnapshot> | null;
  return value?.kind === "strategy_brief" &&
    Array.isArray(value.sections) &&
    value.project
    ? (value as StrategySnapshot)
    : null;
}

/** The strategy has not changed since this version was generated. */
export function strategySnapshotMatches(
  a: StrategySnapshot,
  b: StrategySnapshot,
): boolean {
  return (
    JSON.stringify([a.sections, a.project]) ===
    JSON.stringify([b.sections, b.project])
  );
}
