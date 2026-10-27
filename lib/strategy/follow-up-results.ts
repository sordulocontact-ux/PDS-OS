// Follow-up of the Stratégie after the release (ticket Stratégie § 14): each
// KPI against its latest REAL value, read by code (Deezer) or noted by a
// person — never estimated (CLAUDE.md, rule 6). Client-safe, pure. The
// recommendations computed from them are in lib/strategy/recommendations.ts.

import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import type { KpiActual } from "@/lib/strategy/kpis";

const fr = { strategyFollowUp };

export type KpiMeasure = {
  objective_id: string;
  value: number;
  measured_on: string;
  source_note: string | null;
};

export type KpiRow = {
  id: string;
  label: string;
  kind: "quantitative" | "qualitative";
  unit: string | null;
  target: number | null;
  dueOn: string | null;
  // The latest real value: read by code (Deezer) or noted by a person.
  actual: { value: number; on: string; source: string | null } | null;
  unavailable: boolean;
  automatic: boolean;
  percent: number | null;
  gap: number | null;
};

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
/** A figure with its unit, as the follow-up shows it. */
export const figure = (value: number, unit: string | null) =>
  [number.format(value), unit].filter(Boolean).join(" ");

export function kpiRows(
  objectives: Array<{
    id: string;
    label: string;
    kind: string;
    source: string;
    unit: string | null;
    target: number | null;
    due_on: string | null;
  }>,
  measures: KpiMeasure[],
  actuals: Record<string, KpiActual>,
): KpiRow[] {
  const deezer = fr.strategyFollowUp.kpis.deezer;
  return objectives.map((o) => {
    const automatic = o.source === "deezer_fans";
    const read = actuals[o.id];
    // Newest first: measures are loaded by date, latest first.
    const noted = measures.find((m) => m.objective_id === o.id);
    const actual =
      automatic && read?.status === "measured"
        ? { value: read.value, on: read.on, source: deezer }
        : !automatic && noted
          ? {
              value: noted.value,
              on: noted.measured_on,
              source: noted.source_note,
            }
          : null;
    const target = o.kind === "quantitative" ? o.target : null;
    return {
      id: o.id,
      label: o.label,
      kind: o.kind === "qualitative" ? "qualitative" : "quantitative",
      unit: o.unit,
      target,
      dueOn: o.due_on,
      actual: o.kind === "qualitative" ? null : actual,
      unavailable: automatic && read?.status === "unavailable",
      automatic,
      percent:
        actual && target ? Math.round((actual.value / target) * 100) : null,
      gap: actual && target !== null ? actual.value - target : null,
    };
  });
}
