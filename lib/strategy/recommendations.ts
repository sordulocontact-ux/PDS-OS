// Recommendations of the Stratégie's follow-up (ticket Stratégie § 14),
// computed by code from real data only, each citing the data it rests on (CLAUDE.md, rule 6:
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
// MKT-C2-02: each has a level decided by its rule, never by a model — a
// missed KPI is an information (the deadline has passed: a review to make),
// a KPI below pace a recommendation, a late upstream step a risk (its
// milestone is threatened), a passed milestone whose deliverable is not
// delivered a blocking — and the task the code proposes: due in a week,
// or on the threatened milestone if it comes first, for the deliverable's
// assignee when it has one (else the project's owner, chosen by the page).

import { formatBriefDate } from "@/lib/framing/assess";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import { addDays, dayOffset } from "@/lib/strategy/calendar";
import { lateSteps, type FollowUpInput } from "@/lib/strategy/follow-up";
import { figure, type KpiRow } from "@/lib/strategy/follow-up-results";

const fr = { strategyCalendar, strategyFollowUp };

export const RECOMMENDATION_LEVELS = [
  "information",
  "recommendation",
  "risk",
  "blocking",
] as const;
export type RecommendationLevel = (typeof RECOMMENDATION_LEVELS)[number];

export type RecommendationRule =
  "kpi_missed" | "kpi_pace" | "upstream" | "undelivered";

const LEVEL: Record<RecommendationRule, RecommendationLevel> = {
  kpi_missed: "information",
  kpi_pace: "recommendation",
  upstream: "risk",
  undelivered: "blocking",
};

export type Recommendation = {
  ruleKey: string;
  rule: RecommendationRule;
  level: RecommendationLevel;
  // The data it rests on, then the action it calls for.
  text: string;
  action: string;
  question: string;
  // The task the code proposes, corrected by the owner before it is created.
  task: {
    assigneeId: string | null;
    dueOn: string;
    // Why that date: a week from today, or the threatened milestone.
    dueBasis: { kind: "week" } | { kind: "milestone"; title: string };
  };
};

/** The anchor of a recommendation still to settle on the follow-up page
 * (its rule key, colons made safe), for a PO conversation's way back. */
export const recommendationAnchor = (ruleKey: string) =>
  `rec-${ruleKey.replace(/[^a-z0-9_-]/g, "-")}`;

// A task made from a recommendation is due a week later at most.
export const TASK_DAYS = 7;

type Found = Pick<Recommendation, "ruleKey" | "rule" | "text" | "action"> & {
  assigneeId?: string | null;
  milestone?: { title: string; date: string };
};

// Below this share of the expected pace, the KPI deserves a look.
const PACE_THRESHOLD = 0.8;

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
  const list: Found[] = [];

  for (const k of kpis) {
    if (!k.actual || !k.target || !k.dueOn) continue;
    const { value, on } = k.actual;
    if (on >= k.dueOn) {
      if (value < k.target)
        list.push({
          ruleKey: `kpi_missed:${k.id}`,
          rule: "kpi_missed",
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
        rule: "kpi_pace",
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

  const assignees = new Map(
    input.deliverables.map((d) => [d.id, d.assignee_person_id ?? null]),
  );
  for (const { chain, late } of lateSteps(input))
    for (const step of late)
      list.push({
        ruleKey: `upstream:${chain.deliverableId}:${step.key}`,
        rule: "upstream",
        assigneeId: assignees.get(chain.deliverableId),
        milestone: { title: chain.milestoneTitle, date: chain.milestoneDate },
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
      rule: "undelivered",
      assigneeId: assignees.get(m.deliverable_id),
      text: t.undelivered(m.title, formatBriefDate(m.occurs_on), deliverable),
      action: t.undeliveredAction(deliverable, m.title),
    });
  }

  const week = addDays(input.today, TASK_DAYS);
  return list
    .filter((rec) => !settled.has(rec.ruleKey))
    .map(({ assigneeId, milestone, ...rec }) => ({
      ...rec,
      level: LEVEL[rec.rule],
      question: t.question(projectTitle, rec.text),
      task: {
        assigneeId: assigneeId ?? null,
        ...(milestone && milestone.date >= input.today && milestone.date < week
          ? {
              dueOn: milestone.date,
              dueBasis: { kind: "milestone" as const, title: milestone.title },
            }
          : { dueOn: week, dueBasis: { kind: "week" as const } }),
      },
    }));
}
