import { FinalStep } from "@/components/master-workflow/final/final-step";
import { InvoiceBlock } from "@/components/master-workflow/invoice-block";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { fr } from "@/lib/i18n/fr";
import { loadProjectInvoices } from "@/lib/invoices/queries";
import { loadMasterBudgetLines } from "@/lib/master-workflow/budget-lines";
import { loadFinalView } from "@/lib/master-workflow/final";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";

export const metadata = {
  title: `${fr.masterWorkflow.final.title} · ${fr.app.name}`,
};

// Master, last step: each title's validated Master final, its place in the
// Catalogue and the other deliverables of the brief.
export default async function ProjectMasterFinalPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/final">) {
  const { projectId } = await params;
  const { access, project, facts } = await masterJourneyContext(projectId);

  const [view, invoices, budget] = await Promise.all([
    loadFinalView(project, access),
    loadProjectInvoices(projectId, project.ownerPersonId),
    loadMasterBudgetLines(projectId),
  ]);
  return (
    <MasterStepFrame projectId={projectId} stepKey="final">
      <div className="flex flex-col gap-6">
        <FinalStep view={view} />
        <InvoiceBlock
          projectId={projectId}
          view={invoices}
          budget={budget}
          inHouse={Boolean(
            facts.brief?.mixPerson &&
            (facts.brief.masteringSame || facts.brief.masteringPerson) &&
            view.titles.some((x) => x.final),
          )}
        />
      </div>
    </MasterStepFrame>
  );
}
