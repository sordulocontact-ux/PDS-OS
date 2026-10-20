import { LightControlStep } from "@/components/production/light/light-steps";
import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { loadLightFacts } from "@/lib/production/light/queries";

export const metadata = {
  title: `${fr.productionLight.steps.control.title} · ${fr.app.name}`,
};

/** « Contrôle technique » of a cover or of teasers drawn from the clip
 * (proto lightBody control, PR-13): the validated version is not yet
 * deliverable; the code checks what it can, a person the rest. */
export default async function ProductionControlStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/control">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, data } = await stepContext(
    projectId,
    deliverableId,
    "control",
  );
  const sheet = data.sheet;
  if (!sheet) return null;
  const facts = await loadLightFacts(
    sheet.id,
    deliverableId,
    sheet.derivedFromSheetId,
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
    >
      <LightControlStep projectId={projectId} data={data} facts={facts} />
    </ProductionStepPanel>
  );
}
