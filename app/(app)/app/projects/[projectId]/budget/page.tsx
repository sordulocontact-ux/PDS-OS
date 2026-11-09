import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { BudgetByFamily } from "@/components/budget/budget-by-family";
import { BudgetLines } from "@/components/budget/budget-lines";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { PayList } from "@/components/invoices/pay-list";
import { requireApproved } from "@/lib/auth/dal";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { loadProjectInvoices } from "@/lib/invoices/queries";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.budget.title };

// Envelope and spending of a launched project. Totals are computed by code
// from the lines; only the owner writes, the owner and the direction read
// (RLS, can_read_project_budget): no page for anyone else.
export default async function ProjectBudgetPage({
  params,
}: PageProps<"/app/projects/[projectId]/budget">) {
  const { projectId } = await params;
  const [access, project, { error, lines, levers, deliverables }] =
    await allInOrder([
      requireApproved(),
      requireLaunchedProject(projectId),
      loadBudget(projectId),
    ]);
  if (!canSeeProjectBudget(access, project)) notFound();
  // « À payer », for the direction: the invoices received and not paid.
  const invoices = await loadProjectInvoices(projectId, project.ownerPersonId);
  const t = fr.budget;

  return (
    // A column, not a grid: a grid track grows to the tab bar's min-content
    // and the page scrolled sideways at 390 px (recette 19/10).
    <div className="flex min-w-0 flex-col gap-6">
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      <PayList projectId={projectId} view={invoices} />
      <BudgetSummary
        envelopeCents={project.budgetCents}
        totals={budgetTotals(lines, project.budgetCents)}
      />
      <BudgetLines
        projectId={projectId}
        lines={lines}
        levers={levers}
        deliverables={deliverables}
        organizationId={access.organizationId}
      />
      {/* What each poste adds up to (retour du 09/11/2026). */}
      <BudgetByFamily lines={lines} />
    </div>
  );
}
