import { IconSquareActivityChart } from "nucleo-sharp-essential";

import { ActivityTimeline } from "@/components/project-history/activity-timeline";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.activity;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// Whole history of the project, rebuilt from the tables' own timestamps
// (lib/insights/activity.ts): no separate audit log.
export default async function ProjectActivityPage({
  params,
}: PageProps<"/app/projects/[projectId]/activity">) {
  const { projectId } = await params;
  const [, , events] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadRecentActivity({ projectId, days: 3650, limit: 200 }),
  ]);

  return (
    <div className="grid gap-6">
      <ProjectPageHeader title={t.title} description={t.description} />
      {events.length === 0 ? (
        <EmptyState
          icon={IconSquareActivityChart}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <ActivityTimeline events={events} />
      )}
    </div>
  );
}
