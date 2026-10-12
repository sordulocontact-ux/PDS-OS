import { BriefPage } from "@/components/master-workflow/brief-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMasterBrief } from "@/lib/master-workflow/brief";
import { loadBriefQuestions } from "@/lib/master-workflow/questions";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { masterStepHref } from "@/lib/ui/master-steps";
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

  const [view, questions, mix] = await Promise.all([
    loadMasterBrief(project, access),
    loadBriefQuestions(project, access),
    // What the sending to the mix engineer still needs (PROJ-UX-08).
    loadStepView(project, access, "mix"),
  ]);
  // The Brief step of the Master (lib/ui/master-steps.ts): its chevron
  // names it, the title stays « Master » (ProjectPageTitle).
  return (
    <BriefPage
      view={view}
      questions={questions}
      next={{
        href: masterStepHref(project.id, "mix"),
        blockers: mix.blockers,
        sentAt: mix.history[0]?.sentAt ?? null,
      }}
    />
  );
}
