// The Strategy's follow-up (ticket § 14), computed by code from what the
// project records: before the release, Prêt / En cours / En attente / Bloqué
// for contents, levers, coordination and validations; after it, each KPI
// against its target and a recommendation only on a real value below it.
// PO never produces a state, a number or a date here (rule 6). Client-safe.

import { fr } from "@/lib/i18n/fr";
import { dayOffset } from "@/lib/strategy/calendar";
import type { UpstreamChain } from "@/lib/strategy/upstream";

export type FollowState = "ready" | "in_progress" | "waiting" | "blocked";
export type FollowItem = {
  key: string;
  label: string;
  line: string;
  state: FollowState;
};
export type FollowGroup = {
  key: "contents" | "levers" | "coordination" | "validations";
  items: FollowItem[];
};

type Deliverable = {
  id: string;
  title: string;
  lever_id: string;
  due_date: string | null;
};
type DesignVersion = {
  deliverable_id: string | null;
  status: string;
  created_at: string;
};

export function followUpBefore(input: {
  deliverables: Deliverable[];
  levers: Array<{ id: string; label: string }>;
  versions: DesignVersion[];
  chains: UpstreamChain[];
  tasks: Array<{ status: string; due_date: string | null }>;
  pendingReviews: number;
  today: string;
}): FollowGroup[] {
  const t = fr.strategyDocs.followUp;
  const latest = new Map<string, DesignVersion>();
  for (const v of [...input.versions].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  ))
    if (v.deliverable_id) latest.set(v.deliverable_id, v);
  const lateChain = new Set(
    input.chains
      .filter((c) => c.steps.some((s) => s.late))
      .map((c) => c.deliverableId),
  );

  const contents: FollowItem[] = input.deliverables.map((d) => {
    const v = latest.get(d.id);
    const late =
      (d.due_date !== null && d.due_date < input.today) || lateChain.has(d.id);
    const [state, line]: [FollowState, string] =
      v?.status === "approved"
        ? ["ready", t.deliverableLine.approved]
        : v?.status === "submitted"
          ? ["in_progress", t.deliverableLine.submitted]
          : v?.status === "changes_requested"
            ? [late ? "blocked" : "in_progress", t.deliverableLine.changes]
            : late
              ? ["blocked", t.deliverableLine.late]
              : ["waiting", t.deliverableLine.none];
    return { key: d.id, label: d.title, line, state };
  });
  const byId = new Map(contents.map((c) => [c.key, c]));

  const levers: FollowItem[] = input.levers.map((l) => {
    const own = input.deliverables
      .filter((d) => d.lever_id === l.id)
      .map((d) => byId.get(d.id)!);
    const ready = own.filter((c) => c.state === "ready").length;
    const state: FollowState =
      own.length === 0
        ? "in_progress"
        : own.some((c) => c.state === "blocked")
          ? "blocked"
          : ready === own.length
            ? "ready"
            : own.some((c) => c.state !== "waiting")
              ? "in_progress"
              : "waiting";
    return {
      key: l.id,
      label: l.label,
      line: t.leverLine(ready, own.length),
      state,
    };
  });

  const open = input.tasks.filter((x) => x.status !== "done");
  const late = open.filter(
    (x) => x.due_date !== null && x.due_date < input.today,
  ).length;
  const coordination: FollowItem = {
    key: "tasks",
    label: t.groups.coordination,
    line: open.length ? t.taskLine(open.length, late) : t.noTasks,
    state: late ? "blocked" : open.length ? "in_progress" : "ready",
  };
  const validations: FollowItem = {
    key: "reviews",
    label: t.groups.validations,
    line: input.pendingReviews
      ? t.reviewsPending(input.pendingReviews)
      : t.noReviews,
    state: input.pendingReviews ? "waiting" : "ready",
  };

  return [
    { key: "contents", items: contents },
    { key: "levers", items: levers },
    { key: "coordination", items: [coordination] },
    { key: "validations", items: [validations] },
  ];
}

export type KpiRow = {
  id: string;
  label: string;
  kind: string;
  target_value: number | null;
  target_text: string | null;
  unit: string | null;
  metric: string;
  actual_value: number | null;
  actual_text: string | null;
};

export type KpiView = KpiRow & {
  // The value compared: noted by a person, or read live (Deezer fans).
  value: number | null;
  live: boolean;
  // Share of the target reached, in whole percent; null when not comparable.
  percent: number | null;
};

export function kpiViews(kpis: KpiRow[], liveFans: number | null): KpiView[] {
  return kpis.map((k) => {
    const live = k.metric === "deezer_fans" && liveFans !== null;
    const value = live ? liveFans : k.actual_value;
    const percent =
      k.kind === "quantitative" && value !== null && k.target_value
        ? Math.floor((value / k.target_value) * 100)
        : null;
    return { ...k, value, live, percent };
  });
}

export type Recommendation = {
  ruleKey: string;
  kpiId: string;
  text: string;
  action: string;
  question: string;
};

const number = (n: number, unit: string | null) =>
  `${new Intl.NumberFormat("fr-FR").format(n)}${unit ? ` ${unit}` : ""}`;

/**
 * One recommendation per quantitative KPI whose real value is below its
 * target, once the release has happened; never on a missing value. A
 * recommendation applied or ignored is not offered again.
 */
export function recommendationsOf(
  views: KpiView[],
  releaseDate: string | null,
  today: string,
  handled: ReadonlySet<string>,
): Recommendation[] {
  const t = fr.strategyDocs.followUp;
  if (!releaseDate) return [];
  const days = dayOffset(today, releaseDate);
  if (days < 1) return [];
  return views.flatMap((k) => {
    const ruleKey = `kpi:${k.id}:below`;
    if (
      k.percent === null ||
      k.percent >= 100 ||
      k.value === null ||
      k.target_value === null ||
      handled.has(ruleKey)
    )
      return [];
    return [
      {
        ruleKey,
        kpiId: k.id,
        text: t.belowTarget(
          k.label,
          number(k.value, k.unit),
          number(k.target_value, k.unit),
          k.percent,
          days,
        ),
        action: t.belowTargetAction(k.label),
        question: t.askPoQuestion(k.label),
      },
    ];
  });
}
