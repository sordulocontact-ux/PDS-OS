import { DesignTrack } from "@/components/design/design-track";
import { PageSection } from "@/components/shell/page-section";
import type { DesignData } from "@/lib/design/queries";
import { fr } from "@/lib/i18n/fr";

/**
 * The versions deposited for the target (the Dossier's deposit and review,
 * kept as is: the Production starts from an approved version). Only the
 * direction and the deliverables committed by the Stratégie have versions.
 */
export function TargetVersions({
  design,
  projectId,
  strategyDeliverableId,
  title,
}: {
  design: DesignData;
  projectId: string;
  // Null: the overall direction.
  strategyDeliverableId: string | null;
  title: string;
}) {
  const t = fr.conceptionWork.versions;
  const track = strategyDeliverableId
    ? design.deliverables.find((d) => d.deliverableId === strategyDeliverableId)
    : design.direction;
  if (!track) return null;
  return (
    <PageSection id="design-versions" title={t.title} description={t.hint}>
      <DesignTrack
        track={track}
        organizationId={design.organizationId}
        projectId={projectId}
        canReview={design.canReview}
        mePersonId={design.mePersonId}
        inProgress={design.stage?.state === "in_progress"}
        depositTarget={strategyDeliverableId ? title : t.directionTarget}
        emptyLabel={fr.design.version.none}
      />
    </PageSection>
  );
}
