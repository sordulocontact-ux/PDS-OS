import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { PlanGestures } from "@/components/projects/release-plans/plan-gestures";
import { TitlePlanView } from "@/components/projects/release-plans/plan-view";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import {
  loadTitlePlan,
  loadTitlePlans,
} from "@/lib/projects/title-plan/queries";
import { planStatusTone } from "@/lib/projects/title-plan/tones";
import { formatShortDate } from "@/lib/release/format";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.titleReleasePlans.title };

/**
 * A title's Plan de sortie (lot 14): its statuses, what its document will
 * say, its versions and their links. A collective's only (404 otherwise);
 * the other titles' plans one click away in the trail.
 */
export default async function ProjectReleasePlanPage({
  params,
}: PageProps<"/app/projects/[projectId]/release-plans/[titleId]">) {
  const { projectId, titleId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  const [plan, rows] = await Promise.all([
    loadTitlePlan(project, titleId, access),
    loadTitlePlans(project),
  ]);
  if (!plan) notFound();
  const t = fr.titleReleasePlans;
  const facts: ModuleFact[] = [
    {
      key: "date",
      label: t.page.facts.date,
      value: plan.release.date
        ? formatShortDate(plan.release.date)
        : t.sections.release.noDate,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={t.page.title(plan.label)}
        status={{
          label: t.statuses[plan.status],
          tone: planStatusTone[plan.status],
        }}
        facts={facts}
        extraCrumbs={[
          {
            label: plan.label,
            href: routes.projectReleasePlan(projectId, titleId),
            options: rows.map((row) => ({
              key: row.titleId,
              label: row.label,
              detail: t.statuses[row.status],
              href: routes.projectReleasePlan(projectId, row.titleId),
              current: row.titleId === titleId,
            })),
          },
        ]}
        actions={
          plan.canEdit ? (
            <PlanGestures
              projectId={projectId}
              titleId={titleId}
              planId={plan.planId}
              status={plan.status}
              statusBefore={plan.statusBefore}
              archivedReason={plan.archivedReason}
              titleAbandoned={plan.titleAbandoned}
              hasDate={plan.release.date !== null}
            />
          ) : undefined
        }
      />
      <TitlePlanView
        projectId={projectId}
        organizationId={access.organizationId}
        plan={plan}
      />
    </div>
  );
}
