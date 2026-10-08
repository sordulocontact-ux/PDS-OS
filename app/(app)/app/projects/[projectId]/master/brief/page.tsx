import { BriefPage } from "@/components/master-workflow/brief-page";
import { BackLink } from "@/components/shell/back-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadMasterBrief } from "@/lib/master-workflow/brief";
import { loadBriefQuestions } from "@/lib/master-workflow/questions";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.brief.title} · ${fr.app.name}`,
};

// Master, second step: the Brief Mix/Master of the project. Read by whoever
// sees the project, written by its owner (master_briefs, RLS).
export default async function ProjectMasterBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/brief">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, questions] = await Promise.all([
    loadMasterBrief(project, access),
    loadBriefQuestions(project, access),
  ]);
  // Opened from « Préparer »: the way back.
  return (
    <div className="grid gap-6">
      <BackLink href={routes.projectMaster(projectId)}>
        {fr.masterWorkflow.steps.backToPrepare}
      </BackLink>
      <BriefPage view={view} questions={questions} />
    </div>
  );
}
