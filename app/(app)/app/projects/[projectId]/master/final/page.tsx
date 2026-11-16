import { FinalStep } from "@/components/master-workflow/final/final-step";
import {
  InvoiceBlock,
  InvoiceLead,
  leadInvoicesOf,
} from "@/components/master-workflow/invoice-block";
import { Fold } from "@/components/ui/fold";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { fr } from "@/lib/i18n/fr";
import { loadProjectInvoices } from "@/lib/invoices/queries";
import { loadMasterBudgetLines } from "@/lib/master-workflow/budget-lines";
import { loadFinalView } from "@/lib/master-workflow/final";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadMasterTitleScope } from "@/lib/master-workflow/title-scope";

// Master, last step: each title's validated Master final, its place in the
// Catalogue and the other deliverables of the brief.
export default async function ProjectMasterFinalPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/final">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  const { access, project, facts } = await masterJourneyContext(projectId);

  const [whole, invoices, budget, scope] = await Promise.all([
    loadFinalView(project, access),
    loadProjectInvoices(projectId, project.ownerPersonId),
    loadMasterBudgetLines(projectId),
    loadMasterTitleScope(
      projectId,
      "final",
      typeof titre === "string" ? titre : null,
    ),
  ]);
  // A collective: the active title's Master final (lot 8); the invoice and
  // what is still missing stay the project's.
  const view = scope
    ? {
        ...whole,
        titles: whole.titles.filter((x) => x.id === scope.active.masterId),
      }
    : whole;
  // The direction opens on the invoice to pay (lot 5 of Ibé's feedback):
  // the Master final and the budget fold under it.
  const lead = leadInvoicesOf(invoices);
  const body = (
    <div className="flex flex-col gap-6">
      <FinalStep view={view} whole={whole} />
      <InvoiceBlock
        projectId={projectId}
        view={invoices}
        budget={budget}
        leadIds={new Set(lead.map((i) => i.id))}
        inHouse={Boolean(
          facts.brief?.mixPerson &&
          (facts.brief.masteringSame || facts.brief.masteringPerson) &&
          whole.titles.some((x) => x.final),
        )}
      />
    </div>
  );
  return (
    <MasterStepFrame
      projectId={projectId}
      stepKey="final"
      titleScope={scope}
      slots={
        lead.length > 0
          ? { lead: <InvoiceLead projectId={projectId} view={invoices} /> }
          : undefined
      }
    >
      {lead.length > 0 ? (
        <Fold summary={fr.masterInvoice.lead.more}>{body}</Fold>
      ) : (
        body
      )}
    </MasterStepFrame>
  );
}
