import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals } from "@/lib/budget/types";
import type { DashboardInput, ReserveFact } from "@/lib/marketing/dashboard";
import { loadMarketing, type MarketingData } from "@/lib/marketing/queries";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";

/**
 * What the dashboard is computed from, read with the user's session: the
 * activations and their evidence, the reserves, the budget when the viewer
 * may read it (the budget keeps the permissions of its own module).
 */
export async function loadDashboardInput(
  projectId: string,
  access: Access,
  project: { ownerPersonId: string | null },
  reserves: ReserveFact[] = [],
): Promise<{ input: DashboardInput; data: MarketingData }> {
  const canBudget = canSeeProjectBudget(access, project);
  const [data, budget] = await Promise.all([
    loadMarketing(projectId, access),
    canBudget ? loadBudget(projectId) : Promise.resolve(null),
  ]);
  const totals =
    budget && !budget.error ? budgetTotals(budget.lines, null) : null;
  return {
    data,
    input: {
      activations: data.activations,
      evidence: data.evidence,
      reserves,
      budget: totals
        ? {
            plannedCents: totals.plannedCents,
            committedCents: totals.committedCents,
            invoicedCents: totals.realCents,
            paidCents: totals.paidCents,
          }
        : null,
      budgetRestricted: !canBudget,
    },
  };
}
