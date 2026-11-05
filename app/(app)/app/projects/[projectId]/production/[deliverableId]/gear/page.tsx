import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { ProductionNeedsSection } from "@/components/production/prep/needs-section";
import { EquipmentSection } from "@/components/production/preprod/equipment-section";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";

/** Internal production: the positions to fill and the gear — the director of
 * photography's list arrives here through his link, as needs to price. */
export default async function ProductionGearStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/gear">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "gear",
  );
  const { data, sheet, preprod, today, common, people } = await prepContext(
    projectId,
    deliverableId,
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
    >
      <ProductionNeedsSection
        projectId={projectId}
        sheetId={sheet.id}
        needs={data.needs}
        director={sheet.director}
        choices={sheet.brief}
        canOrganize={data.canOrganize}
        {...people}
      />
      <EquipmentSection
        {...common}
        {...people}
        organizationId={access.organizationId}
        preprod={preprod}
        brief={sheet.brief}
        today={today}
      />
    </ProductionStepPanel>
  );
}
