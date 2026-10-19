import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { requireApproved } from "@/lib/auth/dal";
import { distributionLocked } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// The Distribution starts with the plan, like the other workflows (proto
// « Projet complet »): before « Lancer le plan », every step below shows the
// lock instead of the page.
export default async function ReleaseLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  await allInOrder([requireApproved(), requireLaunchedProject(projectId)]);
  if (await distributionLocked(projectId))
    return <WorkflowLocked projectId={projectId} />;
  return children;
}
