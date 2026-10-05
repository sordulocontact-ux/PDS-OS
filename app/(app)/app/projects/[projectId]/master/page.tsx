import { MasterInventory } from "@/components/master-workflow/master-inventory";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { asFactStatus } from "@/lib/facts/views";
import { fr } from "@/lib/i18n/fr";
import { loadMasterInventory } from "@/lib/master-workflow/inventory";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.shell.project.sidebar.master} · ${fr.app.name}`,
};

// Master: the first step (État du master) at /master; the others will each
// have their folder below (/master/brief…) once built, greyed in the steps
// and absent (404) until then. Read by whoever sees the project; each
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

  const inventory = await loadMasterInventory(project, access);
  return (
    <MasterInventory
      inventory={inventory}
      basePath={routes.projectMaster(projectId)}
      // Only the facts of one status (a tile), all without it.
      state={asFactStatus(state)}
    />
  );
}
