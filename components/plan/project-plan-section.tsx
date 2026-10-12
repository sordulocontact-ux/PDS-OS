import { PlanBoard, type PlanContext } from "@/components/plan/plan-board";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import type { ProposedItem } from "@/lib/plan/propose";

/**
 * The Plan du Projet where the project opens, its overview (docs/
 * ARCHITECTURE.md § 6 ter): proposed by code from the validated Brief,
 * edited then launched by the owner after a review of what starts
 * (PROJ-UX-07). Once launched, the overview shows its steps instead
 * (PlanStepsSection).
 */
export function ProjectPlanSection({
  projectId,
  canEdit,
  proposal,
}: {
  projectId: string;
  canEdit: boolean;
  proposal: {
    items: ProposedItem[];
    members: Array<{ personId: string; name: string }>;
    context: PlanContext;
  } | null;
}) {
  const t = fr.framingIntel.plan;
  if (!proposal) return null;
  return (
    <PageSection
      id="plan"
      title={t.title}
      description={canEdit ? t.body : t.readOnly}
    >
      <PlanBoard
        projectId={projectId}
        items={proposal.items}
        members={proposal.members}
        editable={canEdit}
        context={proposal.context}
      />
    </PageSection>
  );
}
