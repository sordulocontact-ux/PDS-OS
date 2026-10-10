import { IconCalendarDays } from "nucleo-sharp-essential";

import { EditInStrategy } from "@/components/project-plan/edit-in-strategy";
import { PlanningTimeline } from "@/components/project-plan/planning-timeline";
import { ProjectPageActions } from "@/components/projects/project-page-actions";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDay } from "@/lib/assistant/facts";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadProjectPlan } from "@/lib/project-plan/queries";
import { buildTimeline } from "@/lib/project-plan/timeline";
import { projectDateLabel } from "@/lib/projects/labels";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectPlan.planning;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// Everything dated in the project, merged by code: milestones entered by
// hand, deliverable and task due dates, the release and the project's due
// date. The countdown is date arithmetic (lib/strategy/calendar.ts).
export default async function ProjectPlanningPage({
  params,
}: PageProps<"/app/projects/[projectId]/planning">) {
  const { projectId } = await params;
  const [access, project, plan] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadProjectPlan(projectId),
  ]);
  const months = buildTimeline(
    projectId,
    plan,
    t.kinds.release,
    projectDateLabel(project.type),
  );

  return (
    <div className="grid gap-6">
      <ProjectPageActions>
        {
          <EditInStrategy
            projectId={projectId}
            canEdit={canEditProject(access, project)}
          />
        }
      </ProjectPageActions>
      {months.length === 0 ? (
        <EmptyState
          icon={IconCalendarDays}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {plan.referenceDate
              ? t.reference(formatDay(plan.referenceDate))
              : t.noReference}
          </p>
          <PlanningTimeline
            months={months}
            today={plan.today}
            reference={plan.referenceDate}
          />
        </>
      )}
    </div>
  );
}
