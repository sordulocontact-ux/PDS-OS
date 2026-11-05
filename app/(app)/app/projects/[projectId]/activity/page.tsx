import { ActivityTimeline } from "@/components/project-history/activity-timeline";
import { ContentCard } from "@/components/shell/content-card";
import { ProjectHeader } from "@/components/projects/project-header";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadProjectActivity } from "@/lib/overview/activity";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.activity;

export const metadata = { title: t.title };

// What happened in the project (proto « Projet complet »): the journals of
// the project and of its workflows, gathered by date (lib/overview/
// activity.ts), each line prefixed by its workflow. No separate audit log.
export default async function ProjectActivityPage({
  params,
}: PageProps<"/app/projects/[projectId]/activity">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const lines = await loadProjectActivity(project, access);
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={project.id} facts={[]} />
      <ContentCard label={fr.projectShell.activity.label}>
        {lines.length === 0 ? (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {fr.projectShell.activity.empty}
          </p>
        ) : (
          <ActivityTimeline lines={lines} />
        )}
      </ContentCard>
    </div>
  );
}
