// What the Finance page reads (lib/finance/queries.ts), as the code computes
// on it (lib/finance/aggregate.ts). Amounts in cents, excl. tax. Client-safe.

import type { BudgetFamily, BudgetStatus } from "@/lib/budget/types";
import type { Month } from "@/lib/finance/period";

/** The lines of one month, project or artist, poste and state, summed. */
export type FinanceMonthTotal = {
  month: Month;
  projectId: string | null;
  // A direct spend of an artist (never with a project).
  artistId: string | null;
  family: BudgetFamily | null;
  status: BudgetStatus;
  cents: number;
  lines: number;
  // Invoiced or paid with no receipt, file nor invoice.
  noProof: number;
};

export type FinanceProject = {
  id: string;
  title: string;
  // Its artist by the rule every page reads (a collective's main artist).
  artistId: string | null;
  collective: boolean;
  archived: boolean;
  envelopeCents: number | null;
};

export type FinanceArtist = {
  id: string;
  name: string;
  archived: boolean;
  // Its open envelope and what it consumed in its period (BUD 2).
  envelope: {
    cents: number;
    startsOn: string;
    endsOn: string | null;
    spentCents: number;
    pendingCents: number;
  } | null;
};

/** One spend named on the page (« À payer », « Plus grosses dépenses »). */
export type FinanceLine = {
  id: string;
  label: string;
  cents: number;
  family: BudgetFamily | null;
  status: BudgetStatus;
  spentOn: string;
  projectId: string | null;
  artistId: string | null;
  // From its invoice: the day it is to be paid by, who sent it.
  dueOn: string | null;
  contactName: string | null;
};

export type FinanceData = {
  months: FinanceMonthTotal[];
  projects: FinanceProject[];
  artists: FinanceArtist[];
  toPay: FinanceLine[];
  largest: FinanceLine[];
  error: boolean;
};
