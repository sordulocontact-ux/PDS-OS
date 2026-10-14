import { StepPanel } from "@/components/production/journey/step-panel";
import { ProductionNeedsSection } from "@/components/production/prep/needs-section";
import { EquipmentSection } from "@/components/production/preprod/equipment-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";

export const metadata = {
  title: `${fr.productionJourney.steps.gear.title} · ${fr.app.name}`,
};

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
    <StepPanel step={step} steps={steps}>
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
    </StepPanel>
  );
}
