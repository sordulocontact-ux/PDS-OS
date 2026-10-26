// Each objective of the Stratégie read against the activations' statistics
// (recette of 23/10, MKT-BIL-002): the target, what the activations declared
// and what was verified (the latest valid reading of each subject, summed,
// counts only), the gap — absolute and relative — and its state. Without a
// figure the objective is « Non mesurable », with why; never a zero, never a
// model (CLAUDE.md, règle 6). Pure, client-safe.

import type { Evidence } from "@/lib/marketing/model";

export type ObjectiveInput = {
  id: string;
  label: string;
  target: number | null;
  unit: string | null;
  dueOn: string | null;
  // The KPI's metric (lib/strategy/kpis.ts): streams, fans, views…
  metric: string | null;
};

export type ObjectiveState = "reached" | "below" | "not_measurable";

export type ObjectiveRow = {
  id: string;
  label: string;
  target: number | null;
  unit: string | null;
  dueOn: string | null;
  declared: number | null;
  verified: number | null;
  // Declared minus target; and declared / target.
  gap: number | null;
  ratio: number | null;
  state: ObjectiveState;
  // Why it is not measurable, or that the reading is early.
  reason: "no_target" | "not_tracked" | "no_reading" | null;
  // Its date is still to come: the figure is provisional.
  early: boolean;
};

// The KPI's metric → the activations' one (lib/activations/model.ts METRICS);
// absent: the activations do not read it (playlists, other).
const ACTIVATION_METRIC: Record<string, string> = {
  streams: "streams",
  views: "views",
  fans: "followers",
};

export function objectiveRows(
  objectives: ObjectiveInput[],
  evidence: Evidence[],
  today: string,
): ObjectiveRow[] {
  return objectives.map((o) => {
    const metric = o.metric ? ACTIVATION_METRIC[o.metric] : undefined;
    const readings = metric
      ? evidence.filter(
          (e) =>
            e.kind === "statistic" &&
            e.archivedAt === null &&
            e.metric === metric &&
            e.unit === "count" &&
            e.value !== null,
        )
      : [];
    const sum = (list: Evidence[]) =>
      list.length ? list.reduce((s, e) => s + (e.value ?? 0), 0) : null;
    const declared = sum(readings);
    const verified = sum(readings.filter((e) => e.verification === "verified"));
    const reason =
      o.target === null
        ? "no_target"
        : !metric
          ? "not_tracked"
          : declared === null
            ? "no_reading"
            : null;
    const measurable =
      reason === null && o.target !== null && declared !== null;
    return {
      id: o.id,
      label: o.label,
      target: o.target,
      unit: o.unit,
      dueOn: o.dueOn,
      declared,
      verified,
      gap: measurable ? declared - o.target! : null,
      ratio: measurable && o.target! > 0 ? declared / o.target! : null,
      state: !measurable
        ? "not_measurable"
        : declared >= o.target!
          ? "reached"
          : "below",
      reason,
      early: o.dueOn !== null && o.dueOn > today,
    };
  });
}
