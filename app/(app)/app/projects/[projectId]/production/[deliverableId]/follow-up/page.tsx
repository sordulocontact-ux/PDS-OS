import { CompanyProgress } from "@/components/production/journey/company-progress";
import { StepPanel } from "@/components/production/journey/step-panel";
import { EquipmentSection } from "@/components/production/preprod/equipment-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";

export const metadata = { title: `Préproduction · ${fr.app.name}` };

/** External production: the company organises calls, gear, crew and
 * schedule; PDS follows its report and what it chose to list here. */
export default async function ProductionFollowUpStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/follow-up">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "follow-up",
  );
  const { data, sheet, preprod, today, links, common, people } =
    await prepContext(projectId, deliverableId);
  const company = sheet.organization.company;
  return (
    <StepPanel step={step} steps={steps}>
      <CompanyProgress
        projectId={projectId}
        sheetId={sheet.id}
        organization={sheet.organization}
        link={company ? (links[company.id] ?? null) : null}
        canOrganize={data.canOrganize}
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
    </StepPanel>
  );
}
