// Follow-up of the Stratégie after the release (ticket Stratégie § 14): each
// KPI against its latest REAL value, and recommendations computed by code
// from real data only, each citing the data it rests on (CLAUDE.md, rule 6:
// PO invents nothing). Client-safe, pure. Recommendation rules:
// - kpi_pace:<kpi>:<date> — a quantitative KPI with a target, a due date and
//   a real value read between the release and the due date, below 80 % of
//   the pro-rata of its target at that date (linear from the release);
// - kpi_missed:<kpi> — a real value read on or after the due date, below the
//   target;
// - upstream:<deliverable>:<step> — an upstream deadline passed while its
//   step is not done (lib/strategy/follow-up.ts, lateSteps);
// - undelivered:<milestone> — a milestone passed while its linked
//   deliverable is not delivered.
// A recommendation already applied or ignored is not offered again.

import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { dayOffset } from "@/lib/strategy/calendar";
import { lateSteps, type FollowUpInput } from "@/lib/strategy/follow-up";
import type { KpiActual } from "@/lib/strategy/kpis";

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

export type Recommendation = {
  ruleKey: string;
  text: string;
  action: string;
  question: string;
};

// Below this share of the expected pace, the KPI deserves a look.
const PACE_THRESHOLD = 0.8;

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const figure = (value: number, unit: string | null) =>
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

export function recommendations({
  projectTitle,
  referenceDate,
  kpis,
  input,
  settled,
}: {
  projectTitle: string;
  referenceDate: string | null;
  kpis: KpiRow[];
  input: FollowUpInput;
  settled: Set<string>;
}): Recommendation[] {
  const t = fr.strategyFollowUp.recommendations;
  const steps = fr.strategyCalendar.upstream.steps;
  const list: Array<Omit<Recommendation, "question">> = [];

  for (const k of kpis) {
    if (!k.actual || !k.target || !k.dueOn) continue;
    const { value, on } = k.actual;
    if (on >= k.dueOn) {
      if (value < k.target)
        list.push({
          ruleKey: `kpi_missed:${k.id}`,
          text: t.missed(
            k.label,
            figure(value, k.unit),
            figure(k.target, k.unit),
            formatBriefDate(k.dueOn),
          ),
          action: t.missedAction(k.label),
        });
      continue;
    }
    if (!referenceDate || on <= referenceDate) continue;
    const span = dayOffset(k.dueOn, referenceDate);
    if (span <= 0) continue;
    const expected = (k.target * dayOffset(on, referenceDate)) / span;
    if (value < expected * PACE_THRESHOLD)
      list.push({
        ruleKey: `kpi_pace:${k.id}:${on}`,
        text: t.belowPace(
          k.label,
          figure(value, k.unit),
          formatBriefDate(on),
          figure(k.target, k.unit),
          formatBriefDate(k.dueOn),
          figure(Math.round(expected), k.unit),
        ),
        action: t.belowPaceAction(k.label),
      });
  }

  for (const { chain, late } of lateSteps(input))
    for (const step of late)
      list.push({
        ruleKey: `upstream:${chain.deliverableId}:${step.key}`,
        text: t.upstreamLate(
          steps[step.key],
          chain.deliverableTitle,
          formatBriefDate(step.date),
          chain.milestoneTitle,
          formatBriefDate(chain.milestoneDate),
        ),
        action: t.upstreamLateAction(
          chain.deliverableTitle,
          chain.milestoneTitle,
        ),
      });

  const titles = new Map(input.deliverables.map((d) => [d.id, d.title]));
  for (const m of input.milestones) {
    if (!m.deliverable_id || m.occurs_on >= input.today) continue;
    if ((input.delivery[m.deliverable_id] ?? "no_file") === "delivered")
      continue;
    const deliverable = titles.get(m.deliverable_id);
    if (!deliverable) continue;
    list.push({
      ruleKey: `undelivered:${m.id}`,
      text: t.undelivered(m.title, formatBriefDate(m.occurs_on), deliverable),
      action: t.undeliveredAction(deliverable, m.title),
    });
  }

  return list
    .filter((rec) => !settled.has(rec.ruleKey))
    .map((rec) => ({ ...rec, question: t.question(projectTitle, rec.text) }));
}
