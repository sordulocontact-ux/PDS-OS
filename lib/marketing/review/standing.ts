// « Où on en est » of the Suivi & bilan (proto `dashboard`, `dashData`):
// four sentences, each opening its list and its rule, then the detail
// figures by group. Every figure lists what it counts; a value with no
// source is « — », never invented, never zero. Computed by code from the
// data. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type { Dashboard, FigureKey } from "@/lib/marketing/dashboard";
import type { Activation, Evidence } from "@/lib/marketing/model";
import type { Reserve } from "@/lib/marketing/reserves/queries";

import {
  isRealised,
  phaseOf,
  PHASES,
  proofBucket,
  type ReviewActivation,
} from "./phase";

const t = fr.reviewJourney.standing;
const d = fr.marketingReview.dashboard;
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export const money = (cents: number) =>
  fr.moduleFrame.facts.budgetValue(euros.format(cents / 100));

export type StandingItem = {
  key: string;
  title: string;
  detail: string | null;
};

export type StandingFigure = {
  key: string;
  // The tile's word (« À préparer »), the modal's title.
  label: string;
  title: string;
  value: string;
  rule: string;
  items: StandingItem[];
  // No source of the app gives it yet: « — ».
  unsourced?: boolean;
};

export type StandingRow = {
  key: string;
  text: string;
  sub: string | null;
  figure: StandingFigure;
};

export type StandingGroup = {
  key: string;
  label: string;
  figures: StandingFigure[];
};

export type Standing = {
  empty: boolean;
  rows: StandingRow[];
  groups: StandingGroup[];
};

export type BudgetLineFact = {
  id: string;
  label: string;
  amountCents: number;
  status: string;
};

export type StandingInput = {
  activations: ReviewActivation[];
  // The figures of the live dashboard, filtered (lib/marketing/dashboard.ts),
  // and what they count.
  dashboard: Dashboard;
  live: { activations: Activation[]; evidence: Evidence[] };
  reserves: Reserve[];
  marketingClosed: boolean;
  // Null: the viewer may not read the budget.
  budget: { envelopeCents: number | null; lines: BudgetLineFact[] } | null;
};

const phaseLabel = (a: ReviewActivation) => {
  const phase = phaseOf(a);
  return phase === null ? t.labels.cancelled : t.labels.phases[phase];
};

