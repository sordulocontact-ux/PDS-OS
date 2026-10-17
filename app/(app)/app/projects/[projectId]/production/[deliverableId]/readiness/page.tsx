import { StepPanel } from "@/components/shell/journey/step-panel";
import { ReadinessSection } from "@/components/production/preprod/readiness-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { callSheetEvidence } from "@/lib/production/preprod/readiness";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `${fr.productionJourney.steps.readiness.title} · ${fr.app.name}`,
};

/** Every prerequisite confirmed on its evidence (or by a reasoned
 * derogation), then « Prête pour tournage » (PROD-008, 017, BUG-004). */
export default async function ProductionReadinessStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/readiness">) {
  const { projectId, deliverableId } = await params;
  const { step, steps } = await stepContext(
    projectId,
    deliverableId,
    "readiness",
  );
  const { sheet, preprod, o, common, people } = await prepContext(
    projectId,
    deliverableId,
  );
  const supabase = await createClient();
  const { data: versions } = await supabase
    .from("production_call_sheet_versions")
    .select("number")
    .eq("sheet_id", sheet.id)
    .order("number", { ascending: false })
    .limit(1);
  return (
    <StepPanel
      step={step}
      steps={steps}
      rootPrereq={fr.productionJourney.meta.fiche}
    >
      <ReadinessSection
        {...common}
        rows={o.checks}
        evidence={{
          ...o.evidence,
          call_sheet: callSheetEvidence(
            preprod.callSheet,
            versions?.[0]?.number ?? null,
          ),
        }}
        readyAt={sheet.readyAt}
        readyBy={sheet.readyBy}
        {...people}
      />
    </StepPanel>
  );
}
