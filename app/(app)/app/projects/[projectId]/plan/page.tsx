import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPenWriting2 } from "nucleo-sharp-essential";

import { LaunchedPlan } from "@/components/plan/launched-plan";
import { PlanBoard } from "@/components/plan/plan-board";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { fr } from "@/lib/i18n/fr";
import { proposePlan, type PlanWorkflow } from "@/lib/plan/propose";
import { loadLaunchedPlan } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The Plan du Projet (ticket § 9; docs/ARCHITECTURE.md § 6 ter): proposed
 * by code from the validated Brief, edited and launched by the owner; once
 * launched, each workflow's state and its way in.
 */
export default async function ProjectPlanPage({
  params,
}: PageProps<"/app/projects/[projectId]/plan">) {
  const { projectId } = await params;
  const [access, project, launched] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadLaunchedPlan(projectId),
  ]);
  const t = fr.framingIntel.plan;
  const canEdit = canEditProject(access, project);
  const hrefs: Record<PlanWorkflow, string> = {
    strategy: routes.projectStrategy(projectId),
    master: routes.projectMaster(projectId),
    legal: routes.projectLegal(projectId),
    design: routes.projectDesign(projectId),
    delivery: routes.projectRelease(projectId),
  };

  if (launched)
    return (
      <div className="flex flex-col gap-6">
        <ProjectPageHeader
          title={t.title}
          description={`${t.bodyLaunched} ${t.launched(dateFormat.format(new Date(launched.launchedAt)), launched.launchedByName)}.`}
        />
        <LaunchedPlan
          projectId={projectId}
          items={launched.items}
          hrefs={hrefs}
          editable={canEdit}
        />
      </div>
    );

  const framingValidated = project.stages.some(
    (s) => s.key === "framing" && s.state === "validated",
  );
  if (!framingValidated)
    return (
      <EmptyState
        icon={IconPenWriting2}
        title={t.title}
        body={t.notReady}
        action={
          <Link
            href={routes.projectFraming(projectId)}
            className={buttonVariants({ size: "lg" })}
          >
            {fr.framingIntel.locked.openFraming}
          </Link>
        }
      />
    );

  const k = await loadFramingKnowledge(projectId, access);
  if (!k) notFound();
  return (
    <div className="flex flex-col gap-6">
      <ProjectPageHeader
        title={t.title}
        description={canEdit ? t.body : t.readOnly}
      />
      <PlanBoard
        projectId={projectId}
        items={proposePlan(k)}
        members={k.framing.members}
        editable={canEdit}
      />
    </div>
  );
}
