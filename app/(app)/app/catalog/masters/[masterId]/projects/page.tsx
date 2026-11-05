import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DistributionSection } from "@/components/catalog/master-page/distribution-section";
import { ProjectLinkButton } from "@/components/catalog/master-page/project-link-button";
import { ReleaseDatesSection } from "@/components/catalog/master-page/release-dates-section";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listLinkableProjects } from "@/lib/catalog/master/project-link";
import {
  listMasterDistribution,
  listMasterReleaseDates,
} from "@/lib/catalog/master/related";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { withActiveWorkflows } from "@/lib/overview/workflow-progress";
import { listProjects } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";

// Projects & releases tab: live projects carrying the title, among those the
// viewer may see (RLS), in the same table as the Projects page, with « Créer
// un projet » and « Rattacher à un projet existant » (retours 16, 64); their
// three release dates kept apart (#dates, retour 66); then their releases
// (#distribution), read-only.
export default async function MasterProjectsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/projects">) {
  const { masterId } = await params;
  const [access, master, distribution, dates] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterDistribution(masterId),
    listMasterReleaseDates(masterId),
  ]);
  if (!master) notFound();
  const canCreate = can(access, "create_projects");
  const linkable = canCreate ? await listLinkableProjects(masterId) : [];
  const { projects, error } = await listProjects({
    ids: master.projects.map((p) => p.id),
  });
  const t = fr.masterPage.projects;

  return (
    <>
      <PageSection
        card
        id="projects"
        title={t.title}
        action={
          canCreate && (
            <div className="flex flex-wrap gap-2">
              <ProjectLinkButton masterId={master.id} projects={linkable} />
              <Link
                href={routes.projectsNewFromMaster(master.id)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ButtonRoll>
                  <IconPlus aria-hidden data-icon="inline-start" />
                  {t.create}
                </ButtonRoll>
              </Link>
            </div>
          )
        }
      >
        {error ? (
          <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
        ) : projects.length === 0 ? (
          <EmptyNote>{t.emptyBody}</EmptyNote>
        ) : (
          <ProjectsTable
            projects={await withActiveWorkflows(projects)}
            rights={{
              canEdit: can(access, "create_projects"),
              canArchive: can(access, "archive_records"),
              archived: false,
            }}
          />
        )}
      </PageSection>
      <ReleaseDatesSection dates={dates.dates} error={dates.error} />
      <DistributionSection
        releases={distribution.releases}
        error={distribution.error}
        hasProjects={master.projects.length > 0}
      />
    </>
  );
}
