import { LaunchedPlan } from "@/components/plan/launched-plan";
import { PlanBoard } from "@/components/plan/plan-board";
import { PageSection } from "@/components/shell/page-section";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { PlanWorkflow, ProposedItem } from "@/lib/plan/propose";
import type { LaunchedPlan as LaunchedPlanData } from "@/lib/plan/queries";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The Plan du Projet where the project opens, its overview (docs/
 * ARCHITECTURE.md § 6 ter): proposed by code from the validated Brief and
 * edited then launched by the owner, or, once launched, each workflow's
 * state and its way in.
 */
export function ProjectPlanSection({
  projectId,
  canEdit,
  launched,
  proposal,
}: {
  projectId: string;
  canEdit: boolean;
  launched: LaunchedPlanData | null;
  proposal: {
    items: ProposedItem[];
    members: Array<{ personId: string; name: string }>;
  } | null;
}) {
  const t = fr.framingIntel.plan;
  const hrefs: Record<PlanWorkflow, string> = {
    strategy: routes.projectStrategy(projectId),
    master: routes.projectMaster(projectId),
    legal: routes.projectLegal(projectId),
    design: routes.projectDesign(projectId),
    delivery: routes.projectRelease(projectId),
  };

  if (launched)
    return (
      <PageSection
        id="plan"
        title={t.title}
        description={`${t.bodyLaunched} ${t.launched(dateFormat.format(new Date(launched.launchedAt)), launched.launchedByName)}.`}
      >
        <LaunchedPlan
          projectId={projectId}
          items={launched.items}
          hrefs={hrefs}
          editable={canEdit}
        />
      </PageSection>
    );

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
      />
    </PageSection>
  );
}
