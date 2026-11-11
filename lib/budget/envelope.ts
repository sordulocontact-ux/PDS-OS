// The envelope of an artist (BUD 2): an amount split by poste, over a
// period. Client-safe, pure code: what is spent comes from the database
// (artist_budget_usage), every remainder and overrun is computed here, never
// by PO (CLAUDE.md, rule 6).

import {
  BUDGET_FAMILIES,
  isBudgetFamily,
  type BudgetFamily,
} from "@/lib/budget/types";

export type ArtistEnvelope = {
  id: string;
  amountCents: number;
  // « AAAA-MM-JJ »; no last day: open-ended.
  startsOn: string;
  endsOn: string | null;
  // Set once another envelope was opened: history.
  closedAt: string | null;
  posts: Partial<Record<BudgetFamily, number>>;
};

/** One poste as artist_budget_usage reads it (null: lines without one). */
export type EnvelopeUsage = {
  family: BudgetFamily | null;
  allocatedCents: number;
  // Engaged, invoiced or paid: what the artist is bound to pay.
  spentCents: number;
  // Estimated or quoted: not taken yet.
  pendingCents: number;
  directCents: number;
  projectCents: number;
};

export type EnvelopePostRow = EnvelopeUsage & {
  // Allotted minus spent; null for a poste given nothing (it draws on what
  // is not allotted).
  restCents: number | null;
  over: boolean;
};

export type EnvelopeView = {
  rows: EnvelopePostRow[];
  allocatedCents: number;
  // The part of the amount given to no poste.
  unallocatedCents: number;
  spentCents: number;
  pendingCents: number;
  directCents: number;
  projectCents: number;
  // Amount minus spent; negative = overrun.
  restCents: number;
  over: boolean;
};

export function usageOf(row: {
  family: string | null;
  allocated_cents: number;
  spent_cents: number;
  pending_cents: number;
  direct_cents: number;
  project_cents: number;
}): EnvelopeUsage {
  return {
    family: isBudgetFamily(row.family) ? row.family : null,
    allocatedCents: row.allocated_cents,
    spentCents: row.spent_cents,
    pendingCents: row.pending_cents,
    directCents: row.direct_cents,
    projectCents: row.project_cents,
  };
}

const order = (family: BudgetFamily | null) =>
  family === null ? BUDGET_FAMILIES.length : BUDGET_FAMILIES.indexOf(family);

/**
 * The envelope as its tab shows it: each poste allotted or spent, in the
 * order of the postes (those without one last), its remainder, its overrun
 * (spent beyond what it was given: signalled, never blocking); the totals.
 */
export function envelopeView(
  envelope: Pick<ArtistEnvelope, "amountCents">,
  usage: EnvelopeUsage[],
): EnvelopeView {
  const rows = [...usage]
    .sort((a, b) => order(a.family) - order(b.family))
    .map((row): EnvelopePostRow => {
      const restCents =
        row.allocatedCents > 0 ? row.allocatedCents - row.spentCents : null;
      return { ...row, restCents, over: restCents !== null && restCents < 0 };
    });
  const sum = (key: keyof EnvelopeUsage) =>
    usage.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const allocatedCents = sum("allocatedCents");
  const spentCents = sum("spentCents");
  const restCents = envelope.amountCents - spentCents;
  return {
    rows,
    allocatedCents,
    unallocatedCents: envelope.amountCents - allocatedCents,
    spentCents,
    pendingCents: sum("pendingCents"),
    directCents: sum("directCents"),
    projectCents: sum("projectCents"),
    restCents,
    over: restCents < 0,
  };
}

/** What the postes add up to (never more than the amount). */
export function postsTotal(posts: Partial<Record<BudgetFamily, number>>) {
  return Object.values(posts).reduce((total, cents) => total + (cents ?? 0), 0);
}
