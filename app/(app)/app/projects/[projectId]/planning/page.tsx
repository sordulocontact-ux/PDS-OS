import { IconCalendarDays } from "nucleo-sharp-essential";

import { EditInStrategy } from "@/components/project-plan/edit-in-strategy";
import { PlanningTimeline } from "@/components/project-plan/planning-timeline";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDay } from "@/lib/assistant/facts";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadProjectPlan } from "@/lib/project-plan/queries";
import { buildTimeline } from "@/lib/project-plan/timeline";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";

const t = fr.projectPlan.planning;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// Everything dated in the project, merged by code: milestones entered by
// hand, deliverable and task due dates, the release and the project's due
// date. The countdown is date arithmetic (lib/strategy/calendar.ts).
export default async function ProjectPlanningPage({
  params,
}: PageProps<"/app/projects/[projectId]/planning">) {
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await requireLaunchedProject(projectId);
  const plan = await loadProjectPlan(projectId);
  const months = buildTimeline(
    projectId,
    plan,
    t.kinds.release,
    t.kinds.project_due,
  );

  return (
    <div className="grid gap-6">
      <ProjectPageHeader
        title={t.title}
        description={t.description}
        action={
          <EditInStrategy
            projectId={projectId}
            canEdit={canEditProject(access, project)}
          />
        }
      />
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
