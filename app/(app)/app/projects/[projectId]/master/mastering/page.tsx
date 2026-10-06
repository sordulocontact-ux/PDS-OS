import { MasteringPage } from "@/components/master-workflow/mastering-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.mastering.title} · ${fr.app.name}`,
};

// Master, Mastering step: open once the Mix finals are validated; the
// package for the mastering engineer and its follow-up.
export default async function ProjectMasterMasteringPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mastering">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, versions] = await Promise.all([
    loadStepView(project, access, "mastering"),
    loadMixVersions(project, access.personId, "mastering"),
  ]);
  return <MasteringPage view={view} versions={versions} />;
}
