import { DirectionDecision } from "@/components/production/journey/direction-decision";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { ProductionBriefSection } from "@/components/production/prep/brief-section";
import { ProductionImportButton } from "@/components/production/prep/import-dialog";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `${fr.productionJourney.steps.direction.title} · ${fr.app.name}`,
};

/** The director's proposal — intention, découpage, references — written in
 * the app or on the director's link, then validated by the creative side
 * (Ibé, 14/10: « un échange entre le réalisateur et la partie créative »). */
export default async function ProductionDirectionStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/direction">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, data } = await stepContext(
    projectId,
    deliverableId,
    "direction",
  );
  const sheet = data.sheet;
  if (!sheet) return null;
  const supabase = await createClient();
  const { data: canReview } = await supabase.rpc("production_can_review", {
    p_project_id: projectId,
  });
  const d = sheet.organization.direction;
  const reviewer =
    steps.find((s) => s.key === "direction")?.validator?.name ??
    data.ownerName ??
    "—";
  return (
    <StepPanel
      step={step}
      steps={steps}
      rootPrereq={fr.productionJourney.meta.fiche}
    >
      <ProductionImportButton
        projectId={projectId}
        sheetId={sheet.id}
        brief={sheet.brief}
        canOrganize={data.canOrganize}
      />
      <ProductionBriefSection
        projectId={projectId}
        sheet={sheet}
        canWriteBrief={data.canWriteBrief}
        canOrganize={data.canOrganize}
        members={data.members}
        contacts={data.contacts}
      />
      <DirectionDecision
        projectId={projectId}
        sheetId={sheet.id}
        status={d.status}
        comment={d.comment}
        decided={{
          by: d.decidedBy,
          on: d.decidedAt ? formatDate(d.decidedAt) : null,
        }}
        canSubmit={data.canWriteBrief || data.canOrganize}
        canDecide={canReview === true}
        directorByLink={
          sheet.director?.kind === "contact" ? sheet.director.name : null
        }
        reviewerName={reviewer}
      />
    </StepPanel>
  );
}
