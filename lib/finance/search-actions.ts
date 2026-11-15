"use server";

import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { severityOf } from "@/lib/finance/alerts";
import { countOpenProofs, loadProofIndex } from "@/lib/finance/proof-queries";
import {
  financeSearchIndex,
  type FinanceSearchItem,
} from "@/lib/finance/search";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { loadFinanceWatch } from "@/lib/finance/watch-queries";
import { parisPlace } from "@/lib/utils/calendar-period";

export type FinancePulse = {
  alerts: { count: number; danger: number };
  // What waits in a section, by its sidebar entry (proto: Transactions,
  // Justificatifs, Factures).
  counts: { reconcile: number; receipts: number; incomes: number };
  items: FinanceSearchItem[];
  // What « Ajouter une entrée » of the search needs, for who writes Finance.
  add: {
    organizationId: string;
    ownerId: string | null;
    targets: FinanceTarget[];
  } | null;
  error: boolean;
};

/**
 * Read once by a Finance page after it shows (docs/FINANCE-V2.md, lot 5):
 * the count of alerts for the bell, what waits by the sidebar's sections,
 * and what the ⌘K search finds. RLS
 * decides what the member reads; every figure is computed by code.
 */
export async function readFinancePulse(): Promise<FinancePulse> {
  const today = parisPlace(new Date()).day;
  const [access, watch, receipts, proofs] = await Promise.all([
    requirePermission("read_finance"),
    loadFinanceWatch(today),
    countOpenProofs(),
    loadProofIndex(),
  ]);
  const toReconcile = watch.alerts.find((a) => a.kind === "to_reconcile");
  return {
    counts: {
      reconcile: toReconcile?.kind === "to_reconcile" ? toReconcile.count : 0,
      receipts,
      incomes: watch.alerts.filter((a) => a.kind === "late_income").length,
    },
    alerts: {
      count: watch.alerts.length,
      danger: watch.alerts.filter((a) => severityOf(a) === "danger").length,
    },
    items: financeSearchIndex({
      budgets: watch.budgets,
      incomes: watch.treasury.incomes,
      proofs,
      transactions: watch.transactions,
      today,
    }),
    add:
      can(access, "manage_finance") && access.organizationId
        ? {
            organizationId: access.organizationId,
            ownerId: access.personId,
            targets: watch.treasury.targets,
          }
        : null,
    error: watch.error,
  };
}
