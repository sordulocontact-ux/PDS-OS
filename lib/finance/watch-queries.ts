import "server-only";

import { financeAlerts, type Alert } from "@/lib/finance/alerts";
import { loadBudgets, type BudgetsData } from "@/lib/finance/budget-queries";
import { envelopeRow } from "@/lib/finance/envelopes";
import type { BankTransaction } from "@/lib/finance/reconcile";
import { loadReconciliation } from "@/lib/finance/reconcile-queries";
import { addDays, computeTreasury } from "@/lib/finance/treasury";
import {
  loadTreasury,
  type TreasuryData,
} from "@/lib/finance/treasury-queries";
import { allInOrder } from "@/lib/utils/parallel";

// The alerts look 90 days ahead (Ibé's ticket, « Alertes utiles »).
export const WATCH_HORIZON = 90;

/**
 * What Finance has to watch (Ibé's ticket « Cockpit Finance », alerts):
 * read once for the Alertes page and for the bell and the ⌘K search of every
 * Finance page (docs/FINANCE-V2.md, lot 5), which also list what it read.
 * Computed by code, never stored.
 */
export async function loadFinanceWatch(today: string): Promise<{
  alerts: Alert[];
  treasury: TreasuryData;
  budgets: BudgetsData;
  // The bank's operations, already read for the alerts (the ⌘K search too).
  transactions: BankTransaction[];
  error: boolean;
}> {
  const [treasury, budgets] = await allInOrder([
    loadTreasury(addDays(today, WATCH_HORIZON)),
    loadBudgets(),
  ]);
  const bank = await loadReconciliation(treasury.incomes);
  const alerts = financeAlerts({
    treasury: computeTreasury({ ...treasury, today, horizon: WATCH_HORIZON }),
    incomes: treasury.incomes,
    spends: budgets.spends,
    envelopes: budgets.envelopes.map((e) => envelopeRow(e, budgets.spends)),
    transactions: bank.transactions,
    engines: treasury.engines,
    today,
    simulate: (engines) =>
      computeTreasury({
        ...treasury,
        engines,
        today,
        horizon: WATCH_HORIZON,
      }),
  });
  return {
    alerts,
    treasury,
    budgets,
    transactions: bank.transactions,
    error: treasury.error || budgets.error || bank.error,
  };
}
