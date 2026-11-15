"use server";

import { severityOf } from "@/lib/finance/alerts";
import {
  financeSearchIndex,
  type FinanceSearchItem,
} from "@/lib/finance/search";
import { loadFinanceWatch } from "@/lib/finance/watch-queries";
import { parisPlace } from "@/lib/utils/calendar-period";

export type FinancePulse = {
  alerts: { count: number; danger: number };
  items: FinanceSearchItem[];
  error: boolean;
};

/**
 * Read once by a Finance page after it shows (docs/FINANCE-V2.md, lot 5):
 * the count of alerts for the bell, and what the ⌘K search finds. RLS
 * decides what the member reads; every figure is computed by code.
 */
export async function readFinancePulse(): Promise<FinancePulse> {
  const today = parisPlace(new Date()).day;
  const watch = await loadFinanceWatch(today);
  return {
    alerts: {
      count: watch.alerts.length,
      danger: watch.alerts.filter((a) => severityOf(a) === "danger").length,
    },
    items: financeSearchIndex({
      budgets: watch.budgets,
      incomes: watch.treasury.incomes,
      today,
    }),
    error: watch.error,
  };
}
