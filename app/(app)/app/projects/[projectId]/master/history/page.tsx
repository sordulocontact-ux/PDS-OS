import { MasterHistory } from "@/components/master-workflow/master-history";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.masterJourney.history.title} · ${fr.app.name}`,
};

// Master: the Historique du master, filtered by person (?par=).
export default async function ProjectMasterHistoryPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/history">) {
  const [{ projectId }, { par }] = await Promise.all([params, searchParams]);
  return (
    <MasterHistory
      projectId={projectId}
      person={typeof par === "string" ? par : null}
    />
  );
}
