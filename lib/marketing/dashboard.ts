// The Marketing dashboard (ticket « Suivi & bilan », écran 1): every figure is
// computed here from the activations and their evidence, never by PO, with
// the rule it follows. A report keeps the version of the rules it was built
// with (RULES_VERSION): changing a rule means a new version here, older
// reports keep being read with theirs, never recalculated silently.
// Pure, client-safe.

import type {
  Activation,
  ActivationKind,
  ActivationStatus,
  Evidence,
  EvidenceKind,
  Verification,
} from "@/lib/marketing/model";

export const RULES_VERSION = 1;

export type DashboardFilters = {
  from: string | null;
  to: string | null;
  kind: ActivationKind | null;
  owner: string | null;
  status: ActivationStatus | null;
  // Who declared the evidence (author or organism), as typed.
  source: string | null;
  level: Verification | null;
  // Activations with or without an open reserve (lot 5).
  reserve: "open" | "none" | null;
};

export const NO_FILTERS: DashboardFilters = {
  from: null,
  to: null,
  kind: null,
  owner: null,
  status: null,
  source: null,
  level: null,
  reserve: null,
};

export type ReserveFact = {
  id: string;
  activationId: string | null;
  // open / arbitrated / lifted / followed (after the closing) / closed.
  state: "open" | "arbitrated" | "lifted" | "followed" | "closed";
};

export type BudgetFact = {
  plannedCents: number;
  committedCents: number;
  paidCents: number;
} | null;

export type DashboardInput = {
  activations: Activation[];
  evidence: Evidence[];
  reserves: ReserveFact[];
  // Null: the viewer may not read the budget, or it could not be read.
  budget: BudgetFact;
  budgetRestricted: boolean;
};

// What a figure counts: activations or evidence, kept so its detail lists
// exactly what was counted.
export type Figure = {
  key: FigureKey;
  // Null: not available (never shown as 0).
  value: number | null;
  activationIds: string[];
  evidenceIds: string[];
};

export const FIGURE_KEYS = [
  "activations",
  "status_planned",
  "status_in_progress",
  "status_done",
  "status_cancelled",
  "publications_declared",
  "publications_to_verify",
  "publications_verified",
  "publications_missing_link",
  "coverage_declared",
  "coverage_to_verify",
  "coverage_verified",
  "statistics_declared",
  "statistics_verified",
  "statistics_partial",
  "statistics_unavailable",
  "budget_planned",
  "budget_committed",
  "budget_paid",
  "reserves_open",
  "reserves_arbitrated",
  "reserves_lifted",
  "reserves_followed",
] as const;
export type FigureKey = (typeof FIGURE_KEYS)[number];

export const isFigureKey = (v: unknown): v is FigureKey =>
  (FIGURE_KEYS as readonly unknown[]).includes(v);

// A metric's totals: declared and verified kept apart; null = no available
// value (every figure unavailable), never 0 — or rates that cannot be added
// (notAddable: a percentage is never summed, lib/activations/totals.ts).
export type MetricTotal = {
  metric: string;
  declared: number | null;
  verified: number | null;
  notAddable: boolean;
  partial: number;
  unavailable: number;
};

export type Dashboard = {
  rulesVersion: number;
  figures: Record<FigureKey, Figure>;
  metrics: MetricTotal[];
  // In the project, outside the filters (period, type…): said, not hidden.
  excludedActivationIds: string[];
};

// An activation crosses the period when its dates overlap it; without any
// date it is outside a dated period (and listed as excluded).
function inPeriod(a: Activation, from: string | null, to: string | null) {
  if (!from && !to) return true;
  const start = a.startsOn ?? a.endsOn;
  const end = a.endsOn ?? a.startsOn;
  if (!start || !end) return false;
  return (!to || start <= to) && (!from || end >= from);
}

const normalize = (s: string) => s.trim().toLocaleLowerCase("fr-FR");

