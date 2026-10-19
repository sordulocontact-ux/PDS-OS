import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { CallPrepLauncher } from "@/components/calls/prep/call-prep-launcher";
import { ProductionCallList } from "@/components/production/prep/production-call-list";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import { productionCallDefaults } from "@/lib/production/call-prep-defaults";
import type { ProductionCallSummary } from "@/lib/production/call-queries";
import type { ProductionSheetData } from "@/lib/production/sheet";

/**
 * « Préparer un call de production » of one deliverable: the production
 * calls already prepared from its sheet, and for the owner while Production
 * runs, the button that opens the side panel PO prepared from what the
 * preparation lacks. Choosing it triggers nothing external.
 */
export async function ProductionCallPanel({
  projectId,
  data,
  calls,
  canOrganize,
}: {
  projectId: string;
  data: ProductionSheetData;
  calls: ProductionCallSummary[];
  canOrganize: boolean;
}) {
  const t = fr.productionCall;
  // Only what the form needs crosses to the client, never the whole sheet.
  const defaults = canOrganize
    ? await productionCallDefaults(projectId, data)
    : null;
  return (
    <PageSection
      id="production-calls"
      title={t.sectionTitle}
      description={t.sectionDescription}
      card
      action={
        defaults ? (
          <CallPrepLauncher
            label={t.prepare}
            title={t.title}
            body={t.body}
            mode="sheet"
            variant="default"
          >
            <CallPrepForm defaults={defaults} />
          </CallPrepLauncher>
        ) : undefined
      }
    >
      {calls.length > 0 ? (
        <ProductionCallList calls={calls} />
      ) : (
        <EmptyNote>{t.empty}</EmptyNote>
      )}
    </PageSection>
  );
}
