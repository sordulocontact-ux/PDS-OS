import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { BudgetLines } from "@/components/budget/budget-lines";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { requireApproved } from "@/lib/auth/dal";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.budget.title} · ${fr.app.name}` };

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
  const t = fr.budget;

  return (
    <div className="grid gap-6">
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
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
    </div>
  );
}