/** The figures of the dashboard for these filters, rules v1. */
export function computeDashboard(
  input: DashboardInput,
  filters: DashboardFilters = NO_FILTERS,
): Dashboard {
  const live = input.activations.filter((a) => a.archivedAt === null);
  const openReserve = new Set(
    input.reserves
      .filter((r) => r.state === "open" || r.state === "arbitrated")
      .map((r) => r.activationId),
  );
  const scoped = live.filter(
    (a) =>
      inPeriod(a, filters.from, filters.to) &&
      (!filters.kind || a.kind === filters.kind) &&
      (!filters.owner || a.ownerPersonId === filters.owner) &&
      (!filters.status || a.status === filters.status) &&
      (!filters.reserve ||
        (filters.reserve === "open") === openReserve.has(a.id)),
  );
  const ids = new Set(scoped.map((a) => a.id));
  const evidence = input.evidence.filter(
    (e) =>
      e.archivedAt === null &&
      ids.has(e.activationId) &&
      (!filters.source ||
        (e.reportedBy !== null &&
          normalize(e.reportedBy) === normalize(filters.source))) &&
      (!filters.level || e.verification === filters.level),
  );

  const activationFigure = (key: FigureKey, list: Activation[]): Figure => ({
    key,
    value: list.length,
    activationIds: list.map((a) => a.id),
    evidenceIds: [],
  });
  const evidenceFigure = (
    key: FigureKey,
    kind: EvidenceKind,
    keep: (e: Evidence) => boolean,
  ): Figure => {
    const list = evidence.filter((e) => e.kind === kind && keep(e));
    return {
      key,
      value: list.length,
      activationIds: [...new Set(list.map((e) => e.activationId))],
      evidenceIds: list.map((e) => e.id),
    };
  };
  const budgetFigure = (key: FigureKey, cents: number | undefined): Figure => ({
    key,
    value: input.budget && cents !== undefined ? cents : null,
    activationIds: [],
    evidenceIds: [],
  });
  const reserveFigure = (
    key: FigureKey,
    state: ReserveFact["state"],
  ): Figure => {
    const list = input.reserves.filter(
      (r) =>
        r.state === state &&
        (r.activationId === null || ids.has(r.activationId)),
    );
    return {
      key,
      value: list.length,
      activationIds: [
        ...new Set(
          list.flatMap((r) => (r.activationId ? [r.activationId] : [])),
        ),
      ],
      evidenceIds: [],
    };
  };
  const available = (e: Evidence) => e.availability === "available";

  const figures: Record<FigureKey, Figure> = {
    activations: activationFigure("activations", scoped),
    status_planned: activationFigure(
      "status_planned",
      scoped.filter((a) => a.status === "planned"),
    ),
    status_in_progress: activationFigure(
      "status_in_progress",
      scoped.filter((a) => a.status === "in_progress"),
    ),
    status_done: activationFigure(
      "status_done",
      scoped.filter((a) => a.status === "done"),
    ),
    status_cancelled: activationFigure(
      "status_cancelled",
      scoped.filter((a) => a.status === "cancelled"),
    ),
    publications_declared: evidenceFigure(
      "publications_declared",
      "publication",
      (e) => e.verification === "declared",
    ),
    publications_to_verify: evidenceFigure(
      "publications_to_verify",
      "publication",
      (e) => e.verification === "to_verify",
    ),
    publications_verified: evidenceFigure(
      "publications_verified",
      "publication",
      (e) => e.verification === "verified",
    ),
    publications_missing_link: evidenceFigure(
      "publications_missing_link",
      "publication",
      (e) => e.url === null,
    ),
    coverage_declared: evidenceFigure(
      "coverage_declared",
      "coverage",
      (e) => e.verification === "declared",
    ),
    coverage_to_verify: evidenceFigure(
      "coverage_to_verify",
      "coverage",
      (e) => e.verification === "to_verify",
    ),
    coverage_verified: evidenceFigure(
      "coverage_verified",
      "coverage",
      (e) => e.verification === "verified",
    ),
    statistics_declared: evidenceFigure(
      "statistics_declared",
      "statistic",
      (e) => available(e) && e.verification !== "verified",
    ),
    statistics_verified: evidenceFigure(
      "statistics_verified",
      "statistic",
      (e) => available(e) && e.verification === "verified",
    ),
    statistics_partial: evidenceFigure(
      "statistics_partial",
      "statistic",
      (e) => e.availability === "partial",
    ),
    statistics_unavailable: evidenceFigure(
      "statistics_unavailable",
      "statistic",
      (e) => e.availability === "unavailable",
    ),
    budget_planned: budgetFigure("budget_planned", input.budget?.plannedCents),
    budget_committed: budgetFigure(
      "budget_committed",
      input.budget?.committedCents,
    ),
    budget_paid: budgetFigure("budget_paid", input.budget?.paidCents),
    reserves_open: reserveFigure("reserves_open", "open"),
    reserves_arbitrated: reserveFigure("reserves_arbitrated", "arbitrated"),
    reserves_lifted: reserveFigure("reserves_lifted", "lifted"),
    reserves_followed: reserveFigure("reserves_followed", "followed"),
  };

  // Totals by metric: only values that exist are added up; a metric with
  // nothing available stays « Indisponible ».
  const byMetric = new Map<string, Evidence[]>();
  for (const e of evidence) {
    if (e.kind !== "statistic" || !e.metric) continue;
    const key = normalize(e.metric);
    byMetric.set(key, [...(byMetric.get(key) ?? []), e]);
  }
  const sum = (list: Evidence[]) =>
    list.length === 0
      ? null
      : list.reduce((total, e) => total + (e.value ?? 0), 0);
  const metrics: MetricTotal[] = [...byMetric.values()].map((list) => {
    const withValue = list.filter((e) => e.value !== null);
    const declared = withValue.filter((e) => e.verification !== "verified");
    const verified = withValue.filter((e) => e.verification === "verified");
    const rate = list[0].unit === "percent";
    const total = (part: Evidence[]) =>
      rate && part.length > 1 ? null : sum(part);
    return {
      metric: list[0].metric ?? "",
      declared: total(declared),
      verified: total(verified),
      notAddable: rate && (declared.length > 1 || verified.length > 1),
      partial: list.filter((e) => e.availability === "partial").length,
      unavailable: list.filter((e) => e.availability === "unavailable").length,
    };
  });

  return {
    rulesVersion: RULES_VERSION,
    figures,
    metrics,
    excludedActivationIds: live.filter((a) => !ids.has(a.id)).map((a) => a.id),
  };
}

