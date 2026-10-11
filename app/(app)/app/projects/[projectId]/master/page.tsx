import { MasterInventory } from "@/components/master-workflow/master-inventory";
import { PrepareSummary } from "@/components/master-workflow/prepare-summary";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { asFactStatus } from "@/lib/facts/views";
import { fr } from "@/lib/i18n/fr";
import { loadMasterInventory } from "@/lib/master-workflow/inventory";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.master} · ${fr.app.name}`,
};

// Master: the Source step at /master — where the preparation of the mix
// stands (sources, Brief, sending to the mix engineer), then the État du
// master; the Brief is the next step (/master/brief), then the mix
// (/master/mix) and the mastering. Read by whoever sees the project; each
// completion opens the form of the record's own page, under its own
// permission.
export default async function ProjectMasterPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master">) {
  const [{ projectId }, { state }] = await Promise.all([params, searchParams]);
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [inventory, mix] = await Promise.all([
    loadMasterInventory(project, access),
    loadStepView(project, access, "mix"),
  ]);
  return (
    <MasterInventory
      inventory={inventory}
      basePath={routes.projectMaster(projectId)}
      // Only the facts of one status (a tile), all without it.
      state={asFactStatus(state)}
      lead={<PrepareSummary view={mix} />}
    />
  );
}
