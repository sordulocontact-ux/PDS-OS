import { MyActions } from "@/components/overview/my-actions";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.projectWork.work.title} · ${fr.app.name}`,
};

// The viewer's work in the project (proto « Projet complet »): their actions
// from every workflow's journey, the Cadrage first, each opening its step.
// The free tasks of the old board stay in the database and in the global
// Travail; they are not a list of their own here (docs/VISION-UX.md § 3).
export default async function ProjectWorkPage({
  params,
}: PageProps<"/app/projects/[projectId]/work">) {
  const { projectId } = await params;
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const all = await loadShellJourneys(project.id);
  return <MyActions actions={all.mine} empty={fr.projectShell.work.empty} />;
}
