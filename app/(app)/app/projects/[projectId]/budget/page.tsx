import { FormMessage } from "@/components/auth/form-message";
import { BudgetLines } from "@/components/budget/budget-lines";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { requireApproved } from "@/lib/auth/dal";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";

export const metadata = { title: `${fr.budget.title} · ${fr.app.name}` };

// Envelope and spending of a launched project. Totals are computed by code
// from the lines; only the owner writes (RLS), the others read.
export default async function ProjectBudgetPage({
  params,
}: PageProps<"/app/projects/[projectId]/budget">) {
  await requireApproved();
  const { projectId } = await params;
  const project = await requireLaunchedProject(projectId);
  const { error, lines, levers } = await loadBudget(projectId);
  const t = fr.budget;

  return (
    <div className="grid gap-6">
      <ProjectPageHeader title={t.title} description={t.description} />
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      <BudgetSummary
        envelopeCents={project.budgetCents}
        totals={budgetTotals(lines, project.budgetCents)}
      />
      <BudgetLines projectId={projectId} lines={lines} levers={levers} />
    </div>
  );
}
