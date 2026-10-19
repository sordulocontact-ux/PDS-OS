import { ChecklistSection } from "@/components/production/checklist/checklist-section";
import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { EquipmentSection } from "@/components/production/preprod/equipment-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";

export const metadata = {
  title: `${fr.productionJourney.steps["follow-up"].title} · ${fr.app.name}`,
};

/** « Préproduction » of an external production (proto BODY.prep): the
 * company organises, PDS follows its checklist — tasks, due dates,
 * blockers — and adds its own; the gear PDS listed, if any, follows. */
export default async function ProductionFollowUpStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/follow-up">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "follow-up",
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
      closed={Boolean(sheet.closedAt)}
    >
      <ChecklistSection
        projectId={projectId}
        sheetId={sheet.id}
        actions={preprod.actions}
        company={sheet.organization.company?.name ?? null}
        canOrganize={data.canOrganize}
        mePersonId={access.personId}
        {...people}
      />
      {preprod.equipment.length > 0 && (
        <EquipmentSection
          {...common}
          {...people}
          organizationId={access.organizationId}
          preprod={preprod}
          brief={sheet.brief}
          today={today}
        />
      )}
    </ProductionStepPanel>
  );
}
