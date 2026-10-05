import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DistributionSection } from "@/components/catalog/master-page/distribution-section";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMasterDistribution } from "@/lib/catalog/master/related";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// Projects & releases tab: live projects carrying the title, among those the
// viewer may see (RLS), in the same table as the Projects page; then their
// releases (#distribution), read-only.
export default async function MasterProjectsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/projects">) {
  const { masterId } = await params;
  const [access, master, distribution] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterDistribution(masterId),
  ]);
  if (!master) notFound();
  const { projects, error } = await listProjects({
    ids: master.projects.map((p) => p.id),
  });
  const t = fr.masterPage.projects;

  return (
    <>
      <PageSection card id="projects" title={t.title}>
        {error ? (
          <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
        ) : projects.length === 0 ? (
          <EmptyNote>{t.emptyBody}</EmptyNote>
        ) : (
          <ProjectsTable
            projects={projects}
            rights={{
              canEdit: can(access, "create_projects"),
              canArchive: can(access, "archive_records"),
              archived: false,
            }}
          />
        )}
      </PageSection>
      <DistributionSection
        releases={distribution.releases}
        error={distribution.error}
        hasProjects={master.projects.length > 0}
      />
    </>
  );
}
