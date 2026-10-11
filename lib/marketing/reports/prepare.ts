// What PO shows before a report is generated (ticket « Suivi & bilan », écran 2:
// « les données manquantes, incohérences, activations exclues et réserves
// proposées »). Computed here from the data, never by a model; the reserves
// are only proposed: the author ticks the ones kept. Pure, client-safe.

import type { Activation, Evidence } from "@/lib/marketing/model";
import type { ReserveCategory } from "@/lib/marketing/reports/model";

export type CheckKind =
  | "no_evidence"
  | "done_without_publication"
  | "published_not_done"
  | "unreachable_link"
  | "statistic_without_period"
  | "not_finished";

export type PreparationCheck = {
  kind: CheckKind;
  activationId: string;
  evidenceId: string | null;
};

export type ProposedReserve = {
  // Stable across renders: the preparation keeps what the author ticked.
  key: string;
  category: ReserveCategory;
  // How many records it is about; the sentence is written by the screen.
  count: number;
  activationId: string | null;
};

export type Preparation = {
  missing: PreparationCheck[];
  inconsistencies: PreparationCheck[];
  excluded: Activation[];
  reserves: ProposedReserve[];
};

/** The checks and proposed reserves for this scope of live activations. */
export function prepareReport(
  activations: Activation[],
  evidence: Evidence[],
  scope: string[],
  // Categories that already have an open reserve: carried over by the
  // report as they are, never proposed twice.
  openCategories: readonly ReserveCategory[] = [],
): Preparation {
  const live = activations.filter((a) => a.archivedAt === null);
  const inScope = live.filter((a) => scope.includes(a.id));
  const ev = evidence.filter(
    (e) => e.archivedAt === null && scope.includes(e.activationId),
  );
  const of = (a: Activation) => ev.filter((e) => e.activationId === a.id);

  const missing: PreparationCheck[] = [
    ...inScope
      .filter((a) => of(a).length === 0)
      .map((a) => ({
        kind: "no_evidence" as const,
        activationId: a.id,
        evidenceId: null,
      })),
    ...inScope
      .filter(
        (a) =>
          a.status === "done" &&
          of(a).length > 0 &&
          !of(a).some((e) => e.kind === "publication"),
      )
      .map((a) => ({
        kind: "done_without_publication" as const,
        activationId: a.id,
        evidenceId: null,
      })),
    ...ev
      .filter(
        (e) =>
          e.kind === "statistic" &&
          e.availability !== "unavailable" &&
          !e.periodStart &&
          !e.periodEnd,
      )
      .map((e) => ({
        kind: "statistic_without_period" as const,
        activationId: e.activationId,
        evidenceId: e.id,
      })),
  ];
  const inconsistencies: PreparationCheck[] = [
    ...inScope
      .filter(
        (a) =>
          (a.status === "planned" || a.status === "cancelled") &&
          of(a).some((e) => e.kind === "publication"),
      )
      .map((a) => ({
        kind: "published_not_done" as const,
        activationId: a.id,
        evidenceId: null,
      })),
    ...ev
      .filter((e) => e.linkUnreachableAt !== null)
      .map((e) => ({
        kind: "unreachable_link" as const,
        activationId: e.activationId,
        evidenceId: e.id,
      })),
    ...inScope
      .filter((a) => a.status === "planned" || a.status === "in_progress")
      .map((a) => ({
        kind: "not_finished" as const,
        activationId: a.id,
        evidenceId: null,
      })),
  ];

  const count = (keep: (e: Evidence) => boolean) => ev.filter(keep).length;
  const publications = count(
    (e) =>
      e.kind === "publication" &&
      (e.verification !== "verified" || e.linkUnreachableAt !== null),
  );
  const statistics =
    count(
      (e) =>
        e.kind === "statistic" &&
        (e.availability !== "available" || e.verification !== "verified"),
    ) +
    inScope.filter((a) => !of(a).some((e) => e.kind === "statistic")).length;
  const coverage = count(
    (e) => e.kind === "coverage" && e.verification !== "verified",
  );
  const unfinished = inScope.filter(
    (a) => a.status === "planned" || a.status === "in_progress",
  ).length;
  const reserves: ProposedReserve[] = (
    [
      ["links", publications],
      ["statistics", statistics],
      ["coverage", coverage],
      ["activations", unfinished],
    ] as const
  )
    .filter(([category, n]) => n > 0 && !openCategories.includes(category))
    .map(([category, n]) => ({
      key: category,
      category,
      count: n,
      activationId: null,
    }));

  return {
    missing,
    inconsistencies,
    excluded: live.filter((a) => !scope.includes(a.id)),
    reserves,
  };
}
