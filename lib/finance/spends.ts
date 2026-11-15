// Finance › Dépenses (lot 3 of Ibé's ticket « Cockpit Finance »): every
// spend of the label, as finance_spends() reads it. Client-safe, pure code.

import { formatDay } from "@/lib/utils/day";
import {
  budgetLineTtcCents,
  type BudgetFamily,
  type BudgetStatus,
  type BudgetTargetKind,
} from "@/lib/budget/types";

export type FinanceSpend = {
  id: string;
  label: string;
  // HT, as every budget; its VAT when given.
  cents: number;
  // What it was forecast at when entered (lot 4).
  forecastCents: number;
  vatBp: number | null;
  family: BudgetFamily | null;
  familyDetail: string | null;
  // « Sous-poste », under its poste (lot 4).
  subpost: string | null;
  status: BudgetStatus;
  spentOn: string;
  // The invoice's due day, else the spend's own.
  dueOn: string | null;
  target: { kind: BudgetTargetKind; id: string };
  supplierContactId: string | null;
  supplier: string | null;
  rebillable: boolean;
  // The live expected income rebilling it, if any.
  rebillIncomeId: string | null;
  validatorId: string | null;
  note: string | null;
  hasProof: boolean;
  // Matched in full with the bank (lot 6): paid for Finance, whatever the
  // line's own state, which `status` then says « paid ».
  paidByBank: boolean;
  proof: { path: string; name: string } | null;
  refused: boolean;
};

/** The money out of a spend (HT + VAT when known). */
export const spendTtc = (spend: Pick<FinanceSpend, "cents" | "vatBp">) =>
  budgetLineTtcCents(spend.cents, spend.vatBp);

// The ticket's four stages of a spend (« prévu, commandé, facturé, payé »):
// a proposed quote counts as planned until accepted.
export const SPEND_STAGES = [
  "planned",
  "committed",
  "invoiced",
  "paid",
] as const;
export type SpendStage = (typeof SPEND_STAGES)[number];

export const spendStage = (status: BudgetStatus): SpendStage =>
  status === "proposed" ? "planned" : status;

/** Invoiced or paid: its proof is due (« sans justificatif », the alerts). */
export const proofExpected = (spend: Pick<FinanceSpend, "status">) => {
  const stage = spendStage(spend.status);
  return stage === "invoiced" || stage === "paid";
};

/** A rebillable spend with no expected income to pay it back (« dépense
 * refacturable sans remboursement planifié »). */
export const rebillMissing = (spend: FinanceSpend) =>
  spend.rebillable && !spend.rebillIncomeId && !spend.refused;

/** The day the money goes out: paid on its day, else its due day. */
export const spendDay = (spend: FinanceSpend) =>
  spend.status === "paid" ? spend.spentOn : (spend.dueOn ?? spend.spentOn);

// Dates as Finance says them: « 16/11 » in a table, « Lun. 16/11 » in a
// sheet; the year only when it is not the current one.
const dropYear = (full: string) =>
  full.endsWith(formatDay(new Date(), { weekday: false }).slice(-4))
    ? full.slice(0, -5)
    : full;
export const tableDay = (value: string) =>
  dropYear(formatDay(value, { weekday: false }));
export const sheetDay = (value: string) => dropYear(formatDay(value));
