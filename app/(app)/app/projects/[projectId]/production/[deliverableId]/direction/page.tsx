import { DirectorBlock } from "@/components/production/journey/director-block";
import { DirectionDecision } from "@/components/production/journey/direction-decision";
import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { ProductionBriefSection } from "@/components/production/prep/brief-section";
import { ProductionImportButton } from "@/components/production/prep/import-dialog";
import { ProposalSection } from "@/components/production/proposal/proposal-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

/** The director's proposal — intention, découpage, references — written in
 * the app or on the director's link, then validated by the creative side
 * (Ibé, 14/10: « un échange entre le réalisateur et la partie créative »). */
export default async function ProductionDirectionStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/direction">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, data, access } = await stepContext(
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
  // External: the director deposits versions, validated inside and, when
  // asked, outside (PR-11). Internal: the director's brief (PROD tickets).
  if (sheet.organization.kind === "external")
    return (
      <ProductionStepPanel
        projectId={projectId}
        deliverableId={deliverableId}
        step={step}
        steps={steps}
      >
        <DirectorBlock projectId={projectId} data={data} />
        <ProposalSection
          projectId={projectId}
          data={data}
          viewerId={access.personId}
          canReview={canReview === true}
        />
      </ProductionStepPanel>
    );
  const d = sheet.organization.direction;
  const reviewer =
    steps
      .find((s) => s.key === "direction")
      ?.roles?.find((r) => r.kind === "valid")?.name ??
    data.ownerName ??
    "—";
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
    >
      {sheet.directionRevision && (
        <ToneCallout tone="warning">
          {fr.productionDirector.revision(sheet.directionRevision.reason)}
        </ToneCallout>
      )}
      <DirectorBlock projectId={projectId} data={data} />
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
    </ProductionStepPanel>
  );
}
