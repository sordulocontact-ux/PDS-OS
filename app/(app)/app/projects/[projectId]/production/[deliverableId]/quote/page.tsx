import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { BudgetBlock } from "@/components/production/preprod/budget-block";
import { QuotesSection } from "@/components/production/quotes/quotes-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { loadQuotes } from "@/lib/production/quotes/queries";

export const metadata = {
  title: `${fr.productionQuotes.title} · ${fr.app.name}`,
};

/** The quotes of the production, checked by the line producer then decided
 * by their validator (Ibé, 14/10); in internal, the budget lines follow. */
export default async function ProductionQuoteStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/quote">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "quote",
  );
  const { data, sheet, preprod, o, common } = await prepContext(
    projectId,
    deliverableId,
  );
  const org = sheet.organization;
  const quotes = await loadQuotes(sheet.id, data.members);
  const external = org.kind === "external";
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
    >
      <QuotesSection
        projectId={projectId}
        sheetId={sheet.id}
        quotes={quotes}
        frame={{
          envelopeCents: o.logistics.budgetEnvelopeCents.value,
          shootDate: o.logistics.shootDate.value,
          deliveryDate: o.logistics.deliveryDate.value,
          shootDays: 1,
        }}
        revision={sheet.quoteRevision}
        external={external}
        companyName={org.company?.name ?? "—"}
        validatorName={org.quoteValidator?.name ?? null}
        canOrganize={data.canOrganize}
        isValidator={
          access.personId !== null &&
          org.quoteValidator?.personId === access.personId
        }
      />
      {!external && (
        <BudgetBlock
          {...common}
          lines={preprod.budget}
          totals={o.budget}
          equipment={preprod.equipment}
        />
      )}
    </ProductionStepPanel>
  );
}
