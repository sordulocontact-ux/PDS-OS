// Every figure of the Finance page, computed by code from the month totals
// (never by PO, CLAUDE.md rule 6). The states read as everywhere else
// (lib/budget/types.ts): engaged = committed, invoiced or paid; estimated =
// planned or quoted, never taken from an envelope. Client-safe, pure code.

import type { BudgetFamily, BudgetStatus } from "@/lib/budget/types";
import { inSpan, type Month } from "@/lib/finance/period";
import type {
  FinanceArtist,
  FinanceMonthTotal,
  FinanceProject,
} from "@/lib/finance/types";

const ENGAGED: BudgetStatus[] = ["committed", "invoiced", "paid"];
const ESTIMATED: BudgetStatus[] = ["planned", "proposed"];

export type SpendSums = {
  engagedCents: number;
  paidCents: number;
  // Invoiced, not paid yet.
  invoicedCents: number;
  estimatedCents: number;
  noProof: number;
};

export function spendSums(rows: FinanceMonthTotal[]): SpendSums {
  const sums: SpendSums = {
    engagedCents: 0,
    paidCents: 0,
    invoicedCents: 0,
    estimatedCents: 0,
    noProof: 0,
  };
  for (const r of rows) {
    if (ENGAGED.includes(r.status)) sums.engagedCents += r.cents;
    if (ESTIMATED.includes(r.status)) sums.estimatedCents += r.cents;
    if (r.status === "paid") sums.paidCents += r.cents;
    if (r.status === "invoiced") sums.invoicedCents += r.cents;
    sums.noProof += r.noProof;
  }
  return sums;
}

/** The rows of a period (« Tout »: every row). */
export const ofPeriod = (
  rows: FinanceMonthTotal[],
  span: { from: Month | null; to: Month | null } | null,
) => rows.filter((r) => inSpan(r.month, span));

/** The change from the period before, in whole percents; null when there
 * is nothing to compare with. */
export function changePercent(
  current: number,
  previous: number,
): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type MonthBar = {
  month: Month;
  paidCents: number;
  // Engaged or invoiced, not paid yet.
  unpaidCents: number;
  estimatedCents: number;
};

export function monthBars(
  rows: FinanceMonthTotal[],
  months: Month[],
): MonthBar[] {
  return months.map((month) => {
    const sums = spendSums(rows.filter((r) => r.month === month));
    return {
      month,
      paidCents: sums.paidCents,
      unpaidCents: sums.engagedCents - sums.paidCents,
      estimatedCents: sums.estimatedCents,
    };
  });
}

export type Share<K> = {
  key: K;
  engagedCents: number;
  estimatedCents: number;
};

function shares<K>(
  rows: FinanceMonthTotal[],
  keyOf: (r: FinanceMonthTotal) => K,
): Share<K>[] {
  const map = new Map<K, Share<K>>();
  for (const r of rows) {
    const key = keyOf(r);
    const share = map.get(key) ?? { key, engagedCents: 0, estimatedCents: 0 };
    if (ENGAGED.includes(r.status)) share.engagedCents += r.cents;
    if (ESTIMATED.includes(r.status)) share.estimatedCents += r.cents;
    map.set(key, share);
  }
  return [...map.values()]
    .filter((s) => s.engagedCents > 0)
    .sort((a, b) => b.engagedCents - a.engagedCents);
}

/** What each poste engaged, the costliest first (null: no poste chosen). */
export const familyShares = (rows: FinanceMonthTotal[]) =>
  shares<BudgetFamily | null>(rows, (r) => r.family);

/** What each artist engaged, directly or through its projects (null: a
 * project with no artist). */
export function artistShares(
  rows: FinanceMonthTotal[],
  projects: FinanceProject[],
): Share<string | null>[] {
  const artistOf = new Map(projects.map((p) => [p.id, p.artistId]));
  return shares(
    rows,
    (r) =>
      r.artistId ?? (r.projectId ? (artistOf.get(r.projectId) ?? null) : null),
  );
}

export type BudgetRow = {
  id: string;
  envelopeCents: number | null;
  engagedCents: number;
  estimatedCents: number;
  // Envelope minus engaged; null without an envelope. Negative = overrun.
  restCents: number | null;
};

const byRisk = (a: BudgetRow, b: BudgetRow) => {
  const ratio = (r: BudgetRow) =>
    r.envelopeCents ? r.engagedCents / r.envelopeCents : -1;
  return ratio(b) - ratio(a) || b.engagedCents - a.engagedCents;
};

/** The live projects' budgets, every spend whatever its date (an envelope
 * is the project's whole): the nearest to their envelope first, overruns
 * leading; those without an envelope last, the costliest first. */
export function projectBudgets(
  rows: FinanceMonthTotal[],
  projects: FinanceProject[],
): BudgetRow[] {
  return projects
    .filter((p) => !p.archived)
    .map((p) => {
      const sums = spendSums(rows.filter((r) => r.projectId === p.id));
      return {
        id: p.id,
        envelopeCents: p.envelopeCents,
        engagedCents: sums.engagedCents,
        estimatedCents: sums.estimatedCents,
        restCents:
          p.envelopeCents === null ? null : p.envelopeCents - sums.engagedCents,
      };
    })
    .filter((r) => r.envelopeCents !== null || r.engagedCents > 0)
    .sort(byRisk);
}

/** The artists' open envelopes (BUD 2), what they consumed in their period. */
export function artistBudgets(artists: FinanceArtist[]): BudgetRow[] {
  return artists
    .flatMap((a) =>
      a.envelope && !a.archived
        ? [
            {
              id: a.id,
              envelopeCents: a.envelope.cents,
              engagedCents: a.envelope.spentCents,
              estimatedCents: a.envelope.pendingCents,
              restCents: a.envelope.cents - a.envelope.spentCents,
            },
          ]
        : [],
    )
    .sort(byRisk);
}

/** How many budgets are spent beyond their envelope. */
export const overruns = (rows: BudgetRow[]) =>
  rows.filter((r) => r.restCents !== null && r.restCents < 0).length;
