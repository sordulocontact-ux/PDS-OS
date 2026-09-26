import { ExternalTeamTable } from "@/components/project-work/external-team-table";
import { TeamWorkloadTable } from "@/components/project-work/team-workload-table";
import { CreativeTeam } from "@/components/projects/creative-team";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadProjectWork } from "@/lib/project-work/queries";
import { loadExternalTeam } from "@/lib/project-work/team";
import { countByPerson } from "@/lib/project-work/workload";
import {
  listCreativePeople,
  listProjectCreatives,
} from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";

export const metadata = {
  title: `${fr.projectWork.team.title} · ${fr.app.name}`,
};

// Who works on the project and how loaded they are (same counts as the
// Travail page, lib/project-work/workload.ts), then people without an
// account named during calls.
export default async function ProjectTeamPage({
  params,
}: PageProps<"/app/projects/[projectId]/team">) {
  const access = await requireApproved();
  const { projectId } = await params;
  const project = await requireLaunchedProject(projectId);
  const t = fr.projectWork.team;

  // Same rule as the overview: the director or the owner manages creatives.
  const canManageCreatives =
    can(access, "assign_projects") || canEditProject(access, project);
  const [work, creatives, candidates] = await Promise.all([
    loadProjectWork(project, access),
    listProjectCreatives(project.id),
    canManageCreatives && access.organizationId
      ? listCreativePeople(access.organizationId)
      : Promise.resolve([]),
  ]);
  const external = await loadExternalTeam(project.id, work.members);

  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />

      <PageSection id="team-internal" title={t.internal}>
        <TeamWorkloadTable
          projectId={project.id}
          people={work.people}
          counts={countByPerson(work.items)}
        />
      </PageSection>

      <CreativeTeam
        projectId={project.id}
        members={creatives}
        candidates={candidates}
        canManage={canManageCreatives}
      />

      <PageSection id="team-external" title={t.external}>
        <p className="-mt-1 text-sm text-muted-foreground">{t.externalHint}</p>
        <ExternalTeamTable projectId={project.id} members={external} />
      </PageSection>
    </div>
  );
}