export function computeStanding(input: StandingInput): Standing {
  const { activations, dashboard, live, reserves, budget } = input;
  const titleOf = (id: string) =>
    live.activations.find((a) => a.id === id)?.title ??
    activations.find((a) => a.id === id)?.title ??
    "";
  const figure = (
    key: string,
    group: string,
    label: string,
    items: StandingItem[],
    rule: string,
    value: string = String(items.length),
  ): StandingFigure => ({
    key,
    label,
    title: `${group} · ${label} · ${value}`,
    value,
    rule,
    items,
  });
  const actItem = (a: ReviewActivation, detail: string | null) => ({
    key: a.id,
    title: a.title,
    detail,
  });

  // Activations, filtered like the rest of the detail.
  const scoped = new Set(dashboard.figures.activations.activationIds);
  const acts = activations.filter((a) => scoped.has(a.id));
  const groupActs = t.groups.activations;
  const all = figure(
    "all",
    groupActs,
    t.labels.all,
    acts.map((a) => actItem(a, phaseLabel(a))),
    t.rules.all,
  );
  const phases = PHASES.map((phase) =>
    figure(
      `phase${phase}`,
      groupActs,
      t.labels.phases[phase],
      acts
        .filter((a) => phaseOf(a) === phase)
        .map((a) => actItem(a, a.ownerName ?? t.noOwner)),
      t.rules.phases[phase],
    ),
  );
  const cancelled = figure(
    "cancelled",
    groupActs,
    t.labels.cancelled,
    acts
      .filter((a) => a.status === "cancelled")
      .map((a) => actItem(a, a.reason)),
    t.rules.cancelled,
  );

  // The four sentences read every activation (never the filters).
  const realised = activations.filter(isRealised);
  const proofs: StandingFigure = {
    key: "proofs",
    label: t.labels.proofs,
    title: t.labels.proofs,
    value: String(realised.length),
    rule: t.rules.proofs,
    items: realised.map((a) => actItem(a, t.proof[a.proof])),
  };
  const stats: StandingFigure = {
    key: "stats",
    label: t.labels.stats,
    title: t.labels.stats,
    value: String(realised.length),
    rule: t.rules.stats,
    items: realised.map((a) => actItem(a, t.measure[a.measure])),
  };
  const bucket = (b: string) =>
    realised.filter((a) => proofBucket(a.proof) === b).length;
  const got = realised.filter(
    (a) =>
      a.measure === "available_declared" || a.measure === "available_verified",
  ).length;
  const statsMissing = realised.filter(
    (a) => a.measure === "to_collect",
  ).length;
  const closedCount = activations.filter((a) => a.status === "closed").length;
  const cancelledCount = activations.filter(
    (a) => a.status === "cancelled",
  ).length;

  // Budget lines, for whoever reads the budget.
  const lineItems = (keep: (status: string) => boolean) =>
    (budget?.lines ?? [])
      .filter((l) => keep(l.status))
      .map((l) => ({
        key: l.id,
        title: l.label,
        detail: money(l.amountCents),
      }));
  const sum = (keep: (status: string) => boolean) =>
    (budget?.lines ?? [])
      .filter((l) => keep(l.status))
      .reduce((total, l) => total + l.amountCents, 0);
  // As the budget counts it (lib/budget/types.ts, budgetTotals).
  const committed = (s: string) =>
    s === "committed" || s === "invoiced" || s === "paid";
  const groupBudget = t.groups.budget;
  const budgetFigures = budget
    ? [
        figure(
          "budget_planned",
          groupBudget,
          d.figures.budget_planned,
          lineItems((s) => s === "planned"),
          d.rules.budget_planned,
          money(sum((s) => s === "planned")),
        ),
        figure(
          "budget_committed",
          groupBudget,
          d.figures.budget_committed,
          lineItems(committed),
          t.rules.committed,
          money(sum(committed)),
        ),
        figure(
          "budget_paid",
          groupBudget,
          d.figures.budget_paid,
          lineItems((s) => s === "paid"),
          d.rules.budget_paid,
          money(sum((s) => s === "paid")),
        ),
      ]
    : [];

  const rows: StandingRow[] = [
    {
      key: "all",
      text: t.closed(closedCount, activations.length),
      sub: cancelledCount ? t.cancelled(cancelledCount) : null,
      figure: figure(
        "all",
        groupActs,
        t.labels.all,
        activations.map((a) => actItem(a, phaseLabel(a))),
        t.rules.every,
      ),
    },
    {
      key: "proofs",
      text: realised.length
        ? t.proofs(bucket("verified"), bucket("to_verify"), bucket("missing"))
        : t.proofsNone,
      sub: null,
      figure: proofs,
    },
    {
      key: "stats",
      text: realised.length ? t.stats(got, statsMissing) : t.statsNone,
      sub: null,
      figure: stats,
    },
    ...(budget
      ? [
          {
            key: "budget",
            text: t.budget(
              money(sum(committed)),
              budget.envelopeCents !== null
                ? money(budget.envelopeCents)
                : t.noSource,
            ),
            sub: t.budgetHint,
            figure: {
              ...budgetFigures[1],
              title: `${t.labels.budget} · ${money(sum(committed))}`,
            },
          },
        ]
      : []),
  ];

  // Evidence figures of the live dashboard, each with what it counts.
  const evidenceFigure = (key: FigureKey, group: string): StandingFigure => {
    const f = dashboard.figures[key];
    const items = f.evidenceIds.flatMap((id) => {
      const e = live.evidence.find((x) => x.id === id);
      return e
        ? [
            {
              key: id,
              title: e.label || titleOf(e.activationId),
              detail: titleOf(e.activationId),
            },
          ]
        : [];
    });
    return figure(key, group, d.figures[key], items, d.rules[key]);
  };
  const unsourced = (key: FigureKey, group: string): StandingFigure => ({
    ...figure(key, group, d.figures[key], [], d.rules[key], t.noSource),
    unsourced: true,
  });
  const reserveFigure = (
    key: FigureKey,
    keep: (r: Reserve) => boolean,
    detail: (r: Reserve) => string | null,
  ) =>
    figure(
      key,
      t.groups.reserves,
      d.figures[key],
      reserves.filter(keep).map((r) => ({
        key: r.id,
        title: r.description,
        detail: detail(r),
      })),
      d.rules[key],
    );
  const decisions = fr.reviewJourney.reserves.decisions;
  const categories = fr.marketingReview.reports.reserveCategories;
  const followed = (r: Reserve) =>
    input.marketingClosed &&
    r.status === "arbitrated" &&
    r.decision === "follow_up";

  const groups: StandingGroup[] = [
    {
      key: "activations",
      label: groupActs,
      figures: [all, ...phases, cancelled],
    },
    {
      key: "publications",
      label: t.groups.publications,
      figures: (
        [
          "publications_declared",
          "publications_verified",
          "publications_missing_link",
        ] as const
      ).map((k) => evidenceFigure(k, t.groups.publications)),
    },
    {
      key: "coverage",
      label: t.groups.coverage,
      figures: (
        [
          "coverage_declared",
          "coverage_verified",
          "coverage_to_verify",
        ] as const
      ).map((k) => evidenceFigure(k, t.groups.coverage)),
    },
    {
      key: "statistics",
      label: t.groups.statistics,
      figures: [
        evidenceFigure("statistics_declared", t.groups.statistics),
        evidenceFigure("statistics_verified", t.groups.statistics),
        unsourced("statistics_partial", t.groups.statistics),
        unsourced("statistics_unavailable", t.groups.statistics),
      ],
    },
    ...(budget
      ? [{ key: "budget", label: groupBudget, figures: budgetFigures }]
      : []),
    {
      key: "reserves",
      label: t.groups.reserves,
      figures: [
        reserveFigure(
          "reserves_open",
          (r) => r.status === "open",
          (r) => categories[r.category],
        ),
        reserveFigure(
          "reserves_arbitrated",
          (r) => r.status === "arbitrated" && !followed(r),
          (r) => (r.decision ? decisions[r.decision] : null),
        ),
        reserveFigure(
          "reserves_lifted",
          (r) => r.status === "lifted" || r.status === "closed",
          (r) => r.lifted?.note ?? null,
        ),
        reserveFigure("reserves_followed", followed, (r) => r.followUp.name),
      ],
    },
  ];

  return { empty: activations.length === 0, rows, groups };
}
