import {
  ProductionPage,
  finalsOf,
  mixRoundDone,
} from "@/components/master-workflow/production-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.production.mastering.title} · ${fr.app.name}`,
};

// Master, Mastering: same round as the Mixage, opened once every title has
// its Mix final; before, the page says how many are there (the step stays
// readable, ticket « Architecture globale » § 5). The master validation
// lives here.
export default async function ProjectMasterMasteringPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mastering">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, versions, mixVersions] = await Promise.all([
    loadStepView(project, access, "mastering"),
    loadMixVersions(project, access.personId, "mastering"),
    loadMixVersions(project, access.personId, "mix"),
  ]);
  const open = mixRoundDone(view);
  return (
    <ProductionPage
      stage="mastering"
      round={{ view, versions }}
      done={
        open &&
        versions.titles.length > 0 &&
        finalsOf(versions) === versions.titles.length
      }
      waiting={
        open
          ? null
          : { finals: finalsOf(mixVersions), total: mixVersions.titles.length }
      }
    />
  );
}
