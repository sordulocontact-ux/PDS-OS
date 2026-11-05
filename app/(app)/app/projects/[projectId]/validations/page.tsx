import { MyActions } from "@/components/overview/my-actions";
import { ProjectHeader } from "@/components/projects/project-header";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.validations;

export const metadata = { title: t.title };

// The decisions waiting for the viewer in the project (proto « Projet
// complet »): their actions whose kind is « validate » (never found by the
// verb of the label), from every workflow. Decided ones are in the Activité
// and in each step's « Déjà fait ».
export default async function ProjectValidationsPage({
  params,
}: PageProps<"/app/projects/[projectId]/validations">) {
  const { projectId } = await params;
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const all = await loadShellJourneys(project.id);
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={project.id} facts={[]} />
      <MyActions
        actions={all.validations}
        empty={fr.projectShell.work.validationsEmpty}
      />
    </div>
  );
}
