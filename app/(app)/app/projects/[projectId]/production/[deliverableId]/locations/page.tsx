import { StepPanel } from "@/components/production/journey/step-panel";
import { LocationsBoard } from "@/components/production/locations/locations-board";
import { LocationSection } from "@/components/production/preprod/location-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { loadLocations } from "@/lib/production/locations/queries";

export const metadata = {
  title: `${fr.productionJourney.steps.locations.title} · ${fr.app.name}`,
};

/** The places: proposed (by the company through its link in external),
 * given opinions by role, one kept by the project's owner (PROD-011 to 013). */
export default async function ProductionLocationsStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/locations">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "locations",
  );
  const { data, sheet, o, links, common, people } = await prepContext(
    projectId,
    deliverableId,
  );
  const locations = await loadLocations(sheet.id, data, access);
  return (
    <StepPanel step={step} steps={steps}>
      <LocationSection
        {...common}
        logistics={sheet.logistics}
        derogation={
          o.checks.find((c) => c.key === "location")?.derogation ?? null
        }
      >
        {access.organizationId && (
          <LocationsBoard
            scope={{
              projectId,
              sheetId: sheet.id,
              organizationId: access.organizationId,
            }}
            data={locations}
            links={links}
            canOrganize={data.canOrganize}
            {...people}
          />
        )}
      </LocationSection>
    </StepPanel>
  );
}
