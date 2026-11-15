// Finance › Budgets (lot 4 of Ibé's ticket « Cockpit Finance »): every
// envelope (project, artist, cost center) with « budget initial, révisions,
// prévu, engagé, facturé, payé, reste disponible, remboursable/refacturable
// et écart au prévisionnel », by poste and sub-post. Client-safe, pure code:
// every figure is computed here from the lines (CLAUDE.md, rule 6).

import type { BudgetFamily } from "@/lib/budget/types";
import { spendStage, type FinanceSpend } from "@/lib/finance/spends";

export const ENVELOPE_KINDS = ["project", "artist", "cost_center"] as const;
export type EnvelopeKind = (typeof ENVELOPE_KINDS)[number];

export type Revision = {
  beforeCents: number | null;
  afterCents: number | null;
  reason: string | null;
  at: string;
};

export type Envelope = {
  kind: EnvelopeKind;
  id: string;
  name: string;
  archived: boolean;
  // Its amount now (null: no envelope set, a project without budget).
  currentCents: number | null;
  // An artist's envelope covers its period only (BUD 2).
  period: { startsOn: string; endsOn: string | null } | null;
  // Oldest first.
  revisions: Revision[];
  // The share PDS finances, in basis points (100 % by default).
  pdsShareBp: number;
};

export type Totals = {
  // What every line was forecast at when entered.
  forecastCents: number;
  // Lines at their stage now (HT).
  plannedCents: number;
  committedCents: number;
  invoicedCents: number;
  paidCents: number;
  // What the lines cost now, every stage: planned + committed + invoiced +
  // paid.
  projectedCents: number;
  rebillableCents: number;
  lines: number;
};

export type EnvelopeRow = Envelope & {
  totals: Totals;
  initialCents: number | null;
  revisionsCents: number;
  // Committed, invoiced or paid: what the envelope already spent.
  engagedCents: number;
  restCents: number | null;
  // « Écart au prévisionnel »: what the lines cost now less their forecast.
  gapCents: number;
  pdsPartCents: number;
};

const EMPTY: Totals = {
  forecastCents: 0,
  plannedCents: 0,
  committedCents: 0,
  invoicedCents: 0,
  paidCents: 0,
  projectedCents: 0,
  rebillableCents: 0,
  lines: 0,
};

/** The totals of some lines (a refused quote never counts). */
export function totalsOf(spends: FinanceSpend[]): Totals {
  return spends
    .filter((s) => !s.refused)
    .reduce((t, s) => {
      const stage = spendStage(s.status);
      return {
        forecastCents: t.forecastCents + s.forecastCents,
        plannedCents: t.plannedCents + (stage === "planned" ? s.cents : 0),
        committedCents:
          t.committedCents + (stage === "committed" ? s.cents : 0),
        invoicedCents: t.invoicedCents + (stage === "invoiced" ? s.cents : 0),
        paidCents: t.paidCents + (stage === "paid" ? s.cents : 0),
        projectedCents: t.projectedCents + s.cents,
        rebillableCents: t.rebillableCents + (s.rebillable ? s.cents : 0),
        lines: t.lines + 1,
      };
    }, EMPTY);
}

export const engagedOf = (t: Totals) =>
  t.committedCents + t.invoicedCents + t.paidCents;

/** The lines an envelope counts: a project's, a cost center's, an artist's
 * direct spends within its envelope's period. */
export function linesOf(envelope: Envelope, spends: FinanceSpend[]) {
  return spends.filter(
    (s) =>
      s.target.kind === envelope.kind &&
      s.target.id === envelope.id &&
      (!envelope.period ||
        (s.spentOn >= envelope.period.startsOn &&
          (!envelope.period.endsOn || s.spentOn <= envelope.period.endsOn))),
  );
}

export function envelopeRow(
  envelope: Envelope,
  spends: FinanceSpend[],
): EnvelopeRow {
  const totals = totalsOf(linesOf(envelope, spends));
  const first = envelope.revisions[0];
  const initialCents = first ? first.beforeCents : envelope.currentCents;
  const engagedCents = engagedOf(totals);
  return {
    ...envelope,
    totals,
    initialCents,
    revisionsCents: (envelope.currentCents ?? 0) - (initialCents ?? 0),
    engagedCents,
    restCents:
      envelope.currentCents === null
        ? null
        : envelope.currentCents - engagedCents,
    gapCents: totals.projectedCents - totals.forecastCents,
    pdsPartCents: Math.round((engagedCents * envelope.pdsShareBp) / 10000),
  };
}

export type PostRow = {
  family: BudgetFamily | null;
  totals: Totals;
  // The sub-posts under it, each with its lines.
  subposts: { name: string | null; totals: Totals; lines: FinanceSpend[] }[];
};

/** The lines by poste, then sub-post, the largest first. */
export function byPost(spends: FinanceSpend[]): PostRow[] {
  const live = spends.filter((s) => !s.refused);
  const families = [...new Set(live.map((s) => s.family))];
  return families
    .map((family) => {
      const ofFamily = live.filter((s) => s.family === family);
      const names = [...new Set(ofFamily.map((s) => s.subpost))];
      return {
        family,
        totals: totalsOf(ofFamily),
        subposts: names
          .map((name) => {
            const lines = ofFamily.filter((s) => s.subpost === name);
            return { name, totals: totalsOf(lines), lines };
          })
          .sort((a, b) => b.totals.projectedCents - a.totals.projectedCents),
      };
    })
    .sort((a, b) => b.totals.projectedCents - a.totals.projectedCents);
}

/** The month by month bars of some lines (paid, engaged not paid,
 * planned), every month they touch up to now (lib/finance/period.ts). */
export function spendMonthBars(
  spends: FinanceSpend[],
  months: string[],
): {
  month: string;
  paidCents: number;
  unpaidCents: number;
  estimatedCents: number;
}[] {
  return months.map((month) => {
    const t = totalsOf(spends.filter((s) => s.spentOn.startsWith(month)));
    return {
      month,
      paidCents: t.paidCents,
      unpaidCents: t.committedCents + t.invoicedCents,
      estimatedCents: t.plannedCents,
    };
  });
}
