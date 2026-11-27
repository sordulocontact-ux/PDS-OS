import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { TitlePlansList } from "@/components/projects/release-plans/plans-list";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadTitlePlans } from "@/lib/projects/title-plan/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.titleReleasePlans.title };

/**
 * « Plans de sortie » of a launched collective (lot 14 of
 * docs/pds-mic-plan.md, § 3.1 « Sortie ≠ plan de sortie »): one editorial
 * plan per title, born with it. Never shown for another project (404, no
 * entry in its navigation): its Plan de sortie stays in its Stratégie.
 */
export default async function ProjectReleasePlansPage({
  params,
}: PageProps<"/app/projects/[projectId]/release-plans">) {
  const { projectId } = await params;
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!project.collective) notFound();
  const rows = await loadTitlePlans(project);
  const t = fr.titleReleasePlans;
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader projectId={projectId} title={t.title} />
      <TitlePlansList projectId={projectId} rows={rows} />
    </div>
  );
}