// « Tous » in a filter select (an item cannot hold ""): no filter.
export const ANY_FILTER = "all";

const iso = (v: string | null) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

/** The filters read from the page's URL; anything unknown is ignored. */
export function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
  allowed: {
    kinds: readonly string[];
    statuses: readonly string[];
    levels: readonly string[];
  },
): DashboardFilters {
  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" && v.trim() !== "" && v !== ANY_FILTER
      ? v.trim()
      : null;
  };
  const pick = <T extends string>(key: string, list: readonly string[]) => {
    const v = one(key);
    return v && list.includes(v) ? (v as T) : null;
  };
  const owner = one("owner");
  const reserve = one("reserve");
  return {
    from: iso(one("from")),
    to: iso(one("to")),
    kind: pick<ActivationKind>("kind", allowed.kinds),
    owner: owner && /^[0-9a-f-]{36}$/.test(owner) ? owner : null,
    status: pick<ActivationStatus>("status", allowed.statuses),
    source: one("source")?.slice(0, 200) ?? null,
    level: pick<Verification>("level", allowed.levels),
    reserve: reserve === "open" || reserve === "none" ? reserve : null,
  };
}

export const hasFilters = (f: DashboardFilters) =>
  Object.values(f).some((v) => v !== null);

// How the figures are shown, group by group (écran 1, « Indicateurs
// minimaux »).
export const FIGURE_GROUPS = {
  activations: [
    "activations",
    "status_planned",
    "status_in_progress",
    "status_done",
    "status_cancelled",
  ],
  publications: [
    "publications_declared",
    "publications_to_verify",
    "publications_verified",
    "publications_missing_link",
  ],
  coverage: ["coverage_declared", "coverage_to_verify", "coverage_verified"],
  statistics: [
    "statistics_declared",
    "statistics_verified",
    "statistics_partial",
    "statistics_unavailable",
  ],
  budget: ["budget_planned", "budget_committed", "budget_paid"],
  reserves: [
    "reserves_open",
    "reserves_arbitrated",
    "reserves_lifted",
    "reserves_followed",
  ],
} as const satisfies Record<string, readonly FigureKey[]>;
export type FigureGroup = keyof typeof FIGURE_GROUPS;
